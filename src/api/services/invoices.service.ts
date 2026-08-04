import { isMockApi } from '@/api/config'
import { apiClient } from '@/api/client'
import { mockDelay } from '@/api/mock/delay'
import type { AuthorizePaymentPayload, AuthorizePaymentResult } from '@/api/types'
import type { PatientInvoice, PatientInvoiceAttachment, InvoiceStatus } from '@/types/invoice.types'
import type { Transaction } from '@/types/user.types'
import { MOCK_INVOICE, MOCK_TRANSACTIONS } from '@/mock/patient.mock'
import { MOCK_SP_INVOICES } from '@/mock/sp.mock'
import { useUserStore } from '@/store/user.store'

const MOCK_PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
const pinAttempts = new Map<string, number>()

async function hashPin(pin: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getMockInvoiceSvgDataUrl(invoiceId: string, providerName: string, amount: number, date: string): string {
  const svg = `
<svg width="600" height="800" xmlns="http://www.w3.org/2000/svg" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="0" y="0" width="600" height="800" fill="#ffffff" />
  
  <!-- Header -->
  <rect x="0" y="0" width="600" height="120" fill="#0D1E42" />
  <text x="40" y="70" font-size="28" font-weight="bold" fill="#ffffff" letter-spacing="-0.03em">INVOICE</text>
  <text x="560" y="70" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="end">${providerName}</text>
  
  <!-- Info Block -->
  <text x="40" y="180" font-size="11" font-weight="bold" fill="#9CA3AF" letter-spacing="0.05em">INVOICE NUMBER</text>
  <text x="40" y="205" font-size="16" font-weight="bold" fill="#111827">${invoiceId}</text>
  
  <text x="240" y="180" font-size="11" font-weight="bold" fill="#9CA3AF" letter-spacing="0.05em">DATE OF ISSUE</text>
  <text x="240" y="205" font-size="16" fill="#111827">${date}</text>
  
  <text x="440" y="180" font-size="11" font-weight="bold" fill="#9CA3AF" letter-spacing="0.05em">AMOUNT DUE</text>
  <text x="440" y="205" font-size="20" font-weight="bold" fill="#10B981">$${amount.toFixed(2)}</text>
  
  <line x1="40" y1="240" x2="560" y2="240" stroke="#E5E7EB" stroke-width="1.5" />
  
  <!-- Billed To -->
  <text x="40" y="280" font-size="11" font-weight="bold" fill="#9CA3AF" letter-spacing="0.05em">BILLED TO</text>
  <text x="40" y="305" font-size="16" font-weight="bold" fill="#111827">Sarah Johnson</text>
  <text x="40" y="325" font-size="13" fill="#4B5563">National ID: KE-30482175-A</text>
  
  <!-- Service Table -->
  <rect x="40" y="370" width="520" height="40" fill="#F9FAFB" rx="6" />
  <text x="50" y="395" font-size="12" font-weight="bold" fill="#4B5563" letter-spacing="0.02em">DESCRIPTION</text>
  <text x="550" y="395" font-size="12" font-weight="bold" fill="#4B5563" letter-spacing="0.02em" text-anchor="end">AMOUNT</text>
  
  <!-- Line Items -->
  <text x="50" y="440" font-size="14" fill="#111827">Medical Services Rendered</text>
  <text x="550" y="440" font-size="14" fill="#111827" text-anchor="end">$${amount.toFixed(2)}</text>
  <line x1="40" y1="465" x2="560" y2="465" stroke="#F3F4F6" stroke-width="1.5" />
  
  <!-- Total -->
  <text x="420" y="520" font-size="16" font-weight="bold" fill="#111827">Total</text>
  <text x="550" y="520" font-size="20" font-weight="bold" fill="#0D1E42" text-anchor="end">$${amount.toFixed(2)}</text>
  
  <!-- Footer -->
  <rect x="0" y="740" width="600" height="60" fill="#F9FAFB" />
  <text x="300" y="775" font-size="11" fill="#9CA3AF" text-anchor="middle">Thank you for choosing City Medical Centre. Securely authorized via GG'APP PIN confirmation.</text>
</svg>
  `.trim()
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

function getMergedPatientInvoices(): PatientInvoice[] {
  const mapped: PatientInvoice[] = MOCK_SP_INVOICES.map(spInv => {
    let status: InvoiceStatus = 'pending_auth'
    if (spInv.status === 'paid') status = 'paid'
    else if (spInv.status === 'authorized') status = 'authorized'
    else if (spInv.status === 'rejected') status = 'rejected'
    else if (spInv.status === 'pending') status = 'pending_auth'

    const dateObj = new Date(spInv.issueDate)
    dateObj.setDate(dateObj.getDate() + 7)
    const dueDate = dateObj.toISOString().split('T')[0]

    return {
      id: spInv.id,
      providerId: 1,
      status,
      provider: {
        name: 'City Medical Centre',
        license: 'MCZ-2019-04821',
        phone: '+263 4 123 4567',
        address: '14 Samora Machel Ave, Harare'
      },
      date: spInv.issueDate,
      dueDate,
      amount: spInv.amount,
      billedTo: {
        name: spInv.patient,
        nationalId: 'KE-30482175-A'
      },
      serviceFor: spInv.beneficiary ? {
        type: 'beneficiary' as const,
        name: spInv.beneficiary.name,
        relation: spInv.beneficiary.relation,
        age: spInv.beneficiary.age
      } : {
        type: 'self' as const,
        name: spInv.patient
      },
      services: spInv.services.map(s => ({
        name: s.name,
        amount: s.amount,
      })),
      attachmentUrl: spInv.attachmentBlobUrl || spInv.attachmentMetadata?.dataUrl || getMockInvoiceSvgDataUrl(
        spInv.id,
        'City Medical Centre',
        spInv.amount,
        spInv.issueDate
      ),
      attachmentFileName: spInv.attachment || `${spInv.id}.pdf`,
      hasAttachment: true,
    }
  })

  const list: PatientInvoice[] = [...mapped]
  if (!list.some(i => i.id === MOCK_INVOICE.id)) {
    if (!MOCK_INVOICE.attachmentUrl) {
      MOCK_INVOICE.attachmentUrl = getMockInvoiceSvgDataUrl(
        MOCK_INVOICE.id,
        MOCK_INVOICE.provider.name,
        MOCK_INVOICE.amount,
        MOCK_INVOICE.date
      )
    }
    list.push(MOCK_INVOICE)
  }
  return list
}

export const invoicesService = {
  async getPatientInvoices(): Promise<PatientInvoice[]> {
    if (isMockApi) {
      await mockDelay(250)
      return getMergedPatientInvoices()
    }
    const { data } = await apiClient.get<PatientInvoice[]>('/patient/invoices')
    return data
  },

  async getPatientInvoice(id: string): Promise<PatientInvoice | null> {
    if (isMockApi) {
      await mockDelay(200)
      const list = getMergedPatientInvoices()
      return list.find(i => i.id === id) ?? null
    }
    const { data } = await apiClient.get<PatientInvoice>(`/patient/invoices/${id}`)
    return data
  },

  async getPatientInvoiceAttachment(id: string): Promise<PatientInvoiceAttachment | null> {
    if (isMockApi) {
      await mockDelay(200)
      const invoice = await this.getPatientInvoice(id)
      if (!invoice?.attachmentUrl) return null
      return {
        url: invoice.attachmentUrl,
        fileName: invoice.attachmentFileName ?? `${invoice.id}.pdf`,
        mimeType: invoice.attachmentUrl.startsWith('data:image/') ? 'image/png' : 'application/pdf',
        sizeBytes: 0,
        displaySize: '',
      }
    }

    try {
      const { data } = await apiClient.get<PatientInvoiceAttachment>(
        `/patient/invoices/${id}/attachment`,
        { timeout: 120_000 },
      )
      return data
    } catch {
      return null
    }
  },

  async authorizePayment(payload: AuthorizePaymentPayload): Promise<AuthorizePaymentResult> {
    if (isMockApi) {
      await mockDelay(400)
      if (payload.step < 1 || payload.step > 3) {
        return {
          success: false,
          complete: false,
          message: 'PIN confirmation step must be 1, 2, or 3',
        }
      }

      const progressKey = `${payload.invoiceId}:progress`
      if (payload.step > 1) {
        const confirmedThrough = pinAttempts.get(progressKey) ?? 0
        if (confirmedThrough < payload.step - 1) {
          return {
            success: false,
            complete: false,
            message: 'Complete the previous PIN confirmation before continuing',
          }
        }
      }

      const key = `${payload.invoiceId}:${payload.step}`
      const pinHash = await hashPin(payload.pin)
      if (pinHash !== MOCK_PIN_HASH) {
        const attempts = (pinAttempts.get(key) ?? 0) + 1
        pinAttempts.set(key, attempts)
        if (attempts >= 3) {
          pinAttempts.delete(key)
          return {
            success: false,
            complete: false,
            lockedUntil: Date.now() + 30 * 60 * 1000,
            message: 'Too many attempts. Account locked for 30 minutes.',
          }
        }
        return {
          success: false,
          complete: false,
          attemptsRemaining: 3 - attempts,
          message: 'Incorrect PIN. Please try again.',
        }
      }
      pinAttempts.delete(key)
      pinAttempts.set(progressKey, payload.step)
      const complete = payload.step >= 3
      if (complete) {
        pinAttempts.delete(progressKey)
        const list = getMergedPatientInvoices()
        const targetInv = list.find(i => i.id === payload.invoiceId) || MOCK_INVOICE
        const creditAvailable = useUserStore.getState().user.creditAvailable
        const walletDebit = Math.min(Math.max(0, creditAvailable), targetInv.amount)
        const offAppDue = Math.max(0, Number((targetInv.amount - walletDebit).toFixed(2)))

        if (walletDebit <= 0) {
          return {
            success: false,
            complete: false,
            message: 'Insufficient allocation to authorize any portion of this invoice.',
          }
        }

        const spInv = MOCK_SP_INVOICES.find(i => i.id === payload.invoiceId)
        if (spInv) {
          spInv.status = 'authorized'
          spInv.walletAmountPaid = walletDebit
          spInv.offAppAmountDue = offAppDue
        }
        targetInv.status = 'authorized'
        targetInv.walletAmountPaid = walletDebit
        targetInv.offAppAmountDue = offAppDue
        if (payload.invoiceId === MOCK_INVOICE.id) {
          MOCK_INVOICE.status = 'authorized'
          MOCK_INVOICE.walletAmountPaid = walletDebit
          MOCK_INVOICE.offAppAmountDue = offAppDue
        }

        useUserStore.setState(state => ({
          user: {
            ...state.user,
            creditAvailable: Number((state.user.creditAvailable - walletDebit).toFixed(2)),
            creditUsed: Number((state.user.creditUsed + walletDebit).toFixed(2)),
          },
        }))

        const authId = `AUTH-${targetInv.id}`
        if (!MOCK_TRANSACTIONS.some(tx => tx.id === authId)) {
          const authorizedTxn: Transaction = {
            id: authId,
            provider: targetInv.provider.name,
            amount: walletDebit,
            date: new Date().toISOString(),
            status: 'authorized',
            service: targetInv.services[0]?.name ?? 'Invoice Authorization',
            invoiceId: targetInv.id,
          }
          MOCK_TRANSACTIONS.unshift(authorizedTxn)
        }
        return {
          success: true,
          complete: true,
          message: offAppDue > 0
            ? `Paid ${walletDebit} from your allocation. Settle ${offAppDue} directly with your provider.`
            : 'Payment authorization confirmed',
          walletAmountPaid: walletDebit,
          offAppAmountDue: offAppDue,
          invoiceAmount: targetInv.amount,
        }
      }
      return {
        success: true,
        complete: false,
        message: `PIN confirmation ${payload.step} of 3 accepted`,
      }
    }

    const { data } = await apiClient.post<AuthorizePaymentResult>(
      `/patient/invoices/${payload.invoiceId}/authorize`,
      { pin: payload.pin, step: payload.step },
    )
    return data
  },

  async rejectInvoice(id: string, reason: string): Promise<PatientInvoice> {
    if (isMockApi) {
      await mockDelay(300)
      const spInv = MOCK_SP_INVOICES.find(i => i.id === id)
      if (spInv) {
        spInv.status = 'rejected'
        spInv.rejectionReason = reason
      }
      if (id === MOCK_INVOICE.id) {
        MOCK_INVOICE.status = 'rejected'
        MOCK_INVOICE.rejectionReason = reason
        return MOCK_INVOICE
      }
      const list = getMergedPatientInvoices()
      const target = list.find(i => i.id === id)
      if (target) {
        target.status = 'rejected'
        target.rejectionReason = reason
        return target
      }
      return MOCK_INVOICE
    }
    const { data } = await apiClient.post<PatientInvoice>(`/patient/invoices/${id}/reject`, { reason })
    return data
  },
}
