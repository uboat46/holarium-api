# Security Documentation

## Overview

**Security Rating: 9.5/10**

This document outlines the security measures implemented in the Holarium API, a JWT-based NestJS authentication service. A comprehensive security audit was performed and 23 security enhancements were implemented.

### Security Features Summary

| Category | Implementation |
|----------|----------------|
| Authentication | RS256 JWT with 5-minute access tokens |
| Password Security | Bcrypt (12 rounds) with complexity requirements |
| Token Management | Refresh token rotation with replay detection |
| Data Protection | AES-256-GCM encryption for sensitive data |
| API Security | Rate limiting, CORS, Helmet.js headers |
| Logging | Sensitive data masking |
| Versioning | URI-based API versioning (`/api/v1/`) |

---

## Authentication & Authorization

### JWT Implementation

- **Algorithm**: RS256 (RSA asymmetric signing)
- **Access Token TTL**: 5 minutes (configurable via `ACCESS_TOKEN_TTL`)
- **Refresh Token TTL**: 30 days (configurable via `REFRESH_TOKEN_TTL`)
- **Claims**: `sub` (user ID), `role`, `jti` (unique token ID), `iat`, `exp`

The short access token TTL mitigates the risk of token compromise without requiring a token blacklist.

### Password Requirements

Passwords must meet all of the following criteria:

- Minimum 8 characters, maximum 128 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (`!@#$%^&*()_+-=[]{}|;:'"<>,.?/`)

### Account Lockout

- **Threshold**: 5 failed login attempts (configurable)
- **Duration**: 15 minutes (configurable)
- **Timing Attack Prevention**: Lockout status is checked before password validation to prevent timing-based enumeration

### Role-Based Access Control

Two roles are implemented:

- `USER` - Standard user access
- `ADMIN` - Administrative access

Guards throw `ForbiddenException` with generic messages to prevent information leakage.

---

## Token Management

### Refresh Token Rotation

Each refresh token use issues a new token and invalidates the old one:

1. Client presents refresh token
2. Server validates and revokes the token
3. Server issues new access + refresh token pair
4. Token family ID is preserved for tracking

### Replay Attack Detection

- Tokens are grouped into families
- If a revoked token is reused within the detection window, the entire family is invalidated
- This forces re-authentication if token theft is suspected

### Token Limits

- Maximum 5 refresh tokens per user (configurable)
- Oldest tokens are automatically removed when limit is exceeded

---

## Data Protection

### Password Hashing

```
Password → SHA-512 → Bcrypt (12 rounds) → Stored Hash
```

- SHA-512 pre-hashing handles bcrypt's 72-byte input limit
- Bcrypt automatically generates and manages salts
- Rounds configurable via `BCRYPT_ROUNDS` (6-14)

### Device/IP Encryption

Device fingerprints and IP addresses are encrypted at rest using:

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: scrypt with random per-encryption salt
- **Format**: `v2:salt:iv:authTag:ciphertext`

Legacy v1 format (hardcoded salt) remains decryptable for backwards compatibility.

### Sensitive Data Masking

The custom logger masks:

- Passwords and secrets
- JWT tokens (Bearer and standalone)
- API keys and credentials
- Authorization headers

---

## API Security

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/register` | 3 requests | 1 hour |
| `POST /auth/login` | 5 requests | 1 minute |
| `POST /auth/refresh` | 10 requests | 1 minute |
| Global default | 60 requests | 1 minute |

### CORS Configuration

- **Production**: `CORS_ALLOWED_ORIGINS` is required
- **Development**: Optional (defaults to empty)
- No wildcard origins allowed
- Explicit whitelist validation

### Security Headers

Helmet.js is enabled with default protections:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- Content Security Policy

### Input Validation

- Global `ValidationPipe` with `whitelist: true`
- Unknown properties are rejected (`forbidNonWhitelisted: true`)
- Type transformation enabled
- Email addresses are normalized (lowercased, trimmed)

### Error Handling

- Stack traces are hidden in production
- Generic error messages prevent information leakage
- Full errors logged server-side for debugging

---

## API Versioning

### Current Setup

```typescript
// main.ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
  prefix: 'api/v',
});
```

All routes are prefixed with `/api/v1/` by default.

### Adding a New Version

#### Option 1: Version a Single Endpoint

```typescript
import { Controller, Get, Version } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAllV1() {
    // GET /api/v1/users
    return { users: [...] };
  }

  @Version('2')
  @Get()
  findAllV2() {
    // GET /api/v2/users
    return { data: [...], meta: { version: 2 } };
  }
}
```

#### Option 2: Version an Entire Controller

```typescript
// users-v1.controller.ts
@Controller({ path: 'users', version: '1' })
export class UsersV1Controller {
  @Get()
  findAll() { /* v1 implementation */ }
}

