/** @jest-environment node */

import { NextRequest } from 'next/server';

var mockGetAdminUserFromRequest = jest.fn();
var mockMaskEmail = jest.fn((email: string) => `masked:${email}`);
var mockProgressionCount = jest.fn();
var mockProgressionFindMany = jest.fn();

jest.mock('../../../../lib/adminAccess', () => ({
  getAdminUserFromRequest: (...args: unknown[]) => mockGetAdminUserFromRequest(...args),
  maskEmail: (...args: unknown[]) => mockMaskEmail(...args),
}));

jest.mock('../../../../lib/prisma', () => ({
  prisma: {
    progression: {
      count: (...args: unknown[]) => mockProgressionCount(...args),
      findMany: (...args: unknown[]) => mockProgressionFindMany(...args),
    },
  },
}));

import { GET } from '../route';

describe('GET /api/progressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    mockGetAdminUserFromRequest.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@progressionlab.ai',
      role: 'ADMIN',
    });
    mockProgressionCount.mockResolvedValue(2);
    mockProgressionFindMany.mockResolvedValue([
      {
        id: 'progression-1',
        title: 'Neo Soul Loop',
        genre: 'Neo Soul',
        tags: ['lush'],
        isPublic: false,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
        user: {
          id: 'user-1',
          email: 'artist@progressionlab.ai',
          name: 'Artist One',
        },
      },
    ]);
  });

  it('returns 403 when the requester is not an admin user', async () => {
    mockGetAdminUserFromRequest.mockResolvedValue(null);

    const response = await GET(new NextRequest('http://localhost/api/progressions'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden' });
    expect(mockProgressionCount).not.toHaveBeenCalled();
    expect(mockProgressionFindMany).not.toHaveBeenCalled();
  });

  it('applies query and visibility filters to the progression query', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/progressions?page=2&pageSize=10&query=neo&visibility=PRIVATE',
      ),
    );
    const body = await response.json();

    const expectedWhere = {
      AND: [
        {
          OR: [
            { title: { contains: 'neo', mode: 'insensitive' } },
            { genre: { contains: 'neo', mode: 'insensitive' } },
            { user: { is: { email: { contains: 'neo', mode: 'insensitive' } } } },
            { user: { is: { name: { contains: 'neo', mode: 'insensitive' } } } },
          ],
        },
        { isPublic: false },
      ],
    };

    expect(response.status).toBe(200);
    expect(mockProgressionCount).toHaveBeenCalledWith({ where: expectedWhere });
    expect(mockProgressionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 10,
        take: 10,
      }),
    );
    expect(body.total).toBe(2);
    expect(body.items[0]).toMatchObject({
      id: 'progression-1',
      title: 'Neo Soul Loop',
      owner: {
        email: 'artist@progressionlab.ai',
      },
    });
  });

  it('masks owner emails for auditors', async () => {
    mockGetAdminUserFromRequest.mockResolvedValue({
      id: 'auditor-1',
      email: 'auditor@progressionlab.ai',
      role: 'AUDITOR',
    });

    const response = await GET(
      new NextRequest('http://localhost/api/progressions?visibility=PUBLIC&page=1&pageSize=25'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockProgressionCount).toHaveBeenCalledWith({
      where: {
        AND: [{ isPublic: true }],
      },
    });
    expect(mockMaskEmail).toHaveBeenCalledWith('artist@progressionlab.ai');
    expect(body.items[0].owner.email).toBe('masked:artist@progressionlab.ai');
  });
});
