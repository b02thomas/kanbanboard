#!/usr/bin/env python3
"""
Enhanced validation schemas for the Kanban Board application.
Provides strict input validation and sanitization.
"""

import re
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum


class ValidationConfig:
    """Configuration for validation rules."""
    
    # String length limits
    MAX_TITLE_LENGTH = 200
    MAX_DESCRIPTION_LENGTH = 2000
    MAX_NAME_LENGTH = 100
    MAX_EMAIL_LENGTH = 255
    MAX_PASSWORD_LENGTH = 128
    MIN_PASSWORD_LENGTH = 8
    MAX_USERNAME_LENGTH = 50
    MIN_USERNAME_LENGTH = 3
    MAX_MESSAGE_LENGTH = 1000
    MAX_TAG_LENGTH = 50
    MAX_TAGS_COUNT = 10
    
    # Regex patterns
    EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    USERNAME_PATTERN = r'^[a-zA-Z0-9._-]+$'
    COLOR_PATTERN = r'^#?[a-fA-F0-9]{6}$|^(red|blue|green|yellow|purple|orange|pink|gray|teal|indigo)$'
    URL_PATTERN = r'^https?://(?:[-\w.])+(?:\:[0-9]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$'
    
    # Dangerous patterns to filter
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'vbscript:',
        r'onload=',
        r'onerror=',
        r'onclick=',
        r'onmouseover=',
        r'<iframe[^>]*>',
        r'<object[^>]*>',
        r'<embed[^>]*>',
    ]
    
    SQL_INJECTION_PATTERNS = [
        r'union\s+select',
        r'drop\s+table',
        r'insert\s+into',
        r'delete\s+from',
        r'update\s+.*set',
        r'exec\s*\(',
        r'script\s*\(',
        r'--',
        r'/\*.*\*/',
    ]


class TaskStatus(str, Enum):
    """Valid task statuses."""
    TODO = "todo"
    IN_PROGRESS = "inprogress"
    TESTING = "testing"
    COMPLETED = "completed"


class TaskPriority(str, Enum):
    """Valid task priorities."""
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class TaskDueStatus(str, Enum):
    """Valid task due statuses."""
    TODAY = "today"
    OVERDUE = "overdue"
    UPCOMING = "upcoming"


class ProjectStatus(str, Enum):
    """Valid project statuses."""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class UserRole(str, Enum):
    """Valid user roles."""
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


def sanitize_string(value: str) -> str:
    """Sanitize string input to prevent XSS and injection attacks."""
    if not value:
        return value
    
    # Remove dangerous patterns
    for pattern in ValidationConfig.XSS_PATTERNS:
        value = re.sub(pattern, '', value, flags=re.IGNORECASE)
    
    for pattern in ValidationConfig.SQL_INJECTION_PATTERNS:
        value = re.sub(pattern, '', value, flags=re.IGNORECASE)
    
    # Remove null bytes and control characters
    value = value.replace('\x00', '')
    value = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', value)
    
    # Normalize whitespace
    value = re.sub(r'\s+', ' ', value).strip()
    
    return value


def validate_no_html(value: str) -> str:
    """Validate that string contains no HTML tags."""
    if re.search(r'<[^>]+>', value):
        raise ValueError("HTML tags are not allowed")
    return value


def validate_safe_filename(value: str) -> str:
    """Validate filename is safe."""
    if not value:
        return value
    
    # Check for dangerous patterns
    dangerous_patterns = [
        r'\.\./',  # Path traversal
        r'\.\.\\',  # Path traversal (Windows)
        r'^/',     # Absolute path
        r'^\\',    # Absolute path (Windows)
        r'[<>:"|?*]',  # Invalid filename characters
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, value):
            raise ValueError("Unsafe filename")
    
    return value


