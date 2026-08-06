# Routes

Routing uses React Router 7 with a top-level `BrowserRouter`, config-based nested routers, and role-gated portal prefixes.

## Public / authentication
- `/` → `src/features/auth/SplashScreen.tsx`; layout: Root app shell; public
- `/login` → `src/features/auth/LoginScreen.tsx`; layout: Responsive authentication split layout
- `/register` → `src/features/auth/RegisterScreen.tsx`; layout: Responsive authentication split layout
- `/verify` → `src/features/auth/EmailVerifyScreen.tsx`; layout: Public auth flow
- `/onboarding` → `src/features/auth/OnboardingScreen.tsx`; layout: Public auth flow
- `/forgot-password` → `src/features/auth/ForgotPasswordScreen.tsx`; layout: Public auth flow
- `/reset-password` → `src/features/auth/ResetPasswordScreen.tsx`; layout: Public auth flow
- `/terms` → `src/features/legal/TermsScreen.tsx`; layout: Public legal page
- `/privacy` → `src/features/legal/PrivacyPolicyScreen.tsx`; layout: Public legal page
- `/admin/login` → `src/features/auth/AdminLoginScreen.tsx`; layout: Public admin authentication

## Patient portal (`/app/*`, protected role: patient)
- `/app/dashboard` → `src/features/patient/DashboardScreen.tsx`; layout: Patient AppLayout
- `/app/services` → `src/features/patient/FindServiceScreen.tsx`; layout: Patient AppLayout
- `/app/services/:category` → `src/features/patient/ProviderListScreen.tsx`; layout: Patient AppLayout
- `/app/services/provider/:id` → `src/features/patient/ProviderProfileScreen.tsx`; layout: Patient AppLayout
- `/app/booking` → `src/features/patient/EngageFormScreen.tsx`; layout: Patient flow
- `/app/booking/confirm` → `src/features/patient/BookingConfirmScreen.tsx`; layout: Patient flow
- `/app/credit/*` → `src/features/patient/credit/*`; layout: Patient AppLayout / focused flow
- `/app/invoices/*` → `src/features/patient/invoices/*`; layout: Patient AppLayout / payment flow
- `/app/appointments` → `src/features/patient/AppointmentsScreen.tsx`; layout: Patient AppLayout
- `/app/prescriptions/*` → `src/features/patient/Prescription*Screen.tsx`; layout: Patient AppLayout
- `/app/transactions` → `src/features/patient/TransactionHistoryScreen.tsx`; layout: Patient AppLayout
- `/app/profile` → `src/features/patient/ProfileScreen.tsx`; layout: Patient AppLayout
- `/app/security/pin` → `src/features/patient/PaymentPinSetupScreen.tsx`; layout: Patient flow
- `/app/ledger/*` → `src/features/patient/ledger/*`; layout: Patient AppLayout / secure flow
- `/app/notifications` → `src/features/patient/NotificationsScreen.tsx`; layout: Patient AppLayout

## Service-provider portal (`/sp/*`, protected role: sp)
- `/sp/pending` → `src/features/service-provider/SPPendingScreen.tsx`; layout: Provider flow
- `/sp/dashboard` → `src/features/service-provider/dashboard/SPDashboardScreen.tsx`; layout: SPLayout
- `/sp/appointments/*` → `src/features/service-provider/appointments/*`; layout: SPLayout
- `/sp/patients/*` → `src/features/service-provider/patients/*`; layout: SPLayout
- `/sp/invoices/*` → `src/features/service-provider/invoices/*`; layout: SPLayout
- `/sp/prescriptions/*` → `src/features/service-provider/prescriptions/*`; layout: SPLayout
- `/sp/payments` → `src/features/service-provider/payments/SPPaymentsScreen.tsx`; layout: SPLayout
- `/sp/settings` → `src/features/service-provider/settings/SPSettingsScreen.tsx`; layout: SPLayout

