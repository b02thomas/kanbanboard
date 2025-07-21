#!/usr/bin/env python3
"""
Rate limiting middleware for the Kanban Board application.
Provides protection against brute force attacks and API abuse.
"""

import time
import logging
from typing import Optional, Dict, Any
from functools import wraps
from fastapi import Request, HTTPException, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import redis

from settings import settings

logger = logging.getLogger(__name__)

# Configure Redis connection if enabled
redis_client = None
if settings.redis_enabled:
    try:
        redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        # Test connection
        redis_client.ping()
        logger.info("Redis connected successfully for rate limiting")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Using in-memory storage.")
        redis_client = None
else:
    logger.info("Redis disabled, using in-memory storage for rate limiting")

# Create limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url if redis_client else None,
    default_limits=["1000/hour"]  # Default fallback limit
)

def get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    # Check for forwarded headers first (for reverse proxy setups)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct connection
    return request.client.host if request.client else "unknown"

def get_user_identifier(request: Request) -> str:
    """Get user identifier for rate limiting (IP + User-Agent)."""
    ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "unknown")
    return f"{ip}:{hash(user_agent)}"

# Custom rate limit exceeded handler
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    client_ip = get_client_ip(request)
    logger.warning(f"Rate limit exceeded for IP: {client_ip}, Path: {request.url.path}")
    
    response = {
        "error": "Rate limit exceeded",
        "message": f"Too many requests. Limit: {exc.detail}",
        "retry_after": getattr(exc, 'retry_after', 60),
        "ip": client_ip
    }
    
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=response,
        headers={"Retry-After": str(getattr(exc, 'retry_after', 60))}
    )

# Rate limiting decorators for specific endpoints
def login_rate_limit(func):
    """Rate limit decorator for login endpoints."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        return await func(*args, **kwargs)
    
    # Apply rate limiting
    wrapper = limiter.limit(settings.login_rate_limit)(wrapper)
    return wrapper

def api_rate_limit(func):
    """Rate limit decorator for API endpoints."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        return await func(*args, **kwargs)
    
    # Apply rate limiting
    wrapper = limiter.limit(settings.api_rate_limit)(wrapper)
    return wrapper

def registration_rate_limit(func):
    """Rate limit decorator for registration endpoints."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        return await func(*args, **kwargs)
    
    # Apply rate limiting
    wrapper = limiter.limit(settings.registration_rate_limit)(wrapper)
    return wrapper

def password_reset_rate_limit(func):
    """Rate limit decorator for password reset endpoints."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        return await func(*args, **kwargs)
    
    # Apply rate limiting
    wrapper = limiter.limit(settings.password_reset_rate_limit)(wrapper)
    return wrapper

# Custom rate limiting for specific scenarios
class SecurityRateLimiter:
    """Advanced rate limiter for security-sensitive operations."""
    
    def __init__(self):
        self.failed_attempts = {}
        self.blocked_ips = {}
    
    def check_failed_login(self, ip: str, username: str = None) -> bool:
        """Check if IP/user should be blocked for failed login attempts."""
        key = f"login_fail:{ip}:{username}" if username else f"login_fail:{ip}"
        
        if redis_client:
            try:
                attempts = redis_client.get(key)
                if attempts and int(attempts) >= 5:  # 5 failed attempts
                    return False
            except Exception as e:
                logger.error(f"Redis error checking failed attempts: {e}")
        
        return True
    
    def record_failed_login(self, ip: str, username: str = None):
        """Record a failed login attempt."""
        key = f"login_fail:{ip}:{username}" if username else f"login_fail:{ip}"
        
        if redis_client:
            try:
                redis_client.incr(key)
                redis_client.expire(key, 3600)  # 1 hour expiry
            except Exception as e:
                logger.error(f"Redis error recording failed attempt: {e}")
        else:
            # In-memory fallback
            self.failed_attempts[key] = self.failed_attempts.get(key, 0) + 1
    
    def clear_failed_attempts(self, ip: str, username: str = None):
        """Clear failed login attempts after successful login."""
        key = f"login_fail:{ip}:{username}" if username else f"login_fail:{ip}"
        
        if redis_client:
            try:
                redis_client.delete(key)
            except Exception as e:
                logger.error(f"Redis error clearing failed attempts: {e}")
        else:
            self.failed_attempts.pop(key, None)

# Global security rate limiter instance
security_limiter = SecurityRateLimiter()

def configure_app_rate_limiting(app):
    """Configure rate limiting for the FastAPI application."""
    # Add slowapi middleware
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
    app.add_middleware(SlowAPIMiddleware)
    
    logger.info("Rate limiting configured successfully")
    
    # Log configuration
    logger.info(f"Rate limiting settings:")
    logger.info(f"  Login: {settings.login_rate_limit}")
    logger.info(f"  API: {settings.api_rate_limit}")
    logger.info(f"  Registration: {settings.registration_rate_limit}")
    logger.info(f"  Password Reset: {settings.password_reset_rate_limit}")
    logger.info(f"  Redis enabled: {settings.redis_enabled}")

# Export the limiter and decorators
__all__ = [
    'limiter',
    'login_rate_limit',
    'api_rate_limit',
    'registration_rate_limit',
    'password_reset_rate_limit',
    'security_limiter',
    'configure_app_rate_limiting',
    'get_client_ip'
]