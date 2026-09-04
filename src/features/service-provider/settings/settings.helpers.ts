import type { ProviderPayoutAccount, ProviderSettingsResponse } from '@/api/types'

export type SettingsTabId = 'profile' | 'payouts' | 'security'

export type OpeningHours = Record<string, { open: boolean; from: string; to: string }>

export type ProfileFormState = {
  about: string
  address: string
  lat: number | null
  lng: number | null
  phone: string
  country: string
  categories: string[]
  status: 'open' | 'closed'
  establishedYear: string
  languages: string[]
  tags: string[]
  logoUrl: string
  license: string
  openingHours: OpeningHours
}

export type PayoutFormState = {
  id?: string
  method: 'mpesa' | 'bank' | 'mobile_money'
  accountNumber: string
  accountName: string
  country: string
  isDefault: boolean
  mpesaType: 'paybill' | 'till'
  paybillNumber: string
  bankName: string
  branch: string
  branchCode: string
  swiftCode: string
}

export const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const DEFAULT_DAY = { open: false, from: '08:00', to: '17:00' }

export const SP_CATEGORIES: { value: string; label: string }[] = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'radiology', label: 'Radiology / Imaging' },
]

export const EMPTY_PAYOUT_FORM: PayoutFormState = {
  method: 'bank',
  accountNumber: '',
  accountName: '',
  country: 'Zimbabwe',
  isDefault: false,
  mpesaType: 'paybill',
  paybillNumber: '',
  bankName: '',
  branch: '',
  branchCode: '',
  swiftCode: '',
}

export const SETTINGS_TABS: { id: SettingsTabId; label: string }[] = [
  { id: 'profile', label: 'Public Profile' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'security', label: 'Security' },
]

export function buildDefaultHours(): OpeningHours {
  return Object.fromEntries(DAYS_ORDER.map(day => [day, { ...DEFAULT_DAY }]))
}

export function normalizeCategoryValue(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[/-]+/g, ' ').replace(/\s+/g, '_')
  switch (normalized) {
    case 'general_practitioner':
    case 'general_practitioner_doctor':
    case 'specialist':
      return 'doctor'
    case 'radiology_imaging':
      return 'radiology'
    default:
      return normalized
  }
}

export function formFromSettings(settings: ProviderSettingsResponse): ProfileFormState {
  const profile = settings.profile
  const hours = buildDefaultHours()
  for (const day of DAYS_ORDER) {
    if (profile.openingHours[day]) hours[day] = { ...profile.openingHours[day] }
  }
  return {
    about: profile.about,
    address: profile.address,
    lat: profile.lat,
    lng: profile.lng,
    phone: profile.phone,
    country: profile.country,
    categories: profile.category
      ? Array.from(
          new Set(
            profile.category
              .split(',')
              .map(item => normalizeCategoryValue(item))
              .filter(Boolean),
          ),
        )
      : [],
    status: profile.status,
    establishedYear: profile.establishedYear ? String(profile.establishedYear) : '',
    languages: [...profile.languages],
    tags: [...profile.tags],
    logoUrl: profile.logoUrl ?? '',
    license: profile.license ?? '',
    openingHours: hours,
  }
}

export function categoryLabel(value: string) {
  return SP_CATEGORIES.find(item => item.value === value)?.label ?? value
}

export function formatCategoryList(categories: string[]) {
  return categories.map(categoryLabel).join(', ')
}

export function formatHourRange(from: string, to: string) {
  const format = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value
    const suffix = hours >= 12 ? 'PM' : 'AM'
    const hour12 = ((hours + 11) % 12) + 1
    return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
  }
  return `${format(from)} – ${format(to)}`
}

export function payoutDetailLine(account: ProviderPayoutAccount) {
  if (account.method === 'mpesa') {
    return account.mpesaType === 'paybill'
      ? `Paybill ${account.paybillNumber ?? account.accountNumber}${
          account.accountNumber && account.paybillNumber ? ` · Ref: ${account.accountNumber}` : ''
        }`
      : `Till ${account.accountNumber}`
  }
  if (account.method === 'bank') {
    return [account.bankName, account.accountNumber, account.accountName].filter(Boolean).join(' · ')
  }
  return `${account.accountNumber} · ${account.accountName}`
}

export function mobileMoneyLabel(country: string) {
  if (country === 'Zimbabwe') return 'EcoCash'
  if (country === 'Zambia') return 'MTN Mobile Money'
  return 'Mobile Money'
}

export function validatePayoutForm(form: PayoutFormState): string | null {
  if (form.method === 'mpesa') {
    if (form.mpesaType === 'paybill') {
      if (!form.paybillNumber.trim()) return 'Enter the M-Pesa paybill number.'
      if (!form.accountNumber.trim()) return 'Enter the account number / reference.'
    } else if (!form.accountNumber.trim()) {
      return 'Enter the M-Pesa till number.'
    }
    if (!form.accountName.trim()) return 'Enter the business / practice name.'
    return null
  }

  if (form.method === 'bank') {
    if (!form.bankName.trim()) return 'Enter the bank name.'
    if (!form.accountNumber.trim()) return 'Enter the bank account number.'
    if (!form.accountName.trim()) return 'Enter the account name.'
    return null
  }

  if (!form.accountNumber.trim()) return 'Enter the wallet / phone number.'
  if (!form.accountName.trim()) return 'Enter the account name.'
  return null
}

export function profilesEqual(a: ProfileFormState, b: ProfileFormState) {
  return JSON.stringify(a) === JSON.stringify(b)
}
