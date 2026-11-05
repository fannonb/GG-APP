import { C } from '@/design-system/tokens'
import type { SPApplication } from '@/types/admin.types'

/** Whole days since the application was submitted. */
export function daysWaiting(submitted: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(submitted).getTime()) / 86_400_000))
}

/**
 * One plain label per application, said from the reviewer's side:
 * what is it waiting for, and whose move is it.
 */
export function applicationStatus(app: SPApplication): { label: string; color: string; bg: string } {
  // A reply puts the application back in the reviewer's court, whatever its stored status.
  if (app.resubmitted && (app.status === 'pending' || app.status === 'info_requested')) {
    return { label: 'Provider replied', color: '#B45309', bg: '#FEF3C7' }
  }
  switch (app.status) {
    case 'pending':
      return { label: 'Needs review', color: C.text, bg: C.bg }
    case 'info_requested':
      return { label: 'Waiting on provider', color: C.textSub, bg: C.bg }
    case 'approved':
      return { label: 'Approved', color: '#15803D', bg: '#DCFCE7' }
    case 'rejected':
      return { label: 'Rejected', color: C.error, bg: C.errorBg }
  }
}
