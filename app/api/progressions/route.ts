import { NextRequest, NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../lib/auth';
import { checkCsrfToken } from '../../../lib/csrf';
import { prisma } from '../../../lib/prisma';
import type { CreateProgressionRequest } from '../../../lib/types';

/**
 * Creates a saved progression for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrfToken(request);
    if (csrfError) {
      return csrfError;
    }

    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreateProgressionRequest;
    const {
      title,
      chords,
      pianoVoicings,
      feel,
      scale,
      genre,
      notes,
      tags = [],
      isPublic = false,
    } = body;

    if (!title || !chords) {
      return NextResponse.json({ message: 'Title and chords are required' }, { status: 400 });
    }

    const progression = await prisma.progression.create({
      data: {
        title,
        chords,
        pianoVoicings,
        feel,
        scale,
        genre,
        notes,
        tags,
        isPublic,
        userId: session.userId,
      },
    });

    return NextResponse.json(progression, { status: 201 });
  } catch (error) {
    console.error('Failed to save progression:', error);
    return NextResponse.json({ message: 'Failed to save progression' }, { status: 500 });
  }
}

/**
 * Lists saved progressions for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const progressions = await prisma.progression.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(progressions);
  } catch (error) {
    console.error('Failed to fetch progressions:', error);
    return NextResponse.json({ message: 'Failed to fetch progressions' }, { status: 500 });
  }
}
