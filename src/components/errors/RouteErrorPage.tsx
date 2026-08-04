import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { ErrorPage } from '@/components/errors/ErrorPage'
import { NotFoundPage } from '@/components/errors/NotFoundPage'
import { PORTAL_HOME, ROUTES } from '@/router/routes'
import { useAuthStore } from '@/store/auth.store'

function formatRouteError(error: unknown): { title: string; message: string; details?: string } {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: 'Page not found',
        message: error.statusText || 'The page you requested could not be found.',
        details: import.meta.env.DEV ? JSON.stringify(error.data, null, 2) : undefined,
      }
    }

    return {
      title: 'Something went wrong',
      message: error.statusText || 'We could not complete that request. Please try again.',
      details: import.meta.env.DEV
        ? JSON.stringify({ status: error.status, data: error.data }, null, 2)
        : undefined,
    }
  }

  if (error instanceof Error) {
    return {
      title: 'Something went wrong',
      message: 'An unexpected error occurred while loading this page.',
      details: import.meta.env.DEV ? `${error.message}\n\n${error.stack ?? ''}` : undefined,
    }
  }

  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    details: import.meta.env.DEV ? String(error) : undefined,
  }
}

export function RouteErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const { loggedIn, userRole } = useAuthStore()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  const { title, message, details } = formatRouteError(error)
  const homePath =
    loggedIn && userRole && userRole in PORTAL_HOME
      ? PORTAL_HOME[userRole as keyof typeof PORTAL_HOME]
      : ROUTES.LOGIN

  return (
    <ErrorPage
      code={isRouteErrorResponse(error) ? String(error.status) : undefined}
      title={title}
      message={message}
      details={details}
      primaryAction={{
        label: 'Try again',
        onClick: () => window.location.reload(),
      }}
      secondaryAction={{
        label: loggedIn ? 'Go to dashboard' : 'Go to sign in',
        onClick: () => navigate(homePath, { replace: true }),
      }}
    />
  )
}