## Administration portal (`/admin/*`, protected role: admin)
- `/admin/dashboard` → `src/features/admin/dashboard/AdminDashboardScreen.tsx`; layout: AdminLayout
- `/admin/applications` → `src/features/admin/applications/AdminSPAppsScreen.tsx`; layout: AdminLayout
- `/admin/credit-applications` → `src/features/admin/credit/AdminCreditAppsScreen.tsx`; layout: AdminLayout
- `/admin/users` → `src/features/admin/users/AdminUsersScreen.tsx`; layout: AdminLayout
- `/admin/providers` → `src/features/admin/providers/AdminProvidersScreen.tsx`; layout: AdminLayout
- `/admin/payments` → `src/features/admin/payments/AdminPaymentsScreen.tsx`; layout: AdminLayout
- `/admin/analytics` → `src/features/admin/analytics/AdminAnalyticsScreen.tsx`; layout: AdminLayout
- `/admin/news` → `src/features/admin/news/AdminNewsScreen.tsx`; layout: AdminLayout
- `/admin/ads` → `src/features/admin/ads/AdminAdsScreen.tsx`; layout: AdminLayout
- `/admin/ledger-access` → `src/features/admin/ledger/AdminLedgerAccessScreen.tsx`; layout: AdminLayout

## Full router configuration

### `src/router/routes.ts`

```ts
export const LOGO = '/gg-logo-v4.png'

export const ROUTES = {
  // Public
  SPLASH:          '/',
  LOGIN:           '/login',
  REGISTER:        '/register',
  VERIFY:          '/verify',
  ONBOARDING:      '/onboarding',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',
  TERMS:           '/terms',
  PRIVACY_POLICY:  '/privacy',
  DOWNLOAD:        '/download',

  // Patient portal
  DASHBOARD:    '/app/dashboard',
  FIND_SERVICE: '/app/services',
  PROVIDER_LIST:    '/app/services/:category',
  PROVIDER_PROFILE: '/app/services/provider/:id',
  BOOKING:         '/app/booking',
  BOOKING_CONFIRM: '/app/booking/confirm',
  CREDIT_WALLET:      '/app/credit',
  CREDIT_DISCLAIMER:  '/app/credit/disclaimer',
  CREDIT_APPLY:       '/app/credit/apply',
  CREDIT_INCREASE:    '/app/credit/increase',
  CREDIT_STATUS:      '/app/credit/status',
  INVOICE_LIST:   '/app/invoices',
  INVOICE_REVIEW: '/app/invoices/:id',
  PIN_AUTH:          '/app/invoices/:id/pay',
  PAYMENT_SUCCESS:   '/app/invoices/:id/success',
  APPOINTMENTS: '/app/appointments',
  PRESCRIPTION_REQUESTS: '/app/prescriptions',
  PRESCRIPTION_CONFIRM: '/app/prescriptions/confirm',
  PRESCRIPTION_DETAIL: '/app/prescriptions/:id',
  TRANSACTIONS: '/app/transactions',
  PROFILE:       '/app/profile',
  SECURITY_PIN:  '/app/security/pin',
  LEDGER:        '/app/ledger',
  LEDGER_PIN:    '/app/ledger/pin',
  LEDGER_ACCESS: '/app/ledger/access',
  NOTIFICATIONS: '/app/notifications',

  // Service Provider portal
  SP_PENDING:      '/sp/pending',
  SP_DASHBOARD:    '/sp/dashboard',
  SP_APPOINTMENTS: '/sp/appointments',
  SP_APT_DETAIL:   '/sp/appointments/:id',
  SP_PATIENTS:     '/sp/patients',
  SP_PATIENT_DETAIL: '/sp/patients/:id',
  SP_PATIENT_LEDGER: '/sp/patients/:id/ledger',
  SP_LEDGER_UNLOCK:  '/sp/ledger/unlock',
  SP_VISIT_RECORD:   '/sp/visits/record',
  SP_INVOICES:       '/sp/invoices',
  SP_INVOICE_UPLOAD: '/sp/invoices/upload',
  SP_INVOICE_DETAIL: '/sp/invoices/:id',
  SP_PRESCRIPTIONS: '/sp/prescriptions',
  SP_PRESCRIPTION_DETAIL: '/sp/prescriptions/:id',
  SP_PAYMENTS:  '/sp/payments',
  SP_SETTINGS:  '/sp/settings',

  // Admin (public)
  ADMIN_LOGIN: '/admin/login',

  // Admin portal
  ADMIN_DASHBOARD:    '/admin/dashboard',
  ADMIN_APPLICATIONS: '/admin/applications',
  ADMIN_CREDIT_APPLICATIONS: '/admin/credit-applications',
  ADMIN_USERS:        '/admin/users',
  ADMIN_PROVIDERS:    '/admin/providers',
  ADMIN_PAYMENTS:     '/admin/payments',
  ADMIN_ANALYTICS:    '/admin/analytics',
  ADMIN_NEWS:         '/admin/news',
  ADMIN_ADS:          '/admin/ads',
  ADMIN_LEDGER_ACCESS: '/admin/ledger-access',
} as const

/** Dynamic route builders for navigation */
export const route = {
  patientInvoice: (id: string) => `/app/invoices/${id}`,
  patientInvoicePay: (id: string) => `/app/invoices/${id}/pay`,
  patientInvoiceSuccess: (id: string) => `/app/invoices/${id}/success`,
  providerList: (category: string) => `/app/services/${category}`,
  patientPrescription: (id: string) => `/app/prescriptions/${id}`,
  providerProfile: (id: number | string) => `/app/services/provider/${id}`,
  spAppointment: (id: string) => `/sp/appointments/${id}`,
  spPatient: (id: string) => `/sp/patients/${id}`,
  spPatientLedger: (id: string) => `/sp/patients/${id}/ledger`,
  spInvoice: (id: string) => `/sp/invoices/${id}`,
  spPrescription: (id: string) => `/sp/prescriptions/${id}`,
  spRecordVisit: () => '/sp/visits/record',
} as const

/** Portal home routes keyed by role */
export const PORTAL_HOME = {
  patient: ROUTES.DASHBOARD,
  sp:      ROUTES.SP_DASHBOARD,
  admin:   ROUTES.ADMIN_DASHBOARD,
} as const
```

