import { apiClient } from '@/api/client'
import type { AccountHistoryEntry, AdminProvider, AdminUser, EmailChangeRequest } from '@/types/admin.types'

export type AccountKind = 'users' | 'providers'

export interface CreditInvoiceEntry {
  kind: 'invoice'
  id: string
  at: string
  reference: string
  provider: { id: number; name: string }
  service: string
  lineItems: Array<{ name: string; amount: number }>
  forName: string | null
  forRelation: string | null
  amount: number
  fromCredit: number
  /** False for invoices approved before the credit/direct split was recorded. */
  splitRecorded: boolean
  paidDirect: number
  status: 'waiting' | 'approved' | 'paid' | 'disputed' | 'declined'
  submittedAt: string
  approvedAt: string | null
  authRef: string | null
  providerPaidAt: string | null
  payoutRef: string | null
  disputeReason: string | null
  rejectionReason: string | null
}

export interface CreditLimitEntry {
  kind: 'limit'
  id: string
  at: string
  change: 'approved' | 'increase' | 'admin'
  amount: number
  from: number | null
  to: number | null
  reason: string | null
  by: string | null
}

export interface CreditActivity {
  summary: {
    limit: number
    used: number
    available: number
    spentFromCredit: number
    paidDirect: number
    paidVisits: number
    waiting: number
    disputed: number
    forFamily: number
    lastUsedAt: string | null
  }
  items: Array<CreditInvoiceEntry | CreditLimitEntry>
}

export interface UpdatePatientPayload {
  firstName?: string
  lastName?: string
  phone?: string
  countryCode?: string
  dateOfBirth?: string
  gender?: string
  reason?: string
}

export interface UpdateProviderPayload {
  name?: string
  categories?: string[]
  phone?: string
  address?: string
  license?: string
  country?: string
  about?: string
  hours?: string
  openStatus?: 'open' | 'closed'
  payout?: { method: 'MPESA' | 'BANK' | 'MOBILE_MONEY'; accountName: string; accountNumber: string }
  reason?: string
}

/** Admin actions on patient and provider accounts. */
export const adminAccountsService = {
  async updatePatient(id: string, payload: UpdatePatientPayload) {
    const { data } = await apiClient.patch<AdminUser>(`/admin/users/${id}`, payload)
    return data
  },
  async setCreditLimit(id: string, limit: number, reason: string) {
    const { data } = await apiClient.post<AdminUser>(`/admin/users/${id}/credit-limit`, { limit, reason })
    return data
  },
  async updateProvider(id: string, payload: UpdateProviderPayload) {
    const { data } = await apiClient.patch<AdminProvider>(`/admin/providers/${id}`, payload)
    return data
  },
  async suspend(kind: AccountKind, id: string, reason: string) {
    const { data } = await apiClient.post(`/admin/${kind}/${id}/suspend`, { reason })
    return data
  },
  async reactivate(kind: AccountKind, id: string) {
    const { data } = await apiClient.post(`/admin/${kind}/${id}/reactivate`)
    return data
  },
  async signOutAll(kind: AccountKind, id: string) {
    const { data } = await apiClient.post<{ message: string }>(`/admin/${kind}/${id}/sign-out-all`)
    return data
  },
  async sendPasswordReset(kind: AccountKind, id: string) {
    const { data } = await apiClient.post<{ message: string }>(`/admin/${kind}/${id}/password-reset`)
    return data
  },
  async resendVerification(id: string) {
    const { data } = await apiClient.post<{ message: string }>(`/admin/users/${id}/resend-verification`)
    return data
  },
  async history(kind: AccountKind, id: string) {
    const { data } = await apiClient.get<AccountHistoryEntry[]>(`/admin/${kind}/${id}/history`)
    return data
  },
  async creditActivity(id: string) {
    const { data } = await apiClient.get<CreditActivity>(`/admin/users/${id}/credit-activity`)
    return data
  },
  async emailChanges(status: string) {
    const { data } = await apiClient.get<EmailChangeRequest[]>('/admin/email-changes', { params: { status } })
    return data
  },
  async decideEmailChange(id: string, approve: boolean, note?: string) {
    const { data } = await apiClient.post<{ message: string }>(`/admin/email-changes/${id}/${approve ? 'approve' : 'reject'}`, { note })
    return data
  },
}
