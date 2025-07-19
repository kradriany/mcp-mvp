"""Tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from src.mcp_server.main import app, registry
from src.mcp_server.adapters.base import ConnectionStatus


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_connect_mqtt(client):
    """Test MQTT connection endpoint."""
    with patch.object(registry, 'create_connection') as mock_create:
        # Mock successful connection
        mock_adapter = AsyncMock()
        mock_adapter.status = ConnectionStatus.CONNECTED
        mock_adapter.status.value = "connected"
        mock_adapter.status.return_value = "OK – connected, waiting for data"
        
        mock_create.return_value = ("test-conn-123", mock_adapter)
        
        response = client.post("/connect", json={
            "adapter_type": "mqtt",
            "config": {
                "host": "localhost",
                "port": 1883
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["connection_id"] == "test-conn-123"
        assert data["status"] == "connected"


def test_connect_invalid_adapter(client):
    """Test connection with invalid adapter type."""
    response = client.post("/connect", json={
        "adapter_type": "invalid",
        "config": {}
    })
    
    assert response.status_code == 400
    assert "Unknown adapter type" in response.text


def test_get_status(client):
    """Test status endpoint."""
    with patch.object(registry, 'get_adapter') as mock_get:
        # Mock adapter
        mock_adapter = AsyncMock()
        mock_adapter.status.return_value = "OK – streaming 32 msg/s ... (sample follows)"
        mock_get.return_value = mock_adapter
        
        response = client.get("/status/test-conn-123")
        
        assert response.status_code == 200
        assert "streaming 32 msg/s" in response.text


def test_get_status_not_found(client):
    """Test status for non-existent connection."""
    with patch.object(registry, 'get_adapter') as mock_get:
        mock_get.return_value = None
        
        response = client.get("/status/invalid-id")
        
        assert response.status_code == 200
        assert response.text == "Connection not found."


def test_get_sample(client):
    """Test sample endpoint."""
    with patch.object(registry, 'get_adapter') as mock_get:
        # Mock adapter
        mock_adapter = AsyncMock()
        mock_adapter.status.return_value = "OK – connected"
        mock_adapter.sample.return_value = "Sample data here"
        mock_get.return_value = mock_adapter
        
        response = client.get("/sample/test-conn-123?n=100")
        
        assert response.status_code == 200
        assert "OK – connected" in response.text
        assert "Sample data here" in response.text


def test_send_data(client):
    """Test send endpoint."""
    with patch.object(registry, 'get_adapter') as mock_get:
        # Mock adapter
        mock_adapter = AsyncMock()
        mock_get.return_value = mock_adapter
        
        response = client.post("/send/test-conn-123", json={
            "data": "Hello World",
            "encoding": "utf-8"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["bytes_sent"] == 11
        
        # Verify send was called
        mock_adapter.send.assert_called_once()


def test_send_data_base64(client):
    """Test send with base64 encoding."""
    import base64
    
    with patch.object(registry, 'get_adapter') as mock_get:
        # Mock adapter
        mock_adapter = AsyncMock()
        mock_get.return_value = mock_adapter
        
        # Base64 encode test data
        test_data = b"Binary data"
        encoded = base64.b64encode(test_data).decode()
        
        response = client.post("/send/test-conn-123", json={
            "data": encoded,
            "encoding": "base64"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["bytes_sent"] == len(test_data)


def test_disconnect(client):
    """Test disconnect endpoint."""
    with patch.object(registry, 'disconnect') as mock_disconnect:
        mock_disconnect.return_value = True
        
        response = client.delete("/disconnect", json={
            "connection_id": "test-conn-123",
            "force": False
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "successfully" in data["message"]


def test_list_connections(client):
    """Test list connections endpoint."""
    with patch.object(registry, 'list_connections') as mock_list:
        mock_list.return_value = {
            "conn-1": {
                "type": "mqtt",
                "status": "connected",
                "metrics": {
                    "messages_sent": 100,
                    "messages_received": 200
                }
            }
        }
        
        response = client.get("/connections")
        
        assert response.status_code == 200
        data = response.json()
        assert "conn-1" in data
        assert data["conn-1"]["type"] == "mqtt"


def test_api_key_authentication(client):
    """Test API key authentication."""
    with patch('src.mcp_server.main.settings') as mock_settings:
        mock_settings.api_key = "test-key"
        mock_settings.cors_origins = ["*"]
        
        # Without API key
        response = client.get("/connections")
        assert response.status_code == 401
        
        # With wrong API key
        response = client.get("/connections", headers={"X-API-Key": "wrong-key"})
        assert response.status_code == 401
        
        # With correct API key
        with patch.object(registry, 'list_connections') as mock_list:
            mock_list.return_value = {}
            response = client.get("/connections", headers={"X-API-Key": "test-key"})
            assert response.status_code == 200