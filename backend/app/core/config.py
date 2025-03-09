from typing import Literal

from pydantic_settings import BaseSettings
from pydantic import Field, SecretStr


class Settings(BaseSettings):
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: Literal["development", "production"] = "development"
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "UnderstandUs"
    
    # OpenAI Configuration
    OPENAI_API_KEY: SecretStr = Field(
        ...,
        description="OpenAI API Key",
        min_length=1,
    )
    
    # ElevenLabs Configuration
    ELEVENLABS_API_KEY: SecretStr = Field(
        ...,
        description="ElevenLabs API Key",
        min_length=1,
    )
    
    # WebSocket Configuration
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_MAX_MESSAGE_SIZE: int = 1024 * 1024  # 1MB
    
    # Audio Configuration
    MAX_AUDIO_DURATION: int = 300  # 5 minutes
    SUPPORTED_AUDIO_FORMATS: list[str] = ["audio/webm", "audio/wav", "audio/mp3"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings() 