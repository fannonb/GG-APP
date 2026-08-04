import { useNavigate } from 'react-router-dom'
import { ErrorPage } from '@/components/errors/ErrorPage'
import { PORTAL_HOME, ROUTES } from '@/router/routes'
import { useAuthStore } from '@/store/auth.store'

export function NotFoundPage() {
  const navigate = useNavigate()
  const { loggedIn, userRole } = useAuthStore()

  const homePath =
    loggedIn && userRole && userRole in PORTAL_HOME
      ? PORTAL_HOME[userRole as keyof typeof PORTAL_HOME]
      : ROUTES.LOGIN

  return (
    <ErrorPage
      code="404"
      title="Page not found"
      message="The page you're looking for doesn't exist, may have been moved, or you may not have access to it."
      primaryAction={{
        label: loggedIn ? 'Go to dashboard' : 'Go to sign in',
        onClick: () => navigate(homePath, { replace: true }),
      }}
      secondaryAction={{
        label: 'Go back',
        onClick: () => navigate(-1),
      }}
    />
  )
}
