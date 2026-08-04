import type { Appointment, Beneficiary, NewsItem, Patient, Transaction } from '@/types/user.types'

export const EMPTY_PATIENT: Patient = {
  name: '',
  email: '',
  phone: '',
  nationalId: '',
  country: 'Zimbabwe',
  countryCode: 'ZW',
  residenceCountry: 'Zimbabwe',
  residesAbroad: false,
  creditLimit: 0,
  creditUsed: 0,
  creditAvailable: 0,
  creditStatus: 'not_applied',
  memberSince: '',
  hasPaymentPin: false,
  beneficiariesEnabled: false,
}

export const EMPTY_BENEFICIARIES: Beneficiary[] = []
export const EMPTY_TRANSACTIONS: Transaction[] = []
export const EMPTY_APPOINTMENTS: Appointment[] = []
export const EMPTY_NEWS: NewsItem[] = []

/** Section is unlocked if the flag is on, or the account already has beneficiaries. */
export function isBeneficiariesActive(
  beneficiariesEnabled: boolean | undefined,
  beneficiaryCount: number,
): boolean {
  return Boolean(beneficiariesEnabled) || beneficiaryCount > 0
}

export function getPatientDisplayName(user: Patient): string {
  return user.name.trim() || 'Patient'
}

export function getPatientFirstName(user: Patient): string {
  return getPatientDisplayName(user).split(' ')[0]
}

export function getPatientInitials(user: Patient): string {
  const parts = getPatientDisplayName(user)
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return 'PA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export function isLivePatientAccountNew(params: {
  user: Patient
  beneficiaries?: Beneficiary[]
  transactions?: Transaction[]
  appointments?: Appointment[]
  invoiceCount?: number
}): boolean {
  const {
    user,
    beneficiaries = [],
    transactions = [],
    appointments = [],
    invoiceCount = 0,
  } = params

  // Invoices, appointments, or transactions mean the account is already in use.
  if (invoiceCount > 0 || transactions.length > 0 || appointments.length > 0) {
    return false
  }

  return (
    user.creditStatus === 'not_applied' &&
    user.creditLimit === 0 &&
    user.creditUsed === 0 &&
    user.creditAvailable === 0 &&
    beneficiaries.length === 0
  )
}
