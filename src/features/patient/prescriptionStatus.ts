import type { PrescriptionRequest } from '@/types/prescription.types'

/** Where a prescription order stands from the patient's point of view. */
export type PrescriptionStage = 'reviewQuote' | 'approvePayment' | 'awaitQuote' | 'awaitInvoice' | 'preparing' | 'ready' | 'done' | 'closed'

export const isPrescriptionPaid = (r: PrescriptionRequest) => r.invoiceStatus === 'paid' || r.invoiceStatus === 'authorized'

export function prescriptionStage(r: PrescriptionRequest): PrescriptionStage {
  if (r.status === 'cancelled' || r.status === 'rejected') return 'closed'
  if (r.status === 'quoted') return 'reviewQuote'
  // A fulfilled order can still be waiting for the patient to approve its invoice.
  if (r.invoiceId && r.invoiceStatus === 'pending_auth') return 'approvePayment'
  if (r.status === 'fulfilled') return 'done'
  if (r.status === 'submitted') return 'awaitQuote'
  if (r.status === 'ready') return 'ready'
  if (r.status === 'accepted' && !r.invoiceId) return 'awaitInvoice'
  return 'preparing'
}

export function prescriptionMedicineSummary(r: PrescriptionRequest) {
  const items = r.quotedItems ?? []
  if (items.length === 0) return 'Prescription uploaded'
  const first = [items[0].name, items[0].quantity].filter(Boolean).join(' ')
  return items.length > 1 ? `${first} +${items.length - 1} more` : first
}

const QUOTED_STATUSES = new Set<PrescriptionRequest['status']>(['quoted', 'accepted', 'preparing', 'ready', 'fulfilled'])

/** Sent → Quote → Paid → Ready → Collected/Delivered, each with the date it happened when known. */
export function prescriptionProgress(r: PrescriptionRequest): { label: string; done: boolean; at?: string }[] {
  const delivery = r.fulfillmentMode === 'delivery'
  return [
    { label: 'Sent', done: true, at: r.submittedAt },
    { label: 'Quote', done: QUOTED_STATUSES.has(r.status) || r.quotedAt != null || r.quotedAmount != null, at: r.quotedAt },
    { label: 'Paid', done: isPrescriptionPaid(r) },
    { label: 'Ready', done: r.status === 'ready' || r.status === 'fulfilled', at: r.readyAt },
    { label: delivery ? 'Delivered' : 'Collected', done: r.status === 'fulfilled', at: r.fulfilledAt },
  ]
}
