-- Admin user management: suspension reason, email change requests, application message thread.
ALTER TABLE "User" ADD COLUMN "suspendedReason" TEXT;
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);

CREATE TYPE "EmailChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TABLE "EmailChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentEmail" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "reason" TEXT,
    "status" "EmailChangeStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailChangeRequest_status_createdAt_idx" ON "EmailChangeRequest"("status", "createdAt");
CREATE INDEX "EmailChangeRequest_userId_createdAt_idx" ON "EmailChangeRequest"("userId", "createdAt");
ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "ApplicationMessageAuthor" AS ENUM ('ADMIN', 'PROVIDER');
CREATE TABLE "ProviderApplicationMessage" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "author" "ApplicationMessageAuthor" NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProviderApplicationMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProviderApplicationMessage_applicationId_createdAt_idx" ON "ProviderApplicationMessage"("applicationId", "createdAt");
ALTER TABLE "ProviderApplicationMessage" ADD CONSTRAINT "ProviderApplicationMessage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ProviderApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
