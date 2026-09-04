import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { queryClient } from '@/lib/query-client'
import { idbQueryPersister } from '@/lib/query-persister'
import { NewsProvider } from '@/providers/NewsProvider'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationsStore } from '@/store/notifications.store'
import { useUserStore } from '@/store/user.store'
import { queryKeys } from '@/api/query-keys'
import { patientService } from '@/api/services/patient.service'
import { spService } from '@/api/services/sp.service'
import { registerPWA } from '@/services/pwa'
import { isMockApi } from '@/api/config'
import { tokenStorage } from '@/lib/token-storage'
import { authService } from '@/api/services/auth.service'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

function SessionBootstrap() {
  const { loggedIn, userRole, setSession, logout } = useAuthStore()
  const isOnline = useOnlineStatus()

  useEffect(() => {
    void (async () => {
      const stored = tokenStorage.getSession()
      if (!stored) {
        logout()
        return
      }

      // Offline: keep the persisted session instead of treating an
      // unreachable refresh endpoint as an expired/invalid session.
      // The token refresh happens lazily once connectivity returns.
      if (!navigator.onLine) {
        setSession(stored.role)
        return
      }

      try {
        const session = await authService.refreshSession()
        if (session) {
          setSession(session.role)
          return
        }
      } catch {
        useUserStore.getState().reset()
        useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      }
      if (!isMockApi) {
        useUserStore.getState().reset()
        useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      }
      logout()
    })()
  }, [setSession, logout])

  // Mid-session 401: a failed refresh clears the tokens but the Zustand
  // `loggedIn` flag would otherwise survive until navigation. Force the UI
  // back to the logged-out state and drop the user's data immediately.
  useEffect(() => {
    const handleAuthExpired = () => {
      useUserStore.getState().reset()
      useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      logout()
    }
    window.addEventListener('gg:auth-expired', handleAuthExpired)
    return () => window.removeEventListener('gg:auth-expired', handleAuthExpired)
  }, [logout])

  useEffect(() => {
    // Skip hydration while offline — queries restored from IndexedDB
    // already carry the last known data.
    if (!loggedIn || !isOnline) return

    void (async () => {
      if (userRole === 'patient') {
        try {
          const { userMode } = useAuthStore.getState()
          const [profile, notifications] = await Promise.all([
            patientService.getProfile(userMode),
            patientService.getNotifications(userMode),
          ])
          useUserStore.setState({
            user: profile.user,
            beneficiaries: profile.beneficiaries,
          })
          queryClient.setQueryData(queryKeys.patient.profile(userMode), profile)
          useNotificationsStore.setState({ patientNotifs: notifications })
        } catch {
          useUserStore.getState().reset()
          useNotificationsStore.setState({ patientNotifs: [] })
        }
      }

      if (userRole === 'sp') {
        const { spMode } = useAuthStore.getState()
        const dashboard = await spService.getDashboard(spMode)
        useNotificationsStore.setState({ spNotifs: dashboard.notifications })
      }
    })()
  }, [loggedIn, userRole, isOnline])

  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerPWA()
  }, [])

  useEffect(() => {
    // Persist the query cache to IndexedDB so offline restarts still
    // render the last known data. Restores are merged as a background
    // subscription; mutations are intentionally not resumed.
    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister: idbQueryPersister,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      dehydrateOptions: {
        shouldDehydrateQuery: query => query.state.status === 'success',
      },
    })
    return unsubscribe
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <NewsProvider>
        <SessionBootstrap />
        {children}
      </NewsProvider>
    </QueryClientProvider>
  )
}
