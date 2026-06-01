import type { CountryCode } from '@/config/countries'

export type UserRole = 'patient' | 'sp' | 'admin'

export type CreditStatus = 'approved' | 'pending' | 'rejected' | 'not_applied'

export interface Patient {
  name: string
  email: string
  phone: string
  nationalId: string
  country: string
  countryCode: CountryCode
  creditLimit: number
  creditUsed: number
  creditAvailable: number
  creditStatus: CreditStatus
  memberSince: string
  /** Finance partner that issued the patient's active credit line */
  financePartnerId?: 'moneymart' | 'equity'
  creditAccountRef?: string
}

export interface Beneficiary {
  id: string
  name: string
  relation: string
  dob: string
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
}

export type NotificationType = 'payment' | 'invoice' | 'appointment' | 'credit' | 'system'

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
  status: 'completed' | 'pending' | 'failed'
  service: string
}

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed'

export interface Appointment {
  id: string
  provider: string
  category: string
  date: string
  time: string
  status: AppointmentStatus
  for: string
  service: string
}
