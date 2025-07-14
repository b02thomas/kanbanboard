#!/usr/bin/env python3
import requests
import json

def test_backend_api():
    base_url = "https://21906602-ee50-488a-8763-9a51cc01291a.preview.emergentagent.com/api"
    
    print("🚀 Quick Backend API Test for Viva Startup Kanban")
    print("=" * 50)
    
    # Test 1: Login with admin
    print("\n1. Testing Admin Login...")
    try:
        response = requests.post(f"{base_url}/auth/login", 
                               json={"username": "admin", "password": "admin123"},
                               timeout=10)
        if response.status_code == 200:
            data = response.json()
            token = data['access_token']
            user = data['user']
            print(f"✅ Login successful: {user['full_name']} ({user['role']})")
            print(f"   Avatar: {user['avatar']}")
        else:
            print(f"❌ Login failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    # Test 2: Get current user
    print("\n2. Testing Get Current User...")
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{base_url}/auth/me", headers=headers, timeout=10)
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ Current user: {user_data['full_name']} ({user_data['role']})")
        else:
            print(f"❌ Get user failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Get user error: {e}")
    
    # Test 3: Get all users
    print("\n3. Testing Get All Users...")
    try:
        response = requests.get(f"{base_url}/auth/users", headers=headers, timeout=10)
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Found {len(users)} users:")
            for u in users:
                print(f"   - {u['avatar']} {u['full_name']} ({u['role']})")
        else:
            print(f"❌ Get users failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Get users error: {e}")
    
    # Test 4: Get tasks (should be empty initially)
    print("\n4. Testing Get Tasks...")
    try:
        response = requests.get(f"{base_url}/tasks", headers=headers, timeout=10)
        if response.status_code == 200:
            tasks = response.json()
            print(f"✅ Found {len(tasks)} tasks")
        else:
            print(f"❌ Get tasks failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Get tasks error: {e}")
    
    # Test 5: Create a task
    print("\n5. Testing Create Task...")
    try:
        task_data = {
            "title": "Test Task",
            "description": "Testing task creation",
            "priority": "P2",
            "project": "Test Project",
            "project_color": "blue",
            "category": "Development",
            "assigned_to": "admin"
        }
        response = requests.post(f"{base_url}/tasks", json=task_data, headers=headers, timeout=10)
        if response.status_code == 200:
            task = response.json()
            print(f"✅ Task created: {task['title']} (ID: {task['id']})")
            print(f"   Status: {task['status']}, Priority: {task['priority']}")
            task_id = task['id']
        else:
            print(f"❌ Create task failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Create task error: {e}")
        return False
    
    # Test 6: Update task status (drag & drop simulation)
    print("\n6. Testing Update Task Status...")
    try:
        update_data = {"status": "inprogress"}
        response = requests.put(f"{base_url}/tasks/{task_id}", json=update_data, headers=headers, timeout=10)
        if response.status_code == 200:
            updated_task = response.json()
            print(f"✅ Task status updated to: {updated_task['status']}")
        else:
            print(f"❌ Update task failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Update task error: {e}")
    
    # Test 7: Test other demo accounts
    print("\n7. Testing Other Demo Accounts...")
    demo_accounts = [
        ("developer", "dev123"),
        ("designer", "design123")
    ]
    
    for username, password in demo_accounts:
        try:
            response = requests.post(f"{base_url}/auth/login", 
                                   json={"username": username, "password": password},
                                   timeout=10)
            if response.status_code == 200:
                user_data = response.json()['user']
                print(f"✅ {username} login: {user_data['avatar']} {user_data['full_name']}")
            else:
                print(f"❌ {username} login failed: {response.status_code}")
        except Exception as e:
            print(f"❌ {username} login error: {e}")
    
    # Test 8: Test unauthorized access
    print("\n8. Testing Unauthorized Access...")
    try:
        response = requests.get(f"{base_url}/tasks", timeout=10)  # No auth header
        if response.status_code == 401:
            print("✅ Unauthorized access properly blocked")
        else:
            print(f"❌ Unauthorized access not blocked: {response.status_code}")
    except Exception as e:
        print(f"❌ Unauthorized test error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Backend API test completed!")
    return True

if __name__ == "__main__":
    test_backend_api()