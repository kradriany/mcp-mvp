"""Tests for adapter registry."""

import pytest
from unittest.mock import Mock, AsyncMock, patch

from src.mcp_server.core.registry import AdapterRegistry
from src.mcp_server.adapters.base import ConnectionStatus


@pytest.mark.asyncio
async def test_registry_create_connection():
    """Test creating a new connection."""
    registry = AdapterRegistry()
    
    # Create MQTT connection
    conn_id, adapter = await registry.create_connection(
        adapter_type="mqtt",
        config={"host": "localhost", "port": 1883}
    )
    
    assert conn_id is not None
    assert adapter is not None
    assert conn_id in registry._adapters
    
    # Cleanup
    await registry.disconnect(conn_id)


@pytest.mark.asyncio
async def test_registry_resume_connection():
    """Test resuming an existing connection."""
    registry = AdapterRegistry()
    
    # Create initial connection
    conn_id, adapter1 = await registry.create_connection(
        adapter_type="mqtt",
        config={"host": "localhost"}
    )
    
    # Resume with same ID
    conn_id2, adapter2 = await registry.create_connection(
        adapter_type="mqtt",
        config={"host": "localhost"},
        connection_id=conn_id
    )
    
    assert conn_id == conn_id2
    assert adapter1 is adapter2
    
    # Cleanup
    await registry.disconnect(conn_id)


@pytest.mark.asyncio
async def test_registry_invalid_adapter_type():
    """Test creating connection with invalid adapter type."""
    registry = AdapterRegistry()
    
    with pytest.raises(ValueError) as exc_info:
        await registry.create_connection(
            adapter_type="invalid",
            config={}
        )
    
    assert "Unknown adapter type" in str(exc_info.value)


@pytest.mark.asyncio
async def test_registry_get_adapter():
    """Test getting adapter by ID."""
    registry = AdapterRegistry()
    
    # Create connection
    conn_id, adapter = await registry.create_connection(
        adapter_type="rest",
        config={"base_url": "http://localhost"}
    )
    
    # Get adapter
    retrieved = await registry.get_adapter(conn_id)
    assert retrieved is adapter
    
    # Get non-existent
    none_adapter = await registry.get_adapter("invalid-id")
    assert none_adapter is None
    
    # Cleanup
    await registry.disconnect(conn_id)


@pytest.mark.asyncio
async def test_registry_disconnect():
    """Test disconnecting adapters."""
    registry = AdapterRegistry()
    
    # Create connection
    conn_id, adapter = await registry.create_connection(
        adapter_type="mqtt",
        config={"host": "localhost"}
    )
    
    # Disconnect
    success = await registry.disconnect(conn_id)
    assert success is True
    assert conn_id not in registry._adapters
    
    # Disconnect non-existent
    success = await registry.disconnect("invalid-id")
    assert success is False


@pytest.mark.asyncio
async def test_registry_list_connections():
    """Test listing active connections."""
    registry = AdapterRegistry()
    
    # Create multiple connections
    conn1, _ = await registry.create_connection(
        adapter_type="mqtt",
        config={"host": "localhost"}
    )
    
    conn2, _ = await registry.create_connection(
        adapter_type="rest",
        config={"base_url": "http://api.test"}
    )
    
    # List connections
    connections = await registry.list_connections()
    
    assert len(connections) == 2
    assert conn1 in connections
    assert conn2 in connections
    assert connections[conn1]["type"] == "mqtt"
    assert connections[conn2]["type"] == "rest"
    
    # Cleanup
    await registry.cleanup()


@pytest.mark.asyncio
async def test_registry_cleanup():
    """Test cleanup of all connections."""
    registry = AdapterRegistry()
    
    # Create multiple connections
    conn_ids = []
    for i in range(3):
        conn_id, _ = await registry.create_connection(
            adapter_type="mqtt",
            config={"host": f"host{i}"}
        )
        conn_ids.append(conn_id)
    
    # Verify all connected
    assert len(registry._adapters) == 3
    
    # Cleanup
    await registry.cleanup()
    
    # Verify all disconnected
    assert len(registry._adapters) == 0