class EnhancedUserLogin(BaseModel):
    """Enhanced user login validation."""
    username: str = Field(..., min_length=ValidationConfig.MIN_USERNAME_LENGTH, max_length=ValidationConfig.MAX_USERNAME_LENGTH)
    password: str = Field(..., min_length=ValidationConfig.MIN_PASSWORD_LENGTH, max_length=ValidationConfig.MAX_PASSWORD_LENGTH)
    
    def model_post_init(self, __context):
        """Post-init validation."""
        self.username = sanitize_string(self.username)
        if not re.match(ValidationConfig.USERNAME_PATTERN, self.username):
            raise ValueError("Username can only contain letters, numbers, dots, underscores, and hyphens")
        
        if len(self.password) < ValidationConfig.MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {ValidationConfig.MIN_PASSWORD_LENGTH} characters")


class EnhancedUserRegistration(BaseModel):
    """Enhanced user registration validation."""
    username: str = Field(..., min_length=ValidationConfig.MIN_USERNAME_LENGTH, max_length=ValidationConfig.MAX_USERNAME_LENGTH)
    email: str = Field(..., max_length=ValidationConfig.MAX_EMAIL_LENGTH)
    password: str = Field(..., min_length=ValidationConfig.MIN_PASSWORD_LENGTH, max_length=ValidationConfig.MAX_PASSWORD_LENGTH)
    full_name: str = Field(..., min_length=1, max_length=ValidationConfig.MAX_NAME_LENGTH)
    registration_key: Optional[str] = Field(None, max_length=100)
    
    @validator('username')
    def validate_username(cls, v):
        v = sanitize_string(v)
        if not re.match(ValidationConfig.USERNAME_PATTERN, v):
            raise ValueError("Username can only contain letters, numbers, dots, underscores, and hyphens")
        return v
    
    @validator('email')
    def validate_email(cls, v):
        v = sanitize_string(v.lower())
        if not re.match(ValidationConfig.EMAIL_PATTERN, v):
            raise ValueError("Invalid email format")
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < ValidationConfig.MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {ValidationConfig.MIN_PASSWORD_LENGTH} characters")
        
        # Check for common password patterns
        if v.lower() in ['password', '123456', 'qwerty', 'admin', 'user']:
            raise ValueError("Password is too common")
        
        # Require at least one number or special character
        if not re.search(r'[0-9!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one number or special character")
        
        return v
    
    @validator('full_name')
    def validate_full_name(cls, v):
        v = sanitize_string(v)
        validate_no_html(v)
        if not re.match(r'^[a-zA-Z\s\-\'\.]+$', v):
            raise ValueError("Full name can only contain letters, spaces, hyphens, apostrophes, and dots")
        return v


class EnhancedTaskCreate(BaseModel):
    """Enhanced task creation validation."""
    title: str = Field(..., min_length=1, max_length=ValidationConfig.MAX_TITLE_LENGTH)
    description: Optional[str] = Field(None, max_length=ValidationConfig.MAX_DESCRIPTION_LENGTH)
    priority: TaskPriority = Field(default=TaskPriority.P2)
    tags: List[str] = Field(default_factory=list, max_items=ValidationConfig.MAX_TAGS_COUNT)
    dueStatus: TaskDueStatus = Field(default=TaskDueStatus.UPCOMING)
    assignee: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    project: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    project_color: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    deadline: Optional[datetime] = None
    
    @validator('title')
    def validate_title(cls, v):
        v = sanitize_string(v)
        validate_no_html(v)
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v
    
    @validator('description')
    def validate_description(cls, v):
        if v is None:
            return v
        v = sanitize_string(v)
        validate_no_html(v)
        return v
    
    @validator('tags')
    def validate_tags(cls, v):
        if not v:
            return v
        
        validated_tags = []
        for tag in v:
            tag = sanitize_string(tag)
            validate_no_html(tag)
            if len(tag) > ValidationConfig.MAX_TAG_LENGTH:
                raise ValueError(f"Tag '{tag}' is too long (max {ValidationConfig.MAX_TAG_LENGTH} characters)")
            if tag.strip():
                validated_tags.append(tag.strip())
        
        return validated_tags
    
    @validator('assignee')
    def validate_assignee(cls, v):
        if v is None:
            return v
        v = sanitize_string(v)
        validate_no_html(v)
        return v
    
    @validator('project')
    def validate_project(cls, v):
        if v is None:
            return v
        v = sanitize_string(v)
        validate_no_html(v)
        return v
    
    @validator('project_color')
    def validate_project_color(cls, v):
        if v is None:
            return v
        if not re.match(ValidationConfig.COLOR_PATTERN, v):
            raise ValueError("Invalid color format")
        return v
    
    @validator('category')
    def validate_category(cls, v):
        if v is None:
            return v
        v = sanitize_string(v)
        validate_no_html(v)
        return v


class EnhancedTaskUpdate(BaseModel):
    """Enhanced task update validation."""
    title: Optional[str] = Field(None, min_length=1, max_length=ValidationConfig.MAX_TITLE_LENGTH)
    description: Optional[str] = Field(None, max_length=ValidationConfig.MAX_DESCRIPTION_LENGTH)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    tags: Optional[List[str]] = Field(None, max_items=ValidationConfig.MAX_TAGS_COUNT)
    dueStatus: Optional[TaskDueStatus] = None
    assignee: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    project: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    project_color: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    deadline: Optional[datetime] = None
    
    # Apply same validators as TaskCreate
    _validate_title = validator('title', allow_reuse=True)(EnhancedTaskCreate.validate_title)
    _validate_description = validator('description', allow_reuse=True)(EnhancedTaskCreate.validate_description)
    _validate_tags = validator('tags', allow_reuse=True)(EnhancedTaskCreate.validate_tags)
    _validate_assignee = validator('assignee', allow_reuse=True)(EnhancedTaskCreate.validate_assignee)
    _validate_project = validator('project', allow_reuse=True)(EnhancedTaskCreate.validate_project)
    _validate_project_color = validator('project_color', allow_reuse=True)(EnhancedTaskCreate.validate_project_color)
    _validate_category = validator('category', allow_reuse=True)(EnhancedTaskCreate.validate_category)


class EnhancedProjectCreate(BaseModel):
    """Enhanced project creation validation."""
    name: str = Field(..., min_length=1, max_length=ValidationConfig.MAX_NAME_LENGTH)
    description: Optional[str] = Field(None, max_length=ValidationConfig.MAX_DESCRIPTION_LENGTH)
    color: str = Field(default="blue", max_length=20)
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE)
    
    @validator('name')
    def validate_name(cls, v):
        v = sanitize_string(v)
        validate_no_html(v)
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v
    
    @validator('description')
    def validate_description(cls, v):
        if v is None:
            return v
        v = sanitize_string(v)
        validate_no_html(v)
        return v
    
    @validator('color')
    def validate_color(cls, v):
        if not re.match(ValidationConfig.COLOR_PATTERN, v):
            raise ValueError("Invalid color format")
        return v


