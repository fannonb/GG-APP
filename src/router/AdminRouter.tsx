import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminOverviewScreen }   from '@/features/admin/dashboard/AdminOverviewScreen'
import { AdminMoneyScreen }      from '@/features/admin/insights/AdminMoneyScreen'
import { AdminEmailChangesScreen } from '@/features/admin/accounts/AdminEmailChangesScreen'
import { AdminPatientsInsightsScreen } from '@/features/admin/insights/AdminPatientsInsightsScreen'
import { AdminCareInsightsScreen } from '@/features/admin/insights/AdminCareInsightsScreen'
import { AdminProviderInsightsScreen } from '@/features/admin/insights/AdminProviderInsightsScreen'
import { AdminHealthInsightsScreen } from '@/features/admin/insights/AdminHealthInsightsScreen'
import { AdminSPAppsScreen }     from '@/features/admin/applications/AdminSPAppsScreen'
import { AdminCreditAppsScreen } from '@/features/admin/credit/AdminCreditAppsScreen'
import { AdminUsersScreen }      from '@/features/admin/users/AdminUsersScreen'
import { AdminProvidersScreen }  from '@/features/admin/providers/AdminProvidersScreen'
import { AdminPaymentsScreen }   from '@/features/admin/payments/AdminPaymentsScreen'
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
        <Route path="dashboard"    element={<AdminOverviewScreen />} />
        <Route path="applications" element={<AdminSPAppsScreen />} />
        <Route path="credit-applications" element={<AdminCreditAppsScreen />} />
        <Route path="users"        element={<AdminUsersScreen />} />
        <Route path="providers"    element={<AdminProvidersScreen />} />
        <Route path="payments"     element={<AdminPaymentsScreen />} />
        <Route path="news"         element={<AdminNewsScreen />} />
        <Route path="ads"          element={<AdminAdsScreen />} />
        <Route path="ledger-access" element={<AdminLedgerAccessScreen />} />
        <Route path="email-changes" element={<AdminEmailChangesScreen />} />
        <Route path="insights/money" element={<AdminMoneyScreen />} />
        <Route path="insights/patients" element={<AdminPatientsInsightsScreen />} />
        <Route path="insights/care" element={<AdminCareInsightsScreen />} />
        <Route path="insights/providers" element={<AdminProviderInsightsScreen />} />
        <Route path="insights/health" element={<AdminHealthInsightsScreen />} />
        {/* Old addresses from the previous analytics pages. */}
        <Route path="analytics" element={<Navigate to="../dashboard" replace />} />
        <Route path="financials" element={<Navigate to="../insights/money" replace />} />
        <Route path="demographics" element={<Navigate to="../insights/patients" replace />} />
        <Route path="disease-burden" element={<Navigate to="../insights/health" replace />} />
        <Route path="consumer-health" element={<Navigate to="../insights/health" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AdminCountryProvider>
  )
}
