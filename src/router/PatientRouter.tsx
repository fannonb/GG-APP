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
import { CreditStatusScreen }     from '@/features/patient/credit/CreditStatusScreen'
import { InvoiceListScreen }      from '@/features/patient/invoices/InvoiceListScreen'
import { InvoiceReviewScreen }    from '@/features/patient/invoices/InvoiceReviewScreen'
import { PINAuthScreen }          from '@/features/patient/invoices/PINAuthScreen'
import { PaymentSuccessScreen }   from '@/features/patient/invoices/PaymentSuccessScreen'
import { TransactionHistoryScreen } from '@/features/patient/TransactionHistoryScreen'
import { ProfileScreen }          from '@/features/patient/ProfileScreen'
import { NotificationsScreen }    from '@/features/patient/NotificationsScreen'

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
      <Route path="credit/status"          element={<CreditStatusScreen />} />
      <Route path="invoices"               element={<InvoiceListScreen />} />
      <Route path="invoices/:id"           element={<InvoiceReviewScreen />} />
      <Route path="invoices/:id/pay"       element={<PINAuthScreen />} />
      <Route path="invoices/:id/success"   element={<PaymentSuccessScreen />} />
      <Route path="transactions"           element={<TransactionHistoryScreen />} />
      <Route path="profile"               element={<ProfileScreen />} />
      <Route path="notifications"          element={<NotificationsScreen />} />
    </Routes>
  )
}
