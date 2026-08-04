-- AlterTable PatientProfile: residence tracking (local vs abroad)
ALTER TABLE "PatientProfile" ADD COLUMN "residenceCountry" TEXT;
ALTER TABLE "PatientProfile" ADD COLUMN "residesAbroad" BOOLEAN NOT NULL DEFAULT false;

-- Backfill residence from existing market country
UPDATE "PatientProfile" p
SET "residenceCountry" = CASE p."countryCode"
  WHEN 'KE' THEN 'Kenya'
  WHEN 'ZW' THEN 'Zimbabwe'
  WHEN 'ZM' THEN 'Zambia'
  ELSE COALESCE(u."country", p."countryCode")
END
FROM "User" u
WHERE u."id" = p."userId";

-- AlterTable Beneficiary: country of residence within operating markets
ALTER TABLE "Beneficiary" ADD COLUMN "countryCode" TEXT;

-- Backfill beneficiary country from the patient's market country
UPDATE "Beneficiary" b
SET "countryCode" = p."countryCode"
FROM "PatientProfile" p
WHERE p."userId" = b."patientUserId";

-- Require countryCode going forward
ALTER TABLE "Beneficiary" ALTER COLUMN "countryCode" SET NOT NULL;
