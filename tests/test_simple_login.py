#!/usr/bin/env python3
"""
Simple test for login functionality 
"""
import requests
import json

def test_login():
    url = 'http://localhost:8000/api/auth/login'
    
    # Test data
    login_data = {
        'username': 'benedikt.thomas',
        'password': 'smb2025_beni!'
    }
    
    print("Testing login with:", login_data)
    
    try:
        response = requests.post(
            url,
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            data = response.json()
            print(f"User: {data.get('user', {}).get('username', 'N/A')}")
        else:
            print("❌ Login failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_login()