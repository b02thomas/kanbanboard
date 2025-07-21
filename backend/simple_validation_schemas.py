#!/usr/bin/env python3
"""
Simplified validation schemas for Pydantic v2 compatibility.
"""

import re
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class ValidationConfig:
    """Configuration for validation rules."""
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
    
    EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    USERNAME_PATTERN = r'^[a-zA-Z0-9._-]+$'


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "inprogress"
    TESTING = "testing"
    COMPLETED = "completed"


class TaskPriority(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class TaskDueStatus(str, Enum):
    TODAY = "today"
    OVERDUE = "overdue"
    UPCOMING = "upcoming"


class ProjectStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


def sanitize_string(value: str) -> str:
    """Basic string sanitization."""
    if not value:
        return value
    
    # Remove dangerous patterns
    dangerous_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'vbscript:',
        r'onload\s*=',
        r'onerror\s*=',
        r'onclick\s*=',
    ]
    
    for pattern in dangerous_patterns:
        value = re.sub(pattern, '', value, flags=re.IGNORECASE)
    
    # Remove null bytes and control characters
    value = value.replace('\x00', '')
    value = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', value)
    
    # Normalize whitespace
    value = re.sub(r'\s+', ' ', value).strip()
    
    return value


class EnhancedUserLogin(BaseModel):
    """Enhanced user login validation."""
    username: str = Field(..., min_length=ValidationConfig.MIN_USERNAME_LENGTH, max_length=ValidationConfig.MAX_USERNAME_LENGTH)
    password: str = Field(..., min_length=ValidationConfig.MIN_PASSWORD_LENGTH, max_length=ValidationConfig.MAX_PASSWORD_LENGTH)


class EnhancedUserRegistration(BaseModel):
    """Enhanced user registration validation."""
    username: str = Field(..., min_length=ValidationConfig.MIN_USERNAME_LENGTH, max_length=ValidationConfig.MAX_USERNAME_LENGTH)
    email: str = Field(..., max_length=ValidationConfig.MAX_EMAIL_LENGTH)
    password: str = Field(..., min_length=ValidationConfig.MIN_PASSWORD_LENGTH, max_length=ValidationConfig.MAX_PASSWORD_LENGTH)
    full_name: str = Field(..., min_length=1, max_length=ValidationConfig.MAX_NAME_LENGTH)
    registration_key: Optional[str] = Field(None, max_length=100)


class EnhancedTaskCreate(BaseModel):
    """Enhanced task creation validation."""
    title: str = Field(..., min_length=1, max_length=ValidationConfig.MAX_TITLE_LENGTH)
    description: Optional[str] = Field(None, max_length=ValidationConfig.MAX_DESCRIPTION_LENGTH)
    priority: TaskPriority = Field(default=TaskPriority.P2)
    tags: List[str] = Field(default_factory=list, max_length=ValidationConfig.MAX_TAGS_COUNT)
    dueStatus: TaskDueStatus = Field(default=TaskDueStatus.UPCOMING)
    assignee: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    project: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    project_color: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    deadline: Optional[datetime] = None


class EnhancedTaskUpdate(BaseModel):
    """Enhanced task update validation."""
    title: Optional[str] = Field(None, min_length=1, max_length=ValidationConfig.MAX_TITLE_LENGTH)
    description: Optional[str] = Field(None, max_length=ValidationConfig.MAX_DESCRIPTION_LENGTH)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    tags: Optional[List[str]] = Field(None, max_length=ValidationConfig.MAX_TAGS_COUNT)
    dueStatus: Optional[TaskDueStatus] = None
    assignee: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    project: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    project_color: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=ValidationConfig.MAX_NAME_LENGTH)
    deadline: Optional[datetime] = None


class EnhancedProjectCreate(BaseModel):
    """Enhanced project creation validation."""
    name: str = Field(..., min_length=1, max_length=ValidationConfig.MAX_NAME_LENGTH)
    description: Optional[str] = Field(None, max_length=ValidationConfig.MAX_DESCRIPTION_LENGTH)
    color: str = Field(default="blue", max_length=20)
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE)


class EnhancedChatMessage(BaseModel):
    """Enhanced chat message validation."""
    message: str = Field(..., min_length=1, max_length=ValidationConfig.MAX_MESSAGE_LENGTH)


# Export all validation schemas
__all__ = [
    'ValidationConfig',
    'TaskStatus',
    'TaskPriority', 
    'TaskDueStatus',
    'ProjectStatus',
    'EnhancedUserLogin',
    'EnhancedUserRegistration',
    'EnhancedTaskCreate',
    'EnhancedTaskUpdate',
    'EnhancedProjectCreate',
    'EnhancedChatMessage',
    'sanitize_string'
]