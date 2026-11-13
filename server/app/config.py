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
    # Can be a comma-separated string in env, e.g. "https://my-app.vercel.app,http://localhost:5173"
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,*"
    )
    
    @property
    def cors_origins(self) -> List[str]:
        if self.ALLOWED_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"

settings = Settings()
