-- Per-provider invoice numbering: INV-<invoiceCode>-<year>-<sequence>. Codes are filled in by the app
-- (on approval, or the first time a provider needs an invoice number).
ALTER TABLE "Provider" ADD COLUMN "invoiceCode" TEXT;
CREATE UNIQUE INDEX "Provider_invoiceCode_key" ON "Provider"("invoiceCode");
