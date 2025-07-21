#!/usr/bin/env python3
"""
Script to create three admin users via the API
Usage: python3 create_admin_users.py
"""

import requests
import json

def create_admin_users():
    base_url = 'http://localhost:3001/api'
    super_admin_key = 'smb-super-admin-key-2025'
    
    admins = [
        {
            'username': 'benedikt.thomas',
            'email': 'benedikt.thomas@smb-ai-solution.com',
            'full_name': 'Benedikt Thomas',
            'password': 'smb2025_beni!',
            'avatar': '👨‍💼',
            'super_admin_key': super_admin_key
        },
        {
            'username': 'moritz.lange',
            'email': 'moritz.lange@smb-ai-solution.com',
            'full_name': 'Moritz Lange',
            'password': 'smb2025_moritz!',
            'avatar': '👨‍💼',
            'super_admin_key': super_admin_key
        },
        {
            'username': 'simon.lange',
            'email': 'simon.lange@smb-ai-solution.com',
            'full_name': 'Simon Lange',
            'password': 'smb2025_simon!',
            'avatar': '👨‍💼',
            'super_admin_key': super_admin_key
        }
    ]
    
    print("Creating admin users...")
    print("=" * 50)
    
    for admin in admins:
        try:
            response = requests.post(
                f'{base_url}/auth/admin/create-admin',
                json=admin,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                user_data = response.json()
                print(f'✅ Admin {admin["username"]} created successfully')
                print(f'   Email: {user_data["email"]}')
                print(f'   Full Name: {user_data["full_name"]}')
                print(f'   Role: {user_data["role"]}')
                print()
            else:
                print(f'❌ Failed to create admin {admin["username"]}: {response.status_code}')
                print(f'   Error: {response.text}')
                print()
                
        except requests.exceptions.ConnectionError:
            print(f'❌ Cannot connect to server. Please start the server first:')
            print(f'   cd /home/benedikt.thomas/projekte/kanbanboard/backend')
            print(f'   uvicorn server:app --reload')
            break
        except Exception as e:
            print(f'❌ Error creating admin {admin["username"]}: {str(e)}')
            print()

if __name__ == "__main__":
    create_admin_users()