import type { ProviderSettingsResponse } from '@/api/types'
import type { SPDashboardData } from '@/api/services/sp.service'
import {
  DEFAULT_SP_ONBOARDING_DONE,
  SP_ONBOARDING_STEP_COUNT,
  type OnboardingStepStatus,
} from '@/store/auth.store'
import { getSpProfileCompletion } from '@/utils/sp-profile-completion'

export interface SpOnboardingProgress {
  completedSteps: number[]
  isComplete: boolean
  profileComplete: boolean
  profilePendingLabels: string[]
  hasFirstAppointment: boolean
  hasFirstInvoice: boolean
}

export interface SpSetupStepDefinition {
  n: number
  label: string
  desc: string
  cta: string | null
  ctaPath: string | null
}

export interface SpSetupStep extends SpSetupStepDefinition {
  status: OnboardingStepStatus
}

export function computeSpOnboardingProgress(input: {
  settings: ProviderSettingsResponse | null | undefined
  appointmentCount: number
  invoiceCount: number
  apiOnboarding?: SpOnboardingProgress | null
}): SpOnboardingProgress | null {
  if (input.apiOnboarding) {
    return input.apiOnboarding
  }

  if (!input.settings) {
    return null
  }

  const profileCompletion = getSpProfileCompletion(input.settings)
  const completedSteps = [...DEFAULT_SP_ONBOARDING_DONE]

  if (profileCompletion.isComplete) completedSteps.push(3)
  if (input.appointmentCount > 0) completedSteps.push(4)
  if (input.invoiceCount > 0) completedSteps.push(5)

  return {
    completedSteps,
    isComplete: completedSteps.length >= SP_ONBOARDING_STEP_COUNT,
    profileComplete: profileCompletion.isComplete,
    profilePendingLabels: profileCompletion.pendingLabels,
    hasFirstAppointment: input.appointmentCount > 0,
    hasFirstInvoice: input.invoiceCount > 0,
  }
}

export function computeSpOnboardingFromDashboard(
  dashboard: SPDashboardData | null | undefined,
  settings: ProviderSettingsResponse | null | undefined,
): SpOnboardingProgress | null {
  if (!dashboard) return null

  return computeSpOnboardingProgress({
    settings,
    appointmentCount: dashboard.appointments.length,
    invoiceCount: dashboard.invoices.length,
    apiOnboarding: dashboard.onboarding ?? null,
  })
}

export function buildSpSetupSteps(
  defs: readonly SpSetupStepDefinition[],
  progress: SpOnboardingProgress | null,
  completedSteps: number[],
): SpSetupStep[] {
  const effectiveCompletedSteps = progress?.completedSteps ?? completedSteps

  return defs.map(step => {
    const status = deriveSpSetupStepStatus(step.n, effectiveCompletedSteps)

    if (step.n === 3 && progress && !progress.profileComplete) {
      return {
        ...step,
        status,
        desc: `Still needed: ${progress.profilePendingLabels.join(', ')}.`,
      }
    }

    if (step.n === 4 && progress && !progress.hasFirstAppointment && status !== 'done') {
      return {
        ...step,
        status,
        desc: 'Waiting for your first patient booking request.',
      }
    }

    if (step.n === 5 && progress && !progress.hasFirstInvoice && status !== 'done') {
      return {
        ...step,
        status,
        desc: 'After a completed visit, upload an invoice linked to the appointment.',
      }
    }

    return { ...step, status }
  })
}

function deriveSpSetupStepStatus(
  stepN: number,
  completedSteps: number[],
): OnboardingStepStatus {
  if (completedSteps.includes(stepN)) return 'done'

  const firstIncomplete = Array.from(
    { length: SP_ONBOARDING_STEP_COUNT },
    (_, index) => index + 1,
  ).find(step => !completedSteps.includes(step))

  if (stepN === firstIncomplete) return stepN === 3 ? 'action' : 'next'
  if (firstIncomplete !== undefined && stepN === firstIncomplete + 1) return 'next'
  return 'pending'
}
