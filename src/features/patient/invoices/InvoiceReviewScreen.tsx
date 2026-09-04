import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGBadge, GGAvatar, GGTextarea } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { usePatientInvoice, usePatientInvoiceAttachment, useRejectInvoiceMutation } from '@/hooks/api'
import { isMockApi } from '@/api/config'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { useAttachmentPreviewUrl } from '@/hooks/useAttachmentPreviewUrl'
import { downloadInvoiceAttachment, isImageAttachmentUrl } from '@/utils/invoice-attachment'
import { MOCK_INVOICE } from '@/mock/patient.mock'
import { route, ROUTES } from '@/router/routes'
import { getCountryByCode } from '@/config/countries'
import { FlagImg } from '@/components/FlagImg'
import { useUserStore } from '@/store/user.store'
import { CreditLowBalancePrompt } from '@/features/patient/credit/components/CreditLowBalancePrompt'
import { isCreditRunningLow, wouldBeLowAfterPayment } from '@/utils/credit-threshold'
import type { BadgeType } from '@/design-system/GGBadge'

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
          <GGButton variant="success" size="md" style={{ flex: 1 }} onClick={() => void onDownload()}>
            Download
          </GGButton>
          <GGButton variant="secondary" size="md" onClick={onClose}>Close</GGButton>
        </div>
      </div>
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
  const hasApprovedCredit = user.creditStatus === 'approved'
  const invoiceAmount = inv?.amount ?? 0
  const walletPayAmount = Math.min(Math.max(0, user.creditAvailable), invoiceAmount)
  const offAppDue = Math.max(0, Number((invoiceAmount - walletPayAmount).toFixed(2)))
  const isPartialPay = walletPayAmount > 0 && offAppDue > 0
  const canAuthorize = hasApprovedCredit && walletPayAmount > 0
  const hasNoWalletBalance = hasApprovedCredit && walletPayAmount <= 0
  const balanceAlreadyLow = hasApprovedCredit && isCreditRunningLow(user.creditAvailable, user.countryCode)
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

  let badgeType: BadgeType = 'warning'
  let badgeLabel = 'Pending Auth'
  if (inv) {
    if (inv.status === 'authorized') {
      badgeType = 'success'
      badgeLabel = 'Paid'
    } else if (inv.status === 'paid') {
      badgeType = 'success'
      badgeLabel = 'Paid'
    } else if (inv.status === 'rejected') {
      badgeType = 'error'
      badgeLabel = 'Rejected'
    }
  }

  if (!inv) {
    return (
      <AppLayout title="Invoice Review" back notifCount={0}>
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

  return (
    <AppLayout title="Invoice Review" back notifCount={0}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>
        <div style={{ padding: '14px 22px', background: `linear-gradient(90deg, ${C.navy900}, ${C.navy800})`, borderRadius: radius.sm, display: 'flex', gap: '14px', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}><path d="M9 2L3 5v5c0 3.9 2.6 7.5 6 8.3 3.4-.8 6-4.4 6-8.3V5L9 2z" stroke={C.blue500} strokeWidth="1.3" fill="none" /><path d="M6 9l2 2 4-4" stroke={C.success} strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', fontFamily: font.family }}>
            <strong style={{ color: C.blue500 }}>Security-critical flow.</strong> Entering your payment PIN three times constitutes your legally binding payment consent.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '28px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GGCard padding="32px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '24px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Invoice From</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{inv.provider.name}</div>
                    {inv.isPrescription && <GGBadge type="info">Prescription Order</GGBadge>}
                  </div>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '5px' }}>{inv.provider.address}</div>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '2px' }}>Licence: {inv.provider.license}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <GGBadge type={badgeType}>{badgeLabel}</GGBadge>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '10px' }}>Invoice Date: {formatDate(inv.date)}</div>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '3px' }}>Due: {formatDate(inv.dueDate)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '24px', paddingBottom: '24px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ padding: '16px 18px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Billed To (Account Holder)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <GGAvatar name={inv.billedTo.name} size={32} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{inv.billedTo.name}</div>
                      <div style={{ fontSize: '11px', color: C.textSub }}>Balance Account Holder</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '16px 18px', borderRadius: radius.sm, border: `2px solid ${inv.serviceFor.type === 'beneficiary' ? 'rgba(74,173,223,0.35)' : C.border}`, background: inv.serviceFor.type === 'beneficiary' ? C.blue100 : C.bg }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: inv.serviceFor.type === 'beneficiary' ? C.blue500 : C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Service Recipient</div>
                  {inv.serviceFor.type === 'beneficiary' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', fontFamily: font.family }}>{inv.serviceFor.name.split(' ').map(name => name[0]).join('')}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800 }}>{inv.serviceFor.name}</div>
                        <div style={{ fontSize: '11px', color: C.blue500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <GGBadge type="info">Beneficiary</GGBadge>
                          <span>{inv.serviceFor.relation} · Age {inv.serviceFor.age}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <GGAvatar name={inv.billedTo.name} size={32} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{inv.billedTo.name}</div>
                        <div style={{ fontSize: '11px', color: C.textSub }}>Self (Account Holder)</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
                {inv.isPrescription ? 'Medications' : 'Services Rendered'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '8px' }}>
                {(inv.services.length > 0
                  ? inv.services
                  : [{ name: 'Service', amount: inv.amount }]
                ).map((service, index, list) => (
                  <div
                    key={`${service.name}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '12px 0',
                      borderBottom: index < list.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: C.text, lineHeight: 1.45 }}>{service.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.text, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(service.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 0', borderTop: `2px solid ${C.border}` }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>Total Amount</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{formatCurrency(inv.amount, currency)}</span>
              </div>
            </GGCard>

            <GGCard padding="22px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: C.errorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke={C.error} strokeWidth="1.4" /><path d="M7 7h6M7 10h6M7 13h4" stroke={C.error} strokeWidth="1.2" strokeLinecap="round" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Invoice Document (PDF)</div>
                  <div style={{ fontSize: '12px', color: attachmentMsg ? C.warning : C.textSub }}>
                    {attachmentMsg ||
                      (attachmentLoading
                        ? 'Loading invoice document…'
                        : attachmentUnavailable
                          ? 'Document unavailable — provider may need to re-upload the PDF.'
                          : attachmentReady
                            ? attachmentFileName
                            : 'Original invoice uploaded by service provider')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <GGButton
                    variant="secondary"
                    size="sm"
                    disabled={!attachmentReady || attachmentLoading}
                    onClick={() => setShowPreview(true)}
                  >
                    Preview
                  </GGButton>
                  <GGButton
                    variant="secondary"
                    size="sm"
                    disabled={attachmentLoading}
                    onClick={() => void handleDownload()}
                  >
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

          <div style={{ position: isMobile ? 'static' : 'sticky', top: '20px' }}>
            <GGCard padding="28px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>Payment Summary</div>
                {country && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '20px', background: C.bg, border: `1px solid ${C.border}` }}>
                    <FlagImg code={country.code} size={14} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, fontFamily: font.family }}>{country.currencyCode}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '22px' }}>
                {[
                  { label: 'Invoice Amount', val: formatCurrency(inv.amount, currency), bold: true },
                  { label: 'Available Balance', val: formatCurrency(user.creditAvailable, currency) },
                  { label: 'Pay from GG\'APP', val: formatCurrency(walletPayAmount, currency), color: C.success },
                  ...(isPartialPay
                    ? [{ label: 'Pay off-app to provider', val: formatCurrency(offAppDue, currency), color: C.warning }]
                    : []),
                  { label: 'Balance After In-App Pay', val: formatCurrency(user.creditAvailable - walletPayAmount, currency), color: C.warning },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: '13px', color: C.textSub }}>{item.label}</span>
                    <span style={{ fontSize: '15px', fontWeight: item.bold ? 800 : 600, color: item.color ?? C.text }}>{item.val}</span>
                  </div>
                ))}
              </div>

              {inv.status === 'pending_auth' ? (
                <>
                  <div style={{ padding: '14px 16px', background: C.blue100, borderRadius: radius.sm, marginBottom: '20px', fontSize: '13px', color: '#1A5D8A', lineHeight: 1.65 }}>
                    <strong>PIN confirmation required.</strong> You will enter your 4-digit payment PIN three times to authorize the in-app portion
                    {isPartialPay
                      ? ` (${formatCurrency(walletPayAmount, currency)}). The remaining ${formatCurrency(offAppDue, currency)} is settled directly with your provider.`
                      : ' of this payment.'}
                  </div>
                  {!hasApprovedCredit && (
                    <div style={{ padding: '12px 14px', background: C.warningBg, borderRadius: radius.sm, marginBottom: '12px', fontSize: '12px', color: '#8A4D00', lineHeight: 1.6 }}>
                      Approved healthcare credit is required before you can authorize this invoice.
                    </div>
                  )}
                  {hasNoWalletBalance && (
                    <div style={{ padding: '12px 14px', background: C.errorBg, borderRadius: radius.sm, marginBottom: '12px', fontSize: '12px', color: C.error, lineHeight: 1.6 }}>
                      Your GG'APP allocation is fully used. Settle this invoice directly with your provider, or
                      {' '}
                      <button
                        type="button"
                        onClick={() => navigate(ROUTES.CREDIT_INCREASE)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: C.error,
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          fontFamily: font.family,
                          fontSize: '12px',
                        }}
                      >
                        request a limit increase →
                      </button>
                    </div>
                  )}
                  {isPartialPay && (
                    <div style={{ padding: '12px 14px', background: C.warningBg, borderRadius: radius.sm, marginBottom: '12px', fontSize: '12px', color: '#8A4D00', lineHeight: 1.6 }}>
                      Your allocation covers {formatCurrency(walletPayAmount, currency)} of this invoice.
                      Pay the remaining {formatCurrency(offAppDue, currency)} off-app to {inv.provider.name}.
                    </div>
                  )}
                  {balanceAlreadyLow && (
                    <div style={{ marginBottom: '12px' }}>
                      <CreditLowBalancePrompt
                        available={user.creditAvailable}
                        countryCode={user.countryCode}
                        variant="inline"
                      />
                    </div>
                  )}
                  {balanceLowAfterPayment && !balanceAlreadyLow && inv && (
                    <div style={{ marginBottom: '12px' }}>
                      <CreditLowBalancePrompt
                        available={user.creditAvailable}
                        countryCode={user.countryCode}
                        variant="inline"
                        paymentAmount={walletPayAmount}
                      />
                    </div>
                  )}
                  <GGButton variant="success" size="md" fullWidth disabled={!canAuthorize} onClick={() => navigate(route.patientInvoicePay(inv.id))}>
                    {inv.isPrescription
                      ? isPartialPay
                        ? `Approve ${formatCurrency(walletPayAmount, currency)} & Continue`
                        : inv.fulfillmentMode === 'delivery'
                          ? 'Approve Delivery'
                          : 'Approve Preparation'
                      : isPartialPay
                        ? `Authorize ${formatCurrency(walletPayAmount, currency)} In-App`
                        : 'Proceed to Authorization'}
                  </GGButton>
                  
                  <div style={{ marginTop: '12px' }}>
                    <GGButton
                      variant="ghost"
                      fullWidth
                      onClick={() => setShowReject(prev => !prev)}
                      style={{
                        color: C.error,
                        border: `1.5px solid ${C.error}`,
                        background: 'transparent',
                        height: '42px',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}><path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      {showReject ? 'Cancel Rejection' : 'Reject Invoice'}
                    </GGButton>
                  </div>

                  {showReject && (
                    <div style={{ marginTop: '20px', borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.error, marginBottom: '8px' }}>Reject Invoice</div>
                      <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '12px', lineHeight: 1.55 }}>
                        Tell the provider what needs to be corrected. They can edit and resubmit the invoice for your review.
                      </div>
                      <GGTextarea
                        label="Reason for rejection"
                        placeholder="Describe what is incorrect or needs to be fixed..."
                        value={rejectReason}
                        onChange={event => setRejectReason(event.target.value)}
                        required
                        rows={4}
                      />
                      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                        <GGButton
                          variant="secondary"
                          size="sm"
                          style={{ flex: 1 }}
                          onClick={() => {
                            setShowReject(false)
                            setRejectReason('')
                          }}
                        >
                          Cancel
                        </GGButton>
                        <GGButton
                          variant="danger"
                          size="sm"
                          style={{ flex: 1 }}
                          disabled={!rejectReason.trim() || rejectInvoiceMutation.isPending}
                          onClick={() => {
                            rejectInvoiceMutation.mutate(
                              { invoiceId: inv.id, reason: rejectReason },
                              {
                                onSuccess: () => {
                                  setShowReject(false)
                                  setRejectReason('')
                                },
                              }
                            )
                          }}
                        >
                          {rejectInvoiceMutation.isPending ? 'Submitting...' : 'Reject Invoice'}
                        </GGButton>
                      </div>
                    </div>
                  )}
                </>
              ) : inv.status === 'authorized' ? (
                <div style={{ padding: '14px 16px', background: C.successBg, border: `1px solid ${C.success}`, borderRadius: radius.sm, color: '#0D6B47', fontSize: '13px', fontWeight: 600, textAlign: 'center', lineHeight: 1.5 }}>
                  ✓ Payment complete.
                </div>
              ) : inv.status === 'paid' ? (
                <div style={{ padding: '14px 16px', background: C.successBg, border: `1px solid ${C.success}`, borderRadius: radius.sm, color: '#0D6B47', fontSize: '13px', fontWeight: 600, textAlign: 'center', lineHeight: 1.5 }}>
                  ✓ Invoice Paid.
                </div>
              ) : inv.status === 'rejected' ? (
                <div style={{ padding: '14px 16px', background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: radius.sm, color: C.error, fontSize: '13px', fontWeight: 600, textAlign: 'center', lineHeight: 1.5 }}>
                  Invoice rejected. Waiting for the provider to submit a corrected version.
                  {inv.rejectionReason && (
                    <div style={{ marginTop: '8px', fontWeight: 500, fontSize: '12px', color: '#A83236' }}>
                      Your reason: {inv.rejectionReason}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '14px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.sm, color: C.textSub, fontSize: '13px', fontWeight: 600, textAlign: 'center', lineHeight: 1.5 }}>
                  Invoice Status: {inv.status}
                </div>
              )}
            </GGCard>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
