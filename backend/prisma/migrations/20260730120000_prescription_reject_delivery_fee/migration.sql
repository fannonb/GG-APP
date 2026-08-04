-- AlterEnum
ALTER TYPE "PrescriptionRequestStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- AlterTable
ALTER TABLE "PrescriptionRequest" ADD COLUMN IF NOT EXISTS "deliveryFee" DECIMAL(12,2);
