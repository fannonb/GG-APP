-- Each market has one lender: Equity Bank in Kenya, Moneymart in Zimbabwe and Zambia.
UPDATE "PatientProfile"
SET "financePartnerId" = 'equity'
WHERE "countryCode" = 'KE'
  AND "financePartnerId" IS NOT NULL
  AND lower("financePartnerId") <> 'equity';

UPDATE "PatientProfile"
SET "financePartnerId" = 'moneymart'
WHERE "countryCode" IN ('ZW', 'ZM')
  AND "financePartnerId" IS NOT NULL
  AND lower("financePartnerId") <> 'moneymart';

-- Applications still under review go to the lender for the patient's country.
UPDATE "CreditApplication" AS ca
SET "financePartnerId" = CASE WHEN pp."countryCode" = 'KE' THEN 'equity' ELSE 'moneymart' END
FROM "PatientProfile" AS pp
WHERE ca."patientUserId" = pp."userId"
  AND ca."status" = 'SUBMITTED';
