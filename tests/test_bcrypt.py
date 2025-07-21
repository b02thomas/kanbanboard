#!/usr/bin/env python3
"""
Test bcrypt password verification directly
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()

async def test_password():
    """Test password verification"""
    try:
        # Database connection
        client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
        db = client[os.getenv("DATABASE_NAME", "kanbanboard")]
        
        # Get user from database
        user = await db.users.find_one({"username": "benedikt.thomas"})
        if not user:
            print("❌ User not found")
            return
            
        print(f"✅ User found: {user['username']}")
        print(f"  Email: {user['email']}")
        print(f"  Role: {user['role']}")
        
        # Password context
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # Test password
        test_password = "smb2025_beni!"
        stored_hash = user["password_hash"]
        
        print(f"  Testing password: {test_password}")
        print(f"  Stored hash: {stored_hash[:50]}...")
        
        # Verify password
        is_valid = pwd_context.verify(test_password, stored_hash)
        print(f"  Password valid: {is_valid}")
        
        if is_valid:
            print("✅ Password verification successful")
        else:
            print("❌ Password verification failed")
            
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_password())