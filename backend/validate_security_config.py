#!/usr/bin/env python3
"""
Validate security configuration without running server.
"""

from settings import settings
from security_middleware import SecurityHeadersMiddleware
import re

def validate_cors_config():
    """Validate CORS configuration."""
    print("🔒 Validating CORS Configuration...")
    
    # Check origins
    origins = settings.allowed_origins
    if not origins or origins == [""]:
        print("  ❌ No allowed origins configured")
        return False
    
    valid_origins = 0
    for origin in origins:
        if origin.startswith(('http://', 'https://')):
            valid_origins += 1
            print(f"  ✅ Valid origin: {origin}")
        else:
            print(f"  ❌ Invalid origin format: {origin}")
    
    # Check methods
    methods = settings.allowed_methods
    required_methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    missing_methods = [m for m in required_methods if m not in methods]
    
    if missing_methods:
        print(f"  ⚠️  Missing methods: {missing_methods}")
    else:
        print(f"  ✅ All required methods configured: {methods}")
    
    # Check headers
    headers = settings.allowed_headers
    required_headers = ['Authorization', 'Content-Type']
    missing_headers = [h for h in required_headers if h not in headers]
    
    if missing_headers:
        print(f"  ❌ Missing required headers: {missing_headers}")
    else:
        print(f"  ✅ Required headers configured: {headers}")
    
    return valid_origins > 0 and not missing_headers

def validate_security_headers():
    """Validate security headers configuration."""
    print("\n🛡️  Validating Security Headers...")
    
    # Create middleware instance to test headers
    middleware = SecurityHeadersMiddleware(None)
    headers = middleware.security_headers
    
    required_headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'",
    }
    
    valid_headers = 0
    for header, expected in required_headers.items():
        actual = headers.get(header)
        if actual and expected in actual:
            valid_headers += 1
            print(f"  ✅ {header}: Configured correctly")
        else:
            print(f"  ❌ {header}: Not configured or incorrect")
    
    # Check HSTS for production
    if not settings.debug:
        if 'Strict-Transport-Security' in headers:
            print("  ✅ HSTS: Enabled for production")
        else:
            print("  ❌ HSTS: Not enabled for production")
    else:
        print("  ℹ️  HSTS: Disabled in debug mode")
    
    return valid_headers == len(required_headers)

def validate_settings():
    """Validate overall settings."""
    print("\n⚙️  Validating Settings...")
    
    issues = []
    
    # Check secret key
    fallback_keys = ["fallback-development-key-change-in-production", "smb-kanban-super-secret-key-2025-production-change-me"]
    if settings.secret_key in fallback_keys:
        issues.append("Secret key is using fallback value")
    elif len(settings.secret_key) < 32:
        issues.append("Secret key is too short")
    else:
        print("  ✅ Secret key: Properly configured")
    
    # Check token expiration
    if settings.access_token_expire_minutes > 60:
        issues.append(f"Token expiration too long: {settings.access_token_expire_minutes} minutes")
    else:
        print(f"  ✅ Token expiration: {settings.access_token_expire_minutes} minutes")
    
    # Check debug mode
    if settings.debug:
        issues.append("Debug mode is enabled (should be false in production)")
    else:
        print("  ✅ Debug mode: Disabled")
    
    # Check admin keys
    default_admin_keys = ["smb-2025-super-admin", "smb-2025-super-admin-key-secure"]
    if settings.super_admin_key in default_admin_keys:
        issues.append("Super admin key is using default value")
    else:
        print("  ✅ Super admin key: Customized")
    
    if issues:
        print("  ⚠️  Issues found:")
        for issue in issues:
            print(f"    - {issue}")
        return False
    
    return True

def main():
    """Run all validation tests."""
    print("🔍 Security Configuration Validation")
    print("=" * 50)
    
    tests = [
        validate_cors_config,
        validate_security_headers,
        validate_settings
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Validation failed with error: {e}")
    
    print(f"\n🎉 Validation Results: {passed}/{total} passed")
    
    if passed == total:
        print("✅ All security validations passed!")
        print("🚀 Configuration is ready for production!")
    else:
        print("⚠️  Some validations failed. Review configuration before deployment.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)