import { NextRequest, NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../lib/auth';
import { checkCsrfToken } from '../../../../lib/csrf';
import { redeemInviteCodeForUser } from '../../../../lib/billing';

type RedeemInviteRequestBody = {
  code?: unknown;
};

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

    const body = (await request.json()) as RedeemInviteRequestBody;
    const code = typeof body.code === 'string' ? body.code : '';

    if (!code.trim()) {
      return NextResponse.json({ message: 'Invite code is required' }, { status: 400 });
    }

    const result = await redeemInviteCodeForUser({
      rawCode: code,
      userId: session.userId,
    });

    if (!result.applied) {
      if (result.reason === 'already_paid_plan') {
        return NextResponse.json({
          applied: false,
          message: 'Your paid plan remains active. Invite access was not applied.',
        });
      }

      return NextResponse.json(
        {
          applied: false,
          message: 'Invite code is invalid or unavailable',
          reason: result.reason,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      applied: true,
      plan: result.grantedPlan,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to redeem invite code:', error);
    return NextResponse.json({ message: 'Failed to redeem invite code' }, { status: 500 });
  }
}
