import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Expense Claim Policy Review Assistant API"
    DATABASE_URL: str = "sqlite:///./expense_claims.db"
    OPENAI_API_KEY: str | None = None
    OPENAI_BASE_URL: str = "https://models.inference.ai.azure.com"
    LLM_MODEL: str = "gpt-4o"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
