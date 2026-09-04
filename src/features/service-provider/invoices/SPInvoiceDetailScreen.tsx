import { useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGAvatar, StarRating } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { getCountryByCode } from '@/config/countries'
import { useSPInvoice, useSPInvoiceAttachment } from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { formatCurrency, formatDate, formatPhone } from '@/utils/format'
import { downloadInvoiceAttachment, isImageAttachmentUrl } from '@/utils/invoice-attachment'
import { useAttachmentPreviewUrl } from '@/hooks/useAttachmentPreviewUrl'
import type { SPInvoice } from '@/types/invoice.types'

type SPInvStatus = 'paid' | 'pending' | 'authorized' | 'rejected'

const STATUS: Record<SPInvStatus, { label: string; color: string; bg: string; border: string; text: string }> = {
  paid:      { label: 'Paid',      color: C.success, bg: C.successBg, border: 'rgba(34,201,138,0.2)',  text: '#0D6B47' },
  authorized:{ label: 'Paid', color: C.success, bg: C.successBg, border: 'rgba(34,201,138,0.2)', text: '#0D6B47' },
  pending:   { label: 'Pending Auth', color: '#D97706', bg: '#FEF3C7', border: 'rgba(217,119,6,0.2)', text: '#B45309' },
  rejected:  { label: 'Rejected', color: C.error, bg: C.errorBg, border: 'rgba(229,71,77,0.25)', text: C.error },
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px', fontFamily: font.family }}>{children}</div>
}

function InfoRow({ label, val, last }: { label: string; val: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: last ? 'none' : `1px solid ${C.border}`, gap: '8px' }}>
      <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family, textAlign: 'right' }}>{val}</span>
    </div>
  )
}

function NoteBlock({ label, text, borderColor, bg, textColor }: { label: string; text: string; borderColor: string; bg: string; textColor: string }) {
  return (
    <div style={{ borderLeft: `4px solid ${borderColor}`, borderRadius: '0 8px 8px 0', background: bg, padding: '14px 16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: textColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: font.family }}>{label}</div>
      <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.7, fontFamily: font.family }}>{text}</div>
    </div>
  )
}

function AttachmentModal({
  pdfName,
  attachmentUrl,
  isLoading,
  isUnavailable,
  onClose,
  onDownload,
  onReupload,
}: {
  pdfName: string
  attachmentUrl: string
  isLoading: boolean
  isUnavailable: boolean
  onClose: () => void
  onDownload: () => void
  onReupload: () => void
}) {
  const previewUrl = useAttachmentPreviewUrl(attachmentUrl)
  const canPreview = !!attachmentUrl && !!previewUrl

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,30,66,0.6)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: '16px', width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 80px rgba(13,30,66,0.3)' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{pdfName}</div>
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>Invoice document · PDF</div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub, fontSize: '18px', fontWeight: 300 }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', background: C.bg }}>
          {isLoading ? (
            <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: 420 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, fontFamily: font.family }}>Loading document…</div>
              <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>Fetching invoice PDF from server</div>
            </div>
          ) : canPreview ? (
            isImageAttachmentUrl(attachmentUrl) ? (
              <img
                src={previewUrl}
                alt={`${pdfName} preview`}
                style={{ width: '100%', height: '100%', minHeight: 420, objectFit: 'contain', display: 'block', background: '#fff' }}
              />
            ) : (
              <iframe
                src={previewUrl}
                style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none', display: 'block' }}
                title={pdfName}
              />
            )
          ) : (
            <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: 420 }}>
              <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(229,71,77,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="26" viewBox="0 0 22 26" fill="none"><rect x="1" y="1" width="20" height="24" rx="3" stroke={C.error} strokeWidth="1.4"/><path d="M5 9h12M5 13h12M5 17h7" stroke={C.error} strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, fontFamily: font.family }}>{pdfName}</div>
              <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, textAlign: 'center', lineHeight: 1.6 }}>
                {isUnavailable
                  ? 'The PDF file was not stored with this invoice. Edit and resubmit the invoice with the PDF attached.'
                  : 'Invoice document is not available yet.'}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '10px' }}>
          {canPreview && (
            <GGButton variant="success" size="md" style={{ flex: 1 }} onClick={() => void onDownload()}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}><path d="M7 1v8M3 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 11h12v2H1z" fill="currentColor" opacity="0.3"/></svg>
              Download PDF
            </GGButton>
          )}
          {isUnavailable && (
            <GGButton variant="primary" size="md" style={{ flex: 1 }} onClick={onReupload}>
              Re-upload PDF
            </GGButton>
          )}
          <GGButton variant="secondary" size="md" onClick={onClose} style={{ flex: canPreview || isUnavailable ? undefined : 1 }}>Close</GGButton>
        </div>
      </div>
    </div>
  )
}

