#!/usr/bin/env python3
"""
Test login functionality with admin accounts
"""

import requests
import json

def test_login():
    base_url = 'https://task.smb-ai-solution.com/api'
    
    # Test accounts from ADMIN_SETUP.md
    test_accounts = [
        {
            'username': 'benedikt.thomas',
            'password': 'smb2025_beni!',
            'name': 'Benedikt Thomas'
        },
        {
            'username': 'moritz.lange',
            'password': 'smb2025_moritz!',
            'name': 'Moritz Lange'
        },
        {
            'username': 'simon.lange',
            'password': 'smb2025_simon!',
            'name': 'Simon Lange'
        }
    ]
    
    print("Testing Admin Login Accounts...")
    print("=" * 50)
    
    for account in test_accounts:
        try:
            login_data = {
                'username': account['username'],
                'password': account['password']
            }
            
            response = requests.post(
                f'{base_url}/auth/login',
                json=login_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                user_data = response.json()
                print(f'✅ Login successful: {account["name"]}')
                print(f'   Username: {user_data["user"]["username"]}')
                print(f'   Email: {user_data["user"]["email"]}')
                print(f'   Role: {user_data["user"]["role"]}')
                print(f'   Token: {user_data["access_token"][:50]}...')
                print()
            else:
                print(f'❌ Login failed: {account["name"]}')
                print(f'   Status: {response.status_code}')
                print(f'   Error: {response.text}')
                print()
                
        except Exception as e:
            print(f'❌ Connection error for {account["name"]}: {str(e)}')
            print()

if __name__ == "__main__":
    test_login()