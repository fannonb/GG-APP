import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminDashboardScreen } from '@/features/admin/dashboard/AdminDashboardScreen'
import { AdminSPAppsScreen }    from '@/features/admin/applications/AdminSPAppsScreen'
import { AdminDisputesScreen }  from '@/features/admin/disputes/AdminDisputesScreen'
import { AdminInvoicesScreen }  from '@/features/admin/invoices/AdminInvoicesScreen'

export function AdminRouter() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard"    element={<AdminDashboardScreen />} />
      <Route path="applications" element={<AdminSPAppsScreen />} />
      <Route path="disputes"     element={<AdminDisputesScreen />} />
      <Route path="invoices"     element={<AdminInvoicesScreen />} />
    </Routes>
  )
}
