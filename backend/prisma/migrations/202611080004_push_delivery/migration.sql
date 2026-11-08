ALTER TABLE "Notification" ADD COLUMN "pushProcessedAt" TIMESTAMP(3),
                           ADD COLUMN "pushClaimedAt" TIMESTAMP(3);
-- Start with future notifications only; do not replay the historical inbox.
UPDATE "Notification" SET "pushProcessedAt" = CURRENT_TIMESTAMP;
CREATE INDEX "Notification_pushProcessedAt_createdAt_idx" ON "Notification"("pushProcessedAt", "createdAt");

CREATE TABLE "PushReceipt" (
  "id" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "checkAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PushReceipt_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "PushDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PushReceipt_checkAt_idx" ON "PushReceipt"("checkAt");
