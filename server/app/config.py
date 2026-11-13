import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "DocFlow Converter API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Storage settings
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage"))
    MAX_FILE_SIZE_MB: int = 50
    FILE_RETENTION_MINUTES: int = 30
    
    # CORS settings
    # Default to allow all in development, or comma-separated list
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")
    
    @property
    def cors_origins(self) -> List[str]:
        raw = self.ALLOWED_ORIGINS.strip()
        if raw == "*" or "*" in raw.split(","):
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    class Config:
        env_file = ".env"

settings = Settings()
