#!/usr/bin/env python3
"""
Test minimal server login
"""
import requests

def test_login():
    url = 'http://localhost:8001/login'
    
    login_data = {
        'username': 'benedikt.thomas',
        'password': 'smb2025_beni!'
    }
    
    print("Testing minimal server login...")
    
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
            print("✅ Minimal server login successful!")
        else:
            print("❌ Minimal server login failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_login()