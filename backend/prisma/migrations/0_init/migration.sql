-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'SP', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED', 'NOT_APPLIED');

-- CreateEnum
CREATE TYPE "CreditApplicationType" AS ENUM ('INITIAL', 'INCREASE');

-- CreateEnum
CREATE TYPE "CreditApplicationStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderCategory" AS ENUM ('DOCTOR', 'PHARMACY', 'LABORATORY', 'RADIOLOGY', 'HOSPITAL', 'CLINIC');

-- CreateEnum
CREATE TYPE "ProviderOpenStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProviderLifecycleStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProviderApplicationStatus" AS ENUM ('PENDING', 'INFO_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderApplicationDocumentKind" AS ENUM ('LOGO', 'LICENSE', 'SUPPORTING', 'INVOICE_PDF');

-- CreateEnum
CREATE TYPE "ProviderPayoutMethod" AS ENUM ('MPESA', 'BANK', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "ProviderPayoutAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentMode" AS ENUM ('HOME_VISIT', 'IN_PERSON', 'TELEHEALTH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT', 'INVOICE', 'APPOINTMENT', 'CREDIT', 'SYSTEM', 'PRESCRIPTION', 'LEDGER');

-- CreateEnum
CREATE TYPE "LedgerPinStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "LedgerAuditAction" AS ENUM ('PIN_CREATED', 'PIN_ROTATED', 'PIN_REVOKED', 'UNLOCK_SUCCESS', 'UNLOCK_FAILED', 'LEDGER_VIEWED', 'GRANT_REVOKED', 'GRANT_EXPIRED');

-- CreateEnum
CREATE TYPE "PrescriptionRequestStatus" AS ENUM ('SUBMITTED', 'QUOTED', 'ACCEPTED', 'PREPARING', 'READY', 'FULFILLED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PrescriptionFulfillmentMode" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'PENDING', 'FAILED', 'AUTHORIZED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING_AUTH', 'AUTHORIZED', 'PAID', 'DISPUTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ServiceForType" AS ENUM ('SELF', 'BENEFICIARY');

-- CreateEnum
CREATE TYPE "NewsStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "paymentPinHash" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "phone" TEXT,
    "country" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "googleId" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProfile" (
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "countryCode" TEXT NOT NULL,
    "residenceCountry" TEXT,
    "residesAbroad" BOOLEAN NOT NULL DEFAULT false,
    "nationalIdEncrypted" TEXT NOT NULL,
    "nationalIdLast4" TEXT NOT NULL,
    "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creditUsed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creditAvailable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creditStatus" "CreditStatus" NOT NULL DEFAULT 'NOT_APPLIED',
    "financePartnerId" TEXT,
    "creditAccountRef" TEXT,
    "beneficiariesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "memberSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CreditApplication" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "type" "CreditApplicationType" NOT NULL,
    "status" "CreditApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "financePartnerId" TEXT NOT NULL,
    "employment" TEXT NOT NULL,
    "monthlyIncome" DECIMAL(12,2) NOT NULL,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "reason" TEXT,
    "notes" TEXT,
    "declineReason" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "countryCode" TEXT NOT NULL,
    "nationalIdEncrypted" TEXT,
    "nationalIdLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "authUserId" TEXT,
    "applicationId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProviderCategory" NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "about" TEXT,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "distanceKm" DECIMAL(5,2),
    "status" "ProviderOpenStatus" NOT NULL DEFAULT 'OPEN',
    "lifecycleStatus" "ProviderLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "hours" TEXT NOT NULL,
    "hoursJson" JSONB,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "license" TEXT,
    "logoUrl" TEXT,
    "country" TEXT,
    "tags" JSONB,
    "languages" JSONB,
    "establishedYear" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DECIMAL(10,6),
    "lng" DECIMAL(10,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ProviderApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "practiceName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailSecondary" TEXT,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "locationLabel" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "serviceTypes" JSONB NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "openingHours" JSONB NOT NULL,
    "payoutMethod" "ProviderPayoutMethod" NOT NULL,
    "payoutSummary" TEXT,
    "payoutDetails" JSONB,
    "decisionNote" TEXT,
    "lat" DECIMAL(10,6),
    "lng" DECIMAL(10,6),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" "ProviderApplicationDocumentKind" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "displaySize" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderNotificationPreference" (
    "id" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "newAppointmentEmail" BOOLEAN NOT NULL DEFAULT true,
    "paymentEmail" BOOLEAN NOT NULL DEFAULT true,
    "invoiceEmail" BOOLEAN NOT NULL DEFAULT true,
    "disputeEmail" BOOLEAN NOT NULL DEFAULT true,
    "systemEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderPayoutAccount" (
    "id" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "method" "ProviderPayoutMethod" NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProviderPayoutAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderPayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderVisit" (
    "id" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "beneficiaryId" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "followUp" TEXT,
    "internalNote" TEXT,
    "services" JSONB,
    "vitals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSessionAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "deviceLabel" TEXT NOT NULL,
    "locationLabel" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderSessionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderService" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "beneficiaryId" TEXT,
    "service" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeLabel" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "forSelf" BOOLEAN NOT NULL DEFAULT true,
    "mode" "AppointmentMode" NOT NULL DEFAULT 'IN_PERSON',
    "address" TEXT,
    "duration" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rescheduledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancellationNote" TEXT,
    "attachments" JSONB,
    "medicalHistory" JSONB,
    "allergies" JSONB,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "beneficiaryId" TEXT,
    "sourceAppointmentId" TEXT,
    "status" "PrescriptionRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "fulfillmentMode" "PrescriptionFulfillmentMode" NOT NULL DEFAULT 'PICKUP',
    "deliveryAddress" TEXT,
    "patientNotes" TEXT,
    "pharmacyNotes" TEXT,
    "prescriptionAttachment" JSONB NOT NULL,
    "quotedItems" JSONB,
    "quotedAmount" DECIMAL(12,2),
    "deliveryFee" DECIMAL(12,2),
    "quotedAt" TIMESTAMP(3),
    "quoteReviewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "readyAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "forSelf" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "reference" TEXT,
    "patientUserId" TEXT NOT NULL,
    "providerId" INTEGER,
    "invoiceId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL,
    "service" TEXT NOT NULL,
    "providerNameSnapshot" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "status" "NewsStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "appointmentId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING_AUTH',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "walletAmountPaid" DECIMAL(12,2),
    "offAppAmountDue" DECIMAL(12,2),
    "billedToName" TEXT NOT NULL,
    "billedToNationalId" TEXT NOT NULL,
    "serviceForType" "ServiceForType" NOT NULL,
    "serviceForName" TEXT NOT NULL,
    "serviceForRelation" TEXT,
    "serviceForAge" INTEGER,
    "paymentAuthorizedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "attachment" TEXT,
    "attachmentMetadata" JSONB,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "followUp" TEXT,
    "internalNote" TEXT,
    "disputedAt" TIMESTAMP(3),
    "adminApprovedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "disputeResolvedAt" TIMESTAMP(3),
    "providerDisputeResponse" TEXT,
    "providerDisputeProofMetadata" JSONB,
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prescriptionRequestId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderReview" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceSequence" (
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceSequence_pkey" PRIMARY KEY ("type","year")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerPin" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "status" "LedgerPinStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "LedgerPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccessGrant" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "LedgerAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccessAudit" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "providerId" INTEGER,
    "action" "LedgerAuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditApplication_reference_key" ON "CreditApplication"("reference");

-- CreateIndex
CREATE INDEX "CreditApplication_patientUserId_submittedAt_idx" ON "CreditApplication"("patientUserId", "submittedAt");

-- CreateIndex
CREATE INDEX "CreditApplication_status_submittedAt_idx" ON "CreditApplication"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_authUserId_key" ON "Provider"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_applicationId_key" ON "Provider"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderNotificationPreference_providerId_key" ON "ProviderNotificationPreference"("providerId");

-- CreateIndex
CREATE INDEX "ProviderVisit_patientUserId_createdAt_idx" ON "ProviderVisit"("patientUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSessionAudit_sessionId_key" ON "ProviderSessionAudit"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_reference_key" ON "Appointment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "PrescriptionRequest_reference_key" ON "PrescriptionRequest"("reference");

-- CreateIndex
CREATE INDEX "PrescriptionRequest_providerId_status_idx" ON "PrescriptionRequest"("providerId", "status");

-- CreateIndex
CREATE INDEX "PrescriptionRequest_patientUserId_createdAt_idx" ON "PrescriptionRequest"("patientUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_invoiceId_key" ON "Transaction"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_reference_key" ON "Invoice"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_prescriptionRequestId_key" ON "Invoice"("prescriptionRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderReview_reference_key" ON "ProviderReview"("reference");

-- CreateIndex
CREATE INDEX "ProviderReview_providerId_idx" ON "ProviderReview"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderReview_patientUserId_invoiceId_key" ON "ProviderReview"("patientUserId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerPin_patientUserId_key" ON "LedgerPin"("patientUserId");

-- CreateIndex
CREATE INDEX "LedgerAccessGrant_patientUserId_providerId_idx" ON "LedgerAccessGrant"("patientUserId", "providerId");

-- CreateIndex
CREATE INDEX "LedgerAccessGrant_expiresAt_idx" ON "LedgerAccessGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "LedgerAccessAudit_patientUserId_createdAt_idx" ON "LedgerAccessAudit"("patientUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditApplication" ADD CONSTRAINT "CreditApplication_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditApplication" ADD CONSTRAINT "CreditApplication_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "PatientProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_authUserId_fkey" FOREIGN KEY ("authUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ProviderApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderApplication" ADD CONSTRAINT "ProviderApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderApplicationDocument" ADD CONSTRAINT "ProviderApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ProviderApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderNotificationPreference" ADD CONSTRAINT "ProviderNotificationPreference_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPayoutAccount" ADD CONSTRAINT "ProviderPayoutAccount_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVisit" ADD CONSTRAINT "ProviderVisit_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVisit" ADD CONSTRAINT "ProviderVisit_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVisit" ADD CONSTRAINT "ProviderVisit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVisit" ADD CONSTRAINT "ProviderVisit_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSessionAudit" ADD CONSTRAINT "ProviderSessionAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_sourceAppointmentId_fkey" FOREIGN KEY ("sourceAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_prescriptionRequestId_fkey" FOREIGN KEY ("prescriptionRequestId") REFERENCES "PrescriptionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReview" ADD CONSTRAINT "ProviderReview_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReview" ADD CONSTRAINT "ProviderReview_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReview" ADD CONSTRAINT "ProviderReview_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerPin" ADD CONSTRAINT "LedgerPin_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccessGrant" ADD CONSTRAINT "LedgerAccessGrant_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccessGrant" ADD CONSTRAINT "LedgerAccessGrant_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccessAudit" ADD CONSTRAINT "LedgerAccessAudit_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccessAudit" ADD CONSTRAINT "LedgerAccessAudit_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

