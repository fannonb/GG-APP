import type { ProviderProfileResponse, ProviderSettingsResponse } from '@/api/types'

export type SpProfileSectionId = 'facility' | 'services' | 'payout'

export interface SpProfileSectionStatus {
  id: SpProfileSectionId
  label: string
  complete: boolean
  pendingItems: string[]
}

export interface SpProfileCompletion {
  isComplete: boolean
  pendingLabels: string[]
  sections: Record<SpProfileSectionId, SpProfileSectionStatus>
  settingsTab: 'profile' | 'payouts'
}

function isFilled(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasConfiguredHours(
  hours: Record<string, { open: boolean; from: string; to: string }>,
) {
  return Object.values(hours).some(day => day.open && day.from.trim() && day.to.trim())
}

export function getSpProfileCompletion(
  settings: ProviderSettingsResponse,
): SpProfileCompletion {
  const profile = settings.profile
  const facilityPending: string[] = []

  if (!isFilled(profile.about)) facilityPending.push('practice description')
  if (!isFilled(profile.address)) facilityPending.push('address & location')
  if (!isFilled(profile.phone)) facilityPending.push('contact phone')
  if (!isFilled(profile.category)) facilityPending.push('provider category')
  if (!hasConfiguredHours(profile.openingHours)) facilityPending.push('opening hours')

  const servicesPending = profile.tags.length > 0 ? [] : ['at least one service']

  const hasActivePayout = settings.payoutAccounts.some(
    account => account.status === 'active' && isFilled(account.accountNumber) && isFilled(account.accountName),
  )
  const payoutPending = hasActivePayout ? [] : ['a payout account']

  const sections: Record<SpProfileSectionId, SpProfileSectionStatus> = {
    facility: {
      id: 'facility',
      label: 'Facility details',
      complete: facilityPending.length === 0,
      pendingItems: facilityPending,
    },
    services: {
      id: 'services',
      label: 'Services offered',
      complete: servicesPending.length === 0,
      pendingItems: servicesPending,
    },
    payout: {
      id: 'payout',
      label: 'Payout account',
      complete: payoutPending.length === 0,
      pendingItems: payoutPending,
    },
  }

  const pendingLabels = (Object.values(sections) as SpProfileSectionStatus[])
    .filter(section => !section.complete)
    .map(section => section.label)

  const settingsTab = sections.payout.complete ? 'profile' : 'payouts'

  return {
    isComplete: pendingLabels.length === 0,
    pendingLabels,
    sections,
    settingsTab,
  }
}

export function getSpProfileCompletionFromProfile(
  profile: ProviderProfileResponse,
  payoutAccounts: ProviderSettingsResponse['payoutAccounts'],
) {
  return getSpProfileCompletion({ profile, payoutAccounts } as ProviderSettingsResponse)
}
