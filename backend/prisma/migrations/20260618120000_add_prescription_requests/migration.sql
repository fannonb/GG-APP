-- CreateEnum
CREATE TYPE "PrescriptionRequestStatus" AS ENUM ('SUBMITTED', 'QUOTED', 'PREPARING', 'READY', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrescriptionFulfillmentMode" AS ENUM ('PICKUP', 'DELIVERY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PRESCRIPTION';

-- CreateTable
CREATE TABLE "PrescriptionRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "beneficiaryId" TEXT,
    "sourceAppointmentId" TEXT,
    "status" "PrescriptionRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "fulfillmentMode" "PrescriptionFulfillmentMode" NOT NULL DEFAULT 'PICKUP',
    "deliveryAddress" TEXT,
    "patientNotes" TEXT,
    "pharmacyNotes" TEXT,
    "prescriptionAttachment" JSONB NOT NULL,
    "quotedItems" JSONB,
    "quotedAmount" DECIMAL(12,2),
    "quotedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "forSelf" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "prescriptionRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PrescriptionRequest_reference_key" ON "PrescriptionRequest"("reference");

-- CreateIndex
CREATE INDEX "PrescriptionRequest_providerId_status_idx" ON "PrescriptionRequest"("providerId", "status");

-- CreateIndex
CREATE INDEX "PrescriptionRequest_patientUserId_createdAt_idx" ON "PrescriptionRequest"("patientUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_prescriptionRequestId_key" ON "Invoice"("prescriptionRequestId");

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_sourceAppointmentId_fkey" FOREIGN KEY ("sourceAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_prescriptionRequestId_fkey" FOREIGN KEY ("prescriptionRequestId") REFERENCES "PrescriptionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
