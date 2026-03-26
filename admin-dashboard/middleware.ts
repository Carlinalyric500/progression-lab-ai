import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security headers middleware for admin dashboard
 * Applies essential security headers to all responses
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Prevent clickjacking attacks - admin can only be framed by itself
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy for privacy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy - restrictive for admin panel
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()',
  );

  // Strict Content Security Policy for admin panel
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // MUI requires unsafe-inline
    "style-src 'self' 'unsafe-inline'", // MUI requires unsafe-inline
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'", // Prevent embedding in any frame
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // HSTS for admin dashboard (strongly encourage HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - will have their own security headers
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
