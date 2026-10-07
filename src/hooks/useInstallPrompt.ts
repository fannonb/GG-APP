import { useSyncExternalStore } from 'react'
import {
  dismissInstall,
  getInstallState,
  isInstallDismissed,
  promptInstall,
  subscribeInstall,
} from '@/services/install-prompt'

/** Install availability for the current device, plus the actions the install UI needs. */
export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribeInstall, getInstallState, getInstallState)
  const canInstall = state.mode === 'native' || state.mode === 'ios'
  return {
    ...state,
    canInstall,
    /** True when a banner or card may be shown: installable, not snoozed. */
    shouldNudge: canInstall && !isInstallDismissed(),
    install: promptInstall,
    dismiss: dismissInstall,
  }
}
