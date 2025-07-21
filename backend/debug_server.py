#!/usr/bin/env python3
"""
Debug server issues
"""
import asyncio
import sys
import traceback
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

async def test_database():
    """Test database connection and user existence"""
    try:
        mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        database_name = os.getenv("DATABASE_NAME", "kanbanboard")
        
        print(f"Testing MongoDB connection:")
        print(f"  URL: {mongodb_url}")
        print(f"  Database: {database_name}")
        
        client = AsyncIOMotorClient(mongodb_url)
        db = client[database_name]
        
        # Test connection
        await client.admin.command('ping')
        print("✅ MongoDB connection successful")
        
        # Check users collection
        users_count = await db.users.count_documents({})
        print(f"✅ Users collection: {users_count} documents")
        
        # Check for admin user
        admin_user = await db.users.find_one({"username": "benedikt.thomas"})
        if admin_user:
            print("✅ Admin user 'benedikt.thomas' found")
            print(f"  Email: {admin_user.get('email')}")
            print(f"  Role: {admin_user.get('role')}")
        else:
            print("❌ Admin user 'benedikt.thomas' not found")
            
        client.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        traceback.print_exc()

async def test_imports():
    """Test module imports"""
    try:
        print("Testing imports...")
        
        # Test settings
        from settings import settings
        print(f"✅ Settings loaded: {settings.app_name}")
        
        # Test validation schemas
        from simple_validation_schemas import EnhancedUserLogin
        print("✅ Validation schemas loaded")
        
        # Test rate limiter
        from rate_limiter import limiter
        print("✅ Rate limiter loaded")
        
        # Test security middleware
        from security_middleware import configure_secure_cors
        print("✅ Security middleware loaded")
        
        print("✅ All imports successful")
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        traceback.print_exc()

async def main():
    """Main debug function"""
    print("=" * 50)
    print("DEBUG: Kanban Board Server Issues")
    print("=" * 50)
    
    await test_imports()
    print()
    await test_database()

if __name__ == "__main__":
    asyncio.run(main())