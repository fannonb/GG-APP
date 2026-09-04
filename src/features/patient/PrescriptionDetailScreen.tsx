import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGBadge, GGTextarea } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import {
  useAcceptPrescriptionQuoteMutation,
  useDeclinePrescriptionQuoteMutation,
  useMarkPrescriptionQuoteReviewedMutation,
  usePatientPrescriptionRequests,
} from '@/hooks/api'
import { getCountryByCode } from '@/config/countries'
import { useUserStore } from '@/store/user.store'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { route, ROUTES } from '@/router/routes'
import { formatCurrency, formatDate } from '@/utils/format'
import { downloadInvoiceAttachment } from '@/utils/invoice-attachment'
import { useAttachmentPreviewUrl } from '@/hooks/useAttachmentPreviewUrl'
import type { PrescriptionRequest } from '@/types/prescription.types'
import type { BadgeType } from '@/design-system/GGBadge'

function InfoRow({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '12px', color: C.textSub }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, textAlign: 'right' }}>{val}</span>
    </div>
  )
}

function getStatusMeta(status: PrescriptionRequest['status']): { type: BadgeType; label: string } {
  switch (status) {
    case 'submitted':
      return { type: 'warning', label: 'Awaiting Pharmacy' }
    case 'quoted':
      return { type: 'info', label: 'Quote Ready' }
    case 'accepted':
      return { type: 'info', label: 'Quote Accepted' }
    case 'preparing':
      return { type: 'pending', label: 'Preparing' }
    case 'ready':
      return { type: 'success', label: 'Ready' }
    case 'fulfilled':
      return { type: 'success', label: 'Fulfilled' }
    case 'cancelled':
      return { type: 'error', label: 'Cancelled' }
    case 'rejected':
      return { type: 'error', label: 'Rejected by Pharmacy' }
    default:
      return { type: 'default', label: status }
  }
}

function StatusNotice({ request }: { request: PrescriptionRequest }) {
  if (request.invoiceId && request.invoiceStatus === 'pending_auth') {
    return (
      <div style={{ padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.5 }}>
        Review the pharmacy pricing below, then {request.fulfillmentMode === 'delivery' ? 'approve delivery' : 'approve preparation'} from the invoice.
      </div>
    )
  }

  const copy: Partial<Record<PrescriptionRequest['status'], string>> = {
    submitted: 'The pharmacy is reviewing your prescription. They will accept it with pricing or reject it if unavailable.',
    quoted: 'The pharmacy sent pricing for your prescription. Review the quote below and accept or decline to continue.',
    accepted: request.invoiceId
      ? 'You accepted the quote. Review the invoice to approve payment and preparation.'
      : 'You accepted the quote. The pharmacy will upload an invoice shortly so you can approve payment.',
    preparing: 'The pharmacy is preparing your order.',
    ready: `Your order is ready for ${request.fulfillmentMode === 'delivery' ? 'delivery' : 'pickup'}.`,
    fulfilled: `Your order has been ${request.fulfillmentMode === 'delivery' ? 'delivered' : 'collected'}.`,
    cancelled: request.declineReason
      ? `This request was cancelled: ${request.declineReason}`
      : 'This prescription request was cancelled.',
    rejected: request.declineReason
      ? `The pharmacy could not fulfil this prescription: ${request.declineReason}`
      : 'The pharmacy rejected this prescription request.',
  }

  const message = copy[request.status]
  if (!message) return null

  return (
    <div style={{ padding: '12px 14px', background: request.status === 'rejected' ? C.errorBg : C.blue100, borderRadius: radius.sm, fontSize: '12px', color: request.status === 'rejected' ? C.error : '#1A5D8A', lineHeight: 1.5 }}>
      {message}
    </div>
  )
}

