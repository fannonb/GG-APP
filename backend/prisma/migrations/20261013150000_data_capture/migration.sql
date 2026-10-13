-- Data capture for admin insights: condition category on visits, beneficiary
-- gender, repayment preference on credit applications, provider region, and
-- in-app satisfaction ratings.
ALTER TABLE "ProviderVisit" ADD COLUMN "conditionCategory" TEXT;
ALTER TABLE "Beneficiary" ADD COLUMN "gender" TEXT;
ALTER TABLE "CreditApplication" ADD COLUMN "repaymentMethod" TEXT;
ALTER TABLE "Provider" ADD COLUMN "region" TEXT;

CREATE TABLE "AppFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "context" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AppFeedback_createdAt_idx" ON "AppFeedback"("createdAt");
ALTER TABLE "AppFeedback" ADD CONSTRAINT "AppFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Providers approved before region was stored on the provider: copy the
-- region given on their application, when there was one.
UPDATE "Provider" p SET "region" = a."region"
FROM "ProviderApplication" a
WHERE p."applicationId" = a."id" AND p."region" IS NULL AND a."region" IS NOT NULL;
