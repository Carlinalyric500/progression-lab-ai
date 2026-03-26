import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory rate limiter for authentication attempts
 * In production, use Redis or similar for distributed systems
 */
const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>();

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // milliseconds
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * Gets client IP from request, with support for proxies
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Check if a client has exceeded rate limit
 * @returns { allowed: boolean, remaining: number, resetMs: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const stored = rateLimitStore.get(identifier);

  if (!stored || now > stored.resetTime) {
    // Fresh window
    rateLimitStore.set(identifier, { attempts: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxAttempts - 1, resetMs: config.windowMs };
  }

  // Existing window
  if (stored.attempts >= config.maxAttempts) {
    const resetMs = Math.max(0, stored.resetTime - now);
    return { allowed: false, remaining: 0, resetMs };
  }

  stored.attempts++;
  const remaining = config.maxAttempts - stored.attempts;
  const resetMs = stored.resetTime - now;

  return { allowed: true, remaining, resetMs };
}

/**
 * Middleware to check rate limit and return appropriate response
 */
export function createRateLimitResponse(
  request: NextRequest,
  config?: RateLimitConfig,
): NextResponse | null {
  const clientId = getClientIp(request);
  const result = checkRateLimit(clientId, config);

  if (!result.allowed) {
    const response = NextResponse.json(
      { message: 'Too many authentication attempts. Please try again later.' },
      { status: 429 },
    );

    // Inform client when they can retry
    response.headers.set('Retry-After', Math.ceil(result.resetMs / 1000).toString());
    return response;
  }

  return null;
}
