"""MQTT transport adapter implementation."""

import asyncio
import json
from typing import Optional, Dict, Any
from uuid import uuid4
import logging

from gmqtt import Client as MQTTClient
from gmqtt.mqtt.constants import MQTTv311

from .base import BaseAdapter, AdapterConfig, ConnectionStatus

logger = logging.getLogger(__name__)


class MQTTAdapterConfig(AdapterConfig):
    """Configuration for MQTT adapter."""
    host: str = "localhost"
    port: int = 1883
    username: Optional[str] = None
    password: Optional[str] = None
    client_id: Optional[str] = None
    topic_prefix: str = "mcp"
    qos: int = 1
    keepalive: int = 60
    tls: bool = False
    
    def __init__(self, **kwargs):
        super().__init__(name="mqtt", **kwargs)
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)


class MQTTAdapter(BaseAdapter):
    """MQTT protocol adapter using gmqtt.
    
    Provides pub/sub messaging over MQTT with automatic reconnection
    and topic-based routing.
    
    Example:
        config = MQTTAdapterConfig(
            host="broker.mqtt.com",
            port=1883,
            username="user",
            password="pass",
            topic_prefix="mcp/data"
        )
        adapter = MQTTAdapter(config)
        await adapter.connect()
        await adapter.send(b"Hello MQTT")
    """
    
    def __init__(self, config: MQTTAdapterConfig):
        super().__init__(config)
        self.mqtt_config = config
        self._client: Optional[MQTTClient] = None
        self._subscribe_topics: list[str] = []
        self._publish_topic: str = f"{config.topic_prefix}/out"
        self._subscribe_topic: str = f"{config.topic_prefix}/in"
    
    async def connect(self) -> None:
        """Connect to MQTT broker."""
        try:
            self.status = ConnectionStatus.CONNECTING
            self._connection_id = str(uuid4())
            
            # Create client
            client_id = self.mqtt_config.client_id or f"mcp-{self._connection_id[:8]}"
            self._client = MQTTClient(client_id)
            
            # Set callbacks
            self._client.on_connect = self._on_connect
            self._client.on_message = self._on_message_received
            self._client.on_disconnect = self._on_disconnect
            
            # Configure authentication
            if self.mqtt_config.username and self.mqtt_config.password:
                self._client.set_auth_credentials(
                    self.mqtt_config.username,
                    self.mqtt_config.password
                )
            
            # Connect with retry
            await self._retry_with_backoff(self._connect_mqtt)
            
            # Start receive loop
            self._running = True
            receive_task = asyncio.create_task(self._receive_loop())
            self._tasks.add(receive_task)
            receive_task.add_done_callback(self._tasks.discard)
            
        except Exception as e:
            self.status = ConnectionStatus.ERROR
            self._status_message = f"Failed to connect: {str(e)}"
            raise
    
    async def _connect_mqtt(self) -> None:
        """Internal MQTT connection logic."""
        await self._client.connect(
            self.mqtt_config.host,
            self.mqtt_config.port,
            keepalive=self.mqtt_config.keepalive,
            version=MQTTv311
        )
        
        # Wait for connection
        await asyncio.sleep(1)
        
        if not self._client.is_connected:
            raise ConnectionError("Failed to establish MQTT connection")
    
    async def send(self, data: bytes | str) -> None:
        """Publish data to MQTT topic."""
        if self.status != ConnectionStatus.CONNECTED:
            raise ConnectionError(f"Not connected (status: {self.status.value})")
        
        if isinstance(data, str):
            data = data.encode('utf-8')
        
        try:
            # Publish message
            await self._client.publish(
                self._publish_topic,
                data,
                qos=self.mqtt_config.qos,
                retain=False
            )
            
            # Update metrics
            self.metrics.messages_sent += 1
            self.metrics.bytes_sent += len(data)
            
            logger.debug(f"Published {len(data)} bytes to {self._publish_topic}")
            
        except Exception as e:
            await self._handle_error(e)
            raise
    
    async def _receive_loop(self) -> None:
        """Process incoming MQTT messages."""
        # Subscribe to input topic
        self._client.subscribe(self._subscribe_topic, qos=self.mqtt_config.qos)
        logger.info(f"Subscribed to {self._subscribe_topic}")
        
        # Keep connection alive
        while self._running and self._client.is_connected:
            await asyncio.sleep(1)
    
    def _on_connect(self, client, flags, rc, properties):
        """MQTT connection callback."""
        if rc == 0:
            self.status = ConnectionStatus.CONNECTED
            self._status_message = "Connected to MQTT broker"
            self.metrics.connected_at = asyncio.get_event_loop().time()
            logger.info(f"Connected to MQTT broker at {self.mqtt_config.host}:{self.mqtt_config.port}")
        else:
            self.status = ConnectionStatus.ERROR
            self._status_message = f"MQTT connection failed with code {rc}"
            logger.error(self._status_message)
    
    def _on_message_received(self, client, topic, payload, qos, properties):
        """MQTT message received callback."""
        logger.debug(f"Received message on {topic}: {len(payload)} bytes")
        
        # Schedule coroutine in the event loop
        asyncio.create_task(self._handle_received_data(payload))
    
    def _on_disconnect(self, client, packet, exc=None):
        """MQTT disconnection callback."""
        self.status = ConnectionStatus.DISCONNECTED
        if exc:
            self._status_message = f"Disconnected with error: {exc}"
            logger.error(self._status_message)
        else:
            self._status_message = "Disconnected from MQTT broker"
            logger.info(self._status_message)
    
    async def disconnect(self) -> None:
        """Disconnect from MQTT broker."""
        if self._client and self._client.is_connected:
            await self._client.disconnect()
        
        await super().disconnect()
    
    async def subscribe(self, topic: str, qos: Optional[int] = None) -> None:
        """Subscribe to additional MQTT topic.
        
        🔧 EDIT ME: Add custom topic subscriptions
        """
        if self.status != ConnectionStatus.CONNECTED:
            raise ConnectionError("Not connected to MQTT broker")
        
        qos = qos or self.mqtt_config.qos
        self._client.subscribe(topic, qos=qos)
        self._subscribe_topics.append(topic)
        logger.info(f"Subscribed to {topic}")
    
    async def unsubscribe(self, topic: str) -> None:
        """Unsubscribe from MQTT topic."""
        if self.status != ConnectionStatus.CONNECTED:
            raise ConnectionError("Not connected to MQTT broker")
        
        self._client.unsubscribe(topic)
        if topic in self._subscribe_topics:
            self._subscribe_topics.remove(topic)
        logger.info(f"Unsubscribed from {topic}")