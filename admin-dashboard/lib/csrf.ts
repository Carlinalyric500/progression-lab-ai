import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates CSRF token from request against stored token
 * Returns true if valid, false otherwise
 */
export function validateCsrfToken(request: NextRequest, storedToken: string): boolean {
  const providedToken = request.headers.get(CSRF_HEADER_NAME);

  if (!providedToken || !storedToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(providedToken, 'hex');
    const storedBuffer = Buffer.from(storedToken, 'hex');

    if (providedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Get CSRF token from request cookies
 */
export function getCsrfToken(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Set CSRF token in response cookies
 */
export function setCsrfToken(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be accessible to JavaScript for header injection
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Check CSRF token and return error response if invalid
 * For state-changing methods (POST, PUT, DELETE, PATCH)
 *
 * @returns NextResponse if CSRF check fails, null if valid
 */
export function checkCsrfToken(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  // Only validate state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }

  const storedToken = getCsrfToken(request);
  const isValid = storedToken && validateCsrfToken(request, storedToken);

  if (!isValid) {
    return NextResponse.json({ message: 'CSRF token validation failed' }, { status: 403 });
  }

  return null;
}