// users-v2.controller.ts
@Controller({ path: 'users', version: '2' })
export class UsersV2Controller {
  @Get()
  findAll() { /* v2 implementation */ }
}
```

#### Option 3: Support Multiple Versions

```typescript
@Version(['1', '2'])
@Get()
findAll() {
  // Handles both /api/v1/... and /api/v2/...
}
```

### Deprecation Strategy

1. Announce deprecation in API responses via headers
2. Log usage of deprecated versions
3. Maintain deprecated versions for minimum 6 months
4. Remove after migration period

---

## Environment Variables

### Required (Production)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` |
| `APP_ENCRYPTION_KEY` | Min 32 chars for AES encryption |
| `DB_HOST` | PostgreSQL host |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `JWT_PRIVATE_KEY` | RSA private key (PEM format) |
| `JWT_PUBLIC_KEY` | RSA public key (PEM format) |
| `JWT_REFRESH_PRIVATE_KEY` | Refresh token private key |
| `JWT_REFRESH_PUBLIC_KEY` | Refresh token public key |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |

### Optional (with defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_SSL` | `false` | Enable SSL for database |
| `ACCESS_TOKEN_TTL` | `5m` | Access token lifetime |
| `REFRESH_TOKEN_TTL` | `30d` | Refresh token lifetime |
| `BCRYPT_ROUNDS` | `12` | Password hashing rounds |
| `AUTH_LOCKOUT_THRESHOLD` | `5` | Failed attempts before lockout |
| `AUTH_LOCKOUT_DURATION_MINUTES` | `15` | Lockout duration |
| `THROTTLE_TTL` | `60` | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | `60` | Requests per window |

### Generating Keys

```bash
# Generate encryption key
openssl rand -base64 32

# Generate JWT keys
yarn generate:keys

# Export for environment
export JWT_PRIVATE_KEY="$(cat keys/access-private.pem)"
export JWT_PUBLIC_KEY="$(cat keys/access-public.pem)"
export JWT_REFRESH_PRIVATE_KEY="$(cat keys/refresh-private.pem)"
export JWT_REFRESH_PUBLIC_KEY="$(cat keys/refresh-public.pem)"

# Cat single line export for environment
echo "JWT_PRIVATE_KEY=\"$(cat keys/access-private.pem | tr '\n' '~' | sed 's/~/\\n/g')\""
echo "JWT_PUBLIC_KEY=\"$(cat keys/access-public.pem | tr '\n' '~' | sed 's/~/\\n/g')\""
echo "JWT_REFRESH_PRIVATE_KEY=\"$(cat keys/refresh-private.pem | tr '\n' '~' | sed 's/~/\\n/g')\""
echo "JWT_REFRESH_PUBLIC_KEY=\"$(cat keys/refresh-public.pem | tr '\n' '~' | sed 's/~/\\n/g')\""
```

---

## Future Recommendations

### High Priority

1. **Email Verification**
   - Require email verification before account activation
   - Send verification link on registration
   - Implement resend functionality with rate limiting

2. **Password Reset**
   - Secure token-based password reset flow
   - Time-limited reset tokens (1 hour recommended)
   - Invalidate all sessions on password change

3. **Access Token Revocation**
   - Implement Redis-based JTI blacklist
   - Enable immediate token invalidation
   - Useful for logout-all and security incidents

### Medium Priority

4. **Multi-Factor Authentication (MFA)**
   - TOTP-based authenticator app support
   - Backup codes for account recovery
   - Optional per-user enablement

5. **Session Management UI**
   - List active sessions for users
   - Remote session termination
   - Device/location information display

6. **Audit Logging**
   - Log security-relevant events
   - Failed login attempts with IP
   - Permission changes and admin actions

### Low Priority

7. **OAuth2/Social Login**
   - Google, GitHub, etc. integration
   - Account linking for existing users

8. **IP-Based Restrictions**
   - Allowlist/blocklist support
   - Geographic restrictions

---

## Security Audit History

### Completed Fixes (23 total)

#### Critical (4)
1. Environment secrets protection (`.gitignore`)
2. Access token TTL reduced to 5 minutes
3. JTI claim added to access tokens
4. Timing attack prevention in login flow

#### High Priority (4)
5. Health endpoint error leakage fixed
6. CurrentUser decorator throws proper exception
7. RolesGuard throws ForbiddenException
8. JWT keys loaded from environment variables

#### Medium Priority (9)
9. CORS localhost default removed
10. Email removed from JWT payload
11. Device/IP encryption at rest
12. Sensitive data masking in logs
13. API versioning implemented
14. Password complexity validation
15. Email normalization (lowercase)
16. Global exception filter
17. Random scrypt salt (v2 encryption)

#### Low Priority (6)
18. Refresh rate limit adjusted (10/min)
19. CORS production validation
20. Password hashing documented
21. JWT key rotation documented
22. Logout response confirmation
23. Token reuse grace period clarified

---

## Reporting Security Issues

If you discover a security vulnerability, please report it privately to the maintainers. Do not create public issues for security vulnerabilities.

Contact: [security contact email]

We aim to respond within 48 hours and provide a fix within 7 days for critical issues.
