-- CreateEnum
CREATE TYPE "MfaPolicy" AS ENUM ('NONE', 'OPTIONAL', 'REQUIRED_ADMIN');

-- CreateEnum
CREATE TYPE "MfaEnrollmentState" AS ENUM ('NONE', 'PENDING', 'ACTIVE');

-- CreateEnum
CREATE TYPE "WebAuthnFlowType" AS ENUM ('CUSTOMER_REGISTRATION', 'ADMIN_AUTHENTICATION', 'ADMIN_BOOTSTRAP_REGISTRATION');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "mfaPolicy" "MfaPolicy" NOT NULL DEFAULT 'NONE',
ADD COLUMN "mfaEnrollmentState" "MfaEnrollmentState" NOT NULL DEFAULT 'NONE',
ADD COLUMN "mfaEnabledAt" TIMESTAMP(3),
ADD COLUMN "lastMfaVerifiedAt" TIMESTAMP(3),
ADD COLUMN "mfaBypassUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "deviceType" TEXT,
    "backedUp" BOOLEAN,
    "transports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flowType" "WebAuthnFlowType" NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebAuthnCredential_credentialId_key" ON "WebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "WebAuthnCredential_userId_revokedAt_idx" ON "WebAuthnCredential"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "WebAuthnChallenge_userId_flowType_idx" ON "WebAuthnChallenge"("userId", "flowType");

-- CreateIndex
CREATE INDEX "WebAuthnChallenge_expiresAt_idx" ON "WebAuthnChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "WebAuthnCredential"
ADD CONSTRAINT "WebAuthnCredential_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAuthnChallenge"
ADD CONSTRAINT "WebAuthnChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

