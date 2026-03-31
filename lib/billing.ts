import type {
  BillingInterval,
  PromoCodeType,
  SubscriptionPlan,
  SubscriptionStatus,
  UsageEventType,
} from '@prisma/client';
import Stripe from 'stripe';

import { prisma } from './prisma';
import { getStripeClient } from './stripe';
import { getCurrentMonthUsageCount } from './usage';

export type CheckoutInterval = 'monthly' | 'yearly';
export type BillablePlan = Extract<SubscriptionPlan, 'COMPOSER' | 'STUDIO'>;
type PromoCodeValidationFailureReason =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'max_redemptions_reached'
  | 'single_use_already_redeemed'
  | 'plan_not_allowed'
  | 'interval_not_allowed'
  | 'invalid_type'
  | 'missing_stripe_promotion_code_id';

type PromoCodeValidationResult =
  | {
      isValid: true;
      code: string;
      stripePromotionCodeId: string;
      promoCodeId: string;
    }
  | {
      isValid: false;
      reason: PromoCodeValidationFailureReason;
    };

type StripePriceEnvMap = Record<BillablePlan, Record<CheckoutInterval, string>>;

const BILLABLE_PLANS = ['COMPOSER', 'STUDIO'] as const satisfies readonly BillablePlan[];
const BILLING_INTERVAL_BY_CHECKOUT_INTERVAL = {
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
} as const satisfies Record<CheckoutInterval, BillingInterval>;
const SUBSCRIPTION_STATUS_BY_STRIPE_STATUS = {
  active: 'ACTIVE',
  trialing: 'TRIALING',
  past_due: 'PAST_DUE',
  unpaid: 'PAST_DUE',
  incomplete: 'PAST_DUE',
  canceled: 'CANCELED',
  incomplete_expired: 'CANCELED',
  paused: 'CANCELED',
} as const satisfies Partial<Record<Stripe.Subscription.Status, SubscriptionStatus>>;
const AI_GENERATION_USAGE_EVENT = 'AI_GENERATION' as UsageEventType;

const STRIPE_PRICE_ENV_BY_PLAN: StripePriceEnvMap = {
  COMPOSER: {
    monthly: 'STRIPE_COMPOSER_MONTHLY_PRICE_ID',
    yearly: 'STRIPE_COMPOSER_YEARLY_PRICE_ID',
  },
  STUDIO: {
    monthly: 'STRIPE_STUDIO_MONTHLY_PRICE_ID',
    yearly: 'STRIPE_STUDIO_YEARLY_PRICE_ID',
  },
};

export function isBillablePlan(value: string): value is BillablePlan {
  return value === 'COMPOSER' || value === 'STUDIO';
}

export function isCheckoutInterval(value: string): value is CheckoutInterval {
  return value === 'monthly' || value === 'yearly';
}

export function getBillingInterval(interval: CheckoutInterval): BillingInterval {
  return BILLING_INTERVAL_BY_CHECKOUT_INTERVAL[interval];
}

export function normalizePromoCode(rawCode: string): string {
  return rawCode.trim().toUpperCase();
}

function includesPlanRestriction(allowedPlans: SubscriptionPlan[], plan: BillablePlan): boolean {
  return allowedPlans.length === 0 || allowedPlans.includes(plan);
}

function includesIntervalRestriction(
  allowedIntervals: BillingInterval[],
  interval: BillingInterval,
): boolean {
  return allowedIntervals.length === 0 || allowedIntervals.includes(interval);
}

function isDiscountPromoCode(type: PromoCodeType): boolean {
  return type === 'DISCOUNT';
}

export async function validatePromoCodeForCheckout(options: {
  rawCode: string;
  plan: BillablePlan;
  interval: CheckoutInterval;
  userId: string;
}): Promise<PromoCodeValidationResult> {
  const normalizedCode = normalizePromoCode(options.rawCode);
  if (!normalizedCode) {
    return { isValid: false, reason: 'not_found' };
  }

  const billingInterval = getBillingInterval(options.interval);
  const code = await prisma.promoCode.findUnique({
    where: { code: normalizedCode },
    select: {
      id: true,
      type: true,
      isActive: true,
      startsAt: true,
      expiresAt: true,
      maxRedemptions: true,
      currentRedemptions: true,
      isSingleUse: true,
      allowedPlans: true,
      allowedBillingIntervals: true,
      stripePromotionCodeId: true,
    },
  });

  if (!code) {
    return { isValid: false, reason: 'not_found' };
  }

  if (!isDiscountPromoCode(code.type)) {
    return { isValid: false, reason: 'invalid_type' };
  }

  if (!code.isActive) {
    return { isValid: false, reason: 'inactive' };
  }

  const now = new Date();
  if (code.startsAt && code.startsAt > now) {
    return { isValid: false, reason: 'not_started' };
  }

  if (code.expiresAt && code.expiresAt <= now) {
    return { isValid: false, reason: 'expired' };
  }

  if (code.maxRedemptions !== null && code.currentRedemptions >= code.maxRedemptions) {
    return { isValid: false, reason: 'max_redemptions_reached' };
  }

  if (!includesPlanRestriction(code.allowedPlans, options.plan)) {
    return { isValid: false, reason: 'plan_not_allowed' };
  }

  if (!includesIntervalRestriction(code.allowedBillingIntervals, billingInterval)) {
    return { isValid: false, reason: 'interval_not_allowed' };
  }

  if (code.isSingleUse) {
    const existingRedemption = await prisma.promoCodeRedemption.findUnique({
      where: {
        promoCodeId_userId: {
          promoCodeId: code.id,
          userId: options.userId,
        },
      },
      select: { id: true },
    });

    if (existingRedemption) {
      return { isValid: false, reason: 'single_use_already_redeemed' };
    }
  }

  if (!code.stripePromotionCodeId) {
    return { isValid: false, reason: 'missing_stripe_promotion_code_id' };
  }

  return {
    isValid: true,
    code: normalizedCode,
    stripePromotionCodeId: code.stripePromotionCodeId,
    promoCodeId: code.id,
  };
}

