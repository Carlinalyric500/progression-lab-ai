import { NextRequest, NextResponse } from 'next/server';

import {
  createSessionToken,
  normalizeAuthPayload,
  setSessionCookie,
  validateAdminAuthPayload,
  verifyPassword,
} from '../../../../lib/auth';
import { createRateLimitResponse } from '../../../../lib/rateLimiting';
import { prisma } from '../../../../lib/prisma';

/**
 * Admin login endpoint with rate limiting to prevent brute force attacks.
 * Rate limit: 5 attempts per 15 minutes per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit first (5 attempts per 15 minutes)
    const rateLimitResponse = createRateLimitResponse(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const credentials = normalizeAuthPayload(await request.json());

    // Validate input format before database query
    if (!validateAdminAuthPayload(credentials)) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: credentials.email } });

    if (
      !user ||
      user.role === undefined ||
      (user.role !== 'ADMIN' && user.role !== 'AUDITOR') ||
      !user.passwordHash ||
      !verifyPassword(credentials.password, user.passwordHash)
    ) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    setSessionCookie(response, createSessionToken(user.id, user.email, user.role));
    return response;
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}
