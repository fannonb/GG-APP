-- AlterTable
ALTER TABLE "ProviderPayoutAccount" ADD COLUMN "mpesaType" TEXT;
ALTER TABLE "ProviderPayoutAccount" ADD COLUMN "paybillNumber" TEXT;
ALTER TABLE "ProviderPayoutAccount" ADD COLUMN "bankName" TEXT;
ALTER TABLE "ProviderPayoutAccount" ADD COLUMN "branch" TEXT;
ALTER TABLE "ProviderPayoutAccount" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ProviderPayoutAccount" ADD COLUMN "swiftCode" TEXT;
