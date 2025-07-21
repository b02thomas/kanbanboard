#!/usr/bin/env python3
"""
Test script for CORS security configuration.
Tests origin validation, security headers, and CORS behavior.
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:3001"


def test_cors_headers():
    """Test CORS headers configuration."""
    print("🔒 Testing CORS Headers Configuration...")
    
    # Test preflight request
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,Authorization"
    }
    
    try:
        response = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers=headers,
            timeout=10
        )
        
        print(f"  Preflight Status: {response.status_code}")
        
        # Check CORS headers
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
            "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials"),
            "Access-Control-Max-Age": response.headers.get("Access-Control-Max-Age"),
        }
        
        for header, value in cors_headers.items():
            if value:
                print(f"  ✅ {header}: {value}")
            else:
                print(f"  ❌ {header}: Not set")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"  ❌ Error testing CORS headers: {e}")
        return False


def test_security_headers():
    """Test security headers presence."""
    print("\n🛡️  Testing Security Headers...")
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'",
            "Permissions-Policy": "camera=()",
        }
        
        for header, expected in security_headers.items():
            actual = response.headers.get(header)
            if actual:
                if expected in actual:
                    print(f"  ✅ {header}: {actual}")
                else:
                    print(f"  ⚠️  {header}: {actual} (expected to contain: {expected})")
            else:
                print(f"  ❌ {header}: Not set")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error testing security headers: {e}")
        return False


def test_origin_validation():
    """Test origin validation."""
    print("\n🌐 Testing Origin Validation...")
    
    test_origins = [
        ("http://localhost:3000", True, "Allowed localhost"),
        ("https://task.smb-ai-solution.com", True, "Allowed production domain"),
        ("http://malicious-site.com", False, "Blocked malicious origin"),
        ("https://evil.example.com", False, "Blocked evil domain"),
        ("http://localhost:8080", True, "Allowed localhost different port (dev only)"),
    ]
    
    for origin, should_allow, description in test_origins:
        try:
            # Test preflight request
            response = requests.options(
                f"{BASE_URL}/api/auth/login",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type"
                },
                timeout=5
            )
            
            allowed = response.status_code == 200
            status = "✅ Allowed" if allowed else "🚫 Blocked"
            
            if allowed == should_allow:
                print(f"  ✅ {origin}: {status} - {description}")
            else:
                print(f"  ❌ {origin}: {status} - {description} (UNEXPECTED)")
                
        except Exception as e:
            print(f"  ❌ {origin}: Error - {e}")


def test_cors_credentials():
    """Test CORS credentials handling."""
    print("\n🔑 Testing CORS Credentials...")
    
    try:
        # Test request with credentials
        response = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization,Content-Type"
            },
            timeout=10
        )
        
        credentials_allowed = response.headers.get("Access-Control-Allow-Credentials")
        if credentials_allowed == "true":
            print("  ✅ Credentials: Allowed")
        else:
            print("  ❌ Credentials: Not properly configured")
            
        return credentials_allowed == "true"
        
    except Exception as e:
        print(f"  ❌ Error testing credentials: {e}")
        return False


def test_method_restrictions():
    """Test HTTP method restrictions."""
    print("\n📝 Testing HTTP Method Restrictions...")
    
    allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    blocked_methods = ["PATCH", "HEAD", "TRACE"]
    
    for method in allowed_methods:
        try:
            response = requests.options(
                f"{BASE_URL}/api/tasks",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": method
                },
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"  ✅ {method}: Allowed")
            else:
                print(f"  ❌ {method}: Blocked (unexpected)")
                
        except Exception as e:
            print(f"  ❌ {method}: Error - {e}")
    
    for method in blocked_methods:
        try:
            response = requests.options(
                f"{BASE_URL}/api/tasks",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": method
                },
                timeout=5
            )
            
            # Check if method is in allowed methods response
            allowed = response.headers.get("Access-Control-Allow-Methods", "")
            if method.upper() not in allowed.upper():
                print(f"  ✅ {method}: Properly blocked")
            else:
                print(f"  ⚠️  {method}: Unexpectedly allowed")
                
        except Exception as e:
            print(f"  ❌ {method}: Error - {e}")


def test_header_restrictions():
    """Test HTTP header restrictions."""
    print("\n📋 Testing Header Restrictions...")
    
    allowed_headers = ["Authorization", "Content-Type", "X-Requested-With"]
    blocked_headers = ["X-Custom-Header", "X-Admin-Token"]
    
    for header in allowed_headers:
        try:
            response = requests.options(
                f"{BASE_URL}/api/tasks",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": header
                },
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"  ✅ {header}: Allowed")
            else:
                print(f"  ❌ {header}: Blocked (unexpected)")
                
        except Exception as e:
            print(f"  ❌ {header}: Error - {e}")


def main():
    """Run all CORS security tests."""
    print("🧪 CORS Security Test Suite")
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
    tests = [
        test_cors_headers,
        test_security_headers,
        test_origin_validation,
        test_cors_credentials,
        test_method_restrictions,
        test_header_restrictions
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
    
    print(f"\n🎉 CORS Security Tests: {passed}/{total} passed")
    
    if passed == total:
        print("✅ All CORS security tests passed!")
    else:
        print("⚠️  Some tests failed. Review configuration.")


if __name__ == "__main__":
    main()