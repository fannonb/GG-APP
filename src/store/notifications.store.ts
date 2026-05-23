import { create } from 'zustand'
import { MOCK_NOTIFICATIONS } from '@/mock/patient.mock'
import { MOCK_SP_NOTIFICATIONS } from '@/mock/sp.mock'
import type { Notification } from '@/types/user.types'

interface NotificationsStore {
  patientNotifs: Notification[]
  spNotifs: Notification[]
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  markRead: (id: string, role: 'patient' | 'sp') => void
  markAllRead: (role: 'patient' | 'sp') => void
  dismiss: (id: string, role: 'patient' | 'sp') => void
}

export const useNotificationsStore = create<NotificationsStore>(set => ({
  patientNotifs: MOCK_NOTIFICATIONS,
  spNotifs: MOCK_SP_NOTIFICATIONS,
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
    return { [key]: s[key].filter(n => n.id !== id) }
  }),
}))
