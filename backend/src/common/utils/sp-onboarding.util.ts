import { ProviderPayoutAccountStatus, Prisma } from '@prisma/client'

export const SP_ONBOARDING_STEP_COUNT = 5
export const SP_ONBOARDING_DEFAULT_DONE = [1, 2] as const

export interface SpOnboardingProgress {
  completedSteps: number[]
  isComplete: boolean
  profileComplete: boolean
  profilePendingLabels: string[]
  hasFirstAppointment: boolean
  hasFirstInvoice: boolean
}

function isFilled(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasConfiguredHours(hoursJson: Prisma.JsonValue | null | undefined) {
  const entries = Array.isArray(hoursJson)
    ? hoursJson
    : hoursJson && typeof hoursJson === 'object' && !Array.isArray(hoursJson)
      ? Object.values(hoursJson)
      : []

  return entries.some(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return false
    }

    const record = entry as Record<string, unknown>
    const isOpen = record.open === true || record.status === 'open'
    const from = typeof record.from === 'string' ? record.from : ''
    const to = typeof record.to === 'string' ? record.to : ''

    return isOpen && isFilled(from) && isFilled(to)
  })
}

function getServiceNames(
  tags: Prisma.JsonValue | null | undefined,
  services: Array<{ name: string }>,
) {
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
  }

  return services.map(service => service.name).filter(name => name.trim().length > 0)
}

export function getSpProfilePendingLabels(provider: {
  about: string | null
  description: string | null
  address: string
  phone: string
  category: string
  hoursJson: Prisma.JsonValue | null
  tags: Prisma.JsonValue | null
  services: Array<{ name: string }>
  payoutAccounts: Array<{
    status: ProviderPayoutAccountStatus
    accountNumber: string
    accountName: string
  }>
}): string[] {
  const pending: string[] = []
  const facilityPending: string[] = []

  if (!isFilled(provider.about) && !isFilled(provider.description)) {
    facilityPending.push('practice description')
  }
  if (!isFilled(provider.address)) facilityPending.push('address & location')
  if (!isFilled(provider.phone)) facilityPending.push('contact phone')
  if (!provider.category) facilityPending.push('provider category')
  if (!hasConfiguredHours(provider.hoursJson)) facilityPending.push('opening hours')

  if (facilityPending.length > 0) {
    pending.push('Facility details')
  }

  if (getServiceNames(provider.tags, provider.services).length === 0) {
    pending.push('Services offered')
  }

  const hasActivePayout = provider.payoutAccounts.some(
    account =>
      account.status === ProviderPayoutAccountStatus.ACTIVE &&
      isFilled(account.accountNumber) &&
      isFilled(account.accountName),
  )

  if (!hasActivePayout) {
    pending.push('Payout account')
  }

  return pending
}

export function computeSpOnboardingProgress(input: {
  provider: {
    about: string | null
    description: string | null
    address: string
    phone: string
    category: string
    hoursJson: Prisma.JsonValue | null
    tags: Prisma.JsonValue | null
    services: Array<{ name: string }>
    payoutAccounts: Array<{
      status: ProviderPayoutAccountStatus
      accountNumber: string
      accountName: string
    }>
  }
  appointmentCount: number
  invoiceCount: number
}): SpOnboardingProgress {
  const profilePendingLabels = getSpProfilePendingLabels(input.provider)
  const profileComplete = profilePendingLabels.length === 0
  const hasFirstAppointment = input.appointmentCount > 0
  const hasFirstInvoice = input.invoiceCount > 0

  const completedSteps: number[] = [...SP_ONBOARDING_DEFAULT_DONE]
  if (profileComplete) completedSteps.push(3)
  if (hasFirstAppointment) completedSteps.push(4)
  if (hasFirstInvoice) completedSteps.push(5)

  return {
    completedSteps,
    isComplete: completedSteps.length >= SP_ONBOARDING_STEP_COUNT,
    profileComplete,
    profilePendingLabels,
    hasFirstAppointment,
    hasFirstInvoice,
  }
}
