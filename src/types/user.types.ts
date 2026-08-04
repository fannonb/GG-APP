import type { CountryCode } from '@/config/countries'

export type UserRole = 'patient' | 'sp' | 'admin'

export type CreditStatus = 'approved' | 'pending' | 'rejected' | 'not_applied'

export interface Patient {
  name: string
  email: string
  phone: string
  nationalId: string
  dateOfBirth?: string
  country: string
  countryCode: CountryCode
  /** Where the patient currently lives (may differ from market country when abroad) */
  residenceCountry?: string
  /** True when the patient lives outside Kenya, Zimbabwe, or Zambia */
  residesAbroad?: boolean
  creditLimit: number
  creditUsed: number
  creditAvailable: number
  creditStatus: CreditStatus
  memberSince: string
  hasPaymentPin: boolean
  /** Whether the patient has activated beneficiaries on their account */
  beneficiariesEnabled?: boolean
  /** Finance partner that issued the patient's active credit line */
  financePartnerId?: 'moneymart' | 'equity'
  creditAccountRef?: string
}

export interface Beneficiary {
  id: string
  name: string
  relation: string
  dob: string
  /** Operating country where this beneficiary resides (KE | ZW | ZM) */
  countryCode: CountryCode
  nationalId: string
  age: number
}

export interface NewsItem {
  id: number
  title: string
  source: string
  date: string
  tag: string
  body: string
  url?: string
  status?: 'draft' | 'published' | 'archived'
}

export type NotificationType = 'payment' | 'invoice' | 'appointment' | 'credit' | 'system' | 'prescription'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  time: string
  read: boolean
  screen: string
}

export interface Transaction {
  id: string
  provider: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed' | 'authorized'
  service: string
  invoiceId?: string
}

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed'

export interface Appointment {
  id: string
  provider: string
  providerId?: number
  category: string
  date: string
  time: string
  status: AppointmentStatus
  hasInvoice?: boolean
  for: string
  forSelf?: boolean
  beneficiaryId?: string
  service: string
  rescheduledAt?: string | null
}
