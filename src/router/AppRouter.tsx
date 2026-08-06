import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { PatientRouter } from './PatientRouter'
import { SPRouter } from './SPRouter'
import { AdminRouter } from './AdminRouter'
import { SplashScreen } from '@/features/auth/SplashScreen'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { AdminLoginScreen } from '@/features/auth/AdminLoginScreen'
import { RegisterScreen } from '@/features/auth/RegisterScreen'
import { EmailVerifyScreen } from '@/features/auth/EmailVerifyScreen'
import { OnboardingScreen } from '@/features/auth/OnboardingScreen'
import { ForgotPasswordScreen } from '@/features/auth/ForgotPasswordScreen'
import { ResetPasswordScreen } from '@/features/auth/ResetPasswordScreen'
import { TermsScreen } from '@/features/legal/TermsScreen'
import { PrivacyPolicyScreen } from '@/features/legal/PrivacyPolicyScreen'
import { NotFoundPage } from '@/components/errors/NotFoundPage'
import { ROUTES, ADMIN_PORTAL_PATH } from './routes'
import type { UserRole } from '@/types/user.types'
import type { ReactNode } from 'react'

function ProtectedRoute({
  children,
  requiredRole,
  loginPath,
}: {
  children: ReactNode
  requiredRole?: UserRole
  loginPath?: string
}) {
  const { loggedIn, userRole } = useAuthStore()
  const redirectTo = loginPath ?? ROUTES.LOGIN
  if (!loggedIn) return <Navigate to={redirectTo} replace />
  if (requiredRole && userRole !== requiredRole) return <Navigate to={redirectTo} replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.SPLASH} element={<SplashScreen />} />
      <Route path={ROUTES.LOGIN} element={<LoginScreen />} />
      <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginScreen />} />
      <Route path={ROUTES.REGISTER} element={<RegisterScreen />} />
      <Route path={ROUTES.VERIFY} element={<EmailVerifyScreen />} />
      <Route path={ROUTES.ONBOARDING} element={<OnboardingScreen />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordScreen />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordScreen />} />
      <Route path={ROUTES.TERMS} element={<TermsScreen />} />
      <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicyScreen />} />

      <Route
        path="/app/*"
        element={
          <ProtectedRoute requiredRole="patient">
            <PatientRouter />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sp/*"
        element={
          <ProtectedRoute requiredRole="sp">
            <SPRouter />
          </ProtectedRoute>
        }
      />

      <Route
        path={`${ADMIN_PORTAL_PATH}/*`}
        element={
          <ProtectedRoute requiredRole="admin" loginPath={ROUTES.ADMIN_LOGIN}>
            <AdminRouter />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
