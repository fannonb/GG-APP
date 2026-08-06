import type { CountryCode } from '@/config/countries'
import type { Patient } from '@/types/user.types'
import type { UserRole } from '@/types/user.types'

export interface AuthSession {
  accessToken: string
  refreshToken: string
  role: UserRole
  expiresAt: number
}

export interface LoginPayload {
  email: string
  password: string
  role: 'patient' | 'sp' | 'admin'
}

export interface RegisterPatientPayload {
  firstName: string
  lastName: string
  email: string
  country: string
  phone: string
  dob: string
  nationalId: string
  /** Required unless googleIdToken is supplied. */
  password?: string
  /** Present when the patient started registration via "Continue with Google". */
  googleIdToken?: string
}

export interface RegisterPatientResponse {
  message: string
  verificationToken?: string
  session?: AuthSession
}

export interface GoogleAuthPayload {
  code: string
  redirectUri: string
  /** PKCE verifier for web/mobile authorization-code flows (S256). */
  codeVerifier?: string
}

export interface GoogleAuthSessionResult extends AuthSession {
  needsRegistration: false
}

export interface GoogleAuthRegistrationResult {
  needsRegistration: true
  firstName: string
  lastName: string
  email: string
  googleIdToken: string
}

export type GoogleAuthResult = GoogleAuthSessionResult | GoogleAuthRegistrationResult

export interface VerifyEmailResponse {
  message: string
}

export interface ForgotPasswordResponse {
  message: string
  resetUrl?: string
}

export interface ResetPasswordResponse {
  message: string
}

export interface DocumentMetadataPayload {
  kind: 'logo' | 'license' | 'supporting' | 'invoice_pdf'
  originalName: string
  mimeType: string
  sizeBytes: number
  displaySize: string
  storageKey: string
}

export interface ProviderOpeningHoursEntry {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  status: 'open' | 'closed'
  from?: string
  to?: string
}

export interface ProviderLocationPayload {
  label?: string
  address: string
  city?: string
  region?: string
  lat?: number
  lng?: number
}

export interface ProviderPayoutMethodPayload {
  method: 'mpesa' | 'bank' | 'mobile_money'
  summary?: string
  accountNumber?: string
  accountName?: string
  bankName?: string
  bankBranch?: string
}

export interface RegisterSPPayload {
  practiceName: string
  email: string
  emailSecondary?: string
  phone: string
  password: string
  country: string
  serviceTypes: string[]
  licenseNumber: string
  hours: ProviderOpeningHoursEntry[]
  location: ProviderLocationPayload
  payoutMethod: ProviderPayoutMethodPayload
  documents: DocumentMetadataPayload[]
}

export interface RegisterSPResponse {
  message: string
  applicationId: string
  status: 'pending' | 'info_requested' | 'approved' | 'rejected'
}

export interface SPApplicationStatusResponse {
  applicationId: string
  status: 'pending' | 'info_requested' | 'approved' | 'rejected'
  note?: string | null
  submittedAt: string
  decidedAt: string | null
}

export interface AuthorizePaymentPayload {
  invoiceId: string
  pin: string
  step: number
}

export interface SetupPaymentPinPayload {
  pin: string
  confirmPin: string
  currentPin?: string
}

export interface SetupPaymentPinResult {
  configured: boolean
  message: string
}

export interface ChangePatientPasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePatientPasswordResult {
  message: string
}

export interface AppointmentAttachmentPayload {
  name: string
  type: 'pdf' | 'image' | 'document'
  size: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  dataUrl?: string
}

export interface PatientUserProfile extends Omit<Patient, 'dateOfBirth'> {
  dateOfBirth?: string
  countryCode: CountryCode
  country: string
  residenceCountry?: string
  residesAbroad?: boolean
  creditStatus: 'approved' | 'pending' | 'rejected' | 'not_applied'
  memberSince: string
  hasPaymentPin: boolean
}

export interface PatientBeneficiary {
  id: string
  name: string
  relation: string
  dob: string
  countryCode: CountryCode
  nationalId: string
  age: number
}

export interface PatientProfileResponse {
  user: PatientUserProfile
  beneficiaries: PatientBeneficiary[]
}

export interface UpdatePatientProfilePayload {
  name: string
  email: string
  phone: string
  beneficiariesEnabled?: boolean
  residenceCountryCode?: string
  residenceCountryName?: string
}

export interface UpsertBeneficiaryPayload {
  name: string
  relation: string
  dob: string
  countryCode: CountryCode
  nationalId?: string
}

export interface CreateAppointmentPayload {
  providerId: number
  description: string
  date: string
  time: string
  forSelf: boolean
  beneficiaryId?: string
  selectedServices?: string[]
  address?: string
  attachments?: AppointmentAttachmentPayload[]
}

export interface CreateAppointmentResult {
  id: string
  provider: string
  status: 'pending'
  date: string
  time: string
  service: string
  for: string
  message: string
}

