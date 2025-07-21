#!/usr/bin/env python3
"""
Test script for rate limiting functionality.
"""

import asyncio
import time
import requests
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "http://localhost:3001"

def test_login_rate_limit():
    """Test login rate limiting."""
    print("🔐 Testing Login Rate Limiting...")
    
    login_data = {
        "username": "nonexistent_user",
        "password": "wrong_password"
    }
    
    success_count = 0
    rate_limited_count = 0
    
    # Try to make 10 login attempts quickly
    for i in range(10):
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json=login_data,
                timeout=5
            )
            
            if response.status_code == 401:
                success_count += 1
                print(f"  Attempt {i+1}: Failed login (expected) - {response.status_code}")
            elif response.status_code == 429:
                rate_limited_count += 1
                print(f"  Attempt {i+1}: Rate limited! - {response.status_code}")
                break
            else:
                print(f"  Attempt {i+1}: Unexpected response - {response.status_code}")
        
        except requests.exceptions.RequestException as e:
            print(f"  Attempt {i+1}: Request failed - {e}")
        
        time.sleep(0.1)  # Small delay between requests
    
    print(f"  ✅ Successful attempts: {success_count}")
    print(f"  🚫 Rate limited attempts: {rate_limited_count}")
    
    if rate_limited_count > 0:
        print("  ✅ Login rate limiting is working!")
    else:
        print("  ❌ Login rate limiting might not be working properly")

def test_api_rate_limit():
    """Test API rate limiting with authenticated requests."""
    print("\n📡 Testing API Rate Limiting...")
    
    # First, get a valid token
    try:
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "benedikt.thomas", "password": "smb2025_beni\u0021"},
            timeout=10
        )
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            print("  ✅ Got authentication token")
            
            # Test API rate limiting
            success_count = 0
            rate_limited_count = 0
            
            for i in range(20):
                try:
                    response = requests.get(
                        f"{BASE_URL}/api/tasks",
                        headers=headers,
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        success_count += 1
                        if i < 5:  # Only print first few
                            print(f"  Request {i+1}: Success - {response.status_code}")
                    elif response.status_code == 429:
                        rate_limited_count += 1
                        print(f"  Request {i+1}: Rate limited! - {response.status_code}")
                    else:
                        print(f"  Request {i+1}: Unexpected response - {response.status_code}")
                
                except requests.exceptions.RequestException as e:
                    print(f"  Request {i+1}: Request failed - {e}")
                
                time.sleep(0.01)  # Very small delay
            
            print(f"  ✅ Successful requests: {success_count}")
            print(f"  🚫 Rate limited requests: {rate_limited_count}")
            
        else:
            print("  ❌ Could not get authentication token")
            
    except Exception as e:
        print(f"  ❌ Error testing API rate limiting: {e}")

def test_concurrent_requests():
    """Test rate limiting with concurrent requests."""
    print("\n🚀 Testing Concurrent Request Rate Limiting...")
    
    def make_request(attempt_num):
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"username": "test_user", "password": "wrong_password"},
                timeout=5
            )
            return attempt_num, response.status_code
        except Exception as e:
            return attempt_num, f"Error: {e}"
    
    # Make 15 concurrent requests
    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = [executor.submit(make_request, i) for i in range(15)]
        
        success_count = 0
        rate_limited_count = 0
        
        for future in as_completed(futures):
            attempt_num, status = future.result()
            
            if status == 401:
                success_count += 1
            elif status == 429:
                rate_limited_count += 1
                print(f"  Concurrent request {attempt_num}: Rate limited!")
            else:
                print(f"  Concurrent request {attempt_num}: Status {status}")
    
    print(f"  ✅ Successful concurrent requests: {success_count}")
    print(f"  🚫 Rate limited concurrent requests: {rate_limited_count}")

def main():
    """Run all rate limiting tests."""
    print("🧪 Rate Limiting Test Suite")
    print("=" * 50)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print(f"❌ Server returned status {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        print("Please make sure the backend server is running on port 3001")
        return
    
    # Run tests
    test_login_rate_limit()
    test_api_rate_limit()
    test_concurrent_requests()
    
    print("\n🎉 Rate limiting tests completed!")

if __name__ == "__main__":
    main()