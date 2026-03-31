import { NextRequest, NextResponse } from 'next/server';

import { getAdminUserFromRequest } from '../../../lib/adminAccess';
import {
  AUDIT_ACTION_PROMO_CODE_CREATED,
  AUDIT_TARGET_TYPE_PROMO_CODE,
} from '../../../lib/adminAuditLog';
import { checkCsrfToken } from '../../../lib/csrf';
import { prisma } from '../../../lib/prisma';
import type { CreatePromoCodeInput } from '../../../components/admin/types';

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export async function GET(request: NextRequest) {
  const adminUser = await getAdminUserFromRequest(request);
  if (!adminUser) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const codes = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        type: true,
        isActive: true,
        startsAt: true,
        expiresAt: true,
        maxRedemptions: true,
        currentRedemptions: true,
        isSingleUse: true,
        allowedPlans: true,
        grantedPlan: true,
        inviteDurationDays: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: { select: { email: true } },
      },
    });

    const items = codes.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      isActive: c.isActive,
      startsAt: c.startsAt?.toISOString() ?? null,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      maxRedemptions: c.maxRedemptions,
      currentRedemptions: c.currentRedemptions,
      isSingleUse: c.isSingleUse,
      allowedPlans: c.allowedPlans,
      grantedPlan: c.grantedPlan,
      inviteDurationDays: c.inviteDurationDays,
      createdByEmail: c.createdByUser?.email ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to fetch promo codes:', error);
    return NextResponse.json({ message: 'Failed to fetch promo codes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const csrfError = checkCsrfToken(request);
  if (csrfError) return csrfError;

  const adminUser = await getAdminUserFromRequest(request);
  if (!adminUser) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  if (adminUser.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Only ADMIN can create promo codes' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<CreatePromoCodeInput>;
    const rawCode = typeof body.code === 'string' ? normalizeCode(body.code) : '';

    if (!rawCode) {
      return NextResponse.json({ message: 'code is required' }, { status: 400 });
    }

    if (body.type !== 'DISCOUNT' && body.type !== 'INVITE') {
      return NextResponse.json({ message: 'type must be DISCOUNT or INVITE' }, { status: 400 });
    }

    // Validate DISCOUNT codes must have stripePromotionCodeId
    if (body.type === 'DISCOUNT' && !body.stripePromotionCodeId) {
      return NextResponse.json(
        { message: 'stripePromotionCodeId is required for DISCOUNT codes' },
        { status: 400 },
      );
    }

    const created = await prisma.promoCode.create({
      data: {
        code: rawCode,
        type: body.type,
        isActive: body.isActive ?? true,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        maxRedemptions: body.maxRedemptions ?? null,
        isSingleUse: body.isSingleUse ?? false,
        allowedPlans: body.allowedPlans ?? [],
        allowedBillingIntervals: [],
        grantedPlan: body.grantedPlan ?? null,
        inviteDurationDays: body.inviteDurationDays ?? null,
        stripePromotionCodeId: body.stripePromotionCodeId ?? null,
        createdByUserId: adminUser.id,
      },
      include: { createdByUser: { select: { email: true } } },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: adminUser.id,
        actorEmail: adminUser.email,
        actorRole: adminUser.role,
        action: AUDIT_ACTION_PROMO_CODE_CREATED,
        targetType: AUDIT_TARGET_TYPE_PROMO_CODE,
        targetId: created.id,
        metadata: { code: rawCode, type: body.type },
      },
    });

    return NextResponse.json({
      item: {
        id: created.id,
        code: created.code,
        type: created.type,
        isActive: created.isActive,
        startsAt: created.startsAt?.toISOString() ?? null,
        expiresAt: created.expiresAt?.toISOString() ?? null,
        maxRedemptions: created.maxRedemptions,
        currentRedemptions: created.currentRedemptions,
        isSingleUse: created.isSingleUse,
        allowedPlans: created.allowedPlans,
        grantedPlan: created.grantedPlan,
        inviteDurationDays: created.inviteDurationDays,
        createdByEmail: created.createdByUser?.email ?? null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ message: 'Promo code already exists' }, { status: 409 });
    }
    console.error('Failed to create promo code:', error);
    return NextResponse.json({ message: 'Failed to create promo code' }, { status: 500 });
  }
}
