import { useEffect, useMemo } from 'react'
import { useSPDashboard, useSPSettings } from '@/hooks/api'
import { useAuthStore } from '@/store/auth.store'
import { getSpProfileCompletion } from '@/utils/sp-profile-completion'
import {
  buildSpSetupSteps,
  computeSpOnboardingFromDashboard,
  type SpOnboardingProgress,
  type SpSetupStepDefinition,
} from '@/utils/sp-onboarding'

export function useSpOnboardingProgress() {
  const { data: dashboard, isLoading: dashboardLoading } = useSPDashboard()
  const { data: settings, isLoading: settingsLoading } = useSPSettings()
  const spOnboardingCompletedSteps = useAuthStore(s => s.spOnboardingCompletedSteps)
  const completeSpOnboardingStep = useAuthStore(s => s.completeSpOnboardingStep)

  const progress = useMemo(
    () => computeSpOnboardingFromDashboard(dashboard, settings),
    [dashboard, settings],
  )

  useEffect(() => {
    if (!progress) return

    progress.completedSteps.forEach(step => {
      if (!spOnboardingCompletedSteps.includes(step)) {
        completeSpOnboardingStep(step)
      }
    })
  }, [progress, spOnboardingCompletedSteps, completeSpOnboardingStep])

  const effectiveCompletedSteps = progress?.completedSteps ?? spOnboardingCompletedSteps
  const onboardingComplete = progress?.isComplete ?? false

  const profileSettingsTab = settings
    ? getSpProfileCompletion(settings).settingsTab
    : 'profile'

  return {
    progress,
    effectiveCompletedSteps,
    onboardingComplete,
    profileSettingsTab,
    isLoading: dashboardLoading || settingsLoading,
    buildSetupSteps: (defs: readonly SpSetupStepDefinition[]) =>
      buildSpSetupSteps(defs, progress, effectiveCompletedSteps),
  }
}

export type { SpOnboardingProgress }
