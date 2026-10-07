import { create } from 'zustand'
import { MOCK_SP_NOTIFICATIONS } from '@/mock/sp.mock'
import type { Notification } from '@/types/user.types'

type Role = 'patient' | 'sp'

const DISMISSED_KEY = 'gg_dismissed_notifications'

// There is no dismiss endpoint, so dismissed ids live on this device and are
// filtered out of whatever the server returns next.
function loadDismissed(): Record<Role, string[]> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    const parsed = raw ? JSON.parse(raw) as Partial<Record<Role, string[]>> : {}
    return { patient: parsed.patient ?? [], sp: parsed.sp ?? [] }
  } catch {
    return { patient: [], sp: [] }
  }
}

function saveDismissed(value: Record<Role, string[]>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(value))
  } catch {
    // Storage unavailable (private mode); dismissals then last for this session only.
  }
}

interface NotificationsStore {
  patientNotifs: Notification[]
  spNotifs: Notification[]
  dismissed: Record<Role, string[]>
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  markRead: (id: string, role: Role) => void
  markAllRead: (role: Role) => void
  dismiss: (id: string, role: Role) => void
}

export const useNotificationsStore = create<NotificationsStore>(set => ({
  patientNotifs: [],
  spNotifs: MOCK_SP_NOTIFICATIONS,
  dismissed: loadDismissed(),
  panelOpen: false,
  openPanel:  () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  markRead: (id, role) => set(s => {
    const key = role === 'patient' ? 'patientNotifs' : 'spNotifs'
    return { [key]: s[key].map(n => n.id === id ? { ...n, read: true } : n) }
  }),
  markAllRead: (role) => set(s => {
    const key = role === 'patient' ? 'patientNotifs' : 'spNotifs'
    return { [key]: s[key].map(n => ({ ...n, read: true })) }
  }),
  dismiss: (id, role) => set(s => {
    const key = role === 'patient' ? 'patientNotifs' : 'spNotifs'
    // Keep the list bounded; old ids age out as the server drops those notifications.
    const dismissed = { ...s.dismissed, [role]: [...s.dismissed[role].filter(d => d !== id), id].slice(-300) }
    saveDismissed(dismissed)
    return { dismissed, [key]: s[key].filter(n => n.id !== id) }
  }),
}))
