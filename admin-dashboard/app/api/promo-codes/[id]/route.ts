import { NextRequest, NextResponse } from 'next/server';

import { getAdminUserFromRequest } from '../../../../lib/adminAccess';
import {
  AUDIT_ACTION_PROMO_CODE_REVOKED,
  AUDIT_ACTION_PROMO_CODE_UPDATED,
  AUDIT_TARGET_TYPE_PROMO_CODE,
} from '../../../../lib/adminAuditLog';
import { checkCsrfToken } from '../../../../lib/csrf';
import { prisma } from '../../../../lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = checkCsrfToken(request);
  if (csrfError) return csrfError;

  const adminUser = await getAdminUserFromRequest(request);
  if (!adminUser) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  if (adminUser.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Only ADMIN can update promo codes' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};
    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive;
    if (body.expiresAt !== undefined)
      updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt as string) : null;
    if (body.maxRedemptions !== undefined) updateData.maxRedemptions = body.maxRedemptions;
    if (body.inviteDurationDays !== undefined)
      updateData.inviteDurationDays = body.inviteDurationDays;
    if (body.stripePromotionCodeId !== undefined)
      updateData.stripePromotionCodeId = body.stripePromotionCodeId;

    const updated = await prisma.promoCode.update({
      where: { id },
      data: updateData,
      include: { createdByUser: { select: { email: true } } },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: adminUser.id,
        actorEmail: adminUser.email,
        actorRole: adminUser.role,
        action: AUDIT_ACTION_PROMO_CODE_UPDATED,
        targetType: AUDIT_TARGET_TYPE_PROMO_CODE,
        targetId: id,
        metadata: { updatedFields: Object.keys(updateData) },
      },
    });

    return NextResponse.json({
      item: {
        id: updated.id,
        code: updated.code,
        type: updated.type,
        isActive: updated.isActive,
        startsAt: updated.startsAt?.toISOString() ?? null,
        expiresAt: updated.expiresAt?.toISOString() ?? null,
        maxRedemptions: updated.maxRedemptions,
        currentRedemptions: updated.currentRedemptions,
        isSingleUse: updated.isSingleUse,
        allowedPlans: updated.allowedPlans,
        grantedPlan: updated.grantedPlan,
        inviteDurationDays: updated.inviteDurationDays,
        createdByEmail: updated.createdByUser?.email ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to update promo code:', error);
    return NextResponse.json({ message: 'Failed to update promo code' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfError = checkCsrfToken(request);
  if (csrfError) return csrfError;

  const adminUser = await getAdminUserFromRequest(request);
  if (!adminUser) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  if (adminUser.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Only ADMIN can revoke promo codes' }, { status: 403 });
  }

  try {
    const { id } = await params;

    await prisma.promoCode.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: adminUser.id,
        actorEmail: adminUser.email,
        actorRole: adminUser.role,
        action: AUDIT_ACTION_PROMO_CODE_REVOKED,
        targetType: AUDIT_TARGET_TYPE_PROMO_CODE,
        targetId: id,
        metadata: {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to revoke promo code:', error);
    return NextResponse.json({ message: 'Failed to revoke promo code' }, { status: 500 });
  }
}