export function getPrimaryPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price.id ?? null;
}

export function getCheckoutPriceId(plan: BillablePlan, interval: CheckoutInterval): string {
  const envName = STRIPE_PRICE_ENV_BY_PLAN[plan][interval];
  const value = process.env[envName];

  if (!value) {
    throw new Error(`${envName} is not configured`);
  }

  return value;
}

export function resolvePlanFromPriceId(priceId: string | null | undefined): BillablePlan | null {
  if (!priceId) {
    return null;
  }

  for (const plan of BILLABLE_PLANS) {
    for (const interval of ['monthly', 'yearly'] as const) {
      if (process.env[STRIPE_PRICE_ENV_BY_PLAN[plan][interval]] === priceId) {
        return plan;
      }
    }
  }

  return null;
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  return SUBSCRIPTION_STATUS_BY_STRIPE_STATUS[status] ?? 'CANCELED';
}

export function getAppUrl(origin?: string): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (origin) {
    return origin;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}

export async function ensureStripeCustomerForUser(user: {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function updateUserStripeCustomerId(options: {
  userId: string;
  stripeCustomerId: string;
}) {
  return prisma.user.update({
    where: { id: options.userId },
    data: { stripeCustomerId: options.stripeCustomerId },
  });
}

export async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const stripePriceId = getPrimaryPriceId(subscription);
  const plan = resolvePlanFromPriceId(stripePriceId);
  const subscriptionPeriod = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
    cancel_at_period_end?: boolean | null;
  };

  if (!plan) {
    throw new Error(`Unsupported Stripe price ID: ${stripePriceId ?? 'missing'}`);
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`No user found for Stripe customer ${stripeCustomerId}`);
  }

  const interval = subscription.items.data[0]?.price.recurring?.interval;
  const billingInterval = interval === 'year' ? 'YEARLY' : interval === 'month' ? 'MONTHLY' : null;
  const currentPeriodStart = subscriptionPeriod.current_period_start;
  const currentPeriodEnd = subscriptionPeriod.current_period_end;

  if (typeof currentPeriodStart !== 'number' || typeof currentPeriodEnd !== 'number') {
    throw new Error(`Stripe subscription ${subscription.id} is missing current period boundaries`);
  }

  return prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: stripePriceId ?? undefined,
      plan,
      billingInterval: billingInterval ?? undefined,
      status: mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscriptionPeriod.cancel_at_period_end ?? false,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: stripePriceId ?? undefined,
      plan,
      billingInterval,
      status: mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscriptionPeriod.cancel_at_period_end ?? false,
    },
  });
}

export async function recordPromoCodeRedemptionFromCheckout(options: {
  rawCode: string;
  userId: string;
  checkoutSessionId: string;
  stripeSubscriptionId?: string | null;
}) {
  const normalizedCode = normalizePromoCode(options.rawCode);
  if (!normalizedCode) {
    return null;
  }

  const code = await prisma.promoCode.findUnique({
    where: { code: normalizedCode },
    select: {
      id: true,
      stripePromotionCodeId: true,
    },
  });

  if (!code) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const existingRedemption = await tx.promoCodeRedemption.findUnique({
      where: {
        promoCodeId_userId: {
          promoCodeId: code.id,
          userId: options.userId,
        },
      },
      select: { id: true },
    });

    if (!existingRedemption) {
      await tx.promoCodeRedemption.create({
        data: {
          promoCodeId: code.id,
          userId: options.userId,
          status: 'REDEEMED',
          checkoutSessionId: options.checkoutSessionId,
          stripeSubscriptionId: options.stripeSubscriptionId ?? null,
        },
      });

      await tx.promoCode.update({
        where: { id: code.id },
        data: {
          currentRedemptions: {
            increment: 1,
          },
        },
      });
    }

    if (options.stripeSubscriptionId) {
      await tx.subscription.updateMany({
        where: {
          userId: options.userId,
          stripeSubscriptionId: options.stripeSubscriptionId,
        },
        data: {
          appliedPromoCode: normalizedCode,
          stripePromotionCodeId: code.stripePromotionCodeId ?? undefined,
        },
      });
    }

    return {
      code: normalizedCode,
      promoCodeId: code.id,
    };
  });
}

export async function getBillingStatusForUser(userId: string) {
  const [user, aiGenerationsUsed] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        planOverride: true,
        stripeCustomerId: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            billingInterval: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            stripePriceId: true,
            stripeSubscriptionId: true,
          },
        },
      },
    }),
    getCurrentMonthUsageCount(userId, AI_GENERATION_USAGE_EVENT),
  ]);

  return {
    user,
    aiGenerationsUsed,
  };
}