export function SPInvoiceDetailScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const locationInvoice = (location.state as { invoice: SPInvoice } | null)?.invoice
  const { data: invoice, isLoading } = useSPInvoice(id)
  const inv = invoice ?? locationInvoice
  const {
    data: attachment,
    isLoading: attachmentLoading,
    isError: attachmentError,
  } = useSPInvoiceAttachment(id, !!inv)
  const [showAttachment, setShowAttachment] = useState(false)
  const attachmentUrl =
    attachment?.url ?? inv?.attachmentBlobUrl ?? inv?.attachmentMetadata?.dataUrl ?? ''
  const pdfName = attachment?.fileName ?? inv?.attachment ?? `${inv?.id ?? 'invoice'}.pdf`
  const attachmentUnavailable =
    !attachmentLoading && !attachmentUrl && (attachmentError || !!inv)

  const handleDownload = async () => {
    if (!attachmentUrl) return
    await downloadInvoiceAttachment(attachmentUrl, pdfName)
  }

  if (isLoading && !inv) {
    return (
      <SPLayout title="Invoice Detail">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading invoice details...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  if (!inv) {
    return (
      <SPLayout title="Invoice Detail">
        <GGCard padding="24px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
              We could not load this invoice.
            </div>
            <GGButton variant="secondary" size="sm" onClick={() => navigate(ROUTES.SP_INVOICES)}>
              Back to Invoices
            </GGButton>
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const s = STATUS[inv.status as SPInvStatus] ?? STATUS.rejected
  const patientCountry = getCountryByCode(inv.countryCode ?? '')

  const handleReupload = () => {
    navigate('/sp/invoices/upload', { state: { editInvoice: inv } })
  }

  let timeline: { label: string; date: string | null; done: boolean; color: string }[] = []
  if (inv.status === 'rejected') {
    timeline = [
      { label: 'Submitted', date: inv.submittedAt, done: true, color: C.success },
      { label: 'Rejected', date: inv.submittedAt, done: true, color: C.error },
      { label: 'Awaiting Resubmit', date: null, done: false, color: C.error },
    ]
  } else if (inv.status === 'paid') {
    timeline = [
      { label: 'Submitted', date: inv.submittedAt, done: true, color: C.success },
      { label: 'Paid',      date: inv.paidAt ?? null,      done: true, color: C.success },
    ]
  } else if (inv.status === 'authorized') {
    timeline = [
      { label: 'Submitted', date: inv.submittedAt, done: true, color: C.success },
      { label: 'Paid', date: inv.paidAt ?? null, done: true, color: C.success },
    ]
  } else if (inv.status === 'pending') {
    timeline = [
      { label: 'Submitted', date: inv.submittedAt, done: true, color: C.success },
      { label: 'Awaiting Auth', date: null, done: false, color: '#D97706' },
    ]
  }

  const mainCol = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Patient info */}
      <GGCard padding={isMobile ? '18px' : '22px'}>
        <SectionLabel>Patient</SectionLabel>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <GGAvatar name={inv.patient.replace(/\s*\(.*\)/, '')} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '17px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>{inv.patient}</div>
              {inv.isPrescription && (
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: radius.full, background: C.blue100, border: '1px solid rgba(74,173,223,0.25)', fontSize: '11px', fontWeight: 700, color: '#1A5D8A', fontFamily: font.family }}>
                  Prescription Order
                </span>
              )}
            </div>
            {inv.beneficiary && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '4px', padding: '3px 10px', borderRadius: radius.full, background: C.blue100, border: '1px solid rgba(74,173,223,0.25)', fontSize: '11px', color: '#1A5D8A', fontFamily: font.family, fontWeight: 600 }}>
                For {inv.beneficiary.name} · {inv.beneficiary.relation}
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
              {inv.phone && <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{formatPhone(inv.phone, patientCountry?.name).display}</span>}
              {inv.email && <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{inv.email}</span>}
            </div>
          </div>
        </div>
      </GGCard>

      {inv.status === 'rejected' && (
        <GGCard padding="22px" style={{ border: `1px solid rgba(229,71,77,0.25)`, background: C.errorBg }}>
          <SectionLabel>Patient Rejection</SectionLabel>
          <div style={{ padding: '14px 16px', borderRadius: radius.sm, background: '#fff', border: `1px solid rgba(229,71,77,0.2)`, marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.7, fontFamily: font.family, whiteSpace: 'pre-wrap' }}>
              {inv.rejectionReason || 'The patient rejected this invoice. Edit the details and resubmit a corrected version.'}
            </div>
          </div>
          <GGButton variant="primary" size="md" fullWidth onClick={() => navigate('/sp/invoices/upload', { state: { editInvoice: inv } })}>
            Edit & Resubmit Invoice
          </GGButton>
        </GGCard>
      )}

      {/* Consultation notes */}
      <GGCard padding={isMobile ? '18px' : '22px'}>
        <SectionLabel>Consultation Notes</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {inv.diagnosis && <NoteBlock label="Diagnosis & Clinical Findings" text={inv.diagnosis} borderColor={C.navy800} bg={`rgba(13,30,66,0.04)`} textColor={C.navy800} />}
          {inv.treatment && <NoteBlock label="Medications / Treatment Plan" text={inv.treatment} borderColor={C.success} bg={C.successBg} textColor="#0D6B47" />}
          {inv.followUp  && <NoteBlock label="Follow-up Instructions" text={inv.followUp} borderColor={C.warning} bg={C.warningBg} textColor="#7C4A00" />}
          {!inv.diagnosis && !inv.treatment && !inv.followUp && (
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>No consultation notes on record.</div>
          )}
        </div>
      </GGCard>

      {/* Internal note */}
      {inv.internalNote && (
        <GGCard padding={isMobile ? '18px' : '22px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="5" width="11" height="7" rx="1.5" stroke={C.textSub} strokeWidth="1.2"/><path d="M4 5V3.5a2.5 2.5 0 015 0V5" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/><circle cx="6.5" cy="8.5" r="1" fill={C.textSub}/></svg>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: font.family }}>Internal Quality Note</div>
              <div style={{ fontSize: '11px', color: C.textLight, fontFamily: font.family }}>GG'APP admin review only — not visible to patient</div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.7, fontFamily: font.family, fontStyle: 'italic', paddingLeft: '36px' }}>{inv.internalNote}</div>
        </GGCard>
      )}

      {/* Services rendered */}
      <GGCard padding={isMobile ? '18px' : '22px'}>
        <SectionLabel>{inv.isPrescription ? 'Medications' : 'Services Rendered'}</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {(inv.services.length > 0 ? inv.services : [{ name: 'Service', amount: inv.amount }]).map((svc, i, list) => (
            <div
              key={`${svc.name}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '10px 0',
                borderBottom: i < list.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.successBg, border: `1px solid rgba(34,201,138,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={C.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ fontSize: '13px', color: C.text, fontFamily: font.family }}>{svc.name}</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(svc.amount)}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', marginTop: '4px', borderTop: `2px solid ${C.navy800}` }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Total</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.02em', fontFamily: font.family }}>{formatCurrency(inv.amount)}</span>
          </div>
        </div>
      </GGCard>

      {/* Cancelled invoice banner on mobile */}
      {isNarrow && inv.status === 'rejected' && (
        <GGCard padding="18px" style={{ background: s.bg }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: s.text, marginBottom: '8px', fontFamily: font.family }}>
            Invoice Rejected
          </div>
          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6, fontFamily: font.family, marginBottom: '14px' }}>
            The patient rejected this invoice. Review their feedback, make corrections, and resubmit.
          </div>
          <GGButton variant="primary" size="sm" onClick={() => navigate('/sp/invoices/upload', { state: { editInvoice: inv } })}>
            Edit & Resubmit
          </GGButton>
        </GGCard>
      )}
      {isNarrow && inv.status === 'pending' && (
        <GGCard padding="18px" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: s.text, marginBottom: '8px', fontFamily: font.family }}>
            Awaiting Patient Authorization
          </div>
          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6, fontFamily: font.family }}>
            This invoice has been submitted and is awaiting approval and authorization from the patient.
          </div>
        </GGCard>
      )}
      {isNarrow && inv.status === 'authorized' && (
        <GGCard padding="18px" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: s.text, marginBottom: '8px', fontFamily: font.family }}>
            Authorization Confirmed
          </div>
          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6, fontFamily: font.family }}>
            {(inv.offAppAmountDue ?? 0) > 0
              ? `Patient paid ${formatCurrency(inv.walletAmountPaid ?? 0)} via GG'APP. Collect the remaining ${formatCurrency(inv.offAppAmountDue ?? 0)} off-app.`
              : 'The patient has confirmed this invoice. Settlement will be completed later through the finance partner.'}
          </div>
        </GGCard>
      )}
    </div>
  )

  const sideBar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Invoice summary */}
      <GGCard padding="20px">
        <SectionLabel>Invoice Summary</SectionLabel>
        <InfoRow label="Invoice #"    val={inv.id} />
        <InfoRow label="Appointment"  val={inv.appointmentId ?? '—'} />
        <InfoRow label="Date Issued"  val={formatDate(inv.issueDate)} />
        <InfoRow label="Submitted"    val={formatDate(inv.submittedAt)} />
        <InfoRow label="Amount"       val={<span style={{ fontSize: '16px', fontWeight: 800, color: C.navy800, fontFamily: font.family }}>{formatCurrency(inv.amount)}</span>} />
        {(inv.walletAmountPaid != null || inv.offAppAmountDue != null) && (
          <>
            <InfoRow
              label="Paid via GG'APP"
              val={<span style={{ fontSize: '13px', fontWeight: 700, color: C.success, fontFamily: font.family }}>{formatCurrency(inv.walletAmountPaid ?? 0)}</span>}
            />
            {(inv.offAppAmountDue ?? 0) > 0 && (
              <InfoRow
                label="Off-app due"
                val={<span style={{ fontSize: '13px', fontWeight: 700, color: C.warning, fontFamily: font.family }}>{formatCurrency(inv.offAppAmountDue ?? 0)}</span>}
              />
            )}
          </>
        )}
        <InfoRow label="Status"       val={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: radius.full, background: s.bg, border: `1px solid ${s.border}`, fontSize: '11px', fontWeight: 700, color: s.text }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />{s.label}</span>} />
        {inv.adminApprovedAt && <InfoRow label="Admin Approved" val={formatDate(inv.adminApprovedAt)} />}
        {inv.paidAt         && <InfoRow label="Date Paid"      val={formatDate(inv.paidAt)} />}
        {inv.paymentRef
          ? <InfoRow label="Payment Ref" val={<span style={{ fontSize: '12px', fontWeight: 700, color: C.success }}>{inv.paymentRef}</span>} />
          : <InfoRow label="Payment Ref" val="—" />
        }
      </GGCard>

      {(inv.status === 'paid' || inv.status === 'authorized') && inv.patientReview && (
        <GGCard padding="20px">
          <SectionLabel>Patient Review</SectionLabel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GGAvatar name={inv.patientReview.patientName} size={36} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{inv.patientReview.patientName}</div>
                <div style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>{inv.patientReview.date}</div>
              </div>
            </div>
            <StarRating rating={inv.patientReview.rating} />
          </div>
          <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.7, fontFamily: font.family }}>{inv.patientReview.text}</div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: C.textLight, fontFamily: font.family }}>
            Review ref: {inv.patientReview.id}
          </div>
        </GGCard>
      )}

      {/* Invoice document */}
      <GGCard padding="20px">
        <SectionLabel>Invoice Document</SectionLabel>
        <div style={{ padding: '16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(229,71,77,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none"><rect x="1" y="1" width="16" height="20" rx="2.5" stroke={C.error} strokeWidth="1.2"/><path d="M4 8h10M4 11h10M4 14h6" stroke={C.error} strokeWidth="1.1" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.text, fontFamily: font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfName}</div>
              <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px', fontFamily: font.family }}>
                {attachmentUnavailable
                  ? 'PDF missing — edit and re-upload'
                  : attachmentLoading
                    ? 'Loading document…'
                    : 'Invoice PDF document'}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <GGButton variant="secondary" size="sm" fullWidth onClick={() => setShowAttachment(true)} style={{ whiteSpace: 'nowrap' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ marginRight: 5, flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 6.5c0-1.38 1.12-2.5 2.5-2.5S9 5.12 9 6.5 7.88 9 6.5 9 4 7.88 4 6.5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6.5" cy="6.5" r="1" fill="currentColor"/></svg>
            View Document
          </GGButton>
          {attachmentUnavailable ? (
            <GGButton variant="primary" size="sm" fullWidth onClick={handleReupload} style={{ whiteSpace: 'nowrap' }}>
              Re-upload PDF
            </GGButton>
          ) : (
            <GGButton
              variant="secondary"
              size="sm"
              fullWidth
              disabled={!attachmentUrl || attachmentLoading}
              onClick={() => void handleDownload()}
              style={{ whiteSpace: 'nowrap' }}
            >
              Download
            </GGButton>
          )}
          {attachmentUnavailable && inv.status === 'pending' && (
            <div style={{ fontSize: '11px', color: C.error, lineHeight: 1.5, fontFamily: font.family }}>
              This invoice was submitted before PDF storage was fixed. Re-upload the PDF so the patient can preview and authorize it.
            </div>
          )}
        </div>
      </GGCard>

      {/* Timeline */}
      <GGCard padding="20px">
        <SectionLabel>Invoice Timeline</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {timeline.map((step, i) => (
            <div key={step.label} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: step.done ? step.color : '#fff', border: `2px solid ${step.done ? step.color : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {step.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>}
                </div>
                {i < timeline.length - 1 && (
                  <div style={{ width: 2, height: 24, background: step.done && timeline[i+1].done ? step.color : C.border, flexShrink: 0, margin: '2px 0' }} />
                )}
              </div>
              <div style={{ paddingTop: '1px', flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: step.done ? C.text : C.textSub, fontFamily: font.family }}>{step.label}</div>
                {step.date && <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px', fontFamily: font.family }}>{formatDate(step.date)}</div>}
                {i < timeline.length - 1 && <div style={{ height: 8 }} />}
              </div>
            </div>
          ))}
        </div>
      </GGCard>

      {!isNarrow && inv.status === 'rejected' && (
        <GGCard padding="20px" style={{ background: s.bg }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: s.text, marginBottom: '8px', fontFamily: font.family }}>
            Invoice Rejected
          </div>
          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6, fontFamily: font.family, marginBottom: '14px' }}>
            The patient rejected this invoice. Review their feedback, make corrections, and resubmit.
          </div>
          <GGButton variant="primary" size="sm" fullWidth onClick={() => navigate('/sp/invoices/upload', { state: { editInvoice: inv } })}>
            Edit & Resubmit
          </GGButton>
        </GGCard>
      )}

      {/* Pending invoice banner on desktop */}
      {!isNarrow && inv.status === 'pending' && (
        <GGCard padding="20px" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: s.text, marginBottom: '8px', fontFamily: font.family }}>
            Awaiting Patient Authorization
          </div>
          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6, fontFamily: font.family }}>
            This invoice has been submitted and is awaiting approval and authorization from the patient.
          </div>
        </GGCard>
      )}
      {!isNarrow && inv.status === 'authorized' && (
        <GGCard padding="20px" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: s.text, marginBottom: '8px', fontFamily: font.family }}>
            Authorization Confirmed
          </div>
          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6, fontFamily: font.family }}>
            {(inv.offAppAmountDue ?? 0) > 0
              ? `Patient paid ${formatCurrency(inv.walletAmountPaid ?? 0)} via GG'APP. Collect the remaining ${formatCurrency(inv.offAppAmountDue ?? 0)} off-app.`
              : 'The patient has confirmed this invoice. Finance partner settlement is pending integration.'}
          </div>
        </GGCard>
      )}
      <GGButton variant="secondary" size="md" fullWidth onClick={() => navigate('/sp/invoices')}>← All Invoices</GGButton>
    </div>
  )

  return (
    <SPLayout title={inv.id}>
      {showAttachment && (
        <AttachmentModal
          pdfName={pdfName}
          attachmentUrl={attachmentUrl}
          isLoading={attachmentLoading}
          isUnavailable={attachmentUnavailable}
          onClose={() => setShowAttachment(false)}
          onDownload={handleDownload}
          onReupload={handleReupload}
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 320px', gap: '20px', alignItems: 'flex-start' }}>
        {mainCol}
        {!isNarrow && <div style={{ position: 'sticky', top: '20px' }}>{sideBar}</div>}
        {isNarrow && sideBar}
      </div>
    </SPLayout>
  )
}
