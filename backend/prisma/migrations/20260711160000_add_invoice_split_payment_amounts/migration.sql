-- Split payment: wallet covers available allocation; remainder settled off-app with provider.
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "walletAmountPaid" DECIMAL(12,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "offAppAmountDue" DECIMAL(12,2);
