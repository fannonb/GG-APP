export type SPApplicationStatus = 'pending' | 'info_requested' | 'approved' | 'rejected'

export type DisputeStatus = 'open' | 'resolved' | 'escalated'

export type AdminInvoiceStatus = 'flagged' | 'clear' | 'approved' | 'rejected'

export interface AdminStats {
  pendingSPApps: number
  pendingDisputes: number
  pendingInvoices: number
  totalProviders: number
  totalPatients: number
  monthlyVolume: number
}

export interface SPApplication {
  id: string
  name: string
  type: string
  country: string
  email: string
  license: string
  submitted: string
  status: SPApplicationStatus
}

export interface Dispute {
  id: string
  patient: string
  provider: string
  invoice: string
  amount: number
  reason: string
  submitted: string
  status: DisputeStatus
  resolution?: 'patient' | 'provider'
  note?: string
}

export interface AdminInvoice {
  id: string
  provider: string
  patient: string
  amount: number
  submitted: string
  status: AdminInvoiceStatus
  flag?: string
}
