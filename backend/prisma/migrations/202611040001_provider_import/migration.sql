ALTER TABLE "ProviderApplication" ADD COLUMN "importedAt" TIMESTAMP(3), ADD COLUMN "activationTokenHash" TEXT, ADD COLUMN "activationExpiresAt" TIMESTAMP(3), ADD COLUMN "invitedAt" TIMESTAMP(3), ADD COLUMN "activatedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "ProviderApplication_activationTokenHash_key" ON "ProviderApplication"("activationTokenHash");
