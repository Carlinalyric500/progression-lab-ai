import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return secret;
}

export function getStripeWebhookSecrets(): string[] {
  const primary = getStripeWebhookSecret();
  const additional = process.env.STRIPE_WEBHOOK_SECRETS ?? '';

  const secrets = [
    primary,
    ...additional
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean),
  ];

  return Array.from(new Set(secrets));
}

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  stripeClient = new Stripe(getStripeSecretKey());
  return stripeClient;
}
