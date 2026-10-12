import { useEffect } from 'react'
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import { OfflineBanner } from '@/components/OfflineBanner'
import { AppRouter } from '@/router/AppRouter'
import { syncPushSubscription } from '@/services/push-notifications'
import { useAuthStore } from '@/store/auth.store'

export default function App() {
  const loggedIn = useAuthStore(s => s.loggedIn)

  // After sign-in, re-link this browser for push if the user already allowed
  // notifications, so alerts follow whoever is signed in on this device.
  useEffect(() => {
    if (loggedIn) void syncPushSubscription()
  }, [loggedIn])

  return (
    <AppErrorBoundary>
      <OfflineBanner />
      <AppRouter />
    </AppErrorBoundary>
  )
}
