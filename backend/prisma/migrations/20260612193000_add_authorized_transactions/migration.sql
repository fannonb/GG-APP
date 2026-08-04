ALTER TYPE "TransactionStatus" ADD VALUE 'AUTHORIZED';

ALTER TABLE "Transaction" ADD COLUMN "invoiceId" TEXT;

CREATE UNIQUE INDEX "Transaction_invoiceId_key" ON "Transaction"("invoiceId");

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Transaction" (
  "id",
  "patientUserId",
  "providerId",
  "invoiceId",
  "amount",
  "currency",
  "status",
  "service",
  "providerNameSnapshot",
  "occurredAt"
)
SELECT
  concat('txn-auth-', i."reference") AS "id",
  i."patientUserId",
  i."providerId",
  i."id" AS "invoiceId",
  i."amount",
  'USD' AS "currency",
  CASE
    WHEN i."status" = 'PAID' THEN 'COMPLETED'
    ELSE 'AUTHORIZED'
  END::"TransactionStatus" AS "status",
  COALESCE(
    (
      SELECT ili."name"
      FROM "InvoiceLineItem" ili
      WHERE ili."invoiceId" = i."id"
      ORDER BY ili."id" ASC
      LIMIT 1
    ),
    'Invoice Authorization'
  ) AS "service",
  p."name" AS "providerNameSnapshot",
  COALESCE(i."paidAt", i."paymentAuthorizedAt", i."updatedAt", i."submittedAt", NOW()) AS "occurredAt"
FROM "Invoice" i
JOIN "Provider" p ON p."id" = i."providerId"
WHERE i."status" IN ('AUTHORIZED', 'PAID')
  AND NOT EXISTS (
    SELECT 1
    FROM "Transaction" t
    WHERE t."invoiceId" = i."id"
  );
