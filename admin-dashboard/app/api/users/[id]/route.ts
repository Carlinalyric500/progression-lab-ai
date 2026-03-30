import type { SubscriptionPlan } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getAdminUserFromRequest } from '../../../../lib/adminAccess';
import { checkCsrfToken } from '../../../../lib/csrf';
import { prisma } from '../../../../lib/prisma';

type UpdateUserPlanOverrideBody = {
  planOverride?: SubscriptionPlan | null;
};

function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return value === 'SESSION' || value === 'COMPOSER' || value === 'STUDIO' || value === 'COMP';
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = checkCsrfToken(request);
    if (csrfError) {
      return csrfError;
    }

    const adminUser = await getAdminUserFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only ADMIN can update plan overrides' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as UpdateUserPlanOverrideBody;
    const planOverride =
      body.planOverride === null || body.planOverride === undefined
        ? null
        : isSubscriptionPlan(body.planOverride)
          ? body.planOverride
          : undefined;

    if (planOverride === undefined) {
      return NextResponse.json({ message: 'Invalid plan override' }, { status: 400 });
    }

    const { id } = await params;
    await prisma.user.update({
      where: { id },
      data: { planOverride },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update user plan override:', error);
    return NextResponse.json({ message: 'Failed to update plan override' }, { status: 500 });
  }
}
