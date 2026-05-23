import { Routes, Route, Navigate } from 'react-router-dom'
import { SPPendingScreen }           from '@/features/service-provider/SPPendingScreen'
import { SPDashboardScreen }         from '@/features/service-provider/dashboard/SPDashboardScreen'
import { SPAppointmentsScreen }      from '@/features/service-provider/appointments/SPAppointmentsScreen'
import { SPAppointmentDetailScreen } from '@/features/service-provider/appointments/SPAppointmentDetailScreen'
import { SPPatientHistoryScreen }    from '@/features/service-provider/patients/SPPatientHistoryScreen'
import { SPPatientDetailScreen }     from '@/features/service-provider/patients/SPPatientDetailScreen'
import { SPInvoicesScreen }          from '@/features/service-provider/invoices/SPInvoicesScreen'
import { SPInvoiceUploadScreen }     from '@/features/service-provider/invoices/SPInvoiceUploadScreen'
import { SPInvoiceDetailScreen }     from '@/features/service-provider/invoices/SPInvoiceDetailScreen'
import { SPPaymentsScreen }          from '@/features/service-provider/payments/SPPaymentsScreen'
import { SPSettingsScreen }          from '@/features/service-provider/settings/SPSettingsScreen'
import { SPRecordVisitScreen }       from '@/features/service-provider/patients/SPRecordVisitScreen'

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
      <Route path="invoices"         element={<SPInvoicesScreen />} />
      <Route path="invoices/upload"  element={<SPInvoiceUploadScreen />} />
      <Route path="invoices/:id"     element={<SPInvoiceDetailScreen />} />
      <Route path="visits/record"    element={<SPRecordVisitScreen />} />
      <Route path="payments"         element={<SPPaymentsScreen />} />
      <Route path="settings"         element={<SPSettingsScreen />} />
    </Routes>
  )
}
