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

/**
 * Guided setup stays visible until payment PIN exists and a credit application
 * has been submitted — not merely because an appointment or invoice exists.
 */
export function isLivePatientAccountNew(params: {
  user: Patient
  beneficiaries?: Beneficiary[]
  transactions?: Transaction[]
  appointments?: Appointment[]
  invoiceCount?: number
}): boolean {
  const { user } = params
  return !user.hasPaymentPin || user.creditStatus === 'not_applied'
}

/** Server-derived onboarding steps: 1 account, 2 email, 3 PIN, 4 credit, 5 first booking. */
export function derivePatientOnboardingCompletedSteps(
  user: Patient,
  appointmentCount: number,
): number[] {
  const steps = [1, 2]
  if (user.hasPaymentPin) steps.push(3)
  if (user.creditStatus !== 'not_applied') steps.push(4)
  if (appointmentCount > 0) steps.push(5)
  return steps
}
