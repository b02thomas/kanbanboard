#!/usr/bin/env python3
"""
Test script for input validation security.
Tests XSS prevention, SQL injection prevention, and data validation.
"""

import requests
import json
import base64
from typing import Dict, Any

BASE_URL = "http://localhost:3001"


def get_auth_token() -> str:
    """Get authentication token for testing."""
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "benedikt.thomas", "password": "smb2025_beni!"},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()["access_token"]
    except Exception as e:
        print(f"Failed to get auth token: {e}")
    return None


def test_xss_prevention():
    """Test XSS prevention in input fields."""
    print("🛡️  Testing XSS Prevention...")
    
    token = get_auth_token()
    if not token:
        print("  ❌ Cannot get auth token")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # XSS test payloads
    xss_payloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        '\';alert("XSS");\'',
        '<body onload=alert("XSS")>',
        '<div onclick="alert(\'XSS\')">Click me</div>',
        '<script>document.location="http://evil.com"</script>'
    ]
    
    passed = 0
    total = len(xss_payloads)
    
    for payload in xss_payloads:
        try:
            # Test in task creation
            response = requests.post(
                f"{BASE_URL}/api/tasks",
                json={
                    "title": payload,
                    "description": f"Description with {payload}",
                    "priority": "P2",
                    "tags": [payload],
                    "project": f"Project {payload}"
                },
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [400, 422]:
                print(f"  ✅ XSS blocked: {payload[:50]}...")
                passed += 1
            elif response.status_code == 201:
                # Check if payload was sanitized
                task = response.json()
                if payload not in task.get("title", "") and payload not in task.get("description", ""):
                    print(f"  ✅ XSS sanitized: {payload[:50]}...")
                    passed += 1
                else:
                    print(f"  ❌ XSS not prevented: {payload[:50]}...")
            else:
                print(f"  ⚠️  Unexpected response ({response.status_code}): {payload[:50]}...")
        
        except Exception as e:
            print(f"  ❌ Error testing XSS: {e}")
    
    print(f"  📊 XSS Prevention: {passed}/{total} tests passed")
    return passed > total * 0.8  # 80% pass rate


def test_sql_injection_prevention():
    """Test SQL injection prevention."""
    print("\n🗄️  Testing SQL Injection Prevention...")
    
    token = get_auth_token()
    if not token:
        print("  ❌ Cannot get auth token")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # SQL injection test payloads
    sql_payloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "1' OR 1=1#",
        "admin' OR 1=1/*",
        "1'; DELETE FROM tasks; --",
        "1' AND (SELECT COUNT(*) FROM users) > 0 --",
        "'; EXEC xp_cmdshell('dir'); --"
    ]
    
    passed = 0
    total = len(sql_payloads)
    
    for payload in sql_payloads:
        try:
            # Test in login
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "username": payload,
                    "password": "password"
                },
                timeout=10
            )
            
            if response.status_code in [400, 401, 422]:
                print(f"  ✅ SQL Injection blocked: {payload[:50]}...")
                passed += 1
            else:
                print(f"  ❌ SQL Injection not prevented: {payload[:50]}...")
        
        except Exception as e:
            print(f"  ❌ Error testing SQL injection: {e}")
    
    print(f"  📊 SQL Injection Prevention: {passed}/{total} tests passed")
    return passed > total * 0.8


def test_input_length_validation():
    """Test input length validation."""
    print("\n📏 Testing Input Length Validation...")
    
    token = get_auth_token()
    if not token:
        print("  ❌ Cannot get auth token")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test long inputs
    long_title = "A" * 300  # Over 200 char limit
    long_description = "B" * 2500  # Over 2000 char limit
    too_many_tags = ["tag"] * 15  # Over 10 tag limit
    
    test_cases = [
        {
            "name": "Long title",
            "data": {"title": long_title, "description": "Short desc"},
            "should_fail": True
        },
        {
            "name": "Long description", 
            "data": {"title": "Short title", "description": long_description},
            "should_fail": True
        },
        {
            "name": "Too many tags",
            "data": {"title": "Short title", "tags": too_many_tags},
            "should_fail": True
        },
        {
            "name": "Valid input",
            "data": {"title": "Valid title", "description": "Valid description", "tags": ["tag1", "tag2"]},
            "should_fail": False
        }
    ]
    
    passed = 0
    total = len(test_cases)
    
    for test_case in test_cases:
        try:
            response = requests.post(
                f"{BASE_URL}/api/tasks",
                json=test_case["data"],
                headers=headers,
                timeout=10
            )
            
            if test_case["should_fail"]:
                if response.status_code in [400, 422]:
                    print(f"  ✅ {test_case['name']}: Correctly rejected")
                    passed += 1
                else:
                    print(f"  ❌ {test_case['name']}: Should have been rejected")
            else:
                if response.status_code == 201:
                    print(f"  ✅ {test_case['name']}: Correctly accepted")
                    passed += 1
                else:
                    print(f"  ❌ {test_case['name']}: Should have been accepted")
        
        except Exception as e:
            print(f"  ❌ Error testing {test_case['name']}: {e}")
    
    print(f"  📊 Length Validation: {passed}/{total} tests passed")
    return passed == total


