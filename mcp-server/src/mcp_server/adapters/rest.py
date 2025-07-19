"""REST/HTTP transport adapter implementation."""

import asyncio
import json
from typing import Optional, Dict, Any, Union
from datetime import datetime
from uuid import uuid4
import logging

import aiohttp
from aiohttp import ClientSession, ClientWebSocketResponse

from .base import BaseAdapter, AdapterConfig, ConnectionStatus

logger = logging.getLogger(__name__)


class RestAdapterConfig(AdapterConfig):
    """Configuration for REST/HTTP adapter."""
    base_url: str
    auth_type: str = "none"  # none, basic, bearer, api_key
    auth_credentials: Dict[str, str] = {}
    headers: Dict[str, str] = {}
    use_websocket: bool = False
    websocket_path: str = "/ws"
    poll_interval: float = 1.0
    poll_endpoint: str = "/messages"
    send_endpoint: str = "/send"
    
    def __init__(self, base_url: str, **kwargs):
        super().__init__(name="rest", **kwargs)
        self.base_url = base_url.rstrip('/')
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)


class RestAdapter(BaseAdapter):
    """REST/HTTP protocol adapter with WebSocket support.
    
    Supports both polling-based and WebSocket connections for
    real-time communication over HTTP.
    
    Example:
        config = RestAdapterConfig(
            base_url="https://api.example.com",
            auth_type="bearer",
            auth_credentials={"token": "xxx"},
            use_websocket=True
        )
        adapter = RestAdapter(config)
        await adapter.connect()
        await adapter.send(b"Hello REST")
    """
    
    def __init__(self, config: RestAdapterConfig):
        super().__init__(config)
        self.rest_config = config
        self._session: Optional[ClientSession] = None
        self._websocket: Optional[ClientWebSocketResponse] = None
        self._headers: Dict[str, str] = {}
    
    async def connect(self) -> None:
        """Establish HTTP connection or WebSocket."""
        try:
            self.status = ConnectionStatus.CONNECTING
            self._connection_id = str(uuid4())
            
            # Prepare headers
            self._prepare_headers()
            
            # Create session
            self._session = ClientSession(headers=self._headers)
            
            if self.rest_config.use_websocket:
                # Connect via WebSocket
                await self._retry_with_backoff(self._connect_websocket)
            else:
                # Test connection with a simple request
                await self._retry_with_backoff(self._test_connection)
            
            self.status = ConnectionStatus.CONNECTED
            self.metrics.connected_at = datetime.now()
            self._status_message = "Connected"
            
            # Start receive loop
            self._running = True
            receive_task = asyncio.create_task(self._receive_loop())
            self._tasks.add(receive_task)
            receive_task.add_done_callback(self._tasks.discard)
            
        except Exception as e:
            self.status = ConnectionStatus.ERROR
            self._status_message = f"Failed to connect: {str(e)}"
            if self._session:
                await self._session.close()
            raise
    
    def _prepare_headers(self) -> None:
        """Prepare HTTP headers with authentication."""
        self._headers = self.rest_config.headers.copy()
        
        # 🔧 CONFIG: Authentication setup
        if self.rest_config.auth_type == "bearer":
            token = self.rest_config.auth_credentials.get("token", "")
            self._headers["Authorization"] = f"Bearer {token}"
        
        elif self.rest_config.auth_type == "api_key":
            key_name = self.rest_config.auth_credentials.get("key_name", "X-API-Key")
            key_value = self.rest_config.auth_credentials.get("key_value", "")
            self._headers[key_name] = key_value
        
        elif self.rest_config.auth_type == "basic":
            import base64
            username = self.rest_config.auth_credentials.get("username", "")
            password = self.rest_config.auth_credentials.get("password", "")
            credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
            self._headers["Authorization"] = f"Basic {credentials}"
    
    async def _connect_websocket(self) -> None:
        """Connect via WebSocket."""
        ws_url = self.rest_config.base_url.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{ws_url}{self.rest_config.websocket_path}"
        
        self._websocket = await self._session.ws_connect(ws_url)
        logger.info(f"WebSocket connected to {ws_url}")
    
    async def _test_connection(self) -> None:
        """Test REST connection with a simple request."""
        # Try to get status or ping endpoint
        test_endpoints = ["/status", "/ping", "/health", "/"]
        
        for endpoint in test_endpoints:
            try:
                url = f"{self.rest_config.base_url}{endpoint}"
                async with self._session.get(url) as response:
                    if response.status < 500:
                        logger.info(f"REST connection verified at {url}")
                        return
            except Exception:
                continue
        
        raise ConnectionError("Failed to verify REST connection")
    
    async def send(self, data: bytes | str) -> None:
        """Send data via REST or WebSocket."""
        if self.status != ConnectionStatus.CONNECTED:
            raise ConnectionError(f"Not connected (status: {self.status.value})")
        
        try:
            if self.rest_config.use_websocket:
                # Send via WebSocket
                if not self._websocket or self._websocket.closed:
                    raise ConnectionError("WebSocket is closed")
                
                if isinstance(data, bytes):
                    await self._websocket.send_bytes(data)
                else:
                    await self._websocket.send_str(data)
            
            else:
                # Send via REST POST
                url = f"{self.rest_config.base_url}{self.rest_config.send_endpoint}"
                
                if isinstance(data, bytes):
                    headers = {"Content-Type": "application/octet-stream"}
                    async with self._session.post(url, data=data, headers=headers) as response:
                        response.raise_for_status()
                else:
                    headers = {"Content-Type": "application/json"}
                    async with self._session.post(url, json={"data": data}, headers=headers) as response:
                        response.raise_for_status()
            
            # Update metrics
            self.metrics.messages_sent += 1
            self.metrics.bytes_sent += len(data) if isinstance(data, bytes) else len(data.encode())
            
        except Exception as e:
            await self._handle_error(e)
            raise
    
    async def _receive_loop(self) -> None:
        """Receive data via WebSocket or polling."""
        try:
            if self.rest_config.use_websocket:
                await self._websocket_receive_loop()
            else:
                await self._polling_receive_loop()
        except Exception as e:
            if self._running:
                logger.error(f"Receive loop error: {e}")
                await self._handle_error(e)
    
    async def _websocket_receive_loop(self) -> None:
        """Receive messages from WebSocket."""
        while self._running and self._websocket and not self._websocket.closed:
            try:
                msg = await self._websocket.receive()
                
                if msg.type == aiohttp.WSMsgType.TEXT:
                    await self._handle_received_data(msg.data.encode())
                elif msg.type == aiohttp.WSMsgType.BINARY:
                    await self._handle_received_data(msg.data)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {self._websocket.exception()}")
                elif msg.type == aiohttp.WSMsgType.CLOSE:
                    logger.info("WebSocket closed")
                    break
                    
            except Exception as e:
                if self._running:
                    logger.error(f"WebSocket receive error: {e}")
                    await asyncio.sleep(1)
    
    async def _polling_receive_loop(self) -> None:
        """Poll for messages via REST."""
        url = f"{self.rest_config.base_url}{self.rest_config.poll_endpoint}"
        
        while self._running:
            try:
                async with self._session.get(url) as response:
                    if response.status == 200:
                        data = await response.read()
                        if data:
                            await self._handle_received_data(data)
                    elif response.status == 204:
                        # No content - normal for polling
                        pass
                    else:
                        logger.warning(f"Poll request returned {response.status}")
                
                await asyncio.sleep(self.rest_config.poll_interval)
                
            except Exception as e:
                if self._running:
                    logger.error(f"Polling error: {e}")
                    await asyncio.sleep(self.rest_config.poll_interval * 2)
    
    async def disconnect(self) -> None:
        """Close REST/WebSocket connection."""
        if self._websocket and not self._websocket.closed:
            await self._websocket.close()
        
        if self._session and not self._session.closed:
            await self._session.close()
        
        await super().disconnect()
    
    async def request(self, method: str, endpoint: str, **kwargs) -> aiohttp.ClientResponse:
        """Make arbitrary HTTP request.
        
        🔧 EDIT ME: Add custom REST endpoints
        """
        if self.status != ConnectionStatus.CONNECTED:
            raise ConnectionError("Not connected")
        
        url = f"{self.rest_config.base_url}{endpoint}"
        return await self._session.request(method, url, **kwargs)