import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GGCard, GGButton, GGAvatar } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_SP_INVOICES } from '@/mock/sp.mock'
import type { SPInvoice } from '@/types/invoice.types'

type SPInvStatus = 'paid' | 'cancelled' | 'pending'

const STATUS: Record<SPInvStatus, { label: string; color: string; bg: string; border: string; text: string }> = {
  paid:      { label: 'Paid',      color: C.success, bg: C.successBg, border: 'rgba(34,201,138,0.2)',  text: '#0D6B47' },
  cancelled: { label: 'Cancelled', color: C.error,   bg: C.errorBg,   border: 'rgba(229,71,77,0.25)', text: C.error   },
  pending:   { label: 'Pending Auth', color: '#D97706', bg: '#FEF3C7', border: 'rgba(217,119,6,0.2)', text: '#B45309' },
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

const serviceRate = 75

function AttachmentModal({ pdfName, inv, onClose }: { pdfName: string; inv: SPInvoice; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,30,66,0.6)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: '16px', width: '100%', maxWidth: 560, maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 80px rgba(13,30,66,0.3)' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{pdfName}</div>
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>Invoice document · PDF</div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub, fontSize: '18px', fontWeight: 300 }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: '8px', border: `1px solid ${C.border}`, padding: '32px 28px', boxShadow: shadow.md }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.02em', fontFamily: font.family }}>TAX INVOICE</div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>{inv.id}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: C.navy800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="1" width="14" height="18" rx="2" stroke="white" strokeWidth="1.4"/><path d="M6 7h8M6 10h8M6 13h5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
            </div>
            <div style={{ height: 1, background: C.border, marginBottom: '18px' }} />
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '10px', color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontFamily: font.family }}>Billed To</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>{inv.patient}</div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 8, borderRadius: 4, background: C.border, marginBottom: 8, width: i === 4 ? '60%' : '100%', opacity: 0.6 }} />
            ))}
            <div style={{ height: 1, background: C.border, margin: '18px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Total</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, fontFamily: font.family }}>{formatCurrency(inv.amount)}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '10px' }}>
          <GGButton variant="success" size="md" style={{ flex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}><path d="M7 1v8M3 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 11h12v2H1z" fill="currentColor" opacity="0.3"/></svg>
            Download PDF
          </GGButton>
          <GGButton variant="secondary" size="md" onClick={onClose}>Close</GGButton>
        </div>
      </div>
    </div>
  )
}

export function SPInvoiceDetailScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const inv: SPInvoice = (location.state as { invoice: SPInvoice } | null)?.invoice ?? MOCK_SP_INVOICES[0]
  const [showAttachment, setShowAttachment] = useState(false)

  const s = STATUS[inv.status as SPInvStatus] ?? STATUS.cancelled
  const isPdfMismatch = false
  const pdfName = inv.attachment || `${inv.id}.pdf`

  let timeline: { label: string; date: string | null; done: boolean; color: string }[] = []
  if (inv.status === 'cancelled') {
    timeline = [
      { label: 'Submitted', date: inv.submittedAt, done: true, color: C.success },
      { label: 'Cancelled', date: inv.submittedAt, done: true, color: C.error },
    ]
  } else if (inv.status === 'paid') {
    timeline = [
      { label: 'Submitted', date: inv.submittedAt, done: true, color: C.success },
      { label: 'Paid',      date: inv.paidAt ?? null,      done: true, color: C.success },
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
            <div style={{ fontSize: '17px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>{inv.patient}</div>
            {inv.beneficiary && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '4px', padding: '3px 10px', borderRadius: radius.full, background: C.blue100, border: '1px solid rgba(74,173,223,0.25)', fontSize: '11px', color: '#1A5D8A', fontFamily: font.family, fontWeight: 600 }}>
                For {inv.beneficiary.name} · {inv.beneficiary.relation}
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
              {inv.phone && <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{inv.phone}</span>}
              {inv.email && <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{inv.email}</span>}
            </div>
          </div>
        </div>
      </GGCard>

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
        <SectionLabel>Services Rendered</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {inv.services.map((svc, i) => (
            <div key={svc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < inv.services.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.successBg, border: `1px solid rgba(34,201,138,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={C.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ fontSize: '13px', color: C.text, fontFamily: font.family }}>{svc}</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>{formatCurrency(serviceRate)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', marginTop: '4px', borderTop: `2px solid ${C.navy800}` }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Total</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.02em', fontFamily: font.family }}>{formatCurrency(inv.amount)}</span>
          </div>
        </div>
      </GGCard>

      {/* Cancelled invoice banner on mobile */}
      {isNarrow && inv.status === 'cancelled' && (
        <GGCard padding="18px" style={{ background: s.bg }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: s.text, marginBottom: '8px', fontFamily: font.family }}>
            ✕ Invoice Cancelled
          </div>
          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6, fontFamily: font.family, marginBottom: '14px' }}>
            This invoice has been cancelled. You can choose to leave it cancelled or edit its details and resubmit it to the patient.
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GGButton variant="primary" size="sm" onClick={() => navigate('/sp/invoices/upload', { state: { editInvoice: inv } })}>
              Edit & Resubmit
            </GGButton>
            <GGButton variant="secondary" size="sm" onClick={() => navigate('/sp/invoices')}>
              Keep Cancelled
            </GGButton>
          </div>
        </GGCard>
      )}

      {/* Pending invoice banner on mobile */}
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
    </div>
  )

  const sideBar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Invoice summary */}
      <GGCard padding="20px">
        <SectionLabel>Invoice Summary</SectionLabel>
        <InfoRow label="Invoice #"    val={inv.id} />
        <InfoRow label="Date Issued"  val={formatDate(inv.issueDate)} />
        <InfoRow label="Submitted"    val={formatDate(inv.submittedAt)} />
        <InfoRow label="Amount"       val={<span style={{ fontSize: '16px', fontWeight: 800, color: C.navy800, fontFamily: font.family }}>{formatCurrency(inv.amount)}</span>} />
        <InfoRow label="Status"       val={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: radius.full, background: s.bg, border: `1px solid ${s.border}`, fontSize: '11px', fontWeight: 700, color: s.text }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />{s.label}</span>} />
        {inv.adminApprovedAt && <InfoRow label="Admin Approved" val={formatDate(inv.adminApprovedAt)} />}
        {inv.paidAt         && <InfoRow label="Date Paid"      val={formatDate(inv.paidAt)} />}
        {inv.paymentRef
          ? <InfoRow label="Payment Ref" val={<span style={{ fontSize: '12px', fontWeight: 700, color: C.success }}>{inv.paymentRef}</span>} last />
          : <InfoRow label="Payment Ref" val="—" last />
        }
      </GGCard>

      {/* Invoice document */}
      <GGCard padding="20px">
        <SectionLabel>Invoice Document</SectionLabel>
        <div style={{ padding: '16px', background: isPdfMismatch ? C.errorBg : C.bg, borderRadius: radius.sm, border: `1px solid ${isPdfMismatch ? 'rgba(229,71,77,0.25)' : C.border}`, marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(229,71,77,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none"><rect x="1" y="1" width="16" height="20" rx="2.5" stroke={C.error} strokeWidth="1.2"/><path d="M4 8h10M4 11h10M4 14h6" stroke={C.error} strokeWidth="1.1" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: isPdfMismatch ? C.error : C.text, fontFamily: font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfName}</div>
              <div style={{ fontSize: '11px', color: isPdfMismatch ? C.error : C.textSub, marginTop: '1px', fontFamily: font.family }}>
                {isPdfMismatch ? 'Filename mismatch — see rejection reason' : 'Invoice PDF document'}
              </div>
            </div>
          </div>
        </div>
        <GGButton variant="secondary" size="sm" fullWidth onClick={() => setShowAttachment(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ marginRight: 5 }}><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 6.5c0-1.38 1.12-2.5 2.5-2.5S9 5.12 9 6.5 7.88 9 6.5 9 4 7.88 4 6.5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6.5" cy="6.5" r="1" fill="currentColor"/></svg>
          View Document
        </GGButton>
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

      {/* Cancelled invoice banner on desktop */}
      {!isNarrow && inv.status === 'cancelled' && (
        <GGCard padding="20px" style={{ background: s.bg }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: s.text, marginBottom: '8px', fontFamily: font.family }}>
            ✕ Invoice Cancelled
          </div>
          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6, fontFamily: font.family, marginBottom: '14px' }}>
            This invoice has been cancelled. You can choose to leave it cancelled or edit its details and resubmit it to the patient.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <GGButton variant="primary" size="sm" fullWidth onClick={() => navigate('/sp/invoices/upload', { state: { editInvoice: inv } })}>
              Edit & Resubmit
            </GGButton>
            <GGButton variant="secondary" size="sm" fullWidth onClick={() => navigate('/sp/invoices')}>
              Keep Cancelled
            </GGButton>
          </div>
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

      <GGButton variant="secondary" size="md" fullWidth onClick={() => navigate('/sp/invoices')}>← All Invoices</GGButton>
    </div>
  )

  return (
    <SPLayout title={inv.id} subtitle={`${inv.patient} · ${formatDate(inv.issueDate)}`}>
      {showAttachment && <AttachmentModal pdfName={pdfName} inv={inv} onClose={() => setShowAttachment(false)} />}
      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 320px', gap: '20px', alignItems: 'flex-start' }}>
        {mainCol}
        {!isNarrow && <div style={{ position: 'sticky', top: '20px' }}>{sideBar}</div>}
        {isNarrow && sideBar}
      </div>
    </SPLayout>
  )
}
