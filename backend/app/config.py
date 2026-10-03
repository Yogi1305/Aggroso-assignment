import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Expense Claim Policy Review Assistant API"
    DATABASE_URL: str = "sqlite:///./expense_claims.db"
    OPENAI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    OPENAI_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_MODEL: str = "openai/gpt-oss-20b"
    SECRET_KEY: str = "your-super-secret-key-for-jwt-signing"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
