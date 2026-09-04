import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminDashboardScreen }  from '@/features/admin/dashboard/AdminDashboardScreen'
import { AdminSPAppsScreen }     from '@/features/admin/applications/AdminSPAppsScreen'
import { AdminCreditAppsScreen } from '@/features/admin/credit/AdminCreditAppsScreen'
import { AdminUsersScreen }      from '@/features/admin/users/AdminUsersScreen'
import { AdminProvidersScreen }  from '@/features/admin/providers/AdminProvidersScreen'
import { AdminPaymentsScreen }   from '@/features/admin/payments/AdminPaymentsScreen'
import { AdminAnalyticsScreen }  from '@/features/admin/analytics/AdminAnalyticsScreen'
import { AdminDiseaseBurdenScreen } from '@/features/admin/intelligence/AdminDiseaseBurdenScreen'
import { AdminDemographicsScreen } from '@/features/admin/intelligence/AdminDemographicsScreen'
import { AdminFinancialsInflationScreen } from '@/features/admin/intelligence/AdminFinancialsInflationScreen'
import { AdminConsumerHealthScreen } from '@/features/admin/intelligence/AdminConsumerHealthScreen'
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
        <Route path="disease-burden" element={<AdminDiseaseBurdenScreen />} />
        <Route path="demographics" element={<AdminDemographicsScreen />} />
        <Route path="financials"   element={<AdminFinancialsInflationScreen />} />
        <Route path="consumer-health" element={<AdminConsumerHealthScreen />} />
        <Route path="news"         element={<AdminNewsScreen />} />
        <Route path="ads"          element={<AdminAdsScreen />} />
        <Route path="ledger-access" element={<AdminLedgerAccessScreen />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AdminCountryProvider>
  )
}
