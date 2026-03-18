import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '../../../lib/prisma';
import type { Progression } from '../../../lib/types';

function getFirstChordName(progression: Progression): string {
  const firstChord = progression.chords?.[0] as { name?: string } | string | undefined;

  if (typeof firstChord === 'string') {
    return firstChord;
  }

  if (firstChord && typeof firstChord === 'object') {
    return firstChord.name ?? '';
  }

  return '';
}

export async function GET(request: NextRequest) {
  try {
    const tagQuery = request.nextUrl.searchParams.get('tag')?.trim().toLowerCase() ?? '';
    const keyQuery = request.nextUrl.searchParams.get('key')?.trim().toLowerCase() ?? '';

    const progressions = await prisma.progression.findMany({
      where: {
        isPublic: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 500,
    });

    const filteredProgressions = progressions.filter((progression) => {
      const matchesTag =
        tagQuery.length === 0 ||
        progression.tags.some((tag) => tag.toLowerCase().includes(tagQuery));

      const firstChordName = getFirstChordName(progression).trim().toLowerCase();
      const matchesKey = keyQuery.length === 0 || firstChordName.startsWith(keyQuery);

      return matchesTag && matchesKey;
    });

    return NextResponse.json(filteredProgressions);
  } catch (error) {
    console.error('Failed to fetch public progressions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch public progressions', error },
      { status: 500 },
    );
  }
}
