from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    ENVIRONMENT: str = "development"
    API_SERVICE_HOST: str = "0.0.0.0"
    API_SERVICE_PORT: int = 8000
    STT_SERVICE_HOST: str = "0.0.0.0"
    STT_SERVICE_PORT: int = 8001
    
    # LiveKit configuration
    LIVEKIT_API_KEY: str
    LIVEKIT_API_SECRET: str
    LIVEKIT_HOST: str = "http://localhost:7880"

    class Config:
        env_file = ".env"

settings = Settings()