### `src/router/AppRouter.tsx`

```tsx
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
import { ROUTES } from './routes'
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
        path="/admin/*"
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
```

### `src/router/PatientRouter.tsx`

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardScreen }        from '@/features/patient/DashboardScreen'
import { FindServiceScreen }      from '@/features/patient/FindServiceScreen'
import { ProviderListScreen }     from '@/features/patient/ProviderListScreen'
import { ProviderProfileScreen }  from '@/features/patient/ProviderProfileScreen'
import { EngageFormScreen }       from '@/features/patient/EngageFormScreen'
import { BookingConfirmScreen }   from '@/features/patient/BookingConfirmScreen'
import { CreditWalletScreen }     from '@/features/patient/credit/CreditWalletScreen'
import { CreditDisclaimerScreen } from '@/features/patient/credit/CreditDisclaimerScreen'
import { CreditApplyScreen }      from '@/features/patient/credit/CreditApplyScreen'
import { CreditIncreaseScreen }   from '@/features/patient/credit/CreditIncreaseScreen'
import { CreditStatusScreen }     from '@/features/patient/credit/CreditStatusScreen'
import { InvoiceListScreen }      from '@/features/patient/invoices/InvoiceListScreen'
import { InvoiceReviewScreen }    from '@/features/patient/invoices/InvoiceReviewScreen'
import { PINAuthScreen }          from '@/features/patient/invoices/PINAuthScreen'
import { PaymentSuccessScreen }   from '@/features/patient/invoices/PaymentSuccessScreen'
import { AppointmentsScreen }         from '@/features/patient/AppointmentsScreen'
import { RescheduleReviewScreen }    from '@/features/patient/RescheduleReviewScreen'
import { TransactionHistoryScreen } from '@/features/patient/TransactionHistoryScreen'
import { ProfileScreen }          from '@/features/patient/ProfileScreen'
import { PaymentPinSetupScreen }  from '@/features/patient/PaymentPinSetupScreen'
import { HealthLedgerScreen }     from '@/features/patient/ledger/HealthLedgerScreen'
import { LedgerPinSetupScreen }   from '@/features/patient/ledger/LedgerPinSetupScreen'
import { LedgerAccessScreen }     from '@/features/patient/ledger/LedgerAccessScreen'
import { NotificationsScreen }    from '@/features/patient/NotificationsScreen'
import { PrescriptionRequestsScreen } from '@/features/patient/PrescriptionRequestsScreen'
import { PrescriptionConfirmScreen } from '@/features/patient/PrescriptionConfirmScreen'
import { PrescriptionDetailScreen } from '@/features/patient/PrescriptionDetailScreen'
import { NotFoundPage } from '@/components/errors/NotFoundPage'

