#!/usr/bin/env python3
"""
Input validation and sanitization middleware for the Kanban Board application.
Provides comprehensive input validation, sanitization, and request size limiting.
"""

import json
import logging
from typing import Any, Dict, Optional
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import ValidationError
import re

from simple_validation_schemas import sanitize_string, ValidationConfig

logger = logging.getLogger(__name__)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to limit request size and prevent DoS attacks.
    """
    
    def __init__(self, app, max_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_size = max_size
    
    async def dispatch(self, request: Request, call_next):
        """Check request size before processing."""
        
        # Get content length
        content_length = request.headers.get('content-length')
        if content_length:
            try:
                content_length = int(content_length)
                if content_length > self.max_size:
                    logger.warning(f"Request size too large: {content_length} bytes from {request.client.host}")
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"error": "Request entity too large", "max_size": self.max_size}
                    )
            except ValueError:
                pass
        
        return await call_next(request)


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to sanitize all incoming request data.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.dangerous_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'vbscript:',
            r'onload\s*=',
            r'onerror\s*=',
            r'onclick\s*=',
            r'onmouseover\s*=',
            r'<iframe[^>]*>',
            r'<object[^>]*>',
            r'<embed[^>]*>',
            r'eval\s*\(',
            r'setTimeout\s*\(',
            r'setInterval\s*\(',
        ]
    
    async def dispatch(self, request: Request, call_next):
        """Sanitize request data before processing."""
        
        # Only process POST, PUT, PATCH requests with JSON content
        if request.method in ['POST', 'PUT', 'PATCH']:
            content_type = request.headers.get('content-type', '')
            
            if 'application/json' in content_type:
                try:
                    # Read the request body
                    body = await request.body()
                    if body:
                        # Parse JSON
                        try:
                            data = json.loads(body.decode('utf-8'))
                            # Sanitize the data
                            sanitized_data = self._sanitize_recursive(data)
                            # Replace the request body
                            request._body = json.dumps(sanitized_data).encode('utf-8')
                        except json.JSONDecodeError:
                            logger.warning(f"Invalid JSON in request from {request.client.host}")
                            return JSONResponse(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                content={"error": "Invalid JSON format"}
                            )
                except Exception as e:
                    logger.error(f"Error sanitizing request: {e}")
        
        return await call_next(request)
    
    def _sanitize_recursive(self, obj: Any) -> Any:
        """Recursively sanitize data structures."""
        if isinstance(obj, dict):
            return {key: self._sanitize_recursive(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._sanitize_recursive(item) for item in obj]
        elif isinstance(obj, str):
            return self._sanitize_string(obj)
        else:
            return obj
    
    def _sanitize_string(self, value: str) -> str:
        """Sanitize a string value."""
        if not value:
            return value
        
        # Use the sanitize_string function from validation_schemas
        sanitized = sanitize_string(value)
        
        # Additional checks for dangerous patterns
        for pattern in self.dangerous_patterns:
            if re.search(pattern, sanitized, re.IGNORECASE):
                logger.warning(f"Dangerous pattern detected and removed: {pattern}")
                sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        return sanitized


class ValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware for advanced request validation.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.validation_rules = {
            # Path-specific validation rules
            '/api/auth/login': self._validate_login,
            '/api/auth/register': self._validate_registration,
            '/api/tasks': self._validate_task_data,
            '/api/projects': self._validate_project_data,
            '/api/chat/messages': self._validate_chat_message,
        }
    
    async def dispatch(self, request: Request, call_next):
        """Validate request based on path and method."""
        
        # Only validate specific paths and methods
        if request.method in ['POST', 'PUT', 'PATCH']:
            path = request.url.path
            
            # Check if we have validation rules for this path
            validator = self.validation_rules.get(path)
            if validator:
                try:
                    # Read request body
                    body = await request.body()
                    if body:
                        try:
                            data = json.loads(body.decode('utf-8'))
                            # Validate the data
                            validation_result = validator(data)
                            if not validation_result.get('valid', True):
                                return JSONResponse(
                                    status_code=status.HTTP_400_BAD_REQUEST,
                                    content={
                                        "error": "Validation failed",
                                        "details": validation_result.get('errors', [])
                                    }
                                )
                        except json.JSONDecodeError:
                            pass  # Already handled by sanitization middleware
                except Exception as e:
                    logger.error(f"Validation error: {e}")
        
        return await call_next(request)
    
    def _validate_login(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate login data."""
        errors = []
        
        username = data.get('username', '')
        password = data.get('password', '')
        
        if not username or len(username) < ValidationConfig.MIN_USERNAME_LENGTH:
            errors.append(f"Username must be at least {ValidationConfig.MIN_USERNAME_LENGTH} characters")
        
        if len(username) > ValidationConfig.MAX_USERNAME_LENGTH:
            errors.append(f"Username must be at most {ValidationConfig.MAX_USERNAME_LENGTH} characters")
        
        if not password or len(password) < ValidationConfig.MIN_PASSWORD_LENGTH:
            errors.append(f"Password must be at least {ValidationConfig.MIN_PASSWORD_LENGTH} characters")
        
        # Check for suspicious patterns
        if re.search(r'[<>"\']', username):
            errors.append("Username contains invalid characters")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def _validate_registration(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate registration data."""
        errors = []
        
        username = data.get('username', '')
        email = data.get('email', '')
        password = data.get('password', '')
        full_name = data.get('full_name', '')
        
        # Username validation
        if not username or len(username) < ValidationConfig.MIN_USERNAME_LENGTH:
            errors.append(f"Username must be at least {ValidationConfig.MIN_USERNAME_LENGTH} characters")
        
        if not re.match(ValidationConfig.USERNAME_PATTERN, username):
            errors.append("Username can only contain letters, numbers, dots, underscores, and hyphens")
        
        # Email validation
        if not email or not re.match(ValidationConfig.EMAIL_PATTERN, email):
            errors.append("Invalid email format")
        
        # Password validation
        if not password or len(password) < ValidationConfig.MIN_PASSWORD_LENGTH:
            errors.append(f"Password must be at least {ValidationConfig.MIN_PASSWORD_LENGTH} characters")
        
        # Full name validation
        if not full_name or len(full_name.strip()) == 0:
            errors.append("Full name is required")
        
        if len(full_name) > ValidationConfig.MAX_NAME_LENGTH:
            errors.append(f"Full name must be at most {ValidationConfig.MAX_NAME_LENGTH} characters")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def _validate_task_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate task data."""
        errors = []
        
        title = data.get('title', '')
        description = data.get('description', '')
        tags = data.get('tags', [])
        
        # Title validation
        if not title or len(title.strip()) == 0:
            errors.append("Title is required")
        
        if len(title) > ValidationConfig.MAX_TITLE_LENGTH:
            errors.append(f"Title must be at most {ValidationConfig.MAX_TITLE_LENGTH} characters")
        
        # Description validation
        if description and len(description) > ValidationConfig.MAX_DESCRIPTION_LENGTH:
            errors.append(f"Description must be at most {ValidationConfig.MAX_DESCRIPTION_LENGTH} characters")
        
        # Tags validation
        if tags and len(tags) > ValidationConfig.MAX_TAGS_COUNT:
            errors.append(f"Maximum {ValidationConfig.MAX_TAGS_COUNT} tags allowed")
        
        for tag in tags:
            if len(tag) > ValidationConfig.MAX_TAG_LENGTH:
                errors.append(f"Tag '{tag}' is too long (max {ValidationConfig.MAX_TAG_LENGTH} characters)")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def _validate_project_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate project data."""
        errors = []
        
        name = data.get('name', '')
        description = data.get('description', '')
        color = data.get('color', '')
        
        # Name validation
        if not name or len(name.strip()) == 0:
            errors.append("Name is required")
        
        if len(name) > ValidationConfig.MAX_NAME_LENGTH:
            errors.append(f"Name must be at most {ValidationConfig.MAX_NAME_LENGTH} characters")
        
        # Description validation
        if description and len(description) > ValidationConfig.MAX_DESCRIPTION_LENGTH:
            errors.append(f"Description must be at most {ValidationConfig.MAX_DESCRIPTION_LENGTH} characters")
        
        # Color validation
        if color and not re.match(ValidationConfig.COLOR_PATTERN, color):
            errors.append("Invalid color format")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def _validate_chat_message(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate chat message data."""
        errors = []
        
        message = data.get('message', '')
        
        # Message validation
        if not message or len(message.strip()) == 0:
            errors.append("Message is required")
        
        if len(message) > ValidationConfig.MAX_MESSAGE_LENGTH:
            errors.append(f"Message must be at most {ValidationConfig.MAX_MESSAGE_LENGTH} characters")
        
        return {'valid': len(errors) == 0, 'errors': errors}


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle validation errors gracefully.
    """
    
    async def dispatch(self, request: Request, call_next):
        """Handle validation errors."""
        try:
            response = await call_next(request)
            return response
        except ValidationError as e:
            logger.warning(f"Validation error from {request.client.host}: {e}")
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "error": "Validation failed",
                    "details": e.errors()
                }
            )
        except ValueError as e:
            logger.warning(f"Value error from {request.client.host}: {e}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "Invalid input",
                    "message": str(e)
                }
            )
        except Exception as e:
            logger.error(f"Unexpected error from {request.client.host}: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "Internal server error",
                    "message": "An unexpected error occurred"
                }
            )


def configure_input_validation(app):
    """Configure input validation middleware."""
    
    # Add middleware in reverse order (last added is executed first)
    app.add_middleware(ErrorHandlingMiddleware)
    app.add_middleware(ValidationMiddleware)
    app.add_middleware(InputSanitizationMiddleware)
    app.add_middleware(RequestSizeLimitMiddleware, max_size=10*1024*1024)  # 10MB limit
    
    logger.info("Input validation middleware configured successfully")


# Export middleware classes and configuration function
__all__ = [
    'RequestSizeLimitMiddleware',
    'InputSanitizationMiddleware',
    'ValidationMiddleware',
    'ErrorHandlingMiddleware',
    'configure_input_validation'
]