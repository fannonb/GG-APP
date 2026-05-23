import { create } from 'zustand'
import type { UserRole } from '@/types/user.types'

export type UserMode = 'existing' | 'new'

interface AuthStore {
  loggedIn: boolean
  userRole: UserRole | null
  userMode: UserMode
  login: (role: UserRole) => void
  logout: () => void
  setUserMode: (mode: UserMode) => void
}

export const useAuthStore = create<AuthStore>(set => ({
  loggedIn: true,
  userRole: 'patient',
  userMode: 'existing',
  login:       role => set({ loggedIn: true, userRole: role }),
  logout:      ()   => set({ loggedIn: false, userRole: null }),
  setUserMode: mode => set({ userMode: mode }),
}))
