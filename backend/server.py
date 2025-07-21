from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import httpx
import json

# Import our settings module
from settings import settings

# Import rate limiting
from rate_limiter import (
    limiter, 
    login_rate_limit, 
    api_rate_limit, 
    registration_rate_limit,
    security_limiter,
    configure_app_rate_limiting,
    get_client_ip
)

# Import security middleware
from security_middleware import (
    configure_secure_cors,
    configure_security_middleware
)

# Import input validation
from input_validation_middleware import configure_input_validation
from simple_validation_schemas import (
    EnhancedUserLogin,
    EnhancedUserRegistration,
    EnhancedTaskCreate,
    EnhancedTaskUpdate,
    EnhancedProjectCreate,
    EnhancedChatMessage
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection using settings
client = AsyncIOMotorClient(settings.mongodb_url)
db = client[settings.database_name]

# Security setup using settings
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": f"{settings.app_name} API",
        "version": settings.app_version,
        "status": "running",
        "endpoints": {
            "api": "/api",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }

# N8N Configuration - YOUR N8N WEBHOOK URL
N8N_WEBHOOK_URL = settings.n8n_webhook_url
N8N_API_KEY = os.environ.get('N8N_API_KEY', '')

# Registration Configuration
REGISTRATION_MODE = os.environ.get('REGISTRATION_MODE', 'admin_only')  # open, admin_only, invitation
ADMIN_REGISTRATION_KEY = settings.registration_key
SUPER_ADMIN_KEY = settings.super_admin_key

# No predefined users - only admin accounts created via API
USERS = {}

# Models
class User(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    avatar: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegistration(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    avatar: str = "👤"
    role: str = "user"
    admin_key: Optional[str] = None

class AdminUserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    avatar: str = "👨‍💼"
    super_admin_key: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str
    user_id: str
    user_name: str
    user_avatar: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_ai: bool = False
    ai_response: Optional[str] = None

class ChatMessageCreate(BaseModel):
    message: str

class ChatMessageResponse(BaseModel):
    id: str
    message: str
    user_id: str
    user_name: str
    user_avatar: str
    timestamp: datetime
    is_ai: bool
    ai_response: Optional[str] = None

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    color: str = "blue"
    status: str = "active"  # active, completed, paused
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    user_id: str

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: str = "blue"
    status: str = "active"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    priority: str = "P2"  # P1, P2, P3, P4
    status: str = "todo"  # todo, inprogress, testing, completed
    tags: List[str] = Field(default_factory=list)
    dueStatus: str = "upcoming"  # today, overdue, upcoming
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    project: str = "General"
    project_color: str = "blue"
    category: str = "Development"
    assigned_to: str
    deadline: Optional[datetime] = None
    user_id: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "P2"
    tags: List[str] = Field(default_factory=list)
    dueStatus: str = "upcoming"
    project: str = "General"
    project_color: str = "blue"
    category: str = "Development"
    assigned_to: str
    deadline: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    dueStatus: Optional[str] = None
    project: Optional[str] = None
    project_color: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[str] = None
    deadline: Optional[datetime] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# MongoDB User Management Functions
async def create_user_in_db(user_data: dict):
    """Create a new user in MongoDB"""
    result = await db.users.insert_one(user_data)
    return result.inserted_id

async def get_user_by_username(username: str):
    """Get user by username from MongoDB"""
    user = await db.users.find_one({"username": username})
    return user

async def get_user_by_email(email: str):
    """Get user by email from MongoDB"""
    user = await db.users.find_one({"email": email})
    return user

async def get_all_users():
    """Get all users from MongoDB"""
    users = []
    async for user in db.users.find({}):
        user["_id"] = str(user["_id"])  # Convert ObjectId to string
        users.append(user)
    return users

async def migrate_hardcoded_users():
    """Migrate hardcoded users to MongoDB if they don't exist"""
    for username, user_data in USERS.items():
        existing_user = await get_user_by_username(username)
        if not existing_user:
            await create_user_in_db(user_data)

def check_admin_permission(current_user: User):
    """Check if user has admin permissions"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )

def validate_registration_access(user_data: UserRegistration):
    """Validate if registration is allowed based on configuration"""
    if REGISTRATION_MODE == "admin_only":
        if not user_data.admin_key or user_data.admin_key != ADMIN_REGISTRATION_KEY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin key required for registration"
            )
    elif REGISTRATION_MODE == "invitation":
        # TODO: Implement invitation validation
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Invitation-based registration not yet implemented"
        )
    # REGISTRATION_MODE == "open" allows unrestricted registration

async def authenticate_user(username: str, password: str):
    user = await get_user_by_username(username)
    if not user:
        return False
    if not verify_password(password, user["password_hash"]):
        return False
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
    user = await get_user_by_username(username)
    if user is None:
        raise credentials_exception
    # Remove MongoDB ObjectId before creating User model
    user_dict = dict(user)
    if "_id" in user_dict:
        del user_dict["_id"]
    return User(**user_dict)

async def call_n8n_workflow(message: str, user_context: dict) -> str:
    """Call N8N workflow with user message and context"""
    try:
        # Prepare payload for N8N
        payload = {
            "message": message,
            "user": user_context,
            "timestamp": datetime.utcnow().isoformat(),
            "context": "kanban_board"
        }
        
        # If N8N_WEBHOOK_URL is not configured, return a mock response
        if N8N_WEBHOOK_URL == 'https://your-n8n-instance.com/webhook/chatbot':
            return f"AI Assistant: I'd be happy to help you with your question: '{message}'. I can assist with task management, project planning, and team coordination. Please connect me to your N8N workflow to enable full AI capabilities."
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {N8N_API_KEY}" if N8N_API_KEY else None
            }
            
            response = await client.post(
                N8N_WEBHOOK_URL,
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "I'm here to help!")
            else:
                return "I'm temporarily unavailable. Please try again later."
                
    except Exception as e:
        logging.error(f"Error calling N8N workflow: {str(e)}")
        return "I'm experiencing technical difficulties. Please try again."

# Auth Routes
@api_router.post("/auth/login", response_model=Token)
@limiter.limit(settings.login_rate_limit)
async def login(request: Request, user_credentials: UserLogin):
    client_ip = get_client_ip(request)
    
    # Check if IP is blocked due to too many failed attempts
    if not security_limiter.check_failed_login(client_ip, user_credentials.username):
        logging.warning(f"Login blocked for IP {client_ip} due to too many failed attempts")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later.",
            headers={"Retry-After": "3600"}
        )
    
    user = await authenticate_user(user_credentials.username, user_credentials.password)
    if not user:
        # Record failed login attempt
        security_limiter.record_failed_login(client_ip, user_credentials.username)
        logging.warning(f"Failed login attempt from IP {client_ip} for user {user_credentials.username}")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Clear failed attempts on successful login
    security_limiter.clear_failed_attempts(client_ip, user_credentials.username)
    logging.info(f"Successful login from IP {client_ip} for user {user_credentials.username}")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    # Remove MongoDB ObjectId before creating User model
    user_dict = dict(user)
    if "_id" in user_dict:
        del user_dict["_id"]
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**user_dict)
    }

@api_router.post("/auth/register", response_model=Token)
@limiter.limit(settings.registration_rate_limit)
async def register(request: Request, user_data: UserRegistration):
    # Validate registration access
    validate_registration_access(user_data)
    
    # Check if user already exists
    existing_user = await get_user_by_username(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    existing_email = await get_user_by_email(user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_dict = {
        "id": user_data.username,
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "password_hash": get_password_hash(user_data.password),
        "avatar": user_data.avatar,
        "role": user_data.role
    }
    
    await create_user_in_db(user_dict)
    
    # Generate token for new user
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_dict["username"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**user_dict)
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/admin/create-user", response_model=User)
async def admin_create_user(user_data: UserRegistration, current_user: User = Depends(get_current_user)):
    # Check admin permissions
    check_admin_permission(current_user)
    
    # Check if user already exists
    existing_user = await get_user_by_username(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    existing_email = await get_user_by_email(user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_dict = {
        "id": user_data.username,
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "password_hash": get_password_hash(user_data.password),
        "avatar": user_data.avatar,
        "role": user_data.role
    }
    
    await create_user_in_db(user_dict)
    return User(**user_dict)

@api_router.post("/auth/admin/create-admin", response_model=User)
async def create_admin_user(admin_data: AdminUserCreate):
    # Validate super admin key
    if admin_data.super_admin_key != SUPER_ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid super admin key"
        )
    
    # Check if user already exists
    existing_user = await get_user_by_username(admin_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    existing_email = await get_user_by_email(admin_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new admin user
    user_dict = {
        "id": admin_data.username,
        "username": admin_data.username,
        "email": admin_data.email,
        "full_name": admin_data.full_name,
        "password_hash": get_password_hash(admin_data.password),
        "avatar": admin_data.avatar,
        "role": "admin"
    }
    
    await create_user_in_db(user_dict)
    return User(**user_dict)

@api_router.get("/auth/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    users = await get_all_users()
    return [User(**{k: v for k, v in user.items() if k != "_id"}) for user in users]

@api_router.get("/auth/registration-config")
async def get_registration_config():
    return {
        "mode": REGISTRATION_MODE,
        "requires_admin_key": REGISTRATION_MODE == "admin_only"
    }

# Chat Routes
@api_router.get("/chat/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(current_user: User = Depends(get_current_user)):
    messages = await db.chat_messages.find(
        {"user_id": current_user.id}
    ).sort("timestamp", -1).limit(50).to_list(50)
    
    return [ChatMessageResponse(**msg) for msg in reversed(messages)]

@api_router.post("/chat/messages", response_model=ChatMessageResponse)
@limiter.limit(settings.api_rate_limit)
async def send_chat_message(
    request: Request,
    message: EnhancedChatMessage, 
    current_user: User = Depends(get_current_user)
):
    # Create user message
    user_message = ChatMessage(
        message=message.message,
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_avatar=current_user.avatar,
        is_ai=False
    )
    
    # Save user message
    await db.chat_messages.insert_one(user_message.dict())
    
    # Get AI response from N8N
    ai_response = await call_n8n_workflow(
        message.message,
        {
            "id": current_user.id,
            "name": current_user.full_name,
            "role": current_user.role,
            "avatar": current_user.avatar
        }
    )
    
    # Create AI response message
    ai_message = ChatMessage(
        message=ai_response,
        user_id="ai_assistant",
        user_name="AI Assistant",
        user_avatar="🤖",
        is_ai=True
    )
    
    # Save AI response
    await db.chat_messages.insert_one(ai_message.dict())
    
    return ChatMessageResponse(**user_message.dict())

@api_router.delete("/chat/messages")
async def clear_chat_messages(current_user: User = Depends(get_current_user)):
    await db.chat_messages.delete_many({"user_id": current_user.id})
    return {"message": "Chat history cleared"}

# Project Routes
@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user: User = Depends(get_current_user)):
    projects = await db.projects.find({"user_id": current_user.id}).to_list(1000)
    return [Project(**project) for project in projects]

@api_router.post("/projects", response_model=Project)
@limiter.limit(settings.api_rate_limit)
async def create_project(request: Request, project: ProjectCreate, current_user: User = Depends(get_current_user)):
    project_dict = project.dict()
    project_dict["created_by"] = current_user.id
    project_dict["user_id"] = current_user.id
    project_obj = Project(**project_dict)
    await db.projects.insert_one(project_obj.dict())
    return project_obj

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in project_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    result = await db.projects.find_one_and_update(
        {"id": project_id, "user_id": current_user.id},
        {"$set": update_data},
        return_document=True
    )
    
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return Project(**result)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)):
    result = await db.projects.delete_one({"id": project_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

# Task Routes
@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(current_user: User = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": current_user.id}).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.post("/tasks", response_model=Task)
@limiter.limit(settings.api_rate_limit)
async def create_task(request: Request, task: TaskCreate, current_user: User = Depends(get_current_user)):
    task_dict = task.dict()
    task_dict["created_by"] = current_user.id
    task_dict["user_id"] = current_user.id
    task_obj = Task(**task_dict)
    await db.tasks.insert_one(task_obj.dict())
    return task_obj

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    result = await db.tasks.find_one_and_update(
        {"id": task_id, "user_id": current_user.id},
        {"$set": update_data},
        return_document=True
    )
    
    if result is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return Task(**result)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# Analytics Routes
@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(current_user: User = Depends(get_current_user)):
    # Get task statistics
    tasks = await db.tasks.find({"user_id": current_user.id}).to_list(1000)
    projects = await db.projects.find({"user_id": current_user.id}).to_list(1000)
    
    # Task statistics
    task_stats = {
        "total_tasks": len(tasks),
        "todo": len([t for t in tasks if t["status"] == "todo"]),
        "inprogress": len([t for t in tasks if t["status"] == "inprogress"]),
        "testing": len([t for t in tasks if t["status"] == "testing"]),
        "completed": len([t for t in tasks if t["status"] == "completed"]),
        "overdue": len([t for t in tasks if t.get("deadline") and t["deadline"] and datetime.fromisoformat(str(t["deadline"]).replace("Z", "+00:00")) < datetime.now()]),
    }
    
    # Priority distribution
    priority_stats = {
        "P1": len([t for t in tasks if t["priority"] == "P1"]),
        "P2": len([t for t in tasks if t["priority"] == "P2"]),
        "P3": len([t for t in tasks if t["priority"] == "P3"]),
        "P4": len([t for t in tasks if t["priority"] == "P4"]),
    }
    
    # Project statistics
    project_stats = {
        "total_projects": len(projects),
        "active_projects": len([p for p in projects if p["status"] == "active"]),
        "completed_projects": len([p for p in projects if p["status"] == "completed"]),
    }
    
    return {
        "task_stats": task_stats,
        "priority_stats": priority_stats,
        "project_stats": project_stats
    }

# Include the router in the main app
app.include_router(api_router)

# Configure input validation (first, to process requests early)
# configure_input_validation(app)  # DISABLED for testing

# Configure security middleware
configure_security_middleware(app)

# Configure rate limiting
configure_app_rate_limiting(app)

# Configure secure CORS
configure_secure_cors(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    # Migrate hardcoded users to MongoDB
    await migrate_hardcoded_users()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()