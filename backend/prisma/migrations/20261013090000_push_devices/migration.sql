-- Push notification devices: every browser (Web Push) and phone (Expo) a user has registered.
CREATE TYPE "PushChannel" AS ENUM ('WEB', 'EXPO');
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "PushChannel" NOT NULL,
    "address" TEXT NOT NULL,
    "keys" JSONB,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushDevice_address_key" ON "PushDevice"("address");
CREATE INDEX "PushDevice_userId_idx" ON "PushDevice"("userId");
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
