import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import { OfflineBanner } from '@/components/OfflineBanner'
import { AppRouter } from '@/router/AppRouter'

export default function App() {
  return (
    <AppErrorBoundary>
      <OfflineBanner />
      <AppRouter />
    </AppErrorBoundary>
  )
}
