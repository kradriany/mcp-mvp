"""Main FastAPI application for MCP server."""

import asyncio
import base64
from contextlib import asynccontextmanager
from typing import Optional
import logging
import json

from fastapi import FastAPI, HTTPException, Depends, Header, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from .core.config import settings
from .core.registry import AdapterRegistry
from .core.context_loader import ContextLoader
from .schemas import (
    ConnectRequest, ConnectResponse,
    StatusResponse, SampleResponse,
    SendRequest, SendResponse,
    DisconnectRequest, DisconnectResponse,
    ErrorResponse
)

# Configure logging
if settings.log_format == "json":
    logging.basicConfig(
        level=settings.log_level,
        format='{"time": "%(asctime)s", "level": "%(levelname)s", "module": "%(name)s", "message": "%(message)s"}',
    )
else:
    logging.basicConfig(
        level=settings.log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    )

logger = logging.getLogger(__name__)

# Global instances
registry = AdapterRegistry()
context_loader: Optional[ContextLoader] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager."""
    logger.info("Starting MCP server...")
    
    # Load context if enabled
    if settings.load_context_on_startup:
        global context_loader
        try:
            context_loader = ContextLoader()
            await context_loader.load_external_context()
            logger.info("Context loading complete")
        except Exception as e:
            logger.error(f"Failed to load context: {e}")
    
    yield
    
    # Cleanup
    logger.info("Shutting down MCP server...")
    await registry.cleanup()


# Create FastAPI app
app = FastAPI(
    title="MCP Server",
    description="Universal connector for heterogeneous communication protocols",
    version="0.1.0",
    lifespan=lifespan,
    default_response_class=PlainTextResponse,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency for optional API key authentication
async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> None:
    """Verify API key if configured."""
    if settings.api_key and x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.post("/connect", response_model=ConnectResponse, dependencies=[Depends(verify_api_key)])
async def connect(request: ConnectRequest) -> ConnectResponse:
    """Establish or resume a channel connection."""
    try:
        # Merge with defaults
        config = settings.get_adapter_defaults(request.adapter_type)
        config.update(request.config)
        
        # Create connection
        connection_id, adapter = await registry.create_connection(
            adapter_type=request.adapter_type,
            config=config,
            connection_id=request.connection_id
        )
        
        # Get status
        status_text = await adapter.status()
        
        return ConnectResponse(
            connection_id=connection_id,
            status=adapter.status.value,
            message=status_text
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Connection error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/status/{connection_id}", response_class=PlainTextResponse, dependencies=[Depends(verify_api_key)])
async def get_status(connection_id: str = Path(description="Connection ID")) -> str:
    """Get human/agent-friendly status text."""
    adapter = await registry.get_adapter(connection_id)
    
    if not adapter:
        return "Connection not found."
    
    return await adapter.status()


@app.get("/sample/{connection_id}", response_class=PlainTextResponse, dependencies=[Depends(verify_api_key)])
async def get_sample(
    connection_id: str = Path(description="Connection ID"),
    n: int = 256
) -> str:
    """Get rate-limited sample of live payload."""
    adapter = await registry.get_adapter(connection_id)
    
    if not adapter:
        return "Connection not found."
    
    # Get status and sample
    status = await adapter.status()
    sample = await adapter.sample(n)
    
    return f"{status}\n\n{sample}"


@app.post("/send/{connection_id}", response_model=SendResponse, dependencies=[Depends(verify_api_key)])
async def send_data(
    request: SendRequest,
    connection_id: str = Path(description="Connection ID")
) -> SendResponse:
    """Push data through connection."""
    adapter = await registry.get_adapter(connection_id)
    
    if not adapter:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    try:
        # Decode data if needed
        if request.encoding == "base64":
            data = base64.b64decode(request.data)
        else:
            data = request.data.encode('utf-8')
        
        # Send data
        await adapter.send(data)
        
        return SendResponse(
            success=True,
            bytes_sent=len(data),
            message="Data sent successfully"
        )
        
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Send error: {e}")
        return SendResponse(
            success=False,
            bytes_sent=0,
            message=str(e)
        )


@app.delete("/disconnect", response_model=DisconnectResponse, dependencies=[Depends(verify_api_key)])
async def disconnect(request: DisconnectRequest) -> DisconnectResponse:
    """Gracefully close connection."""
    success = await registry.disconnect(request.connection_id, request.force)
    
    if success:
        return DisconnectResponse(
            success=True,
            message="Connection closed successfully"
        )
    else:
        return DisconnectResponse(
            success=False,
            message="Connection not found"
        )


@app.get("/connections", dependencies=[Depends(verify_api_key)])
async def list_connections():
    """List all active connections."""
    return await registry.list_connections()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "connections": len(await registry.list_connections())
    }


# 🔧 Customize Claude retrieval chain
@app.get("/context/search", dependencies=[Depends(verify_api_key)])
async def search_context(q: str, limit: int = 5):
    """Search loaded context for relevant information."""
    if not context_loader:
        raise HTTPException(status_code=503, detail="Context not loaded")
    
    results = context_loader.search(q, top_k=limit)
    return {
        "query": q,
        "results": results
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "mcp_server.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_config=None,  # Use our logging config
    )