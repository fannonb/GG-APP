import { apiClient } from '@/api/client'
import type { MetricsCountry } from '@/types/admin-metrics.types'

export type PayoutTab = 'to_pay' | 'paid' | 'waiting' | 'disputed' | 'rejected'

export interface PayoutInvoice {
  id: string
  reference: string
  patientUserId: string
  patient: string
  forFamily: { name: string; relation: string | null } | null
  provider: { id: number; name: string; country: MetricsCountry | null }
  service: string | null
  amount: number
  currency: string | null
  status: 'authorized' | 'paid' | 'pending_auth' | 'disputed' | 'rejected'
  submittedAt: string
  approvedAt: string | null
  paidAt: string | null
  disputeReason: string | null
  rejectionReason: string | null
  payout: { id: string | null; reference: string; source: 'partner' | 'manual' | 'legacy'; partner: string | null; mismatch: boolean } | null
}

export interface PayoutInvoiceDetail extends PayoutInvoice {
  lineItems: Array<{ name: string; amount: number }>
  timeline: Array<{ label: string; at: string; note?: string | null }>
  payoutAccount: { method: string; accountName: string; accountNumber: string } | null
}

export interface PayoutList {
  tab: PayoutTab
  page: number
  pageSize: number
  total: number
  counts: Record<PayoutTab, number>
  items: PayoutInvoice[]
}

export interface PayoutSummaryRow {
  country: MetricsCountry
  currency: string
  approved: number
  paidOut: number
  owed: number
  owedCount: number
}

export interface OwedByProvider {
  provider: { id: number; name: string; country: MetricsCountry | null }
  currency: string | null
  owed: number
  invoiceIds: string[]
  invoiceCount: number
  oldestApprovedAt: string | null
  payoutAccount: { method: string; accountName: string; accountNumber: string } | null
}

export const adminPayoutsService = {
  async list(params: { tab: PayoutTab; country: string; range: string; q: string; page: number; pageSize: number }) {
    const { data } = await apiClient.get<PayoutList>('/admin/payouts/invoices', { params })
    return data
  },
  async summary(country: string, range: string) {
    const { data } = await apiClient.get<PayoutSummaryRow[]>('/admin/payouts/summary', { params: { country, range } })
    return data
  },
  async byProvider(country: string) {
    const { data } = await apiClient.get<OwedByProvider[]>('/admin/payouts/by-provider', { params: { country } })
    return data
  },
  async detail(id: string) {
    const { data } = await apiClient.get<PayoutInvoiceDetail>(`/admin/payouts/invoices/${id}`)
    return data
  },
  async record(payload: { invoiceIds: string[]; reference: string; paidAt?: string; note?: string }) {
    const { data } = await apiClient.post<{ payoutId: string; invoices: number; amount: number; currency: string }>('/admin/payouts/record', payload)
    return data
  },
}
