-- AlterTable
ALTER TABLE "ProviderReview" ADD COLUMN IF NOT EXISTS "reference" TEXT;

-- Backfill existing reviews
UPDATE "ProviderReview"
SET "reference" = 'REV-2026-' || LPAD("id", 4, '0')
WHERE "reference" IS NULL;

ALTER TABLE "ProviderReview" ALTER COLUMN "reference" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderReview_reference_key" ON "ProviderReview"("reference");

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "reference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_reference_key" ON "Transaction"("reference");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReferenceSequence" (
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceSequence_pkey" PRIMARY KEY ("type","year")
);
