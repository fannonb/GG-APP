-- CreateEnum
CREATE TYPE "PrescriptionOfferStatus" AS ENUM ('PENDING', 'QUOTED', 'DECLINED', 'SELECTED', 'CLOSED');

-- AlterEnum
ALTER TYPE "PrescriptionRequestStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "PrescriptionRequest" ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "searchLat" DECIMAL(10,6),
ADD COLUMN     "searchLng" DECIMAL(10,6),
ADD COLUMN     "searchRadiusKm" INTEGER,
ADD COLUMN     "widenedAt" TIMESTAMP(3),
ALTER COLUMN "providerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PrescriptionOffer" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "radiusKm" INTEGER NOT NULL,
    "distanceKm" DECIMAL(6,2) NOT NULL,
    "status" "PrescriptionOfferStatus" NOT NULL DEFAULT 'PENDING',
    "quotedItems" JSONB,
    "quotedAmount" DECIMAL(12,2),
    "deliveryFee" DECIMAL(12,2),
    "pharmacyNotes" TEXT,
    "quotedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrescriptionOffer_providerId_status_idx" ON "PrescriptionOffer"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PrescriptionOffer_requestId_providerId_key" ON "PrescriptionOffer"("requestId", "providerId");

-- CreateIndex
CREATE INDEX "PrescriptionRequest_status_searchRadiusKm_dispatchedAt_idx" ON "PrescriptionRequest"("status", "searchRadiusKm", "dispatchedAt");

-- AddForeignKey
ALTER TABLE "PrescriptionOffer" ADD CONSTRAINT "PrescriptionOffer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrescriptionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionOffer" ADD CONSTRAINT "PrescriptionOffer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

