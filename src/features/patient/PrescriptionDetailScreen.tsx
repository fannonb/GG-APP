import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGTextarea } from '@/design-system'
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
import { useResponsive } from '@/hooks/useResponsive'
import { route, ROUTES } from '@/router/routes'
import { formatAmount, formatDate } from '@/utils/format'
import { downloadInvoiceAttachment } from '@/utils/invoice-attachment'
import { useAttachmentPreviewUrl } from '@/hooks/useAttachmentPreviewUrl'
import { ProgressSteps, type ProgressStep } from '@/components/ProgressSteps'
import type { PrescriptionRequest } from '@/types/prescription.types'
import {
  isPrescriptionPaid,
  prescriptionMedicineSummary,
  prescriptionProgress,
  prescriptionStage,
  type PrescriptionStage,
} from './prescriptionStatus'

const CYAN_DEEP = '#0B7BC0'
const AMBER = { fg: '#B45309', bg: 'rgba(245,166,35,0.14)', border: 'rgba(245,166,35,0.5)' }
const CYAN = { fg: CYAN_DEEP, bg: C.blue100, border: C.border }
const GREEN = { fg: '#15803D', bg: 'rgba(34,197,94,0.12)', border: C.border }
const GREY = { fg: C.textSub, bg: C.bg, border: C.border }

const STATUS: Record<PrescriptionStage, { label: string; tone: typeof AMBER }> = {
  reviewQuote: { label: 'Quote to review', tone: AMBER },
  approvePayment: { label: 'Approve payment', tone: AMBER },
  awaitQuote: { label: 'Waiting for quote', tone: CYAN },
  awaitInvoice: { label: 'Invoice on its way', tone: CYAN },
  preparing: { label: 'Being prepared', tone: CYAN },
  ready: { label: 'Ready', tone: GREEN },
  done: { label: 'Completed', tone: GREEN },
  closed: { label: 'Closed', tone: GREY },
}

const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }

function Pill({ tone, children }: { tone: { fg: string; bg: string }; children: ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: radius.full, color: tone.fg, background: tone.bg, whiteSpace: 'nowrap' }}>{children}</span>
}

function StageIcon({ stage }: { stage: PrescriptionStage }) {
  const stroke = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (stage) {
    case 'ready':
    case 'done':
      return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9.5l3.2 3.2L14 5.5" {...stroke} /></svg>
    case 'closed':
      return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" {...stroke} /></svg>
    case 'reviewQuote':
    case 'approvePayment':
      return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 4.5v5.5" {...stroke} /><circle cx="9" cy="13.25" r="1.1" fill="currentColor" /></svg>
    default:
      return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" {...stroke} strokeWidth={1.6} /><path d="M9 5.75V9l2.25 1.5" {...stroke} strokeWidth={1.6} /></svg>
  }
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, color: C.textSub, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  )
}

function FilePreview({ request, onClose }: { request: PrescriptionRequest; onClose: () => void }) {
  const { isMobile } = useResponsive()
  const previewUrl = useAttachmentPreviewUrl(request.attachment.dataUrl ?? '')
  const dialogRef = useRef<HTMLDivElement>(null)
  const attachment = request.attachment

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(8,21,40,0.55)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={attachment.name ?? 'Prescription'}
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 900,
          height: isMobile ? '88vh' : '86vh',
          background: '#fff',
          borderRadius: isMobile ? `${radius.lg} ${radius.lg} 0 0` : radius.lg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          outline: 'none',
          fontFamily: font.family,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name ?? 'Prescription'}</div>
          {attachment.dataUrl && (
            <GGButton variant="secondary" size="sm" onClick={() => void downloadInvoiceAttachment(attachment.dataUrl!, attachment.name ?? 'prescription')}>Download</GGButton>
          )}
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 34, height: 34, borderRadius: radius.full, border: 'none', background: C.bg, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!previewUrl ? (
            <div style={{ fontSize: 13, color: C.textSub }}>{attachment.dataUrl ? 'Loading preview…' : 'This file can’t be previewed. Download it instead.'}</div>
          ) : attachment.type === 'image' ? (
            <img src={previewUrl} alt={attachment.name ?? 'Prescription'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <iframe title={attachment.name ?? 'Prescription PDF'} src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
          )}
        </div>
      </div>
    </div>
  )
}

