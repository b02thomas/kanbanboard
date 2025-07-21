#!/usr/bin/env python3
"""
Check user document structure in database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import json

load_dotenv()

async def check_users():
    """Check user document structure"""
    try:
        client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
        db = client[os.getenv("DATABASE_NAME", "kanbanboard")]
        
        print("Checking user documents...")
        
        async for user in db.users.find({}):
            print(f"\nUser: {user.get('username', 'N/A')}")
            print("Fields:")
            for key, value in user.items():
                if key == "_id":
                    print(f"  {key}: {str(value)}")
                else:
                    print(f"  {key}: {value}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_users())