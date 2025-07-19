"""Pydantic models for API requests and responses."""

from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class ConnectRequest(BaseModel):
    """Request to establish/resume a connection."""
    adapter_type: Literal["mqtt", "rest", "serial", "grpc", "websocket", "custom"]
    config: Dict[str, Any] = Field(
        description="Adapter-specific configuration"
    )
    connection_id: Optional[str] = Field(
        None,
        description="Optional ID to resume existing connection"
    )


class ConnectResponse(BaseModel):
    """Response after connection attempt."""
    connection_id: str
    status: str
    message: str


class StatusResponse(BaseModel):
    """Connection status information."""
    connection_id: str
    status: str
    message: str
    metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Connection metrics"
    )


class SampleResponse(BaseModel):
    """Sample of live payload data."""
    connection_id: str
    sample: str
    timestamp: datetime = Field(default_factory=datetime.now)
    truncated: bool = False


class SendRequest(BaseModel):
    """Request to send data through connection."""
    data: str = Field(description="Data to send (base64 encoded if binary)")
    encoding: Literal["utf-8", "base64"] = "utf-8"


class SendResponse(BaseModel):
    """Response after send attempt."""
    success: bool
    bytes_sent: int
    message: Optional[str] = None


class DisconnectRequest(BaseModel):
    """Request to disconnect."""
    connection_id: str
    force: bool = Field(
        False,
        description="Force disconnect without graceful shutdown"
    )


class DisconnectResponse(BaseModel):
    """Response after disconnect."""
    success: bool
    message: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)