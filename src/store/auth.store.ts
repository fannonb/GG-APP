import { create } from 'zustand'
import type { UserRole } from '@/types/user.types'
import { MOCK_SP_NOTIFICATIONS, MOCK_SP_NEW_NOTIFICATIONS } from '@/mock/sp.mock'
import { useNotificationsStore } from '@/store/notifications.store'
import { isMockApi } from '@/api/config'
import { tokenStorage } from '@/lib/token-storage'

export type UserMode = 'existing' | 'new'

export const ONBOARDING_STEP_COUNT = 5
/** Steps auto-completed at registration (Create Account + Verify Email). */
export const DEFAULT_ONBOARDING_DONE = [1, 2]

export const SP_ONBOARDING_STEP_COUNT = 5
/** Steps auto-completed after provider registration (Account + Application Approved). */
export const DEFAULT_SP_ONBOARDING_DONE = [1, 2]

export type OnboardingStepStatus = 'done' | 'action' | 'next' | 'pending'

export function isOnboardingComplete(completedSteps: number[]): boolean {
  return completedSteps.length >= ONBOARDING_STEP_COUNT
}

export function deriveSpOnboardingStepStatus(
  stepN: number,
  completedSteps: number[],
  options?: { profileComplete?: boolean },
): OnboardingStepStatus {
  const effectiveCompletedSteps =
    options?.profileComplete && !completedSteps.includes(3)
      ? [...completedSteps, 3].sort((a, b) => a - b)
      : completedSteps

  if (effectiveCompletedSteps.includes(stepN)) return 'done'

  const firstIncomplete = Array.from(
    { length: SP_ONBOARDING_STEP_COUNT },
    (_, i) => i + 1,
  ).find(n => !effectiveCompletedSteps.includes(n))

  if (stepN === firstIncomplete) return stepN === 3 ? 'action' : 'next'
  if (firstIncomplete !== undefined && stepN === firstIncomplete + 1) return 'next'
  return 'pending'
}

export function deriveOnboardingStepStatus(
  stepN: number,
  completedSteps: number[],
): OnboardingStepStatus {
  if (completedSteps.includes(stepN)) return 'done'

  const firstIncomplete = Array.from(
    { length: ONBOARDING_STEP_COUNT },
    (_, i) => i + 1,
  ).find(n => !completedSteps.includes(n))

  if (stepN === firstIncomplete) return stepN === 3 ? 'action' : 'next'
  if (firstIncomplete !== undefined && stepN === firstIncomplete + 1) return 'next'
  return 'pending'
}

export function isSpOnboardingComplete(completedSteps: number[]): boolean {
  return completedSteps.length >= SP_ONBOARDING_STEP_COUNT
}

interface AuthStore {
  loggedIn: boolean
  userRole: UserRole | null
  userMode: UserMode
  spMode: UserMode
  onboardingCompletedSteps: number[]
  spOnboardingCompletedSteps: number[]
  login: (role: UserRole) => void
  setSession: (role: UserRole) => void
  logout: () => void
  setUserMode: (mode: UserMode) => void
  setSpMode: (mode: UserMode) => void
  completeOnboardingStep: (step: number) => void
  resetOnboarding: () => void
  completeSpOnboardingStep: (step: number) => void
  resetSpOnboarding: () => void
}

const storedSession = tokenStorage.getSession()
const initialLoggedIn = storedSession ? true : isMockApi
const initialRole: UserRole | null = storedSession?.role ?? (isMockApi ? 'patient' : null)

export const useAuthStore = create<AuthStore>(set => ({
  loggedIn: initialLoggedIn,
  userRole: initialRole,
  userMode: 'existing',
  spMode: 'existing',
  onboardingCompletedSteps: [...DEFAULT_ONBOARDING_DONE],
  spOnboardingCompletedSteps: [...DEFAULT_SP_ONBOARDING_DONE],
  login: role => set({ loggedIn: true, userRole: role }),
  setSession: role => set({ loggedIn: true, userRole: role }),
  logout: () => set({ loggedIn: false, userRole: null }),
  setUserMode: mode =>
    set({
      userMode: mode,
      ...(mode === 'new' ? { onboardingCompletedSteps: [...DEFAULT_ONBOARDING_DONE] } : {}),
    }),
  setSpMode: mode => {
    set({
      spMode: mode,
      ...(mode === 'new' ? { spOnboardingCompletedSteps: [...DEFAULT_SP_ONBOARDING_DONE] } : {}),
    })
    useNotificationsStore.setState({
      spNotifs: mode === 'new' ? [...MOCK_SP_NEW_NOTIFICATIONS] : [...MOCK_SP_NOTIFICATIONS],
    })
  },
  completeOnboardingStep: step =>
    set(state => {
      if (state.onboardingCompletedSteps.includes(step)) return state
      return { onboardingCompletedSteps: [...state.onboardingCompletedSteps, step].sort((a, b) => a - b) }
    }),
  resetOnboarding: () => set({ onboardingCompletedSteps: [...DEFAULT_ONBOARDING_DONE] }),
  completeSpOnboardingStep: step =>
    set(state => {
      if (state.spOnboardingCompletedSteps.includes(step)) return state
      return { spOnboardingCompletedSteps: [...state.spOnboardingCompletedSteps, step].sort((a, b) => a - b) }
    }),
  resetSpOnboarding: () => set({ spOnboardingCompletedSteps: [...DEFAULT_SP_ONBOARDING_DONE] }),
}))