export function PrescriptionDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { isMobile } = useResponsive()
  const u = useUserStore(s => s.user)
  const { data = [], isLoading } = usePatientPrescriptionRequests()
  const markReviewed = useMarkPrescriptionQuoteReviewedMutation()
  const acceptQuote = useAcceptPrescriptionQuoteMutation()
  const declineQuote = useDeclinePrescriptionQuoteMutation()
  const request = (data as PrescriptionRequest[]).find(item => item.id === id)

  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const closePreview = useCallback(() => setPreviewOpen(false), [])

  useEffect(() => {
    if (!request?.id) return
    if (!request.quotedAt && request.quotedAmount == null) return
    if (request.quoteReviewedAt) return
    markReviewed.mutate(request.id)
    // Intentionally only when this request first needs review marking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, request?.quotedAt, request?.quotedAmount, request?.quoteReviewedAt])

  if (!request) {
    return (
      <AppLayout title="Prescription" back notifCount={0}>
        <GGCard padding="24px">
          <div style={{ color: C.textSub, fontFamily: font.family }}>
            {isLoading ? 'Loading prescription…' : 'This prescription could not be found.'}
          </div>
        </GGCard>
      </AppLayout>
    )
  }

  const currency = getCountryByCode(request.countryCode ?? '')?.currencySymbol ?? getCountryByCode(u.countryCode)?.currencySymbol ?? '$'
  const money = (value: number) => formatAmount(value, currency)
  const stage = prescriptionStage(request)
  const status = stage === 'closed'
    ? { ...STATUS.closed, label: request.status === 'rejected' ? 'Declined' : 'Cancelled' }
    : STATUS[stage]
  const delivery = request.fulfillmentMode === 'delivery'
  const pharmacy = request.provider ?? 'The pharmacy'
  const items = request.quotedItems ?? []
  const hasQuote = request.quotedAmount != null || items.length > 0
  const total = (request.quotedAmount ?? 0) + (request.deliveryFee ?? 0)
  const paid = isPrescriptionPaid(request)
  const shortDate = (value?: string) => (value ? formatDate(value, { month: 'short', day: 'numeric' }) : undefined)

  const progress = prescriptionProgress(request)
  const currentIndex = progress.findIndex(step => !step.done)
  const steps: ProgressStep[] = progress.map((step, index) => ({
    label: step.label,
    detail: step.done ? shortDate(step.at) : undefined,
    state: step.done ? 'done' : index === currentIndex ? 'current' : 'todo',
  }))
  if (stage === 'closed') {
    // Show where the order stopped rather than a misleading "next" step.
    const stopAt = Math.max(currentIndex, 1)
    steps[stopAt] = { label: request.status === 'rejected' ? 'Declined' : 'Cancelled', state: 'stopped' }
  }

  const handleAcceptQuote = async () => {
    setActionError(null)
    try {
      await acceptQuote.mutateAsync(request.id)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to accept this quote.')
    }
  }

  const handleDeclineQuote = async () => {
    if (declineReason.trim().length < 3) {
      setActionError('Tell the pharmacy briefly why you are declining.')
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

  // ── Next step: one message and at most one main action for the current stage ──
  let next: { title: string; body: ReactNode; actions?: ReactNode }
  switch (stage) {
    case 'reviewQuote':
      next = {
        title: `${pharmacy} sent a price`,
        body: 'Check the items and total below. If you accept, the pharmacy sends an invoice for you to approve. Nothing is charged until then.',
        actions: showDecline ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <GGTextarea
              label="Why are you declining?"
              value={declineReason}
              onChange={event => setDeclineReason(event.target.value)}
              rows={2}
              placeholder="e.g. too expensive, I found it elsewhere"
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <GGButton variant="secondary" size="md" fullWidth onClick={() => { setShowDecline(false); setDeclineReason(''); setActionError(null) }}>Keep quote</GGButton>
              <GGButton variant="danger" size="md" fullWidth loading={declineQuote.isPending} onClick={() => void handleDeclineQuote()}>Decline quote</GGButton>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, alignItems: isMobile ? 'stretch' : 'center' }}>
            <GGButton variant="primary" size="md" fullWidth={isMobile} loading={acceptQuote.isPending} onClick={() => void handleAcceptQuote()}>
              Accept {total > 0 ? money(total) : 'quote'}
            </GGButton>
            <button type="button" onClick={() => { setShowDecline(true); setActionError(null) }} style={linkBtn}>Decline</button>
          </div>
        ),
      }
      break
    case 'approvePayment':
      next = {
        title: 'Approve the invoice',
        body: `${pharmacy} sent an invoice${total > 0 ? ` for ${money(total)}` : ''}. Approve it to pay with your GG'APP credit.`,
        actions: (
          <GGButton variant="primary" size="md" fullWidth={isMobile} onClick={() => navigate(route.patientInvoice(request.invoiceId!))}>
            Review &amp; approve{total > 0 ? ` ${money(total)}` : ''}
          </GGButton>
        ),
      }
      break
    case 'awaitQuote':
      next = { title: `Waiting for ${pharmacy}`, body: 'They are checking stock and will send you a price. We’ll notify you when it arrives.' }
      break
    case 'awaitInvoice':
      next = { title: 'Quote accepted', body: `${pharmacy} is preparing your invoice. You’ll approve payment from it.` }
      break
    case 'preparing':
      next = { title: 'Being prepared', body: `${pharmacy} is getting your order ready. We’ll tell you when it’s ready for ${delivery ? 'delivery' : 'pickup'}.` }
      break
    case 'ready':
      next = {
        title: delivery ? 'Ready and on its way' : `Ready for pickup at ${pharmacy}`,
        body: delivery
          ? `${pharmacy} will deliver to ${request.deliveryAddress ?? 'your address'}.`
          : 'Bring your ID when you collect it.',
        actions: request.providerId != null && !delivery ? (
          <GGButton variant="secondary" size="md" fullWidth={isMobile} onClick={() => navigate(route.providerProfile(request.providerId!))}>
            Hours &amp; directions
          </GGButton>
        ) : undefined,
      }
      break
    case 'done':
      next = {
        title: `${delivery ? 'Delivered' : 'Collected'}${request.fulfilledAt ? ` on ${formatDate(request.fulfilledAt, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`,
        body: paid ? `Paid${total > 0 ? ` ${money(total)}` : ''} with your GG'APP credit.` : 'This order is complete.',
        actions: request.providerId != null ? (
          <GGButton variant="secondary" size="md" fullWidth={isMobile} onClick={() => navigate(route.providerProfile(request.providerId!))}>
            Order again from {pharmacy}
          </GGButton>
        ) : undefined,
      }
      break
    case 'closed':
      next = {
        title: request.status === 'rejected' ? `${pharmacy} couldn’t fill this` : 'This order was cancelled',
        body: request.declineReason ? `Reason: ${request.declineReason}` : 'You can send the same prescription to another pharmacy.',
        actions: (
          <GGButton variant="primary" size="md" fullWidth={isMobile} onClick={() => navigate(route.providerList('pharmacy'))}>
            Try another pharmacy
          </GGButton>
        ),
      }
      break
  }

  const nextCard = (
    <div style={{ background: '#fff', border: `1px solid ${status.tone.border}`, borderRadius: radius.lg, padding: isMobile ? 16 : 20, display: 'flex', gap: 14 }}>
      <span aria-hidden style={{ width: 40, height: 40, borderRadius: radius.full, background: status.tone.bg, color: status.tone.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <StageIcon stage={stage} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.3, paddingTop: 2 }}>{next.title}</div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6, marginTop: 4 }}>{next.body}</div>
        </div>
        {next.actions}
        {actionError && <div role="alert" style={{ padding: '10px 12px', borderRadius: radius.sm, background: C.errorBg, color: C.error, fontSize: 13 }}>{actionError}</div>}
      </div>
    </div>
  )

  const priceCard = hasQuote && (
    <GGCard padding={isMobile ? '16px' : '20px'}>
      <div style={{ ...cardTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span>Price</span>
        {request.quotedAt && <span style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>Quoted {shortDate(request.quotedAt)}</span>}
      </div>
      {items.map((item, index) => (
        <div key={`${request.id}-item-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.name}</div>
            {(item.quantity || item.substitute) && (
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                {[item.quantity && `Qty ${item.quantity}`, item.substitute && `Substitute: ${item.substitute}`].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{money(item.unitPrice)}</div>
        </div>
      ))}
      {(request.deliveryFee ?? 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}`, fontSize: 14, color: C.textSub }}>
          <span>Delivery</span>
          <span style={{ fontWeight: 600, color: C.text }}>{money(request.deliveryFee!)}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontSize: 16, fontWeight: 800, color: C.text }}>
        <span>Total</span>
        <span>{money(total)}</span>
      </div>
      {request.invoiceId && (
        <button
          type="button"
          onClick={() => navigate(route.patientInvoice(request.invoiceId!))}
          style={{ all: 'unset', boxSizing: 'border-box', width: '100%', marginTop: 14, padding: '12px 14px', borderRadius: radius.sm, background: C.bg, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: font.family }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.textSub }}>Invoice</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{request.invoiceId}</div>
          </div>
          <Pill tone={paid ? GREEN : AMBER}>{paid ? 'Paid' : 'Awaiting approval'}</Pill>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ color: C.textLight }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
    </GGCard>
  )

  const attachment = request.attachment
  const detailsCard = (
    <GGCard padding={isMobile ? '16px' : '20px'}>
      <div style={{ ...cardTitle, marginBottom: 2 }}>Order details</div>
      <DetailRow label="Sent">{formatDate(request.submittedAt, { month: 'short', day: 'numeric', year: 'numeric' })}</DetailRow>
      <DetailRow label="For">{request.forSelf ? 'You' : request.for}</DetailRow>
      <DetailRow label={delivery ? 'Delivery to' : 'Pick up at'}>{delivery ? request.deliveryAddress ?? '—' : pharmacy}</DetailRow>
      {request.patientNotes && <DetailRow label="Your note">{request.patientNotes}</DetailRow>}
      {request.pharmacyNotes && <DetailRow label={`Note from ${pharmacy}`}>{request.pharmacyNotes}</DetailRow>}

      <div style={{ fontSize: 12, color: C.textSub, margin: '14px 0 8px' }}>Your prescription</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: radius.sm }}>
        <span aria-hidden style={{ width: 36, height: 36, borderRadius: 10, background: C.blue100, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 800 }}>
          {attachment.type === 'pdf' ? 'PDF' : 'IMG'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name ?? 'Prescription'}</div>
          {attachment.size && <div style={{ fontSize: 12, color: C.textSub }}>{attachment.size}</div>}
        </div>
        {attachment.dataUrl && (
          <button type="button" onClick={() => setPreviewOpen(true)} style={linkBtn}>View</button>
        )}
      </div>
    </GGCard>
  )

  return (
    <AppLayout title="Prescription" back notifCount={0}>
      <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: font.family }}>
        <GGCard padding={isMobile ? '16px' : '20px 22px'}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span aria-hidden style={{ width: 46, height: 46, borderRadius: 14, background: C.blue100, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
                <rect x="3.25" y="1.75" width="9.5" height="12.5" rx="1.75" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5.25v4.5M5.75 7.5h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 18 : 21, fontWeight: 800, color: C.text, lineHeight: 1.25 }}>{prescriptionMedicineSummary(request)}</div>
              <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
                {pharmacy} · {request.forSelf ? 'For you' : `For ${request.for}`} · {delivery ? 'Delivery' : 'Pick up'}
              </div>
              <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{request.id}</div>
            </div>
            {!isMobile && <Pill tone={status.tone}>{status.label}</Pill>}
          </div>
        </GGCard>

        <ProgressSteps steps={steps} label="Order progress" />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.5fr) minmax(300px, 1fr)', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {nextCard}
            {priceCard}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {detailsCard}
            {!isMobile && (
              <button type="button" onClick={() => navigate(ROUTES.PRESCRIPTION_REQUESTS)} style={{ ...linkBtn, alignSelf: 'flex-start', padding: '0 4px' }}>
                ← All prescriptions
              </button>
            )}
          </div>
        </div>
      </div>
      {previewOpen && <FilePreview request={request} onClose={closePreview} />}
    </AppLayout>
  )
}

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '8px 6px',
  fontSize: 14,
  fontWeight: 700,
  color: CYAN_DEEP,
  cursor: 'pointer',
  fontFamily: font.family,
}
