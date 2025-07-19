"""Base transport adapter interface."""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, Callable, Awaitable
from datetime import datetime
import asyncio
import logging
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class ConnectionStatus(Enum):
    """Connection status enumeration."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"
    RECONNECTING = "reconnecting"


@dataclass
class ConnectionMetrics:
    """Metrics for connection monitoring."""
    connected_at: Optional[datetime] = None
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    last_activity: Optional[datetime] = None
    errors: int = 0
    reconnect_attempts: int = 0


@dataclass
class AdapterConfig:
    """Base configuration for adapters."""
    name: str
    retry_max_attempts: int = 5
    retry_backoff_factor: float = 2.0
    retry_max_delay: float = 60.0
    timeout: float = 30.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseAdapter(ABC):
    """Abstract base class for transport adapters.
    
    Provides a unified interface for different communication protocols
    with built-in retry logic, metrics tracking, and status reporting.
    """
    
    def __init__(self, config: AdapterConfig):
        self.config = config
        self.status = ConnectionStatus.DISCONNECTED
        self.metrics = ConnectionMetrics()
        self._connection_id: Optional[str] = None
        self._sample_buffer: list[str] = []
        self._sample_buffer_size = 1000
        self._status_message = "Connection not configured."
        self._retry_delay = 1.0
        self._running = False
        self._tasks: set[asyncio.Task] = set()
        
        # Callbacks
        self._on_message: Optional[Callable[[bytes], Awaitable[None]]] = None
        self._on_error: Optional[Callable[[Exception], Awaitable[None]]] = None
    
    @property
    def connection_id(self) -> Optional[str]:
        """Get the connection identifier."""
        return self._connection_id
    
    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the remote endpoint.
        
        Must be implemented by concrete adapters.
        Should set status to CONNECTED on success.
        """
        pass
    
    @abstractmethod
    async def send(self, data: bytes | str) -> None:
        """Send data through the connection.
        
        Args:
            data: Data to send (bytes or string)
            
        Raises:
            ConnectionError: If not connected
            TimeoutError: If send times out
        """
        pass
    
    @abstractmethod
    async def _receive_loop(self) -> None:
        """Internal receive loop for processing incoming data.
        
        Must be implemented by concrete adapters.
        Should call _handle_received_data() for each message.
        """
        pass
    
    async def sample(self, n: int = 256) -> str:
        """Get a rate-limited sample of live payload.
        
        Args:
            n: Maximum number of characters to return
            
        Returns:
            Sample of recent messages
        """
        if not self._sample_buffer:
            return "No data available"
        
        # Join recent messages
        sample = "\n".join(self._sample_buffer[-10:])
        
        # Truncate if needed
        if len(sample) > n:
            sample = sample[:n-3] + "..."
        
        return sample
    
    async def status(self) -> str:
        """Get human/agent-friendly status text.
        
        Returns:
            Status description string
        """
        if self.status == ConnectionStatus.CONNECTED:
            if self.metrics.messages_received > 0:
                rate = self._calculate_message_rate()
                return f"OK – streaming {rate} msg/s ... (sample follows)"
            else:
                return "OK – connected, waiting for data"
        
        elif self.status == ConnectionStatus.RECONNECTING:
            return f"Connection configured but unreachable: retrying (back-off {self._retry_delay:.0f} s)."
        
        elif self.status == ConnectionStatus.ERROR:
            return f"Connection error: {self._status_message}"
        
        elif self.status == ConnectionStatus.CONNECTING:
            return "Connecting..."
        
        else:
            return self._status_message
    
    async def disconnect(self) -> None:
        """Gracefully close the connection."""
        logger.info(f"Disconnecting {self.config.name}")
        self._running = False
        
        # Cancel all running tasks
        for task in self._tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        
        self.status = ConnectionStatus.DISCONNECTED
        self._status_message = "Connection closed."
        self._connection_id = None
    
    def set_message_handler(self, handler: Callable[[bytes], Awaitable[None]]) -> None:
        """Set callback for incoming messages."""
        self._on_message = handler
    
    def set_error_handler(self, handler: Callable[[Exception], Awaitable[None]]) -> None:
        """Set callback for errors."""
        self._on_error = handler
    
    async def _handle_received_data(self, data: bytes) -> None:
        """Process received data and update metrics."""
        self.metrics.messages_received += 1
        self.metrics.bytes_received += len(data)
        self.metrics.last_activity = datetime.now()
        
        # Update sample buffer
        try:
            text = data.decode('utf-8', errors='replace')
            self._sample_buffer.append(f"[{datetime.now().isoformat()}] {text}")
            if len(self._sample_buffer) > self._sample_buffer_size:
                self._sample_buffer.pop(0)
        except Exception as e:
            logger.debug(f"Error decoding sample data: {e}")
        
        # Call handler if set
        if self._on_message:
            try:
                await self._on_message(data)
            except Exception as e:
                logger.error(f"Error in message handler: {e}")
                await self._handle_error(e)
    
    async def _handle_error(self, error: Exception) -> None:
        """Handle errors and update metrics."""
        self.metrics.errors += 1
        logger.error(f"Adapter error in {self.config.name}: {error}")
        
        if self._on_error:
            try:
                await self._on_error(error)
            except Exception as e:
                logger.error(f"Error in error handler: {e}")
    
    def _calculate_message_rate(self) -> float:
        """Calculate current message rate."""
        if not self.metrics.connected_at:
            return 0.0
        
        duration = (datetime.now() - self.metrics.connected_at).total_seconds()
        if duration > 0:
            return self.metrics.messages_received / duration
        return 0.0
    
    async def _retry_with_backoff(self, coro: Callable[[], Awaitable[Any]]) -> Any:
        """Execute coroutine with exponential backoff retry."""
        attempt = 0
        delay = 1.0
        
        while attempt < self.config.retry_max_attempts:
            try:
                return await coro()
            except Exception as e:
                attempt += 1
                self.metrics.reconnect_attempts += 1
                
                if attempt >= self.config.retry_max_attempts:
                    self.status = ConnectionStatus.ERROR
                    self._status_message = f"Max retry attempts reached: {str(e)}"
                    raise
                
                self._retry_delay = min(
                    delay * (self.config.retry_backoff_factor ** attempt),
                    self.config.retry_max_delay
                )
                
                logger.warning(
                    f"Retry attempt {attempt}/{self.config.retry_max_attempts} "
                    f"after {self._retry_delay:.1f}s: {str(e)}"
                )
                
                self.status = ConnectionStatus.RECONNECTING
                await asyncio.sleep(self._retry_delay)