from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security setup
SECRET_KEY = "smb-startup-secret-key-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="SMB Startup Kanban Board")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Predefined users for the startup - YOU CAN ADD MORE USERS HERE
USERS = {
    "admin": {
        "id": "admin",
        "username": "admin",
        "email": "admin@smb.startup",
        "full_name": "Admin User",
        "hashed_password": pwd_context.hash("admin123"),
        "avatar": "👨‍💼",
        "role": "admin"
    },
    "developer": {
        "id": "developer", 
        "username": "developer",
        "email": "dev@smb.startup",
        "full_name": "Lead Developer",
        "hashed_password": pwd_context.hash("dev123"),
        "avatar": "👨‍💻",
        "role": "developer"
    },
    "designer": {
        "id": "designer",
        "username": "designer", 
        "email": "design@smb.startup",
        "full_name": "UI/UX Designer",
        "hashed_password": pwd_context.hash("design123"),
        "avatar": "👩‍🎨",
        "role": "designer"
    },
    "manager": {
        "id": "manager",
        "username": "manager",
        "email": "manager@smb.startup", 
        "full_name": "Project Manager",
        "hashed_password": pwd_context.hash("manager123"),
        "avatar": "👩‍💼",
        "role": "manager"
    },
    "sales": {
        "id": "sales",
        "username": "sales",
        "email": "sales@smb.startup",
        "full_name": "Sales Lead",
        "hashed_password": pwd_context.hash("sales123"),
        "avatar": "👨‍💰",
        "role": "sales"
    }
    # TO ADD MORE USERS:
    # "username": {
    #     "id": "username",
    #     "username": "username",
    #     "email": "email@smb.startup",
    #     "full_name": "Full Name",
    #     "hashed_password": pwd_context.hash("password123"),
    #     "avatar": "👤",  # Choose emoji
    #     "role": "role"
    # }
}

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

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

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
    project: Optional[str] = None
    project_color: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[str] = None
    deadline: Optional[datetime] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(username: str, password: str):
    user = USERS.get(username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
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
    except jwt.PyJWTError:
        raise credentials_exception
    user = USERS.get(username)
    if user is None:
        raise credentials_exception
    return User(**user)

# Auth Routes
@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = authenticate_user(user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**user)
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/auth/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    return [User(**user) for user in USERS.values()]

# Project Routes
@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user: User = Depends(get_current_user)):
    projects = await db.projects.find({"user_id": current_user.id}).to_list(1000)
    return [Project(**project) for project in projects]

@api_router.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate, current_user: User = Depends(get_current_user)):
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
async def create_task(task: TaskCreate, current_user: User = Depends(get_current_user)):
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()