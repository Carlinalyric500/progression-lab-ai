import { NextRequest, NextResponse } from 'next/server';

import { clearSessionCookie } from '../../../../lib/auth';
import { checkCsrfToken, clearCsrfToken } from '../../../../lib/csrf';

/**
 * Clears the auth session cookie for the current client.
 */
export async function POST(request: NextRequest) {
  const csrfError = checkCsrfToken(request);
  if (csrfError) {
    return csrfError;
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  clearCsrfToken(response);
  return response;
}
