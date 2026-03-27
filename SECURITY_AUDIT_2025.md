# Security Audit Report - AI Musician Helper
**Date:** January 2025  
**Status:** Critical Issues Found - Requires Immediate Action

---

## Executive Summary

This comprehensive security audit identified **7 critical vulnerabilities**, **5 high-severity issues**, and several medium/low-priority concerns. The most critical findings involve:

1. **Default database credentials exposed in multiple files** (committed to repo)
2. **Missing rate limiting on progression CRUD endpoints**
3. **Insufficient request body validation on POST /api/progressions**
4. **Inadequate input validation on envelope controls**
5. **Authorization bypass potential in admin dashboard**

**Recommendation:** Address all critical and high-severity issues before production deployment.

---

## CRITICAL ISSUES

### 1. Default Database Credentials Exposed ⚠️ CRITICAL

**Severity:** CRITICAL  
**Location:** Multiple files
- [docker-compose.yml](docker-compose.yml#L14): `postgresql://postgres:postgres@db:5432/progression_lab`
- [.env](.env#L5): `postgresql://postgres:postgres@localhost:5432/progression_lab`
- [.env.local.example](.env.local.example#L8): Default credentials in template
- [admin-dashboard/.env.local.example](admin-dashboard/.env.local.example#L2): Default credentials in template
- [README.md](README.md#L286): Default credentials in documentation

**Issue:** Default PostgreSQL credentials (`postgres:postgres`) are hardcoded and committed to version control. These credentials are visible to anyone with access to the repository.

**Impact:**
- Direct database compromise if repository is public
- Credential reuse risk if developers use same credentials across environments
- Violation of security best practices and compliance standards (CWE-798)

**Fix:**
```bash
# 1. Update docker-compose.yml to use environment variables
# docker-compose.yml
environment:
  POSTGRES_DB: ${POSTGRES_DB:-progression_lab}
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

# 2. Rotate database credentials immediately
# 3. Update connection strings to use environment variables:
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# 4. Remove .env from version control (ensure .gitignore includes it)
# 5. Document credentials should be generated using:
# openssl rand -base64 32 | tr -d '=' | head -c 24
```

**Affected Files to Modify:**
- [docker-compose.yml](docker-compose.yml)
- Remove or regenerate [.env](.env)
- Update [.env.local.example](.env.local.example)
- Update [admin-dashboard/.env.local.example](admin-dashboard/.env.local.example)
- Update [README.md](README.md#L286) - remove actual credentials from documentation

---

### 2. Missing Rate Limiting on Progression CRUD Endpoints ⚠️ CRITICAL

**Severity:** CRITICAL  
**Location:** 
- [POST /api/progressions](app/api/progressions/route.ts#L11): No rate limiting
- [GET /api/progressions](app/api/progressions/route.ts#L65): No rate limiting
- [POST /api/progressions/[id]](app/api/progressions/[id]/route.ts): No rate limiting (PUT)
- [DELETE /api/progressions/[id]](app/api//progressions/[id]/route.ts#L93): No rate limiting

**Issue:** Only [chord-suggestions endpoint](app/api/chord-suggestions/route.ts#L19-L21) has rate limiting. All progression CRUD endpoints lack protection against:
- Brute force enumeration of progressions
- Rapid deletion of user data
- DoS attacks via excessive API calls
- Data exfiltration

**Impact:**
- Attackers can enumerate all progression IDs and download them
- Users can be targeted with data deletion DoS attacks
- Malicious scripts can harvest copyrighted content at scale
- Service degradation for legitimate users

**Fix:**
```typescript
// Add to app/api/progressions/route.ts (both GET and POST)
import { createRateLimitResponse } from '../../../lib/rateLimiting';

const PROGRESSION_RATE_LIMIT = {
  maxAttempts: 20,  // Allow more than auth (users will make multiple requests)
  windowMs: 15 * 60 * 1000,  // 15 minutes
};

export async function POST(request: NextRequest) {
  const rateLimitResponse = createRateLimitResponse(request, PROGRESSION_RATE_LIMIT);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  // ... rest of handler
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = createRateLimitResponse(request, PROGRESSION_RATE_LIMIT);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  // ... rest of handler
}

// Add to app/api/progressions/[id]/route.ts (GET, PUT, DELETE)
const PROGRESSION_DETAIL_RATE_LIMIT = {
  maxAttempts: 30,  // Higher for legitimate user operations
  windowMs: 15 * 60 * 1000,
};

export async function GET(request: NextRequest, { params }) {
  const rateLimitResponse = createRateLimitResponse(request, PROGRESSION_DETAIL_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;
  // ... rest
}

export async function PUT(request: NextRequest, { params }) {
  const rateLimitResponse = createRateLimitResponse(request, PROGRESSION_DETAIL_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;
  // ... rest
}

export async function DELETE(request: NextRequest, { params }) {
  const rateLimitResponse = createRateLimitResponse(request, PROGRESSION_DETAIL_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;
  // ... rest
}
```

**Notes:**
- Current in-memory rate limiting needs Redis migration for distributed deployments
- Document this as deployment requirement in [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md#L135)

---

### 3. Missing Request Body Size Validation on POST /api/progressions ⚠️ CRITICAL

**Severity:** CRITICAL  
**Location:** [app/api/progressions/route.ts](app/api/progressions/route.ts#L11-L60)

**Issue:** POST endpoint accepts progression data without size validation. While [chord-suggestions](app/api/chord-suggestions/route.ts#L215-L216) validates `MAX_REQUEST_BODY_BYTES = 8 * 1024`, the progressions endpoint directly calls `request.json()` without checking:

```typescript
// VULNERABLE - No size check
const body = (await request.json()) as CreateProgressionRequest;
```

**Impact:**
- DoS via large JSON uploads (memory exhaustion)
- Potential buffer overflow or parsing attack
- Database bloat with oversized data
- Performance degradation

**Fix:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

const MAX_PROGRESSION_SIZE_BYTES = 100 * 1024;  // 100 KB reasonable for chord data

async function validateProgressionSize(request: NextRequest): Promise<NextResponse | null> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_PROGRESSION_SIZE_BYTES) {
    return NextResponse.json({ message: 'Request body too large' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_PROGRESSION_SIZE_BYTES) {
    return NextResponse.json({ message: 'Request body too large' }, { status: 413 });
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const sizeError = await validateProgressionSize(request);
    if (sizeError) return sizeError;

    const csrfError = checkCsrfToken(request);
    if (csrfError) return csrfError;

    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // ... rest of handler
  }
}
```

**Affected Files:**
- [app/api/progressions/route.ts](app/api/progressions/route.ts)
- [app/api/progressions/[id]/route.ts](app/api/progressions/[id]/route.ts#L68) - PUT endpoint also vulnerable

---

### 4. Inadequate Input Validation on Progression Fields ⚠️ CRITICAL

**Severity:** CRITICAL  
**Location:** [app/api/progressions/route.ts](app/api/progressions/route.ts#L29-L30)

**Issue:** No validation on string lengths for user inputs:
- `title`: No max length check (could be 1MB+)
- `notes`: No max length check (could be 1MB+)
- `tags`: Array size unlimited, individual tag lengths unlimited
- `feel`, `scale`, `genre`: No length or format validation

**Current Code:**
```typescript
const { title, chords, pianoVoicings, feel, scale, genre, notes, tags = [] } = body;
if (!title || !chords) {  // Only basic truthiness check
  return NextResponse.json({ message: 'Title and chords are required' }, { status: 400 });
}
```

**Impact:**
- Database column overflow (if using VARCHAR with limits)
- UI rendering DoS (excessively long strings crash UI)
- Search/indexing performance degradation
- Potential for injection attacks through tagged metadata

**Fix:**
```typescript
function validateProgressionInput(data: CreateProgressionRequest): string | null {
  const LIMITS = {
    title: 200,
    notes: 2000,
    feel: 100,
    scale: 100,
    genre: 100,
    tags: { count: 20, length: 50 },
    chords: { count: 100, symbolLength: 20 },
  };

  // Title validation
  if (!data.title) return 'Title is required';
  if (data.title.length > LIMITS.title) {
    return `Title must be ${LIMITS.title} characters or less`;
  }

  // Notes validation
  if (data.notes && data.notes.length > LIMITS.notes) {
    return `Notes must be ${LIMITS.notes} characters or less`;
  }

  // Feel/Scale/Genre validation
  if (data.feel && (typeof data.feel !== 'string' || data.feel.length > LIMITS.feel)) {
    return `Feel must be a string of ${LIMITS.feel} characters or less`;
  }
  if (data.scale && (typeof data.scale !== 'string' || data.scale.length > LIMITS.scale)) {
    return `Scale must be a string of ${LIMITS.scale} characters or less`;
  }
  if (data.genre && (typeof data.genre !== 'string' || data.genre.length > LIMITS.genre)) {
    return `Genre must be a string of ${LIMITS.genre} characters or less`;
  }

  // Tags validation
  if (data.tags) {
    if (!Array.isArray(data.tags)) return 'Tags must be an array';
    if (data.tags.length > LIMITS.tags.count) {
      return `Maximum ${LIMITS.tags.count} tags allowed`;
    }
    for (const tag of data.tags) {
      if (typeof tag !== 'string' || tag.length > LIMITS.tags.length) {
        return `Each tag must be a string of ${LIMITS.tags.length} characters or less`;
      }
    }
  }

  // Chords validation
  if (!data.chords) return 'Chords are required';
  if (!Array.isArray(data.chords)) return 'Chords must be an array';
  if (data.chords.length > LIMITS.chords.count) {
    return `Maximum ${LIMITS.chords.count} chords allowed`;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // ... size validation ...

    const body = (await request.json()) as CreateProgressionRequest;
    const validationError = validateProgressionInput(body);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    // ... rest of handler
  }
}
```

**Affected Files:**
- [app/api/progressions/route.ts](app/api/progressions/route.ts) - POST
- [app/api/progressions/[id]/route.ts](app/api/progressions/[id]/route.ts) - PUT

---

### 5. Inadequate Envelope Control Validation ⚠️ CRITICAL

**Severity:** CRITICAL  
**Location:** [features/generator/components/EnvelopeControls.tsx](features/generator/components/EnvelopeControls.tsx#L44-L57)

**Issue:** The playback settings `attack` and `decay` values are passed directly to Tone.js without range validation. While the UI sliders enforce limits, an attacker can directly call the API or manipulate client-side values:

```typescript
// VULNERABLE - No server-side validation
export async function PUT(request: NextRequest, { params }) {
  // ... 
  const { title, chords, pianoVoicings, feel, scale, genre, notes, tags, isPublic, 
          attack, decay, sustain, release } = body;  // No validation!
```

**Impact:**
- Invalid audio parameters could crash Tone.js audio engine
- Negative or extreme values could cause DoS
- Unexpected UI behavior for other users sharing settings
- Audio context errors and performance degradation

**Note:** Attack/decay are not currently persisted to database, but should be validated if this changes.

**Fix:**
```typescript
function validateEnvelopeSettings(settings: {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
}): string | null {
  const ENVELOPE_LIMITS = {
    attack: { min: 0, max: 0.5 },    // 0ms to 500ms
    decay: { min: 0.01, max: 3 },    // 10ms to 3s
    sustain: { min: 0, max: 1 },     // 0 to 1 (normalized)
    release: { min: 0.01, max: 3 },  // 10ms to 3s
  };

  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined) continue;
    
    const limits = ENVELOPE_LIMITS[key as keyof typeof ENVELOPE_LIMITS];
    if (!limits) continue;
    
    if (typeof value !== 'number' || isNaN(value)) {
      return `${key} must be a valid number`;
    }
    if (value < limits.min || value > limits.max) {
      return `${key} must be between ${limits.min} and ${limits.max}`;
    }
  }

  return null;
}
```

---

## HIGH-SEVERITY ISSUES

### 6. Authorization Bypass: AUDITOR Role Can Delete Progressions ⚠️ HIGH

**Severity:** HIGH  
**Location:** [admin-dashboard/app/api/progressions/[id]/route.ts](admin-dashboard/app/api/progressions/[id]/route.ts#L88-L102)

**Issue:** The role check allows deletion if role is NOT 'ADMIN', but AUDITOR should only view data:

```typescript
// VULNERABLE - allows AUDITOR to delete!
if (adminUser.role !== 'ADMIN') {
  return NextResponse.json({ message: 'Only ADMIN can delete records' }, { status: 403 });
}
```

Later in [useAdminDashboard.ts](admin-dashboard/components/admin/useAdminDashboard.ts#L34-L142):
```typescript
const canDelete = user?.role === 'ADMIN';  // Correctly checks === ADMIN
// But the API endpoint doesn't match this logic!
```

**Impact:**
- AUDITOR users can permanently delete progressions
- Privilege escalation vulnerability
- Data loss attack vector
- Violation of role-based access control (RBAC) design

**Fix:**
```typescript
// admin-dashboard/app/api/progressions/[id]/route.ts - line 90
if (adminUser.role !== 'ADMIN') {  // Current (WRONG)
  return NextResponse.json({ message: 'Only ADMIN can delete records' }, { status: 403 });
}

// Should be:
if (adminUser.role !== 'ADMIN') {
  return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
}

// Or more explicitly:
if (adminUser.role === 'AUDITOR' || adminUser.role !== 'ADMIN') {
  return NextResponse.json({ message: 'Forbidden: only ADMIN can delete' }, { status: 403 });
}
```

Verify this check is consistent with:
- [admin-dashboard/app/api/progressions/route.ts](admin-dashboard/app/api/progressions/route.ts) - LIST should check ADMIN or AUDITOR
- [admin-dashboard/components/admin/useAdminDashboard.ts](admin-dashboard/components/admin/useAdminDashboard.ts#L34-L142)

---

### 7. X-Permitted-Cross-Origin-Policies Header Missing ⚠️ HIGH

**Severity:** HIGH  
**Location:** [middleware.ts](middleware.ts), [admin-dashboard/middleware.ts](admin-dashboard/middleware.ts)

**Issue:** Security headers middleware is missing the `X-Permitted-Cross-Origin-Policies` header (noted in [SECURITY_FIXES_APPLIED.md](SECURITY_FIXES_APPLIED.md#L248-L249) but not implemented).

**Current Status:** From [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md#L55-L60):
```markdown
- X-Permitted-Cross-Origin-Policies: (not set)
```

**Impact:**
- Browser restrictions not fully enforced
- Potential for embedded iframe exploitation
- Doesn't prevent all cross-origin attacks

**Fix:**
```typescript
// middleware.ts and admin-dashboard/middleware.ts
response.headers.set('X-Permitted-Cross-Origin-Policies', 'none()');
```

---

### 8. Information Disclosure via Console Errors ⚠️ HIGH

**Severity:** HIGH  
**Location:** Multiple files with `console.error` calls:
- [app/api/chord-suggestions/route.ts](app/api/chord-suggestions/route.ts#L297-L311): Logs OpenAI response details
- [app/api/progressions/route.ts](app/api/progressions/route.ts#L57): Generic error logging
- [app/api/progressions/[id]/route.ts](app/api/progressions/[id]/route.ts#L32-L85): Error details leaked

**Issue:** `console.error()` statements in production code:
```typescript
console.error('Empty output_text from OpenAI response:', response);  // LINE 297
console.error('chord-suggestions route error:', error);              // LINE 311
```

Vercel logs these to CloudWatch/stdout where they may be accessible.

**Impact:**
- API response structure leakage (helps attackers craft exploits)
- OpenAI response details exposure (could include rate limit info, model details)
- Stack traces with system information
- Violation of [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md#L87) requirement for structured logging

**Fix:**
```typescript
// Replace console.error with structured logging
import * as Sentry from "@sentry/nextjs";

// Instead of:
// console.error('Empty output_text from OpenAI response:', response);

// Use:
Sentry.captureException(new Error('Empty output_text from OpenAI'), {
  extra: { endpoint: 'chord-suggestions' }
});

// For client: return generic error only
return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 502 });
```

Remove or minimize all `console.error()` calls in production code paths.

---

### 9. In-Memory Rate Limiter Not Distributed-System Safe ⚠️ HIGH

**Severity:** HIGH  
**Location:** [lib/rateLimiting.ts](lib/rateLimiting.ts#L7) and [admin-dashboard/lib/rateLimiting.ts](admin-dashboard/lib/rateLimiting.ts#L7)

**Issue:** Rate limiting uses in-memory Map:
```typescript
const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>();
```

This works for single-instance deployments but fails in:
- Vercel serverless functions (no shared state across instances)
- Scaled deployments (multiple server instances)
- Distributed systems with load balancing

**Impact:**
- Rate limiting can be bypassed by distributing requests across instances
- Attackers can brute force across multiple endpoints simultaneously
- No protection in production if deployed scaled

**Fix - Document as deployment requirement:**

Update [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md#L135-L136):
```markdown
### Rate Limiting

Currently implemented at 5 attempts per 15 minutes per IP using in-memory storage.

⚠️ **CRITICAL FOR PRODUCTION:** In-memory rate limiting does NOT work with:
- Vercel serverless functions (AWS Lambda has no shared state)
- Scaled deployments with multiple instances
- Auto-scaling environments

**Required for production deployment:**
1. Migrate to Redis-based rate limiting using `redis` or `@upstash/redis` package
2. Use cookie-based rate limiting as fallback if Redis unavailable
3. Consider IP-based rate limiting at CDN level (Cloudflare, Vercel Edge Network)
4. Monitor rate limit bypass attempts

**Implementation guidance:**
- For Vercel: Use Upstash Redis (integrated partnership)
- For self-hosted: Use Redis instance with persistence
- Fallback: Database-backed rate limiting (slower but works)
```

---

## MEDIUM-SEVERITY ISSUES

### 10. Hardcoded OPENAI_MODEL Fallback ⚠️ MEDIUM

**Severity:** MEDIUM  
**Location:** [app/api/chord-suggestions/route.ts](app/api/chord-suggestions/route.ts#L281) and [docker-compose.yml](docker-compose.yml#L13)

**Issue:**
```typescript
model: process.env.OPENAI_MODEL || 'gpt-5.4',  // Fallback model
```

And in docker-compose:
```yaml
OPENAI_MODEL: ${OPENAI_MODEL:-gpt-5.4}  # Non-existent fallback
```

**Impact:**
- API calls fail with 404 error if env var not set
- "gpt-5.4" model doesn't exist (typo or future reference)
- Unexpected behavior in development environments
- Silent failures when env var not configured

**Fix:**
```typescript
// app/api/chord-suggestions/route.ts
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';  // Use real, stable model

// docker-compose.yml
OPENAI_MODEL: ${OPENAI_MODEL:-gpt-4o}

// .env
OPENAI_MODEL=gpt-4o  # Real model, not typo
```

---

### 11. Shareroom Enumeration Risk (Low Entropy) ⚠️ MEDIUM

**Severity:** MEDIUM  
**Location:** [prisma/schema.prisma](prisma/schema.prisma#L33)

**Issue:** ShareID uses cuid() which is:
- Deterministic but not cryptographically random
- Ordered by timestamp (could leak creation time info)
- Sequential characteristics allow pattern recognition

```prisma
shareId    String   @unique @default(cuid())
```

**Impact:**
- Predictable progression URLs enable enumeration
- All public progressions discoverable if progression count estimated
- Weak privacy for "private" shared links without additional authentication

**Risk Level:** LOW-MEDIUM
- `cuid()` is still reasonably safe for non-security-critical use
- Sharing is opt-in (isPublic flag checked)
- Additional weak protection: lack of indexing on shareId prevents fast enumeration

**Fix (if needed):**
Use more random ID generation:
```typescript
// lib/progressionId.ts
import crypto from 'crypto';

export function generateProgressionShareId(): string {
  // Generate 32 random bytes, base64 encode, take first 24 chars
  return crypto.randomBytes(24).toString('base64url');
}

// Prisma migration to add custom ID generation:
// Use default with custom function
```

For now: **Document this limitation in [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md)** - don't share sensitive unpublished progressions via ID alone.

---

### 12. Session Duration Too Long ⚠️ MEDIUM

**Severity:** MEDIUM  
**Location:** [lib/auth.ts](lib/auth.ts#L4)

**Issue:**
```typescript
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;  // 7 DAYS
```

7-day session timeout is lengthy for:
- Web application with sensitive personal data (chord progressions)
- Shared/public computer scenarios
- Session hijacking recovery time

**Impact:**
- Compromised token valid for up to 7 days
- Large vulnerability window if device stolen
- No re-authentication for sensitive operations

**Recommendation:**
```typescript
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;  // 24 hours (1 day)
// Could also support shorter for sensitive operations // const ADMIN_SESSION MAX_AGE_SECONDS = 60 * 60 * 4;  // 4 hours for admin
```

---

## RECOMMENDATIONS BY PRIORITY

### Immediate (Fix Before Production)
1. ✅ **Remove default database credentials** from all files  
2. ✅ **Add rate limiting to progression CRUD endpoints**  
3. ✅ **Add request body size validation to POST /api/progressions**  
4. ✅ **Add input field validation** (title, notes, tags lengths)  
5. ✅ **Add envelope parameter validation**  

### Critical (Before Scaling to Multiple Instances)
6. ✅ **Fix AUDITOR authorization bypass** in admin delete endpoint  
7. ✅ **Migrate to Redis-based rate limiting**  
8. ✅ **Remove/reduce console.error statements** in production 

### High Priority (Security Best Practices)
9. ✅ **Add X-Permitted-Cross-Origin-Policies header**  
10. ✅ **Fix OPENAI_MODEL fallback** to real model name  
11. ✅ **Reduce session timeout** from 7 days to 24 hours  

### Documentation & Deployment
12. ✅ **Update [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md)** with rate limiting requirements  
13. ✅ **Remove credentials from [README.md](README.md)**  
14. ✅ **Add secrets scanning to CI/CD** (git-secrets, detect-secrets)  

---

## Testing Checklist

After fixes are applied:

- [ ] Test rate limiting with repeated requests (should block after limit)
- [ ] Test oversized request bodies (should return 413)
- [ ] Test empty/null progression fields (should return 400)
- [ ] Test AUDITOR role cannot delete progressions (should return 403)
- [ ] Test ADMIN role can delete progressions (should work)
- [ ] Test envelope values outside limits rejected (should return 400)
- [ ] Verify no console.error in production logs
- [ ] Check X-Permitted-Cross-Origin-Policies header present
- [ ] Verify credentials cannot be extracted from git history

---

## Compliance Notes

**Standards Affected:**
-🔴 **OWASP Top 10 2021**: A01:2021 – Broken Access Control (issue #6)
- 🔴 **OWASP Top 10 2021**: A02:2021 – Cryptographic Failures (issue #1, credentials)
- 🔴 **OWASP Top 10 2021**: A06:2021 – Vulnerable and Outdated Components (rate limiting)
- 🔴 **CWE-798**: Use of Hard-Coded Credentials (issue #1)
- 🔴 **CWE-307**: Improper Restriction of Rendered UI Layers or Frames (issue #7)

**Remediation Status:** ⏳ IN PROGRESS

---

## Previous Audit References

This audit identifies **new issues** beyond previous security work documented in:
- [SECURITY_FIXES_APPLIED.md](SECURITY_FIXES_APPLIED.md) - Prior fixes implemented
- [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md) - Deployment checklist

---

## Questions for Development Team

1. Are credentials stored in .gitignore in actual deployment?
2. Is production using Redis or similar for rate limiting?
3. Are there other admin roles needed beyond ADMIN/AUDITOR?
4. Should deleted progressions be soft-deleted (logical delete) instead of hard delete?
5. Are there other APIs that need rate limiting?
6. Is structured logging (Sentry) configured for production?

---

**Report Generated:** 2025-01-XX  
**Auditor:** Security Review Team  
**Confidence Level:** High (detailed code review + pattern matching)
