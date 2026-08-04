-- Add persisted appointment linkage for invoices.
ALTER TABLE "Invoice"
ADD COLUMN "appointmentId" TEXT;

-- Link provider visits back to the canonical appointment record.
ALTER TABLE "ProviderVisit"
ADD CONSTRAINT "ProviderVisit_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Link invoices back to the canonical appointment record.
ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
