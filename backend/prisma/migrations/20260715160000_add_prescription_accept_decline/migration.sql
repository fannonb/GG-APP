-- AlterEnum
ALTER TYPE "PrescriptionRequestStatus" ADD VALUE 'ACCEPTED';

-- AlterTable
ALTER TABLE "PrescriptionRequest" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "declineReason" TEXT,
ADD COLUMN     "declinedAt" TIMESTAMP(3);