export interface CancelPatientAppointmentPayload {
  reason: string
  note?: string
}

export interface InvoiceAttachmentMetadata {
  originalName: string
  mimeType: string
  sizeBytes: number
  displaySize: string
  storageKey: string
  dataUrl?: string
}

export interface UpsertSPInvoicePayload {
  appointmentId?: string
  prescriptionRequestId?: string
  invoiceNumber: string
  services: string[]
  /** Explicit per-service charges; must sum to `amount`. Falls back to an even split when omitted. */
  lineItems?: { name: string; amount: number }[]
  amount: number
  attachment?: InvoiceAttachmentMetadata
  attachmentBlobUrl?: string
  diagnosis?: string
  treatment?: string
  followUp?: string
  internalNote?: string
}

export interface ProviderProfileResponse {
  id: number
  name: string
  email: string
  phone: string
  category: string
  isPharmacyOnly: boolean
  about: string
  address: string
  country: string
  status: 'open' | 'closed'
  languages: string[]
  tags: string[]
  establishedYear: number | null
  lat: number | null
  lng: number | null
  openingHours: Record<string, { open: boolean; from: string; to: string }>
  license: string
  logoUrl?: string
}

export interface ProviderNotificationPreferences {
  newAppointmentEmail: boolean
  paymentEmail: boolean
  invoiceEmail: boolean
  disputeEmail: boolean
  systemEmail: boolean
}

export interface ProviderSessionInfo {
  id: string
  sessionId: string
  device: string
  location: string
  active: boolean
  time: string
  lastSeenAt: string
}

export interface ProviderPayoutAccount {
  id: string
  method: 'mpesa' | 'bank' | 'mobile_money'
  accountNumber: string
  accountName: string
  country: string
  isDefault: boolean
  status: 'active' | 'inactive'
  mpesaType?: 'paybill' | 'till'
  paybillNumber?: string
  bankName?: string
  branch?: string
  branchCode?: string
  swiftCode?: string
}

export interface ProviderSettingsResponse {
  profile: ProviderProfileResponse
  notificationPreferences: ProviderNotificationPreferences
  payoutAccounts: ProviderPayoutAccount[]
  sessions: ProviderSessionInfo[]
}

export interface UpdateProviderProfilePayload {
  about?: string
  languages?: string[]
  tags?: string[]
  address?: string
  lat?: number
  lng?: number
  establishedYear?: number
  status?: 'open' | 'closed'
  country?: string
  phone?: string
  category?: string
  logoUrl?: string
  openingHours?: Record<string, { open: boolean; from: string; to: string }>
}

export interface ChangeProviderPasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface CreateProviderVisitPayload {
  appointmentId?: string
  beneficiaryId?: string
  patientId: string
  diagnosis?: string
  treatment?: string
  followUp?: string
  internalNote?: string
  services?: string[]
  vitals: {
    bp: string
    temp: string
    glucose: string
    sats: string
  }
}

export interface CreateProviderVisitResponse {
  id: string
  patientId: string
  appointmentId?: string | null
  beneficiaryId?: string | null
  diagnosis?: string | null
  treatment?: string | null
  followUp?: string | null
  internalNote?: string | null
  services: string[]
  vitals: Record<string, string>
  createdAt: string
}

export interface ProviderVisitRecord {
  id: string
  patientId: string
  appointmentId?: string
  beneficiaryId: string | null
  forBeneficiary: string | null
  service: string
  diagnosis: string
  treatment: string
  followUp: string
  internalNote: string
  services: string[]
  vitals: Record<string, string>
  createdAt: string
}

export interface UpdateSPAppointmentStatusPayload {
  status: 'confirmed' | 'cancelled'
}

export interface RescheduleSPAppointmentPayload {
  date: string
  time: string
  note?: string
}

export interface UpsertProviderPayoutAccountPayload {
  method: 'mpesa' | 'bank' | 'mobile_money'
  accountNumber: string
  accountName: string
  country: string
  isDefault?: boolean
  mpesaType?: 'paybill' | 'till'
  paybillNumber?: string
  bankName?: string
  branch?: string
  branchCode?: string
  swiftCode?: string
}

export interface ProviderPasswordChangeResponse {
  message: string
}

export interface ProviderSessionRevokeResponse {
  message: string
}

export interface DeleteProviderPayoutAccountResponse {
  message: string
}

export interface AdminApplicationActionPayload {
  note?: string
}

export interface DeleteAdminProviderResponse {
  message: string
}

export interface DeleteAdminUserResponse {
  message: string
}

export interface AuthorizePaymentResult {
  success: boolean
  complete: boolean
  attemptsRemaining?: number
  lockedUntil?: number
  message?: string
  walletAmountPaid?: number
  offAppAmountDue?: number
  invoiceAmount?: number
}

export interface SubmitReviewPayload {
  providerId: number
  invoiceId: string
  rating: number
  text?: string
  providerName?: string
}

export interface ApiErrorBody {
  message?: string
  statusCode?: number
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
