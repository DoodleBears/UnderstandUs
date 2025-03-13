from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    LIVEKIT_API_KEY: str
    LIVEKIT_API_SECRET: str
    CORS_ORIGINS: list[str] = ["*"]
    
    class Config:
        env_file = ".env"

settings = Settings() 