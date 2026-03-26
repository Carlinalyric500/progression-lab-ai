# Security Deployment Guide

## Pre-Deployment Security Checklist

### 🔐 Environment Variables

Before deploying to production, ensure the following environment variables are set securely in your deployment platform (Vercel, etc.):

```
# Required for both main app and admin dashboard
AUTH_SECRET=<generated_with_openssl_rand_base64_32>
DATABASE_URL=<production_database_url>

# Admin dashboard only
ADMIN_AUTH_SECRET=<generated_with_openssl_rand_base64_32>

# Main app only
OPENAI_API_KEY=<your_openai_api_key>

# Optional: Sentry for error tracking
SENTRY_ORG=<your_org>
SENTRY_PROJECT=<your_project>
SENTRY_AUTH_TOKEN=<your_token>
```

**⚠️ NEVER commit actual environment variables to git. Use platform-specific secret management.**

### Generating Secrets

```bash
# Generate AUTH_SECRET and ADMIN_AUTH_SECRET
openssl rand -base64 32
```

### 🌐 Network Security

- [ ] Enforce HTTPS/TLS everywhere (minimum TLS 1.2)
- [ ] Enable HSTS headers (set max-age appropriately for your domain)
- [ ] Configure DNS with appropriate security records (SPF, DKIM, DMARC if sending email)
- [ ] Restrict database access to application servers only (no public internet)

### 🔒 Authentication & Sessions

- [ ] Verify `NODE_ENV=production` is set
- [ ] Confirm session cookie `secure` flag is enabled (automatic in production)
- [ ] Set `sameSite` to `Lax` or `Strict` (default is `Lax`)
- [ ] Session expiry times are appropriate:
  - Main app: 7 days
  - Admin dashboard: 8 hours
- [ ] Rate limiting is active (5 auth attempts per 15 minutes per IP)

### 🛡️ Security Headers

The following headers are automatically set by middleware:

- `X-Frame-Options: SAMEORIGIN` (main app) / `DENY` (admin)
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (production only)
- `Content-Security-Policy` (customizable)
- `Permissions-Policy` (restricts browser APIs)

**Note:** CSP may need adjustment based on your resource loading patterns.

### 🔍 Dependency Security

Run these checks regularly:

```bash
# Check for known vulnerabilities
yarn audit

# Fix vulnerabilities
yarn audit --fix

# For more detailed scanning
npm install -g snyk
snyk test
snyk monitor --all-projects
```

**Recommended:** Add CI/CD step to fail on critical/high severity vulnerabilities.

### 📝 Logging & Monitoring

- [ ] Implement structured logging (avoid console.error in production)
- [ ] Mask sensitive data in logs (passwords, tokens, API keys)
- [ ] Set up alerts for:
  - Multiple failed authentication attempts from same IP
  - Unusual deletion patterns (admin dashboard)
  - API errors and 5xx responses
  - Slow database queries

### 🗄️ Database Security

- [ ] Database credentials stored securely (not in code)
- [ ] Database user has minimal required permissions
- [ ] Backups are encrypted and stored securely
- [ ] Backups are tested regularly for recoverability
- [ ] Database connections use SSL/TLS

### 👤 Admin Access

- [ ] Admin credentials are complex and unique
- [ ] Admin password reset mechanism is secure
- [ ] Admin activities are logged
- [ ] Only ADMIN role can delete data (not AUDITOR)
- [ ] Admin dashboard requires separate HTTPS connection in production

### 🔄 Update & Patch Management

- [ ] Set up automated dependency updates (Dependabot, Renovate)
- [ ] Test updates in staging before production
- [ ] Have rollback plan for critical deployments
- [ ] Monitor security advisories for dependencies

### 🚨 Incident Response

- [ ] Document incident response procedures
- [ ] Have a process for revoking compromised credentials
- [ ] Know how to temporarily disable admin accounts
- [ ] Have backup/restore procedures documented and tested

### 📊 Regular Audits

- [ ] Run security audits quarterly
- [ ] Perform penetration testing annually
- [ ] Review access logs regularly
- [ ] Audit admin dashboard usage
- [ ] Check for exposed secrets in git history

## Security Hotspots to Watch

### 1. Rate Limiting
Currently implemented at 5 attempts per 15 minutes per IP. For multi-region deployments, consider moving to Redis-based rate limiting.

### 2. CSRF Protection
POST/PUT/DELETE operations require CSRF tokens. Ensure frontend always sends tokens in `x-csrf-token` header.

### 3. Input Validation
- Email must match RFC 5322 simplified pattern
- Password length bounds: 6-512 characters
- Email length: max 254 characters
- Prevents DOS via excessively long inputs

### 4. Error Messages
- Auth endpoints return generic "Invalid email or password" messages
- Never differentiate between "user not found" and "wrong password"
- This prevents account enumeration attacks

### 5. Session Tokens
- Custom JWT-like format with HMAC-SHA256
- Includes expiry validation
- Uses timing-safe comparison to prevent timing attacks

## Deployment-Specific Notes

### Vercel Deployment

1. Add environment variables in Project Settings → Environment Variables
2. Enable "Automatically expose System Environment Variables"
3. Configure domain with HTTPS
4. Set up edge middleware for security headers
5. Enable "Preferred Region" if multi-region concerns exist

### Self-Hosted Deployment

1. Use reverse proxy (nginx, Cloudflare) for:
   - HTTPS termination
   - Rate limiting at proxy level
   - Security header injection
2. Run Next.js with `NODE_ENV=production`
3. Use process manager (PM2, systemd) for auto-restart
4. Implement log rotation
5. Regular security updates for OS and runtime

## After Deployment

1. ✅ Test login with rate limiting (`curl` 6+ times in quick succession)
2. ✅ Verify CSRF protection (`DELETE` without token should 403)
3. ✅ Confirm session cookies are `httpOnly` and `secure`
4. ✅ Test admin delete permissions (AUDITOR should 403, ADMIN should 204)
5. ✅ Verify security headers with online tools (securityheaders.com)

## Ongoing Security Practices

- Review failed auth attempt logs weekly
- Run `yarn audit` monthly
- Check for exposed secrets in git regularly
- Update this guide as new vulnerabilities are discovered
- Conduct security training for team members
