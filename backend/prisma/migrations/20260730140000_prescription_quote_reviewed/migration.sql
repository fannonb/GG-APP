-- Track when the patient has reviewed pharmacy pricing before surfacing invoice auth alerts.
ALTER TABLE "PrescriptionRequest" ADD COLUMN IF NOT EXISTS "quoteReviewedAt" TIMESTAMP(3);
