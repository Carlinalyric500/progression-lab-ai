-- Add invite access plan and promo-code foundation.
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'INVITE';

DO $$
BEGIN
  CREATE TYPE "PromoCodeType" AS ENUM ('DISCOUNT', 'INVITE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PromoRedemptionStatus" AS ENUM ('REDEEMED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "planOverrideExpiresAt" TIMESTAMP(3);

ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "appliedPromoCode" TEXT,
ADD COLUMN IF NOT EXISTS "stripePromotionCodeId" TEXT;

CREATE TABLE IF NOT EXISTS "PromoCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "PromoCodeType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "maxRedemptions" INTEGER,
  "currentRedemptions" INTEGER NOT NULL DEFAULT 0,
  "isSingleUse" BOOLEAN NOT NULL DEFAULT false,
  "allowedPlans" "SubscriptionPlan"[] NOT NULL,
  "allowedBillingIntervals" "BillingInterval"[] NOT NULL,
  "grantedPlan" "SubscriptionPlan",
  "inviteDurationDays" INTEGER,
  "maxSavedProgressions" INTEGER,
  "maxSavedArrangements" INTEGER,
  "aiGenerationsPerMonth" INTEGER,
  "stripePromotionCodeId" TEXT,
  "metadata" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PromoCodeRedemption" (
  "id" TEXT NOT NULL,
  "promoCodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "PromoRedemptionStatus" NOT NULL DEFAULT 'REDEEMED',
  "failureReason" TEXT,
  "checkoutSessionId" TEXT,
  "stripeSubscriptionId" TEXT,
  "metadata" JSONB,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PromoCodeRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX IF NOT EXISTS "PromoCode_type_isActive_expiresAt_idx" ON "PromoCode"("type", "isActive", "expiresAt");
CREATE INDEX IF NOT EXISTS "PromoCode_createdAt_idx" ON "PromoCode"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCodeRedemption_promoCodeId_userId_key" ON "PromoCodeRedemption"("promoCodeId", "userId");
CREATE INDEX IF NOT EXISTS "PromoCodeRedemption_userId_redeemedAt_idx" ON "PromoCodeRedemption"("userId", "redeemedAt");
CREATE INDEX IF NOT EXISTS "PromoCodeRedemption_promoCodeId_redeemedAt_idx" ON "PromoCodeRedemption"("promoCodeId", "redeemedAt");

CREATE INDEX IF NOT EXISTS "Subscription_appliedPromoCode_idx" ON "Subscription"("appliedPromoCode");

DO $$
BEGIN
  ALTER TABLE "PromoCode"
  ADD CONSTRAINT "PromoCode_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PromoCodeRedemption"
  ADD CONSTRAINT "PromoCodeRedemption_promoCodeId_fkey"
  FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PromoCodeRedemption"
  ADD CONSTRAINT "PromoCodeRedemption_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
