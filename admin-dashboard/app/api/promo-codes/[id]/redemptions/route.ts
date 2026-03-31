import { NextRequest, NextResponse } from 'next/server';

import { getAdminUserFromRequest } from '../../../../../lib/adminAccess';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdminUserFromRequest(request);
  if (!adminUser) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;

    const redemptions = await prisma.promoCodeRedemption.findMany({
      where: { promoCodeId: id },
      orderBy: { redeemedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        status: true,
        redeemedAt: true,
        user: { select: { email: true } },
      },
    });

    const items = redemptions.map((r) => ({
      id: r.id,
      userId: r.userId,
      userEmail: r.user.email,
      status: r.status,
      redeemedAt: r.redeemedAt.toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to fetch redemptions:', error);
    return NextResponse.json({ message: 'Failed to fetch redemptions' }, { status: 500 });
  }
}
