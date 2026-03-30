import { SubscriptionPlan } from '@prisma/client';
import { NextResponse } from 'next/server';

import { getAllTierConfigs } from '../../../lib/subscriptionConfig';

const PUBLIC_PLANS: SubscriptionPlan[] = [
  SubscriptionPlan.SESSION,
  SubscriptionPlan.COMPOSER,
  SubscriptionPlan.STUDIO,
];

export async function GET() {
  try {
    const configs = await getAllTierConfigs();
    const items = PUBLIC_PLANS.map((plan) => configs[plan]);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to fetch pricing tier configs:', error);
    return NextResponse.json({ message: 'Failed to fetch pricing tier configs' }, { status: 500 });
  }
}