def test_data_type_validation():
    """Test data type validation."""
    print("\n🔢 Testing Data Type Validation...")
    
    token = get_auth_token()
    if not token:
        print("  ❌ Cannot get auth token")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test invalid data types
    invalid_data_tests = [
        {
            "name": "Invalid priority",
            "data": {"title": "Test", "priority": "INVALID"},
            "should_fail": True
        },
        {
            "name": "Invalid status",
            "data": {"title": "Test", "status": "invalid_status"},
            "should_fail": True
        },
        {
            "name": "Invalid due status",
            "data": {"title": "Test", "dueStatus": "invalid_due"},
            "should_fail": True
        },
        {
            "name": "Invalid tags type",
            "data": {"title": "Test", "tags": "not_an_array"},
            "should_fail": True
        },
        {
            "name": "Valid data",
            "data": {"title": "Test", "priority": "P1", "dueStatus": "today"},
            "should_fail": False
        }
    ]
    
    passed = 0
    total = len(invalid_data_tests)
    
    for test_case in invalid_data_tests:
        try:
            response = requests.post(
                f"{BASE_URL}/api/tasks",
                json=test_case["data"],
                headers=headers,
                timeout=10
            )
            
            if test_case["should_fail"]:
                if response.status_code in [400, 422]:
                    print(f"  ✅ {test_case['name']}: Correctly rejected")
                    passed += 1
                else:
                    print(f"  ❌ {test_case['name']}: Should have been rejected")
            else:
                if response.status_code == 201:
                    print(f"  ✅ {test_case['name']}: Correctly accepted")
                    passed += 1
                else:
                    print(f"  ❌ {test_case['name']}: Should have been accepted")
        
        except Exception as e:
            print(f"  ❌ Error testing {test_case['name']}: {e}")
    
    print(f"  📊 Data Type Validation: {passed}/{total} tests passed")
    return passed == total


def test_request_size_limits():
    """Test request size limits."""
    print("\n📦 Testing Request Size Limits...")
    
    token = get_auth_token()
    if not token:
        print("  ❌ Cannot get auth token")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Create a large payload (over 10MB)
        large_payload = {
            "title": "Test",
            "description": "A" * (11 * 1024 * 1024)  # 11MB description
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tasks",
            json=large_payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 413:  # Request Entity Too Large
            print("  ✅ Large request correctly rejected")
            return True
        else:
            print(f"  ❌ Large request not rejected (status: {response.status_code})")
            return False
    
    except Exception as e:
        print(f"  ❌ Error testing request size: {e}")
        return False


def test_email_validation():
    """Test email validation in registration."""
    print("\n📧 Testing Email Validation...")
    
    invalid_emails = [
        "invalid-email",
        "@domain.com",
        "user@",
        "user@domain",
        "user.domain.com",
        "user@domain..com",
        "user@.domain.com",
        "user@domain.c",
        "user@domain.com.",
        "user space@domain.com"
    ]
    
    passed = 0
    total = len(invalid_emails)
    
    for email in invalid_emails:
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "username": "testuser",
                    "email": email,
                    "password": "SecurePass123!",
                    "full_name": "Test User"
                },
                timeout=10
            )
            
            if response.status_code in [400, 422]:
                print(f"  ✅ Invalid email rejected: {email}")
                passed += 1
            else:
                print(f"  ❌ Invalid email accepted: {email}")
        
        except Exception as e:
            print(f"  ❌ Error testing email {email}: {e}")
    
    print(f"  📊 Email Validation: {passed}/{total} tests passed")
    return passed > total * 0.8


def main():
    """Run all input validation tests."""
    print("🧪 Input Validation Security Test Suite")
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
        test_xss_prevention,
        test_sql_injection_prevention,
        test_input_length_validation,
        test_data_type_validation,
        test_request_size_limits,
        test_email_validation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
    
    print(f"\n🎉 Input Validation Tests: {passed}/{total} passed")
    
    if passed == total:
        print("✅ All input validation tests passed!")
        print("🔒 Your application is well protected against common input attacks!")
    else:
        print("⚠️  Some tests failed. Review input validation configuration.")


if __name__ == "__main__":
    main()