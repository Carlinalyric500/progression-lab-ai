import { NextRequest, NextResponse } from 'next/server';

import {
  createSessionToken,
  normalizeAuthCredentials,
  setSessionCookie,
  validateAuthCredentials,
  verifyPassword,
} from '../../../../lib/auth';
import { createRateLimitResponse } from '../../../../lib/rateLimiting';
import { prisma } from '../../../../lib/prisma';

/**
 * Authenticates a user and returns user profile with session cookie.
 * Includes rate limiting (5 attempts per 15 minutes) to prevent brute force attacks.
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit first
    const rateLimitResponse = createRateLimitResponse(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const credentials = normalizeAuthCredentials(await request.json());
    const validationError = validateAuthCredentials(credentials);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const { email, password } = credentials;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
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
    console.error('Login failed:', error);
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}
