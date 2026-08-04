-- Re-map legacy specialist providers to doctor before removing the enum value.
UPDATE "Provider"
SET category = 'DOCTOR'
WHERE category = 'SPECIALIST';

UPDATE "Provider"
SET categories = COALESCE(
  (
    SELECT array_agg(DISTINCT replaced)
    FROM (
      SELECT CASE WHEN cat = 'SPECIALIST' THEN 'DOCTOR' ELSE cat END AS replaced
      FROM unnest(categories) AS cat
    ) normalized
  ),
  ARRAY[]::text[]
)
WHERE 'SPECIALIST' = ANY(categories);

ALTER TYPE "ProviderCategory" RENAME TO "ProviderCategory_old";

CREATE TYPE "ProviderCategory" AS ENUM (
  'DOCTOR',
  'PHARMACY',
  'LABORATORY',
  'RADIOLOGY',
  'HOSPITAL',
  'CLINIC'
);

ALTER TABLE "Provider"
  ALTER COLUMN category TYPE "ProviderCategory"
  USING category::text::"ProviderCategory";

DROP TYPE "ProviderCategory_old";
