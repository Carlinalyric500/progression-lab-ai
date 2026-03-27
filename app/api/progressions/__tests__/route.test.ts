/** @jest-environment node */

import { NextResponse } from 'next/server';

var mockGetSessionFromRequest = jest.fn();
var mockCheckCsrfToken = jest.fn();
var mockProgressionCreate = jest.fn();

jest.mock('../../../../lib/auth', () => ({
  getSessionFromRequest: (...args: unknown[]) => mockGetSessionFromRequest(...args),
}));

jest.mock('../../../../lib/csrf', () => ({
  checkCsrfToken: (...args: unknown[]) => mockCheckCsrfToken(...args),
}));

jest.mock('../../../../lib/prisma', () => ({
  prisma: {
    progression: {
      create: (...args: unknown[]) => mockProgressionCreate(...args),
    },
  },
}));

import { POST } from '../route';

describe('POST /api/progressions', () => {
  beforeEach(() => {
    mockGetSessionFromRequest.mockReset();
    mockCheckCsrfToken.mockReset();
    mockProgressionCreate.mockReset();
    console.error = jest.fn();
  });

  it('returns 403 when the CSRF token is missing', async () => {
    mockCheckCsrfToken.mockReturnValue(
      NextResponse.json({ message: 'CSRF token validation failed' }, { status: 403 }),
    );

    const response = await POST({} as never);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: 'CSRF token validation failed' });
    expect(mockGetSessionFromRequest).not.toHaveBeenCalled();
    expect(mockProgressionCreate).not.toHaveBeenCalled();
  });

  it('does not leak raw errors on persistence failures', async () => {
    mockCheckCsrfToken.mockReturnValue(null);
    mockGetSessionFromRequest.mockReturnValue({ userId: 'user-1' });
    mockProgressionCreate.mockRejectedValue(new Error('database exploded'));

    const response = await POST({
      json: async () => ({ title: 'Test', chords: ['Cmaj7'] }),
    } as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ message: 'Failed to save progression' });
    expect('error' in body).toBe(false);
  });
});
