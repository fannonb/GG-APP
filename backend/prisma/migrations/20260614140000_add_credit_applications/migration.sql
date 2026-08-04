-- CreateEnum
CREATE TYPE "CreditApplicationType" AS ENUM ('INITIAL', 'INCREASE');

-- CreateEnum
CREATE TYPE "CreditApplicationStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CreditApplication" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "type" "CreditApplicationType" NOT NULL,
    "status" "CreditApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "financePartnerId" TEXT NOT NULL,
    "employment" TEXT NOT NULL,
    "monthlyIncome" DECIMAL(12,2) NOT NULL,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "reason" TEXT,
    "notes" TEXT,
    "declineReason" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditApplication_reference_key" ON "CreditApplication"("reference");

-- CreateIndex
CREATE INDEX "CreditApplication_patientUserId_submittedAt_idx" ON "CreditApplication"("patientUserId", "submittedAt");

-- CreateIndex
CREATE INDEX "CreditApplication_status_submittedAt_idx" ON "CreditApplication"("status", "submittedAt");

-- AddForeignKey
ALTER TABLE "CreditApplication" ADD CONSTRAINT "CreditApplication_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditApplication" ADD CONSTRAINT "CreditApplication_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
