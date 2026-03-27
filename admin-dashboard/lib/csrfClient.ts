const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

function readCookieValue(cookieName: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    if (!cookie.startsWith(`${cookieName}=`)) {
      continue;
    }

    return decodeURIComponent(cookie.slice(cookieName.length + 1));
  }

  return null;
}

export function createCsrfHeaders(headers?: HeadersInit): Headers {
  const resolvedHeaders = new Headers(headers);
  const token = readCookieValue(CSRF_COOKIE_NAME);

  if (token && !resolvedHeaders.has(CSRF_HEADER_NAME)) {
    resolvedHeaders.set(CSRF_HEADER_NAME, token);
  }

  return resolvedHeaders;
}
