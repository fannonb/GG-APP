import type { AdminStats, SPApplication, Dispute, AdminInvoice } from '@/types/admin.types'

export const MOCK_ADMIN_STATS: AdminStats = {
  pendingSPApps: 4,
  pendingDisputes: 2,
  pendingInvoices: 7,
  totalProviders: 38,
  totalPatients: 1247,
  monthlyVolume: 84320,
}

export const MOCK_SP_APPLICATIONS: SPApplication[] = [
  { id: 'SP-APP-847291', name: 'Harare Eye Clinic',    type: 'Specialist',  country: 'Zimbabwe', email: 'admin@harare-eye.co.zw', license: 'MCZ-SPEC-2022-1183', submitted: '2026-05-20', status: 'pending' },
  { id: 'SP-APP-847290', name: 'QuickMeds Pharmacy',   type: 'Pharmacy',    country: 'Zimbabwe', email: 'info@quickmeds.co.zw',   license: 'ZPRA-2021-4421',       submitted: '2026-05-19', status: 'pending' },
  { id: 'SP-APP-847289', name: 'Bulawayo Diagnostics', type: 'Laboratory',  country: 'Zimbabwe', email: 'lab@bdx.co.zw',          license: 'MCZ-LAB-2020-0087',    submitted: '2026-05-18', status: 'info_requested' },
  { id: 'SP-APP-847288', name: 'Family Care Clinic',   type: 'Clinic',      country: 'Zambia',   email: 'hello@familycare.zm',    license: 'HPC-ZM-2023-2210',     submitted: '2026-05-17', status: 'pending' },
]

export const MOCK_DISPUTES: Dispute[] = [
  { id: 'DISP-2026-001', patient: 'Sarah Johnson',   provider: 'City Medical Centre', invoice: 'INV-2026-0842', amount: 450.00, reason: 'Incorrect service billed — patient disputes the wound dressing charge as it was not rendered during the visit.', submitted: '2026-05-20', status: 'open' },
  { id: 'DISP-2026-002', patient: 'Michael Tawanda', provider: 'LifeCare Pharmacy',   invoice: 'INV-2026-0831', amount: 125.50, reason: 'Medication quantity on invoice does not match what was dispensed.',                                                submitted: '2026-05-19', status: 'open' },
  { id: 'DISP-2026-003', patient: 'Grace Mutasa',    provider: 'Premier Diagnostics', invoice: 'INV-2026-0800', amount: 280.00, reason: 'Patient received all services listed. Dispute resolved in favour of provider.',                                   submitted: '2026-05-10', status: 'resolved' },
]

export const MOCK_ADMIN_INVOICES: AdminInvoice[] = [
  { id: 'INV-2026-0842', provider: 'City Medical Centre', patient: 'Sarah Johnson',    amount: 450.00, submitted: '2026-05-19', status: 'flagged', flag: 'Amount 32% above avg for service type' },
  { id: 'INV-2026-0841', provider: 'LifeCare Pharmacy',   patient: 'Michael Tawanda', amount: 125.50, submitted: '2026-05-18', status: 'clear' },
  { id: 'INV-2026-0840', provider: 'Premier Diagnostics', patient: 'David Chirwa',    amount: 280.00, submitted: '2026-05-17', status: 'clear' },
]
