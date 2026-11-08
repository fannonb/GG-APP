import { create } from 'zustand'
import { useAuthStore } from '@/store/auth.store'

// Patient closes the dashboard ads for this session only. Kept in memory with no
// persist middleware, so a new tab, a reload or a reopened browser shows them again.
interface AdSessionStore {
  adsClosed: boolean
  closeAds: () => void
  reset: () => void
}

export const useAdSessionStore = create<AdSessionStore>(set => ({
  adsClosed: false,
  closeAds: () => set({ adsClosed: true }),
  reset: () => set({ adsClosed: false }),
}))

// Signing out or signing in again brings the ads back, even within the same tab.
// Only real changes count: the auth store is written on every session bootstrap.
useAuthStore.subscribe((state, prev) => {
  if (state.loggedIn !== prev.loggedIn || state.userRole !== prev.userRole) {
    useAdSessionStore.getState().reset()
  }
})
