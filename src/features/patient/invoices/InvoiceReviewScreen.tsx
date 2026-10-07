import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGAvatar, GGTextarea } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { usePatientInvoice, usePatientInvoiceAttachment, useRejectInvoiceMutation } from '@/hooks/api'
import { isMockApi } from '@/api/config'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatAmount, formatDate } from '@/utils/format'
import { useAttachmentPreviewUrl } from '@/hooks/useAttachmentPreviewUrl'
import { downloadInvoiceAttachment, isImageAttachmentUrl } from '@/utils/invoice-attachment'
import { MOCK_INVOICE } from '@/mock/patient.mock'
import { route, ROUTES } from '@/router/routes'
import { getCountryByCode } from '@/config/countries'
import { useUserStore } from '@/store/user.store'
import { getFinancePartnerIdForCountry, getFinancePartnerSummary } from '@/features/patient/credit/credit.constants'
import { getLowCreditThreshold, wouldBeLowAfterPayment } from '@/utils/credit-threshold'
import { getDaysUntilAppointment } from '@/utils/appointments'
import { ProgressSteps, type StepState } from '@/components/ProgressSteps'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'
const GREEN = '#15803D'
const GREEN_BG = 'rgba(34,197,94,0.12)'
const AMBER = '#B45309'
const AMBER_BG = 'rgba(245,166,35,0.14)'
const RED = '#B91C1C'
const RED_BG = 'rgba(239,68,68,0.10)'

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: 46,
  borderRadius: radius.sm,
  border: 'none',
  background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
  boxShadow: '0 6px 16px rgba(11,123,192,0.28)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
}

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: CYAN_DEEP,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: font.family,
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.textLight,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

