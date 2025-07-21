#!/usr/bin/env python3
"""
Configuration settings for the Kanban Board application.
Uses environment variables for secure configuration management.
"""

import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application settings loaded from environment variables."""
    
    def __init__(self):
        # Security Settings
        self.secret_key: str = os.getenv("SECRET_KEY", "fallback-development-key-change-in-production")
        self.algorithm: str = "HS256"
        self.access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))  # 1 hour default
        
        # Database Settings
        self.mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        self.database_name: str = os.getenv("DATABASE_NAME", "kanbanboard")
        
        # N8N Integration
        self.n8n_webhook_url: str = os.getenv("N8N_WEBHOOK_URL", "https://your-n8n-instance.com/webhook/chatbot")
        
        # CORS Settings
        self.allowed_origins: List[str] = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://task.smb-ai-solution.com").split(",")
        self.allowed_methods: List[str] = os.getenv("ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS").split(",")
        self.allowed_headers: List[str] = os.getenv("ALLOWED_HEADERS", "Authorization,Content-Type,X-Requested-With").split(",")
        self.expose_headers: List[str] = os.getenv("EXPOSE_HEADERS", "X-Total-Count,X-Rate-Limit-Remaining").split(",")
        self.cors_max_age: int = int(os.getenv("CORS_MAX_AGE", "3600"))  # 1 hour
        
        # Application Settings
        self.app_name: str = os.getenv("APP_NAME", "SMB Kanban Board")
        self.app_version: str = os.getenv("APP_VERSION", "1.0.0")
        self.debug: bool = os.getenv("DEBUG", "false").lower() == "true"
        
        # Admin Settings
        self.super_admin_key: str = os.getenv("SUPER_ADMIN_KEY", "smb-2025-super-admin")
        self.registration_key: str = os.getenv("REGISTRATION_KEY", "smb-2025-registration")
        
        # Rate Limiting
        self.login_rate_limit: str = os.getenv("LOGIN_RATE_LIMIT", "5/minute")
        self.api_rate_limit: str = os.getenv("API_RATE_LIMIT", "100/minute")
        self.registration_rate_limit: str = os.getenv("REGISTRATION_RATE_LIMIT", "3/hour")
        self.password_reset_rate_limit: str = os.getenv("PASSWORD_RESET_RATE_LIMIT", "3/hour")
        
        # Redis Configuration (for rate limiting storage)
        self.redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_enabled: bool = os.getenv("REDIS_ENABLED", "false").lower() == "true"
        
        # Input Validation Settings
        self.max_request_size: int = int(os.getenv("MAX_REQUEST_SIZE", str(10 * 1024 * 1024)))  # 10MB default
        self.max_file_size: int = int(os.getenv("MAX_FILE_SIZE", str(5 * 1024 * 1024)))  # 5MB default
        self.allowed_file_types: List[str] = os.getenv("ALLOWED_FILE_TYPES", "pdf,doc,docx,txt,jpg,jpeg,png,gif").split(",")
        self.strict_validation: bool = os.getenv("STRICT_VALIDATION", "true").lower() == "true"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings instance."""
    return settings