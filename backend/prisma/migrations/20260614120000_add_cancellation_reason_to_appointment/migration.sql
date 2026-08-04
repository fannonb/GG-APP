-- AlterTable: add cancellation reason and optional note to Appointment
ALTER TABLE "Appointment" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "cancellationNote"   TEXT;
