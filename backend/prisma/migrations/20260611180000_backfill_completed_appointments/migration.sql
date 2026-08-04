-- Backfill completed appointments that already have a linked visit or invoice.
UPDATE "Appointment" AS a
SET "status" = 'COMPLETED'
WHERE a."status" IN ('REQUESTED', 'CONFIRMED')
  AND (
    EXISTS (
      SELECT 1
      FROM "ProviderVisit" AS v
      WHERE v."appointmentId" = a."id"
    )
    OR EXISTS (
      SELECT 1
      FROM "Invoice" AS i
      WHERE i."appointmentId" = a."id"
    )
  );
