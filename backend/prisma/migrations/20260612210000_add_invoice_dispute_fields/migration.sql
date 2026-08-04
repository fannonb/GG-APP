-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "disputeResolvedAt" TIMESTAMP(3),
ADD COLUMN "providerDisputeResponse" TEXT,
ADD COLUMN "providerDisputeProofMetadata" JSONB;