export function PrescriptionDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const u = useUserStore(s => s.user)
  const { data = [], isLoading } = usePatientPrescriptionRequests()
  const markReviewed = useMarkPrescriptionQuoteReviewedMutation()
  const acceptQuote = useAcceptPrescriptionQuoteMutation()
  const declineQuote = useDeclinePrescriptionQuoteMutation()
  const requests = data as PrescriptionRequest[]
  const request = requests.find(item => item.id === id)
  const currencySymbol = getCountryByCode(u.countryCode)?.currencySymbol ?? '$'

  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [quoteAccepted, setQuoteAccepted] = useState(false)

  const previewUrl = useAttachmentPreviewUrl(request?.attachment.dataUrl ?? '')

  useEffect(() => {
    if (!request?.id) return
    if (!request.quotedAt && request.quotedAmount == null) return
    if (request.quoteReviewedAt) return
    markReviewed.mutate(request.id)
    // Intentionally only when this request first needs review marking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, request?.quotedAt, request?.quotedAmount, request?.quoteReviewedAt])

  if (isLoading && !request) {
    return (
      <AppLayout title="Prescription Request" back notifCount={0}>
        <GGCard padding="24px"><div style={{ color: C.textSub, fontFamily: font.family }}>Loading prescription request…</div></GGCard>
      </AppLayout>
    )
  }

  if (!request) {
    return (
      <AppLayout title="Prescription Request" back notifCount={0}>
        <GGCard padding="24px"><div style={{ color: C.textSub, fontFamily: font.family }}>This prescription request could not be found.</div></GGCard>
      </AppLayout>
    )
  }

  const statusMeta = getStatusMeta(request.status)
  const attachment = request.attachment
  const canPreview = !!attachment.dataUrl && !!previewUrl
  const isDelivery = request.fulfillmentMode === 'delivery'
  const canReviewQuote = request.status === 'quoted'
  const awaitingInvoice = request.status === 'accepted' && !request.invoiceId
  const awaitingApproval = !!request.invoiceId && request.invoiceStatus === 'pending_auth'
  const invoiceSettled = !!request.invoiceId && request.invoiceStatus !== 'pending_auth'

  const handleAcceptQuote = async () => {
    setActionError(null)
    try {
      await acceptQuote.mutateAsync(request.id)
      setQuoteAccepted(true)
      setShowDecline(false)
      setDeclineReason('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to accept this quote.')
    }
  }

  const handleDeclineQuote = async () => {
    if (declineReason.trim().length < 3) {
      setActionError('Provide a short reason for declining this quote.')
      return
    }
    setActionError(null)
    try {
      await declineQuote.mutateAsync({ id: request.id, reason: declineReason.trim() })
      setShowDecline(false)
      setDeclineReason('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to decline this quote.')
    }
  }

  return (
    <AppLayout title={request.id} back notifCount={0}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 1fr)', gap: '20px', fontFamily: font.family }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GGCard padding="24px">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>Request Details</div>
              <GGBadge type={statusMeta.type}>{statusMeta.label}</GGBadge>
            </div>
            <InfoRow label="Submitted" val={formatDate(request.submittedAt)} />
            <InfoRow label="Pharmacy" val={request.provider ?? '—'} />
            <InfoRow label="For" val={request.for} />
            <InfoRow label="Fulfillment" val={isDelivery ? 'Delivery' : 'Pickup'} />
            {request.deliveryAddress && <InfoRow label="Delivery address" val={request.deliveryAddress} />}
            {request.patientNotes && <InfoRow label="Your notes" val={request.patientNotes} />}
            {request.pharmacyNotes && <InfoRow label="Pharmacy notes" val={request.pharmacyNotes} />}
          </GGCard>

          <GGCard padding="24px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Prescription File</div>
              {attachment.dataUrl && (
                <GGButton
                  variant="secondary"
                  size="sm"
                  onClick={() => void downloadInvoiceAttachment(attachment.dataUrl!, attachment.name ?? 'prescription')}
                >
                  Download
                </GGButton>
              )}
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '12px' }}>{attachment.name ?? 'Uploaded prescription'}</div>
            {canPreview && attachment.type === 'image' && (
              <img src={previewUrl} alt={attachment.name ?? 'Prescription'} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: radius.md, border: `1px solid ${C.border}` }} />
            )}
            {canPreview && attachment.type === 'pdf' && (
              <iframe title={attachment.name ?? 'Prescription PDF'} src={previewUrl} style={{ width: '100%', height: 420, border: `1px solid ${C.border}`, borderRadius: radius.md }} />
            )}
            {!canPreview && (
              <div style={{ padding: '32px 20px', textAlign: 'center', borderRadius: radius.md, border: `1px dashed ${C.border}`, background: C.bg }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>
                  {attachment.dataUrl ? 'Loading preview…' : 'Preview unavailable'}
                </div>
                <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.6 }}>
                  {attachment.dataUrl
                    ? 'The document is being prepared for preview.'
                    : 'This file type can\'t be previewed here. Use Download to view it.'}
                </div>
              </div>
            )}
          </GGCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <StatusNotice request={request} />

          {(request.quotedAmount != null || (request.quotedItems?.length ?? 0) > 0) && (
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '14px' }}>Quote from Pharmacy</div>
              {(request.quotedItems ?? []).map((item, index) => (
                <div
                  key={`${request.id}-item-${index}`}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: '13px' }}
                >
                  <span style={{ color: C.text }}>
                    {item.name}
                    {item.quantity ? ` × ${item.quantity}` : ''}
                  </span>
                  <span style={{ fontWeight: 700, color: C.text }}>{formatCurrency(item.unitPrice, currencySymbol)}</span>
                </div>
              ))}
              {request.quotedAmount != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', fontWeight: 700, color: C.text }}>
                  <span>Items total</span>
                  <span>{formatCurrency(request.quotedAmount, currencySymbol)}</span>
                </div>
              )}
              {request.deliveryFee != null && request.deliveryFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', fontWeight: 700, color: C.text, fontSize: 13 }}>
                  <span>Delivery fee</span>
                  <span>{formatCurrency(request.deliveryFee, currencySymbol)}</span>
                </div>
              )}
              {request.quotedAmount != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: 4, borderTop: `1px solid ${C.border}`, fontWeight: 800, color: C.navy800 }}>
                  <span>Total</span>
                  <span>{formatCurrency(request.quotedAmount + (request.deliveryFee ?? 0), currencySymbol)}</span>
                </div>
              )}
              {request.quotedAt && (
                <div style={{ fontSize: '11px', color: C.textSub, marginTop: '10px' }}>
                  Quoted on {formatDate(request.quotedAt)}
                </div>
              )}

              {canReviewQuote && !showDecline && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '12px' }}>
                    Accept this quote to let the pharmacy upload an invoice. You will approve payment when the invoice is ready.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <GGButton variant="primary" size="md" fullWidth loading={acceptQuote.isPending} onClick={() => void handleAcceptQuote()}>
                      Accept Quote →
                    </GGButton>
                    <GGButton variant="danger" size="md" fullWidth onClick={() => { setShowDecline(true); setActionError(null) }}>
                      Decline Quote
                    </GGButton>
                  </div>
                </div>
              )}

              {canReviewQuote && showDecline && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
                  <GGTextarea
                    label="Reason for declining *"
                    value={declineReason}
                    onChange={event => setDeclineReason(event.target.value)}
                    rows={3}
                    placeholder="Too expensive / prefer another pharmacy / …"
                    required
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <GGButton variant="secondary" size="md" fullWidth onClick={() => { setShowDecline(false); setDeclineReason('') }}>
                      Back
                    </GGButton>
                    <GGButton variant="danger" size="md" fullWidth loading={declineQuote.isPending} onClick={() => void handleDeclineQuote()}>
                      Confirm Decline
                    </GGButton>
                  </div>
                </div>
              )}

              {(quoteAccepted || awaitingInvoice) && !awaitingApproval && (
                <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: radius.sm, background: C.successBg, color: C.success, fontSize: '12px', lineHeight: 1.6 }}>
                  Quote accepted. Waiting for the pharmacy to upload your invoice.
                </div>
              )}

              {awaitingApproval && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
                  {request.invoiceId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '12px 14px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: C.bg }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase' }}>Invoice</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{request.invoiceId}</div>
                      </div>
                      <GGBadge type="warning">Awaiting approval</GGBadge>
                    </div>
                  )}
                  <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '12px' }}>
                    Review the invoice total
                    {request.quotedAmount != null
                      ? ` (${formatCurrency((request.quotedAmount ?? 0) + (request.deliveryFee ?? 0), currencySymbol)})`
                      : ''}
                    , then {isDelivery ? 'approve delivery' : 'approve preparation'} of your medication.
                  </div>
                  <GGButton
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => navigate(route.patientInvoice(request.invoiceId!))}
                  >
                    {isDelivery ? 'Review Invoice & Approve Delivery →' : 'Review Invoice & Approve Preparation →'}
                  </GGButton>
                </div>
              )}
            </GGCard>
          )}

          {invoiceSettled && (
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Invoice</div>
              <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '16px' }}>
                Your payment for this prescription order is complete.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px 14px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: C.bg }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase' }}>Invoice</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{request.invoiceId}</div>
                </div>
                <GGBadge type="info">{request.invoiceStatus ?? 'paid'}</GGBadge>
              </div>
              <GGButton variant="secondary" size="md" fullWidth onClick={() => navigate(route.patientInvoice(request.invoiceId!))}>
                View Invoice →
              </GGButton>
            </GGCard>
          )}

          {actionError && (
            <div style={{ padding: '12px 14px', borderRadius: radius.sm, background: C.errorBg, color: C.error, fontSize: '12px' }}>
              {actionError}
            </div>
          )}

          <GGButton variant="secondary" size="sm" onClick={() => navigate(ROUTES.PRESCRIPTION_REQUESTS)}>
            ← All Prescription Requests
          </GGButton>
        </div>
      </div>
    </AppLayout>
  )
}
