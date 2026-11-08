-- Dashboard ads move from the admin's browser storage to the database so patients (web and mobile) receive them.
CREATE TYPE "AdBannerStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED');

CREATE TABLE "AdBanner" (
    "id" TEXT NOT NULL,
    "advertiserName" TEXT NOT NULL,
    "ctaUrl" TEXT NOT NULL,
    "desktopImage" JSONB,
    "mobileImage" JSONB,
    "status" "AdBannerStatus" NOT NULL DEFAULT 'DRAFT',
    "frequency" TEXT NOT NULL DEFAULT 'always',
    "startDate" DATE NOT NULL,
    "expiresAt" DATE NOT NULL,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdBanner_status_startDate_expiresAt_idx" ON "AdBanner"("status", "startDate", "expiresAt");