class EnhancedChatMessage(BaseModel):
    """Enhanced chat message validation."""
    message: str = Field(..., min_length=1, max_length=ValidationConfig.MAX_MESSAGE_LENGTH)
    
    @validator('message')
    def validate_message(cls, v):
        v = sanitize_string(v)
        validate_no_html(v)
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v


class EnhancedFileUpload(BaseModel):
    """Enhanced file upload validation."""
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., max_length=100)
    file_size: int = Field(..., gt=0, le=10*1024*1024)  # Max 10MB
    
    @validator('filename')
    def validate_filename(cls, v):
        v = sanitize_string(v)
        validate_safe_filename(v)
        
        # Check file extension
        allowed_extensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.zip']
        if not any(v.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError("File type not allowed")
        
        return v
    
    @validator('content_type')
    def validate_content_type(cls, v):
        allowed_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/zip'
        ]
        
        if v not in allowed_types:
            raise ValueError("Content type not allowed")
        
        return v


# Export all validation schemas
__all__ = [
    'ValidationConfig',
    'TaskStatus',
    'TaskPriority', 
    'TaskDueStatus',
    'ProjectStatus',
    'UserRole',
    'EnhancedUserLogin',
    'EnhancedUserRegistration',
    'EnhancedTaskCreate',
    'EnhancedTaskUpdate',
    'EnhancedProjectCreate',
    'EnhancedChatMessage',
    'EnhancedFileUpload',
    'sanitize_string',
    'validate_no_html',
    'validate_safe_filename'
]