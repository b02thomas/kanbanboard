#!/usr/bin/env python3
"""
Security middleware for the Kanban Board application.
Implements security headers, CORS validation, and other security measures.
"""

import logging
from typing import List, Optional
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from urllib.parse import urlparse
import re

from settings import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.security_headers = {
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Enable XSS protection
            "X-XSS-Protection": "1; mode=block",
            
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Content Security Policy
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' ws: wss:; "
                "frame-ancestors 'none';"
            ),
            
            # Permissions Policy (formerly Feature Policy)
            "Permissions-Policy": (
                "camera=(), microphone=(), geolocation=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=(), "
                "speaker=(), vibrate=(), fullscreen=(self)"
            ),
            
            # Remove server information
            "Server": f"{settings.app_name} API",
        }
        
        # Add HSTS header for HTTPS
        if not settings.debug:
            self.security_headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
    
    async def dispatch(self, request: Request, call_next):
        """Add security headers to response."""
        response = await call_next(request)
        
        # Add security headers
        for header, value in self.security_headers.items():
            response.headers[header] = value
        
        # Add rate limiting headers if available
        if hasattr(request.state, 'rate_limit_remaining'):
            response.headers["X-Rate-Limit-Remaining"] = str(request.state.rate_limit_remaining)
        
        if hasattr(request.state, 'rate_limit_reset'):
            response.headers["X-Rate-Limit-Reset"] = str(request.state.rate_limit_reset)
        
        return response


class OriginValidationMiddleware(BaseHTTPMiddleware):
    """
    Advanced origin validation middleware.
    Validates origins more strictly than basic CORS.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.allowed_origins = set(settings.allowed_origins)
        self.allowed_origin_patterns = self._compile_origin_patterns()
    
    def _compile_origin_patterns(self) -> List[re.Pattern]:
        """Compile regex patterns for dynamic origin validation."""
        patterns = []
        
        # Allow localhost with any port for development
        if settings.debug:
            patterns.append(re.compile(r'^https?://localhost:\d+$'))
            patterns.append(re.compile(r'^https?://127\.0\.0\.1:\d+$'))
        
        return patterns
    
    def _is_origin_allowed(self, origin: str) -> bool:
        """Check if origin is allowed."""
        if not origin:
            return False
        
        # Check exact matches
        if origin in self.allowed_origins:
            return True
        
        # Check pattern matches
        for pattern in self.allowed_origin_patterns:
            if pattern.match(origin):
                return True
        
        return False
    
    async def dispatch(self, request: Request, call_next):
        """Validate origin for requests."""
        origin = request.headers.get("origin")
        
        # Skip origin validation for non-browser requests
        if not origin:
            return await call_next(request)
        
        # For CORS preflight requests
        if request.method == "OPTIONS":
            if not self._is_origin_allowed(origin):
                logger.warning(f"Blocked CORS preflight from unauthorized origin: {origin}")
                return Response(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content="Origin not allowed",
                    headers={"Access-Control-Allow-Origin": "null"}
                )
        
        # For actual requests
        elif origin and not self._is_origin_allowed(origin):
            logger.warning(f"Blocked request from unauthorized origin: {origin}")
            return Response(
                status_code=status.HTTP_403_FORBIDDEN,
                content="Origin not allowed"
            )
        
        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log requests for security monitoring.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.sensitive_paths = {'/api/auth/login', '/api/auth/register'}
    
    async def dispatch(self, request: Request, call_next):
        """Log request details."""
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Log sensitive endpoints
        if request.url.path in self.sensitive_paths:
            logger.info(
                f"Security endpoint accessed: {request.method} {request.url.path} "
                f"from {client_ip} with UA: {user_agent}"
            )
        
        response = await call_next(request)
        
        # Log failed authentication attempts
        if request.url.path in self.sensitive_paths and response.status_code == 401:
            logger.warning(
                f"Authentication failed: {request.method} {request.url.path} "
                f"from {client_ip} - Status: {response.status_code}"
            )
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        # Check for forwarded headers first
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"


def configure_secure_cors(app):
    """Configure secure CORS middleware."""
    
    # Clean up origins (remove empty strings and whitespace)
    allowed_origins = [origin.strip() for origin in settings.allowed_origins if origin.strip()]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=settings.allowed_methods,
        allow_headers=settings.allowed_headers,
        expose_headers=settings.expose_headers,
        max_age=settings.cors_max_age,
    )
    
    logger.info(f"CORS configured with origins: {allowed_origins}")


def configure_security_middleware(app):
    """Configure all security middleware."""
    
    # Add security headers
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Add origin validation (only in production)
    if not settings.debug:
        app.add_middleware(OriginValidationMiddleware)
    
    # Add request logging
    app.add_middleware(RequestLoggingMiddleware)
    
    logger.info("Security middleware configured successfully")


# Export functions
__all__ = [
    'SecurityHeadersMiddleware',
    'OriginValidationMiddleware',
    'RequestLoggingMiddleware',
    'configure_secure_cors',
    'configure_security_middleware'
]