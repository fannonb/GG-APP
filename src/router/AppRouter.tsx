import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { PatientRouter } from './PatientRouter'
import { SPRouter } from './SPRouter'
import { AdminRouter } from './AdminRouter'
import { SplashScreen } from '@/features/auth/SplashScreen'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { RegisterScreen } from '@/features/auth/RegisterScreen'
import { EmailVerifyScreen } from '@/features/auth/EmailVerifyScreen'
import { OnboardingScreen } from '@/features/auth/OnboardingScreen'
import { TweaksPanel } from '@/components/TweaksPanel'
import { ROUTES } from './routes'
import type { UserRole } from '@/types/user.types'
import type { ReactNode } from 'react'

function ProtectedRoute({ children, requiredRole }: { children: ReactNode; requiredRole?: UserRole }) {
  const { loggedIn, userRole } = useAuthStore()
  if (!loggedIn) return <Navigate to={ROUTES.LOGIN} replace />
  if (requiredRole && userRole !== requiredRole) return <Navigate to={ROUTES.LOGIN} replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <>
      <Routes>
        {/* Public */}
        <Route path={ROUTES.SPLASH}           element={<SplashScreen />} />
        <Route path={ROUTES.LOGIN}            element={<LoginScreen />} />
        <Route path={ROUTES.REGISTER}         element={<RegisterScreen />} />
        <Route path={ROUTES.VERIFY}            element={<EmailVerifyScreen />} />
        <Route path={ROUTES.ONBOARDING}        element={<OnboardingScreen />} />

        {/* Patient portal */}
        <Route path="/app/*" element={
          <ProtectedRoute requiredRole="patient">
            <PatientRouter />
          </ProtectedRoute>
        } />

        {/* SP portal */}
        <Route path="/sp/*" element={
          <ProtectedRoute requiredRole="sp">
            <SPRouter />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin/*" element={
          <ProtectedRoute requiredRole="admin">
            <AdminRouter />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>

      <TweaksPanel />
    </>
  )
}