function InvoiceAttachmentPreviewModal({
  fileName,
  url,
  onClose,
  onDownload,
}: {
  fileName: string
  url: string
  onClose: () => void
  onDownload: () => void
}) {
  const previewUrl = useAttachmentPreviewUrl(url)
  const isImage = isImageAttachmentUrl(url)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,30,66,0.6)', backdropFilter: 'blur(4px)' }} />
      <div
        onClick={event => event.stopPropagation()}
        style={{ position: 'relative', background: '#fff', borderRadius: '16px', width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 80px rgba(13,30,66,0.3)' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{fileName}</div>
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>Invoice document preview</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            style={{ background: C.bg, border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub, fontSize: '18px', fontWeight: 300 }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', background: C.bg, minHeight: 420 }}>
          {previewUrl ? (
            isImage ? (
              <img
                src={previewUrl}
                alt={`${fileName} preview`}
                style={{ display: 'block', width: '100%', height: '100%', minHeight: 420, objectFit: 'contain', background: '#fff' }}
              />
            ) : (
              <iframe
                title={`${fileName} preview`}
                src={previewUrl}
                style={{ width: '100%', height: '100%', minHeight: 420, border: 'none', display: 'block', background: '#fff' }}
              />
            )
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>
              Preparing preview…
            </div>
          )}
        </div>
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '10px' }}>
          <GGButton variant="primary" size="md" style={{ flex: 1 }} onClick={() => void onDownload()}>
            Download
          </GGButton>
          <GGButton variant="secondary" size="md" onClick={onClose}>Close</GGButton>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, strong, color }: { label: string; value: ReactNode; strong?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.textSub }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: strong ? 800 : 600, color: color ?? C.text, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export function InvoiceReviewScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { isMobile } = useResponsive()
  const user = useUserStore(s => s.user)
  const { data: invoice } = usePatientInvoice(id)
  const inv = invoice ?? (isMockApi ? MOCK_INVOICE : undefined)
  const shouldLoadAttachment = !!inv
  const {
    data: attachment,
    isLoading: attachmentLoading,
    isError: attachmentError,
  } = usePatientInvoiceAttachment(id, shouldLoadAttachment)
  const country = getCountryByCode(user.countryCode)
  const currency = country?.currencySymbol ?? 'Z$'
  const partnerName = getFinancePartnerSummary(getFinancePartnerIdForCountry(user.countryCode))?.name ?? 'your finance partner'
  const hasApprovedCredit = user.creditStatus === 'approved'
  const invoiceAmount = inv?.amount ?? 0
  const walletPayAmount = Math.min(Math.max(0, user.creditAvailable), invoiceAmount)
  const offAppDue = Math.max(0, Number((invoiceAmount - walletPayAmount).toFixed(2)))
  const isPartialPay = walletPayAmount > 0 && offAppDue > 0
  const canAuthorize = hasApprovedCredit && walletPayAmount > 0
  const hasNoWalletBalance = hasApprovedCredit && walletPayAmount <= 0
  const balanceLowAfterPayment = hasApprovedCredit && walletPayAmount > 0 && inv != null
    && wouldBeLowAfterPayment(user.creditAvailable, walletPayAmount, user.countryCode)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [attachmentMsg, setAttachmentMsg] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const rejectInvoiceMutation = useRejectInvoiceMutation()
  const attachmentUrl = attachment?.url ?? inv?.attachmentUrl ?? ''
  const attachmentFileName = attachment?.fileName ?? inv?.attachmentFileName ?? `${inv?.id ?? 'invoice'}.pdf`
  const attachmentReady = !!attachmentUrl
  const attachmentUnavailable =
    !attachmentLoading &&
    !attachmentReady &&
    (attachmentError || (shouldLoadAttachment && !attachmentLoading))

  const handleDownload = async () => {
    if (!attachmentUrl) {
      setAttachmentMsg(
        attachmentUnavailable
          ? 'PDF not available — ask your provider to re-upload the invoice document.'
          : 'Loading invoice document…',
      )
      setTimeout(() => setAttachmentMsg(''), 4000)
      return
    }

    await downloadInvoiceAttachment(attachmentUrl, attachmentFileName)
  }

  if (!inv) {
    return (
      <AppLayout title="Invoice" back notifCount={0}>
        <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: font.family }}>
          <GGCard padding="28px">
            <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Invoice unavailable</div>
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6 }}>
              This invoice could not be loaded for your account.
            </div>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  // 'authorized' means the patient approved and the partner released funds; both read as paid.
  const isPaid = inv.status === 'paid' || inv.status === 'authorized'
  const isPending = inv.status === 'pending_auth'
  const isRejected = inv.status === 'rejected'
  const paidFromCredit = inv.walletAmountPaid ?? inv.amount
  const paidOffApp = inv.offAppAmountDue ?? 0

  const status = isPaid
    ? { label: 'Paid', fg: GREEN, bg: GREEN_BG }
    : isRejected
      ? { label: 'Sent back to provider', fg: RED, bg: RED_BG }
      : isPending
        ? { label: 'Waiting for your approval', fg: AMBER, bg: AMBER_BG }
        : { label: inv.status.replace(/_/g, ' '), fg: C.textSub, bg: C.bg }

  const steps: { label: string; detail?: string; state: StepState }[] = [
    { label: 'Sent by provider', detail: formatDate(inv.date, { month: 'short', day: 'numeric' }), state: 'done' },
    isRejected
      ? { label: 'Sent back to provider', detail: 'Awaiting correction', state: 'stopped' }
      : { label: 'Approved by you', detail: isPending ? `By ${formatDate(inv.dueDate, { month: 'short', day: 'numeric' })}` : undefined, state: isPaid ? 'done' : isPending ? 'current' : 'todo' },
    { label: 'Paid to provider', state: isPaid ? 'done' : 'todo' },
  ]

  const daysToDue = getDaysUntilAppointment(inv.dueDate)
  const dueTone = daysToDue < 0 ? { fg: RED, bg: RED_BG } : daysToDue <= 2 ? { fg: AMBER, bg: AMBER_BG } : { fg: CYAN_DEEP, bg: C.blue100 }
  const dueText = daysToDue < 0
    ? `Overdue since ${formatDate(inv.dueDate, { month: 'short', day: 'numeric' })}`
    : `Approve by ${formatDate(inv.dueDate, { month: 'short', day: 'numeric' })}`

  const notices: { tone: 'warn' | 'error'; content: ReactNode }[] = []
  if (isPending) {
    if (!hasApprovedCredit) {
      notices.push({ tone: 'warn', content: 'You need approved healthcare credit before you can pay this invoice.' })
    } else if (hasNoWalletBalance) {
      notices.push({
        tone: 'error',
        content: (
          <>
            Your credit is fully used. Settle this invoice directly with the provider, or{' '}
            <button type="button" onClick={() => navigate(ROUTES.CREDIT_INCREASE)} style={{ ...linkBtn, fontSize: 12, color: RED, textDecoration: 'underline' }}>
              request a limit increase
            </button>.
          </>
        ),
      })
    } else if (isPartialPay) {
      notices.push({ tone: 'warn', content: `Your credit covers ${formatAmount(walletPayAmount, currency)}. Pay the remaining ${formatAmount(offAppDue, currency)} directly to ${inv.provider.name}.` })
    }
    if (balanceLowAfterPayment) {
      notices.push({
        tone: 'warn',
        content: (
          <>
            This leaves you below the {formatAmount(getLowCreditThreshold(user.countryCode), currency)} buffer we recommend.{' '}
            <button type="button" onClick={() => navigate(ROUTES.CREDIT_INCREASE)} style={{ ...linkBtn, fontSize: 12 }}>
              Request increase
            </button>
          </>
        ),
      })
    }
  }

  const recipientIsBeneficiary = inv.serviceFor.type === 'beneficiary'
  const lineItems = inv.services.length > 0 ? inv.services : [{ name: 'Service', amount: inv.amount }]

  const sidePanel = (
    <GGCard padding={isMobile ? '20px' : '24px'}>
      {isPaid ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: GREEN_BG, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M4 9.25l3.25 3.25L14 5.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Payment receipt</div>
              <div style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>Paid in full</div>
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{formatAmount(paidFromCredit + paidOffApp, currency)}</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 2, marginBottom: 14 }}>to {inv.provider.name}</div>
          <SummaryRow label="Paid from your credit" value={formatAmount(paidFromCredit, currency)} />
          {paidOffApp > 0 && <SummaryRow label="Paid directly to provider" value={formatAmount(paidOffApp, currency)} />}
          <SummaryRow label="Paid by" value={partnerName} />
          <SummaryRow label="Invoice" value={inv.id} />
          {inv.paymentRef && <SummaryRow label="Transaction ref" value={inv.paymentRef} />}
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 12, lineHeight: 1.5 }}>
            {partnerName} sent this payment straight to the provider's registered account.
          </div>
        </>
      ) : isRejected ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>Sent back to provider</div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>
            {inv.provider.name} will send you a corrected invoice. Nothing has been paid.
          </div>
          {inv.rejectionReason && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: C.bg, borderRadius: radius.sm, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              <div style={{ ...sectionLabel, marginBottom: 4 }}>Your note</div>
              {inv.rejectionReason}
            </div>
          )}
        </>
      ) : isPending ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>Amount to approve</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 2 }}>
            {formatAmount(walletPayAmount > 0 ? walletPayAmount : inv.amount, currency)}
          </div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>to {inv.provider.name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: radius.full, color: dueTone.fg, background: dueTone.bg }}>{dueText}</span>          </div>

          {hasApprovedCredit && (
            <SummaryRow
              label="Your credit"
              value={(
                <>
                  {formatAmount(user.creditAvailable, currency)}
                  <span style={{ color: C.textLight, fontWeight: 500 }}> → </span>
                  {formatAmount(user.creditAvailable - walletPayAmount, currency)}
                </>
              )}
            />
          )}

          {notices.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notices.map((notice, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    borderRadius: radius.sm,
                    fontSize: 12,
                    lineHeight: 1.55,
                    background: notice.tone === 'error' ? RED_BG : AMBER_BG,
                    color: notice.tone === 'error' ? RED : '#8A4D00',
                  }}
                >
                  {notice.content}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={!canAuthorize}
            onClick={() => navigate(route.patientInvoicePay(inv.id))}
            style={{ ...primaryBtn, marginTop: 18, opacity: canAuthorize ? 1 : 0.45, cursor: canAuthorize ? 'pointer' : 'not-allowed', boxShadow: canAuthorize ? primaryBtn.boxShadow : 'none' }}
          >
            Approve {formatAmount(walletPayAmount > 0 ? walletPayAmount : inv.amount, currency)} with PIN
          </button>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 8, lineHeight: 1.5, textAlign: 'center' }}>
            You'll enter your PIN three times. This is your legally binding approval and can't be undone.
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 13, color: C.textSub, textAlign: 'center' }}>
            Something wrong?{' '}
            <button type="button" onClick={() => setShowReject(prev => !prev)} aria-expanded={showReject} style={linkBtn}>
              {showReject ? 'Never mind' : 'Ask provider to fix it'}
            </button>
          </div>

          {showReject && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10, lineHeight: 1.55 }}>
                Tell {inv.provider.name} what's wrong. They'll send you a corrected invoice, and nothing is paid until you approve it.
              </div>
              <GGTextarea
                label="What needs fixing?"
                placeholder="e.g. I was charged for a test I didn't have"
                value={rejectReason}
                onChange={event => setRejectReason(event.target.value)}
                required
                rows={3}
              />
              <GGButton
                variant="danger"
                size="sm"
                fullWidth
                style={{ marginTop: 10 }}
                disabled={!rejectReason.trim() || rejectInvoiceMutation.isPending}
                onClick={() => {
                  rejectInvoiceMutation.mutate(
                    { invoiceId: inv.id, reason: rejectReason },
                    {
                      onSuccess: () => {
                        setShowReject(false)
                        setRejectReason('')
                      },
                    },
                  )
                }}
              >
                {rejectInvoiceMutation.isPending ? 'Sending…' : 'Send back to provider'}
              </GGButton>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 14, color: C.textSub }}>Status: {status.label}</div>
      )}
    </GGCard>
  )

  return (
    <AppLayout title={isPaid ? 'Invoice receipt' : 'Review invoice'} back notifCount={0}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20, fontFamily: font.family }}>
        <ProgressSteps steps={steps} label="Invoice progress" />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.75fr) minmax(300px, 1fr)', gap: isMobile ? 16 : 24, alignItems: 'start' }}>
          {isMobile && sidePanel}

          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20, minWidth: 0 }}>
            <GGCard padding={isMobile ? '20px' : '28px'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.015em' }}>{inv.provider.name}</div>
                    {inv.isPrescription && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: radius.full, color: CYAN_DEEP, background: C.blue100 }}>Prescription order</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>{inv.provider.address}</div>
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>Licence {inv.provider.license}</div>
                </div>
                <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: radius.full, color: status.fg, background: status.bg }}>{status.label}</span>
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 10 }}>{inv.id}</div>
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>Issued {formatDate(inv.date)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', padding: '12px 14px', background: recipientIsBeneficiary ? C.blue100 : C.bg, borderRadius: radius.sm }}>
                <GGAvatar name={recipientIsBeneficiary ? inv.serviceFor.name : inv.billedTo.name} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                    For {recipientIsBeneficiary ? inv.serviceFor.name : `${inv.billedTo.name} (you)`}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 1 }}>
                    {recipientIsBeneficiary
                      ? `${inv.serviceFor.relation}${inv.serviceFor.age ? `, ${inv.serviceFor.age}` : ''} · paid from ${inv.billedTo.name}'s credit`
                      : 'Paid from your healthcare credit'}
                  </div>
                </div>
              </div>

              <div style={{ ...sectionLabel, marginBottom: 6 }}>{inv.isPrescription ? 'Medications' : 'Services'}</div>
              <div>
                {lineItems.map((service, index) => (
                  <div
                    key={`${service.name}-${index}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '11px 0', borderBottom: `1px solid ${C.border}` }}
                  >
                    <span style={{ fontSize: 14, color: C.text, lineHeight: 1.45 }}>{service.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {formatAmount(service.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{formatAmount(inv.amount, currency)}</span>
              </div>
            </GGCard>

            <GGCard padding={isMobile ? '16px' : '18px 22px'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: C.blue100, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden><rect x="3.5" y="2" width="13" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Provider's invoice (PDF)</div>
                  <div style={{ fontSize: 12, color: attachmentMsg ? AMBER : C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {attachmentMsg ||
                      (attachmentLoading
                        ? 'Loading invoice document…'
                        : attachmentUnavailable
                          ? 'Not available. The provider may need to upload it again.'
                          : attachmentReady
                            ? attachmentFileName
                            : 'Original document uploaded by the provider')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
                  <GGButton variant="secondary" size="sm" disabled={!attachmentReady || attachmentLoading} onClick={() => setShowPreview(true)} style={{ flex: isMobile ? 1 : undefined }}>
                    Preview
                  </GGButton>
                  <GGButton variant="secondary" size="sm" disabled={attachmentLoading} onClick={() => void handleDownload()} style={{ flex: isMobile ? 1 : undefined }}>
                    Download
                  </GGButton>
                </div>
              </div>
              {showPreview && attachmentReady && (
                <InvoiceAttachmentPreviewModal
                  fileName={attachmentFileName}
                  url={attachmentUrl}
                  onClose={() => setShowPreview(false)}
                  onDownload={handleDownload}
                />
              )}
            </GGCard>
          </div>

          {!isMobile && <div style={{ position: 'sticky', top: 20 }}>{sidePanel}</div>}
        </div>
      </div>
    </AppLayout>
  )
}
