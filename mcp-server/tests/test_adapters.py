"""Tests for transport adapters."""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch

from src.mcp_server.adapters.base import BaseAdapter, AdapterConfig, ConnectionStatus
from src.mcp_server.adapters.mqtt import MQTTAdapter, MQTTAdapterConfig
from src.mcp_server.adapters.rest import RestAdapter, RestAdapterConfig


class MockAdapter(BaseAdapter):
    """Mock adapter for testing base functionality."""
    
    async def connect(self) -> None:
        self.status = ConnectionStatus.CONNECTED
        self._connection_id = "mock-123"
    
    async def send(self, data: bytes | str) -> None:
        if isinstance(data, str):
            data = data.encode()
        self.metrics.messages_sent += 1
        self.metrics.bytes_sent += len(data)
    
    async def _receive_loop(self) -> None:
        while self._running:
            await asyncio.sleep(0.1)


@pytest.mark.asyncio
async def test_base_adapter_lifecycle():
    """Test adapter lifecycle methods."""
    config = AdapterConfig(name="test")
    adapter = MockAdapter(config)
    
    # Initial state
    assert adapter.status == ConnectionStatus.DISCONNECTED
    assert adapter.connection_id is None
    
    # Connect
    await adapter.connect()
    assert adapter.status == ConnectionStatus.CONNECTED
    assert adapter.connection_id == "mock-123"
    
    # Send data
    await adapter.send("test message")
    assert adapter.metrics.messages_sent == 1
    assert adapter.metrics.bytes_sent == 12
    
    # Disconnect
    await adapter.disconnect()
    assert adapter.status == ConnectionStatus.DISCONNECTED


@pytest.mark.asyncio
async def test_adapter_status_messages():
    """Test status message generation."""
    config = AdapterConfig(name="test")
    adapter = MockAdapter(config)
    
    # Disconnected status
    status = await adapter.status()
    assert "not configured" in status
    
    # Connected status
    await adapter.connect()
    status = await adapter.status()
    assert "connected" in status.lower()
    
    # With messages
    adapter.metrics.messages_received = 100
    adapter.metrics.connected_at = asyncio.get_event_loop().time()
    status = await adapter.status()
    assert "msg/s" in status


@pytest.mark.asyncio
async def test_adapter_retry_logic():
    """Test retry with exponential backoff."""
    config = AdapterConfig(
        name="test",
        retry_max_attempts=3,
        retry_backoff_factor=2.0,
        retry_max_delay=10.0
    )
    adapter = MockAdapter(config)
    
    # Mock failing coroutine
    attempt_count = 0
    async def failing_coro():
        nonlocal attempt_count
        attempt_count += 1
        if attempt_count < 3:
            raise ConnectionError("Test error")
        return "success"
    
    # Should succeed on third attempt
    result = await adapter._retry_with_backoff(failing_coro)
    assert result == "success"
    assert attempt_count == 3
    assert adapter.metrics.reconnect_attempts == 2


@pytest.mark.asyncio
async def test_mqtt_adapter_config():
    """Test MQTT adapter configuration."""
    config = MQTTAdapterConfig(
        host="test.mqtt.broker",
        port=1883,
        username="testuser",
        password="testpass",
        topic_prefix="test/mcp"
    )
    
    assert config.host == "test.mqtt.broker"
    assert config.port == 1883
    assert config.username == "testuser"
    assert config.topic_prefix == "test/mcp"


@pytest.mark.asyncio
async def test_rest_adapter_auth_headers():
    """Test REST adapter authentication headers."""
    # Bearer token
    config = RestAdapterConfig(
        base_url="https://api.test.com",
        auth_type="bearer",
        auth_credentials={"token": "test-token"}
    )
    adapter = RestAdapter(config)
    adapter._prepare_headers()
    
    assert adapter._headers["Authorization"] == "Bearer test-token"
    
    # API key
    config = RestAdapterConfig(
        base_url="https://api.test.com",
        auth_type="api_key",
        auth_credentials={
            "key_name": "X-Custom-Key",
            "key_value": "test-key"
        }
    )
    adapter = RestAdapter(config)
    adapter._prepare_headers()
    
    assert adapter._headers["X-Custom-Key"] == "test-key"


@pytest.mark.asyncio
async def test_adapter_sample_buffer():
    """Test sample buffer functionality."""
    config = AdapterConfig(name="test")
    adapter = MockAdapter(config)
    
    # Empty buffer
    sample = await adapter.sample()
    assert sample == "No data available"
    
    # Add some data
    await adapter._handle_received_data(b"Message 1")
    await adapter._handle_received_data(b"Message 2")
    await adapter._handle_received_data(b"Message 3")
    
    sample = await adapter.sample(50)
    assert "Message" in sample
    assert len(sample) <= 50


@pytest.mark.asyncio
async def test_adapter_callbacks():
    """Test message and error callbacks."""
    config = AdapterConfig(name="test")
    adapter = MockAdapter(config)
    
    # Set up callbacks
    received_messages = []
    received_errors = []
    
    async def on_message(data: bytes):
        received_messages.append(data)
    
    async def on_error(error: Exception):
        received_errors.append(error)
    
    adapter.set_message_handler(on_message)
    adapter.set_error_handler(on_error)
    
    # Test message handling
    await adapter._handle_received_data(b"Test message")
    assert len(received_messages) == 1
    assert received_messages[0] == b"Test message"
    
    # Test error handling
    test_error = ValueError("Test error")
    await adapter._handle_error(test_error)
    assert len(received_errors) == 1
    assert received_errors[0] == test_error