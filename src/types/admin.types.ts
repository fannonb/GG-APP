export type SPApplicationStatus = 'pending' | 'info_requested' | 'approved' | 'rejected'

export type AdminCountry = 'Kenya' | 'Zimbabwe' | 'Zambia'

export type AdminUserStatus = 'active' | 'suspended' | 'pending_verification'

export type CreditStatus = 'approved' | 'pending' | 'rejected' | 'not_applied'

export type ProviderStatus = 'active' | 'suspended'

export type AdminPaymentStatus = 'paid' | 'authorized' | 'pending' | 'failed'

export interface UploadedDocument {
  name: string
  type: 'pdf' | 'image'
  size: string
  uploadedAt: string
  kind?: 'logo' | 'license' | 'supporting' | 'invoice_pdf'
}

export interface DayHours {
  open: boolean
  from: string
  to: string
}

export interface AdminStats {
  pendingSPApps: number
  pendingCreditApps: number
  totalProviders: number
  totalPatients: number
  monthlyVolume: number
}

export interface SPApplication {
  id: string
  name: string
  serviceTypes: string[]
  country: string
  email: string
  emailSecondary?: string
  phone: string
  licenseNumber: string
  hours: Record<string, DayHours>
  paymentMethod: 'mpesa' | 'bank' | 'mobile_money'
  mpesaPaybill?: string
  bankName?: string
  bankAccount?: string
  bankBranch?: string
  documents: UploadedDocument[]
  submitted: string
  status: SPApplicationStatus
}

export interface AdminUser {
  id: string
  name: string
  email: string
  phone: string
  nationalId: string
  dob: string
  country: string
  creditStatus: CreditStatus
  creditLimit: number
  creditUsed: number
  financePartner?: 'moneymart' | 'equity'
  beneficiariesCount: number
  transactionCount: number
  memberSince: string
  status: AdminUserStatus
  idDocuments: UploadedDocument[]
}

export interface AdminProvider {
  id: string
  name: string
  type: string
  serviceTypes?: string[]
  country: string
  email: string
  emailSecondary?: string
  phone: string
  address?: string
  license: string
  status: ProviderStatus
  totalPatients: number
  totalEarnings: number
  pendingPayments: number
  joinedDate: string
  rating?: number
  hours?: Record<string, DayHours>
  paymentMethod?: 'mpesa' | 'bank' | 'mobile_money'
  mpesaPaybill?: string
  bankName?: string
  bankAccount?: string
  bankBranch?: string
  documents?: UploadedDocument[]
  description?: string
}

export interface AdminPayment {
  id: string
  invoiceId: string
  patient: string
  provider: string
  amount: number
  country: string
  date: string
  status: AdminPaymentStatus
  paymentRef?: string
}

export interface AdminPaymentVolumeSummary {
  country: string
  volume: number
  count: number
}

export interface AdminPaymentsResponse {
  items: AdminPayment[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: {
    totalTransactions: number
    volumeByCountry: AdminPaymentVolumeSummary[]
  }
}

export type AdminActivityCategory =
  | 'appointment'
  | 'invoice'
  | 'payment'
  | 'registration'

export interface AdminActivityItem {
  id: string
  actorType: 'patient' | 'provider'
  actorName: string
  country: string
  /** Full action description, e.g. "Appointment booked" */
  title: string
  /** Short highlighted action label, e.g. "Booked" */
  actionHighlight: string
  /** Primary reference code when available (appointment, invoice, etc.) */
  reference?: string
  /** Brief contextual summary (reason, practice name, payment ref, etc.) */
  summary?: string
  detail: string
  occurredAt: string
  category: AdminActivityCategory
}

export interface CountryStats {
  country: AdminCountry
  code: 'KE' | 'ZW' | 'ZM'
  currency: string
  currencySymbol: string
  patients: number
  providers: number
  volume: number
}

export interface CategoryStats {
  category: string
  providers: number
  patients: number
  volume: number
}

export interface MonthlyTrendPoint {
  month: string
  volume: number
  transactions: number
}

export interface AdminAnalyticsData {
  countryStats: CountryStats[]
  monthlyTrend: {
    all: MonthlyTrendPoint[]
    Zimbabwe: MonthlyTrendPoint[]
    Kenya: MonthlyTrendPoint[]
    Zambia: MonthlyTrendPoint[]
  }
  categoryStats: CategoryStats[]
  topProviders: AdminProvider[]
}

export interface ActivityEvent {
  id: string
  type: 'application' | 'payment' | 'user'
  message: string
  time: string
  link: string
}

export type AdBannerStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired'
export type AdFrequency   = 'always' | 'every_other' | 'every_third'

export interface AdBanner {
  id: string
  advertiserName: string    // internal label only — not shown to patients
  ctaUrl: string            // where clicking the banner navigates
  desktopImageUrl: string   // 1200 × 90 px image (PNG / JPG / WebP)
  mobileImageUrl: string    // 750 × 150 px image  (PNG / JPG / WebP)
  status: AdBannerStatus
  frequency: AdFrequency
  startDate: string         // YYYY-MM-DD
  expiresAt: string         // YYYY-MM-DD
  countries: string[]       // empty = all countries
  impressions: number
  clicks: number
  updatedAt: string         // ISO timestamp — most recently saved banner shows first
}
