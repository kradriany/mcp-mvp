"""Adapter registry for managing connections."""

import asyncio
from typing import Dict, Optional, Type, Any
from uuid import uuid4
import logging

from ..adapters.base import BaseAdapter, AdapterConfig
from ..adapters.mqtt import MQTTAdapter, MQTTAdapterConfig
from ..adapters.rest import RestAdapter, RestAdapterConfig

logger = logging.getLogger(__name__)


class AdapterRegistry:
    """Registry for managing adapter instances and connections."""
    
    # 🔧 ADD more adapters here
    ADAPTER_TYPES: Dict[str, Type[BaseAdapter]] = {
        "mqtt": MQTTAdapter,
        "rest": RestAdapter,
        # TODO: Add SerialAdapter
        # TODO: Add GRPCAdapter
        # TODO: Add WebSocketAdapter
    }
    
    CONFIG_TYPES: Dict[str, Type[AdapterConfig]] = {
        "mqtt": MQTTAdapterConfig,
        "rest": RestAdapterConfig,
    }
    
    def __init__(self):
        self._adapters: Dict[str, BaseAdapter] = {}
        self._lock = asyncio.Lock()
    
    async def create_connection(
        self, 
        adapter_type: str, 
        config: Dict[str, Any],
        connection_id: Optional[str] = None
    ) -> tuple[str, BaseAdapter]:
        """Create or resume a connection.
        
        Args:
            adapter_type: Type of adapter to use
            config: Configuration dictionary
            connection_id: Optional ID to resume existing connection
            
        Returns:
            Tuple of (connection_id, adapter)
            
        Raises:
            ValueError: If adapter type is unknown
            ConnectionError: If connection fails
        """
        async with self._lock:
            # Check for existing connection
            if connection_id and connection_id in self._adapters:
                adapter = self._adapters[connection_id]
                logger.info(f"Resuming connection {connection_id}")
                return connection_id, adapter
            
            # Validate adapter type
            if adapter_type not in self.ADAPTER_TYPES:
                raise ValueError(
                    f"Unknown adapter type: {adapter_type}. "
                    f"Available types: {list(self.ADAPTER_TYPES.keys())}"
                )
            
            # Create new connection
            connection_id = connection_id or str(uuid4())
            
            # Build configuration
            config_class = self.CONFIG_TYPES.get(adapter_type, AdapterConfig)
            adapter_config = config_class(**config)
            
            # Create adapter instance
            adapter_class = self.ADAPTER_TYPES[adapter_type]
            adapter = adapter_class(adapter_config)
            
            # Connect
            try:
                await adapter.connect()
                self._adapters[connection_id] = adapter
                logger.info(f"Created new connection {connection_id} with {adapter_type}")
                return connection_id, adapter
                
            except Exception as e:
                logger.error(f"Failed to create connection: {e}")
                raise
    
    async def get_adapter(self, connection_id: str) -> Optional[BaseAdapter]:
        """Get adapter by connection ID."""
        return self._adapters.get(connection_id)
    
    async def disconnect(self, connection_id: str, force: bool = False) -> bool:
        """Disconnect and remove adapter.
        
        Args:
            connection_id: Connection to disconnect
            force: Force disconnect without graceful shutdown
            
        Returns:
            True if disconnected, False if not found
        """
        async with self._lock:
            adapter = self._adapters.get(connection_id)
            if not adapter:
                return False
            
            try:
                if not force:
                    await adapter.disconnect()
                else:
                    # Force disconnect without cleanup
                    adapter._running = False
            except Exception as e:
                logger.error(f"Error disconnecting {connection_id}: {e}")
            
            del self._adapters[connection_id]
            logger.info(f"Disconnected {connection_id}")
            return True
    
    async def list_connections(self) -> Dict[str, Dict[str, Any]]:
        """List all active connections."""
        connections = {}
        
        for conn_id, adapter in self._adapters.items():
            connections[conn_id] = {
                "type": adapter.config.name,
                "status": adapter.status.value,
                "metrics": {
                    "messages_sent": adapter.metrics.messages_sent,
                    "messages_received": adapter.metrics.messages_received,
                    "bytes_sent": adapter.metrics.bytes_sent,
                    "bytes_received": adapter.metrics.bytes_received,
                    "errors": adapter.metrics.errors,
                }
            }
        
        return connections
    
    async def cleanup(self) -> None:
        """Disconnect all adapters."""
        logger.info("Cleaning up all connections...")
        
        # Disconnect all adapters
        tasks = []
        for conn_id in list(self._adapters.keys()):
            tasks.append(self.disconnect(conn_id))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info("Cleanup complete")