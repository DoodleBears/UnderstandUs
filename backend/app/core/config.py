from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # FastAPI settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "UnderstandUs"
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # LiveKit settings
    LIVEKIT_URL: str
    LIVEKIT_API_KEY: str
    LIVEKIT_API_SECRET: str
    
    # # WebSocket settings
    # WS_MESSAGE_QUEUE: str = "redis://localhost:6379/0"
    
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings() 