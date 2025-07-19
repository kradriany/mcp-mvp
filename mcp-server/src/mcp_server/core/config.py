"""Application configuration using pydantic-settings."""

from typing import Optional, Dict, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable support.
    
    🔧 CONFIG: Add custom settings here
    """
    
    # Server settings
    host: str = Field("0.0.0.0", description="Server host")
    port: int = Field(8080, description="Server port")
    reload: bool = Field(False, description="Enable auto-reload")
    
    # Logging
    log_level: str = Field("INFO", description="Logging level")
    log_format: str = Field("json", description="Log format (json or text)")
    
    # Security
    api_key: Optional[str] = Field(None, description="Optional API key for authentication")
    cors_origins: list[str] = Field(["*"], description="CORS allowed origins")
    
    # Adapter defaults
    default_timeout: float = Field(30.0, description="Default connection timeout")
    max_connections: int = Field(100, description="Maximum concurrent connections")
    
    # Context loading
    load_context_on_startup: bool = Field(True, description="Load MCP context on startup")
    context_cache_dir: Optional[str] = Field(None, description="Directory for context cache")
    
    # 🔧 SECRETS: Add sensitive configuration
    mqtt_default_host: str = Field("localhost", description="Default MQTT broker host")
    mqtt_default_port: int = Field(1883, description="Default MQTT broker port")
    
    model_config = SettingsConfigDict(
        env_prefix="MCP_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow"
    )
    
    def get_adapter_defaults(self, adapter_type: str) -> Dict[str, Any]:
        """Get default configuration for adapter type."""
        defaults = {
            "timeout": self.default_timeout,
        }
        
        if adapter_type == "mqtt":
            defaults.update({
                "host": self.mqtt_default_host,
                "port": self.mqtt_default_port,
            })
        
        # 🔧 CONFIG: Add more adapter defaults
        
        return defaults


# Global settings instance
settings = Settings()