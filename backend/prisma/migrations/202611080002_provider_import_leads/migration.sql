-- Outscraper imports: dedupe by Google place id, keep road/website, and hold rows without an email as leads.
ALTER TABLE "ProviderApplication" ADD COLUMN "road" TEXT, ADD COLUMN "website" TEXT, ADD COLUMN "googlePlaceId" TEXT;
CREATE UNIQUE INDEX "ProviderApplication_googlePlaceId_key" ON "ProviderApplication"("googlePlaceId");

CREATE TYPE "ProviderImportLeadStatus" AS ENUM ('NEEDS_EMAIL', 'IMPORTED', 'DISMISSED');

CREATE TABLE "ProviderImportLead" (
    "id" TEXT NOT NULL,
    "googlePlaceId" TEXT,
    "practiceName" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "serviceTypes" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ProviderImportLeadStatus" NOT NULL DEFAULT 'NEEDS_EMAIL',
    "applicationId" TEXT,
    "importedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderImportLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderImportLead_googlePlaceId_key" ON "ProviderImportLead"("googlePlaceId");
CREATE UNIQUE INDEX "ProviderImportLead_applicationId_key" ON "ProviderImportLead"("applicationId");
CREATE INDEX "ProviderImportLead_status_createdAt_idx" ON "ProviderImportLead"("status", "createdAt");
