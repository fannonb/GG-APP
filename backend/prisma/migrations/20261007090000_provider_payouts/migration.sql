-- Provider payouts: recorded from the finance partner's banking API or manually by an admin.
CREATE TYPE "PayoutSource" AS ENUM ('PARTNER', 'MANUAL');
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "financePartnerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "source" "PayoutSource" NOT NULL,
    "amountMismatch" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "recordedByUserId" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payout_financePartnerId_reference_key" ON "Payout"("financePartnerId", "reference");
CREATE INDEX "Payout_providerId_paidAt_idx" ON "Payout"("providerId", "paidAt");
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD COLUMN "payoutId" TEXT;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
