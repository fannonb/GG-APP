-- CreateEnum
CREATE TYPE "LedgerPinStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "LedgerAuditAction" AS ENUM ('PIN_CREATED', 'PIN_ROTATED', 'PIN_REVOKED', 'UNLOCK_SUCCESS', 'UNLOCK_FAILED', 'LEDGER_VIEWED', 'GRANT_REVOKED', 'GRANT_EXPIRED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEDGER';

-- AlterTable
ALTER TABLE "ProviderVisit" ADD COLUMN "beneficiaryId" TEXT;

-- CreateTable
CREATE TABLE "LedgerPin" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "status" "LedgerPinStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "LedgerPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccessGrant" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "LedgerAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccessAudit" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "providerId" INTEGER,
    "action" "LedgerAuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerPin_patientUserId_key" ON "LedgerPin"("patientUserId");

-- CreateIndex
CREATE INDEX "LedgerAccessGrant_patientUserId_providerId_idx" ON "LedgerAccessGrant"("patientUserId", "providerId");

-- CreateIndex
CREATE INDEX "LedgerAccessGrant_expiresAt_idx" ON "LedgerAccessGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "LedgerAccessAudit_patientUserId_createdAt_idx" ON "LedgerAccessAudit"("patientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderVisit_patientUserId_createdAt_idx" ON "ProviderVisit"("patientUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProviderVisit" ADD CONSTRAINT "ProviderVisit_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerPin" ADD CONSTRAINT "LedgerPin_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccessGrant" ADD CONSTRAINT "LedgerAccessGrant_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccessGrant" ADD CONSTRAINT "LedgerAccessGrant_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccessAudit" ADD CONSTRAINT "LedgerAccessAudit_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccessAudit" ADD CONSTRAINT "LedgerAccessAudit_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
