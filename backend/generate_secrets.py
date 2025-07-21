#!/usr/bin/env python3
"""
Generate secure secrets for the Kanban Board application.
Run this script to generate new secrets for production deployment.
"""

import secrets
import string
import argparse

def generate_secret_key(length=32):
    """Generate a secure secret key."""
    return secrets.token_urlsafe(length)

def generate_admin_key(length=16):
    """Generate a secure admin key."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_password(length=12):
    """Generate a secure password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

def main():
    parser = argparse.ArgumentParser(description='Generate secure secrets for Kanban Board')
    parser.add_argument('--all', action='store_true', help='Generate all secrets')
    parser.add_argument('--secret-key', action='store_true', help='Generate SECRET_KEY')
    parser.add_argument('--admin-key', action='store_true', help='Generate admin keys')
    parser.add_argument('--password', action='store_true', help='Generate password')
    
    args = parser.parse_args()
    
    if args.all or args.secret_key:
        print("# Security Settings")
        print(f"SECRET_KEY={generate_secret_key()}")
        print()
    
    if args.all or args.admin_key:
        print("# Admin Keys")
        print(f"SUPER_ADMIN_KEY={generate_admin_key()}")
        print(f"REGISTRATION_KEY={generate_admin_key()}")
        print()
    
    if args.all or args.password:
        print("# Generated Passwords")
        print(f"ADMIN_PASSWORD={generate_password()}")
        print()
    
    if not any([args.all, args.secret_key, args.admin_key, args.password]):
        print("🔐 Kanban Board Secret Generator")
        print("=" * 40)
        print()
        print("SECRET_KEY (for JWT signing):")
        print(f"  {generate_secret_key()}")
        print()
        print("SUPER_ADMIN_KEY (for admin operations):")
        print(f"  {generate_admin_key()}")
        print()
        print("REGISTRATION_KEY (for user registration):")
        print(f"  {generate_admin_key()}")
        print()
        print("Example secure password:")
        print(f"  {generate_password()}")
        print()
        print("⚠️  Important: Store these secrets securely!")
        print("⚠️  Never commit these to version control!")
        print("⚠️  Use different keys for different environments!")

if __name__ == "__main__":
    main()