-- CreateEnum
CREATE TYPE "ProviderCredentialStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "ProviderApplication" ADD COLUMN     "businessRegNumber" TEXT,
ADD COLUMN     "taxPin" TEXT;

-- AlterTable
ALTER TABLE "ProviderApplicationDocument" ADD COLUMN     "dataUrl" TEXT,
ALTER COLUMN "storageKey" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "providerId" INTEGER,
    "kind" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "holderName" TEXT,
    "expiresAt" TIMESTAMP(3),
    "documentId" TEXT,
    "status" "ProviderCredentialStatus" NOT NULL DEFAULT 'SUBMITTED',
    "note" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCredential_documentId_key" ON "ProviderCredential"("documentId");

-- CreateIndex
CREATE INDEX "ProviderCredential_applicationId_idx" ON "ProviderCredential"("applicationId");

-- CreateIndex
CREATE INDEX "ProviderCredential_providerId_idx" ON "ProviderCredential"("providerId");

-- CreateIndex
CREATE INDEX "ProviderCredential_expiresAt_idx" ON "ProviderCredential"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ProviderApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProviderApplicationDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

