from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: Literal["development", "production"] = "development"
    
    # OpenAI Configuration
    OPENAI_API_KEY: str
    
    # ElevenLabs Configuration
    ELEVENLABS_API_KEY: str
    
    class Config:
        env_file = ".env"

settings = Settings() 