export function PatientRouter() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard"              element={<DashboardScreen />} />
      <Route path="services"               element={<FindServiceScreen />} />
      <Route path="services/:category"     element={<ProviderListScreen />} />
      <Route path="services/provider/:id"  element={<ProviderProfileScreen />} />
      <Route path="booking"                element={<EngageFormScreen />} />
      <Route path="booking/confirm"        element={<BookingConfirmScreen />} />
      <Route path="credit"                 element={<CreditWalletScreen />} />
      <Route path="credit/disclaimer"      element={<CreditDisclaimerScreen />} />
      <Route path="credit/apply"           element={<CreditApplyScreen />} />
      <Route path="credit/increase"        element={<CreditIncreaseScreen />} />
      <Route path="credit/status"          element={<CreditStatusScreen />} />
      <Route path="invoices"               element={<InvoiceListScreen />} />
      <Route path="invoices/:id"           element={<InvoiceReviewScreen />} />
      <Route path="invoices/:id/pay"       element={<PINAuthScreen />} />
      <Route path="invoices/:id/success"   element={<PaymentSuccessScreen />} />
      <Route path="appointments"              element={<AppointmentsScreen />} />
      <Route path="appointments/:id/reschedule" element={<RescheduleReviewScreen />} />
      <Route path="prescriptions"             element={<PrescriptionRequestsScreen />} />
      <Route path="prescriptions/confirm"     element={<PrescriptionConfirmScreen />} />
      <Route path="prescriptions/:id"         element={<PrescriptionDetailScreen />} />
      <Route path="transactions"           element={<TransactionHistoryScreen />} />
      <Route path="profile"               element={<ProfileScreen />} />
      <Route path="security/pin"          element={<PaymentPinSetupScreen />} />
      <Route path="ledger"                element={<HealthLedgerScreen />} />
      <Route path="ledger/pin"            element={<LedgerPinSetupScreen />} />
      <Route path="ledger/access"         element={<LedgerAccessScreen />} />
      <Route path="notifications"          element={<NotificationsScreen />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
```

### `src/router/SPRouter.tsx`

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { SPPendingScreen }           from '@/features/service-provider/SPPendingScreen'
import { SPDashboardScreen }         from '@/features/service-provider/dashboard/SPDashboardScreen'
import { SPAppointmentsScreen }      from '@/features/service-provider/appointments/SPAppointmentsScreen'
import { SPAppointmentDetailScreen } from '@/features/service-provider/appointments/SPAppointmentDetailScreen'
import { SPPatientHistoryScreen }    from '@/features/service-provider/patients/SPPatientHistoryScreen'
import { SPPatientDetailScreen }     from '@/features/service-provider/patients/SPPatientDetailScreen'
import { SPPatientLedgerScreen }     from '@/features/service-provider/patients/SPPatientLedgerScreen'
import { SPLedgerUnlockScreen }      from '@/features/service-provider/patients/SPLedgerUnlockScreen'
import { SPInvoicesScreen }          from '@/features/service-provider/invoices/SPInvoicesScreen'
import { SPInvoiceUploadScreen }     from '@/features/service-provider/invoices/SPInvoiceUploadScreen'
import { SPInvoiceDetailScreen }     from '@/features/service-provider/invoices/SPInvoiceDetailScreen'
import { SPPaymentsScreen }          from '@/features/service-provider/payments/SPPaymentsScreen'
import { SPSettingsScreen }          from '@/features/service-provider/settings/SPSettingsScreen'
import { SPRecordVisitScreen }       from '@/features/service-provider/patients/SPRecordVisitScreen'
import { SPPrescriptionsScreen }     from '@/features/service-provider/prescriptions/SPPrescriptionsScreen'
import { SPPrescriptionDetailScreen } from '@/features/service-provider/prescriptions/SPPrescriptionDetailScreen'
import { NotFoundPage } from '@/components/errors/NotFoundPage'

export function SPRouter() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="pending"          element={<SPPendingScreen />} />
      <Route path="dashboard"        element={<SPDashboardScreen />} />
      <Route path="appointments"     element={<SPAppointmentsScreen />} />
      <Route path="appointments/:id" element={<SPAppointmentDetailScreen />} />
      <Route path="patients"         element={<SPPatientHistoryScreen />} />
      <Route path="patients/:id"     element={<SPPatientDetailScreen />} />
      <Route path="patients/:id/ledger" element={<SPPatientLedgerScreen />} />
      <Route path="ledger/unlock"    element={<SPLedgerUnlockScreen />} />
      <Route path="invoices"         element={<SPInvoicesScreen />} />
      <Route path="invoices/upload"  element={<SPInvoiceUploadScreen />} />
      <Route path="invoices/:id"     element={<SPInvoiceDetailScreen />} />
      <Route path="visits/record"    element={<SPRecordVisitScreen />} />
      <Route path="prescriptions"     element={<SPPrescriptionsScreen />} />
      <Route path="prescriptions/:id" element={<SPPrescriptionDetailScreen />} />
      <Route path="payments"         element={<SPPaymentsScreen />} />
      <Route path="settings"         element={<SPSettingsScreen />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
```

### `src/router/AdminRouter.tsx`

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminDashboardScreen }  from '@/features/admin/dashboard/AdminDashboardScreen'
import { AdminSPAppsScreen }     from '@/features/admin/applications/AdminSPAppsScreen'
import { AdminCreditAppsScreen } from '@/features/admin/credit/AdminCreditAppsScreen'
import { AdminUsersScreen }      from '@/features/admin/users/AdminUsersScreen'
import { AdminProvidersScreen }  from '@/features/admin/providers/AdminProvidersScreen'
import { AdminPaymentsScreen }   from '@/features/admin/payments/AdminPaymentsScreen'
import { AdminAnalyticsScreen }  from '@/features/admin/analytics/AdminAnalyticsScreen'
import { AdminNewsScreen }       from '@/features/admin/news/AdminNewsScreen'
import { AdminAdsScreen }        from '@/features/admin/ads/AdminAdsScreen'
import { AdminLedgerAccessScreen } from '@/features/admin/ledger/AdminLedgerAccessScreen'
import { AdminCountryProvider }  from '@/features/admin/AdminCountryContext'
import { NotFoundPage } from '@/components/errors/NotFoundPage'

export function AdminRouter() {
  return (
    <AdminCountryProvider>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"    element={<AdminDashboardScreen />} />
        <Route path="applications" element={<AdminSPAppsScreen />} />
        <Route path="credit-applications" element={<AdminCreditAppsScreen />} />
        <Route path="users"        element={<AdminUsersScreen />} />
        <Route path="providers"    element={<AdminProvidersScreen />} />
        <Route path="payments"     element={<AdminPaymentsScreen />} />
        <Route path="analytics"    element={<AdminAnalyticsScreen />} />
        <Route path="news"         element={<AdminNewsScreen />} />
        <Route path="ads"          element={<AdminAdsScreen />} />
        <Route path="ledger-access" element={<AdminLedgerAccessScreen />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AdminCountryProvider>
  )
}
```
