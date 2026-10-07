import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGAvatar, GGDatePicker } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { getCountryByCode } from '@/config/countries'
import { useRescheduleSPAppointmentMutation, useSPAppointment, useSPInvoices, useUpdateSPAppointmentStatusMutation } from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAttachmentPreviewUrl } from '@/hooks/useAttachmentPreviewUrl'
import { route, ROUTES } from '@/router/routes'
import { formatDate, formatPhone, formatTime12h } from '@/utils/format'
import { appointmentHasRecordedVisit, getAppointmentDisplayStatus, getDaysUntilAppointment } from '@/utils/appointments'
import { downloadInvoiceAttachment, isImageAttachmentUrl } from '@/utils/invoice-attachment'
import { ProgressSteps, type ProgressStep } from '@/components/ProgressSteps'
import type { Appointment, Attachment } from '@/types/appointment.types'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: radius.sm,
  border: 'none',
  background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
  boxShadow: '0 6px 16px rgba(11,123,192,0.25)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  textDecoration: 'none',
  boxSizing: 'border-box',
}

const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#fff',
  boxShadow: 'none',
  border: '1px solid rgba(11,123,192,0.35)',
  color: CYAN_DEEP,
}

const quietLink: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '4px 0',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: font.family,
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
}

function AttachIcon({ type }: { type: string }) {
  if (type === 'pdf') return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none"><rect x="1" y="1" width="18" height="22" rx="3" fill={C.errorBg} stroke={C.error} strokeWidth="1.3"/><path d="M5 9h10M5 13h10M5 17h6" stroke={C.error} strokeWidth="1.2" strokeLinecap="round"/><text x="4.5" y="7" fontSize="4.5" fill={C.error} fontWeight="800" fontFamily="monospace">PDF</text></svg>
  )
  if (type === 'image') return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="1" y="1" width="18" height="18" rx="3" fill={C.blue100} stroke={C.blue500} strokeWidth="1.3"/><circle cx="6.5" cy="7" r="2" fill={C.blue400}/><path d="M1 15l5-5 4 4 4-5 5 6" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none"><rect x="1" y="1" width="18" height="22" rx="3" fill={C.bg} stroke={C.border} strokeWidth="1.3"/><path d="M5 9h10M5 13h10M5 17h6" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/></svg>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, fontFamily: font.family }}>{children}</div>
}

function Pill({ fg, bg, children }: { fg: string; bg: string; children: ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: radius.full, color: fg, background: bg, whiteSpace: 'nowrap' }}>{children}</span>
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, color: C.textSub }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function AppointmentAttachmentModal({
  attachment,
  onClose,
}: {
  attachment: { name: string; type: string; size: string | null; url: string | null }
  onClose: () => void
}) {
  const sourceUrl = attachment.url ?? ''
  const previewUrl = useAttachmentPreviewUrl(sourceUrl)
  const canPreview = !!sourceUrl && !!previewUrl
  const isImage = attachment.type === 'image' || isImageAttachmentUrl(sourceUrl)

  const handleDownload = async () => {
    if (!sourceUrl) return
    await downloadInvoiceAttachment(sourceUrl, attachment.name)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,30,66,0.6)', backdropFilter: 'blur(4px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: 820,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(13,30,66,0.3)',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachment.name}
            </div>
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>
              {attachment.size ?? 'File attached to this appointment'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: C.bg, border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub, fontSize: '18px', fontWeight: 300, flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', background: C.bg, minHeight: 420 }}>
          {canPreview ? (
            isImage ? (
              <img
                src={previewUrl}
                alt={`${attachment.name} preview`}
                style={{ display: 'block', width: '100%', height: '100%', minHeight: 420, objectFit: 'contain', background: '#fff' }}
              />
            ) : (
              <iframe
                title={attachment.name}
                src={previewUrl}
                style={{ width: '100%', height: '100%', minHeight: 500, border: 'none', display: 'block', background: '#fff' }}
              />
            )
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: C.textSub, fontSize: '13px', lineHeight: 1.6, fontFamily: font.family }}>
              {sourceUrl
                ? 'Preparing document preview…'
                : 'File preview is not available for this attachment. Ask the patient to re-send the file if needed.'}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '10px' }}>
          <GGButton
            variant="success"
            size="md"
            style={{ flex: 1 }}
            disabled={!sourceUrl}
            onClick={() => void handleDownload()}
          >
            Download
          </GGButton>
          <GGButton variant="secondary" size="md" onClick={onClose}>Close</GGButton>
        </div>
      </div>
    </div>
  )
}

const STATUS: Record<string, { fg: string; bg: string; label: string }> = {
  new: { fg: '#B45309', bg: 'rgba(245,166,35,0.14)', label: 'New request' },
  confirmed: { fg: '#15803D', bg: 'rgba(34,197,94,0.12)', label: 'Confirmed' },
  completed: { fg: C.textSub, bg: C.bg, label: 'Completed' },
  cancelled: { fg: '#B91C1C', bg: 'rgba(239,68,68,0.10)', label: 'Cancelled' },
}

const ACTION_DONE: Record<string, { fg: string; bg: string; msg: string }> = {
  accepted: { fg: '#15803D', bg: 'rgba(34,197,94,0.12)', msg: 'Appointment accepted. The patient has been notified.' },
  declined: { fg: '#B91C1C', bg: 'rgba(239,68,68,0.10)', msg: 'Request declined. The patient has been notified.' },
  rescheduled: { fg: '#8A4D00', bg: 'rgba(245,166,35,0.14)', msg: 'New time sent to the patient for their approval.' },
}

function countdown(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 1) return `In ${days} days`
  return null
}

export function SPAppointmentDetailScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const locationAppointment = (location.state as { apt?: Appointment } | null)?.apt
  const { data: appointment, isLoading } = useSPAppointment(id)
  const { data: invoices = [] } = useSPInvoices()
  const updateAppointmentStatusMutation = useUpdateSPAppointmentStatusMutation()
  const rescheduleAppointmentMutation = useRescheduleSPAppointmentMutation()
  const apt = appointment ?? locationAppointment
  const [viewingAtt, setViewingAtt] = useState<{ name: string; type: string; size: string | null; url: string | null } | null>(null)
  const [actionDone, setActionDone] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleNote, setRescheduleNote] = useState('')

  if (isLoading && !apt) {
    return (
      <SPLayout title="Appointment">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading appointment details...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  if (!apt) {
    return (
      <SPLayout title="Appointment">
        <GGCard padding="24px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
              We could not load this appointment.
            </div>
            <GGButton variant="secondary" size="sm" onClick={() => navigate(ROUTES.SP_APPOINTMENTS)}>
              Back to appointments
            </GGButton>
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const displayStatus = getAppointmentDisplayStatus(apt)
  const status = STATUS[displayStatus] ?? STATUS.new
  const invoice = invoices
    .filter(inv => inv.appointmentId === apt.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
  const isInvoiceUploaded = !!apt.hasInvoice || !!invoice
  const isPaid = invoice?.status === 'paid' || invoice?.status === 'authorized'
  const isInvoiceRejected = invoice?.status === 'rejected'
  const hasRecordedVisit = appointmentHasRecordedVisit(apt)
  const isUpdatingStatus = updateAppointmentStatusMutation.isPending
  const isRescheduling = rescheduleAppointmentMutation.isPending
  const isActionBusy = isUpdatingStatus || isRescheduling
  const patientCountry = getCountryByCode(apt.countryCode ?? '')
  const phone = formatPhone(apt.phone, patientCountry?.name, apt.address)
  const days = getDaysUntilAppointment(apt.date)
  const isCancelled = displayStatus === 'cancelled'
  const when = !isCancelled && displayStatus !== 'completed' && !hasRecordedVisit ? countdown(days) : null
  const dateLong = new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const timeLabel = formatTime12h(apt.time)

  const isConfirmedish = displayStatus === 'confirmed' || displayStatus === 'completed'
  const steps: ProgressStep[] = [
    { label: 'Requested', detail: apt.requestedAt ? formatDate(apt.requestedAt, { month: 'short', day: 'numeric' }) : undefined, state: 'done' },
    isCancelled
      ? { label: 'Cancelled', state: 'stopped' }
      : { label: 'Confirmed', state: isConfirmedish ? 'done' : 'current' },
    {
      label: 'Visit recorded',
      detail: hasRecordedVisit || isCancelled ? undefined : `Visit ${formatDate(apt.date, { month: 'short', day: 'numeric' })}`,
      state: hasRecordedVisit ? 'done' : isConfirmedish ? 'current' : 'todo',
    },
    {
      label: isPaid ? 'Paid' : 'Invoice sent',
      detail: isPaid
        ? (invoice?.paidAt ? formatDate(invoice.paidAt, { month: 'short', day: 'numeric' }) : undefined)
        : isInvoiceRejected ? 'Sent back' : invoice?.status === 'pending' ? 'Waiting for patient' : undefined,
      state: isInvoiceRejected ? 'stopped' : isInvoiceUploaded ? 'done' : hasRecordedVisit ? 'current' : 'todo',
    },
  ]

  const recordVisit = () => navigate('/sp/visits/record', { state: { ctx: { patientId: apt.patientId, patientName: apt.patient, appointmentId: apt.id, conditions: apt.medicalHistory, allergies: apt.allergies } } })
  const uploadInvoice = () => navigate(ROUTES.SP_INVOICE_UPLOAD, { state: { prefill: { appointmentId: apt.id, patientId: apt.patientId, patientName: apt.patient, visitId: apt.visitId } } })
  const openReschedule = () => {
    setActionError(null)
    setRescheduleDate(apt.date.slice(0, 10))
    setRescheduleTime(apt.time)
    setRescheduleOpen(true)
  }
  const setStatus = (next: 'confirmed' | 'cancelled', done: string, failMsg: string) => {
    setActionError(null)
    updateAppointmentStatusMutation.mutate(
      { id: apt.id, payload: { status: next } },
      {
        onSuccess: () => setActionDone(done),
        onError: error => setActionError(error instanceof Error ? error.message : failMsg),
      },
    )
  }

  const normalizeAtt = (a: Attachment) => ({
    name: a.name,
    type: a.type === 'document' ? 'doc' : a.type,
    size: a.size ?? null,
    url: a.dataUrl?.trim() ? a.dataUrl : null,
  })

  const handleDownloadAttachment = async (a: Attachment, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!a.dataUrl) return
    await downloadInvoiceAttachment(a.dataUrl, a.name)
  }

  const callButton = apt.phone ? (
    <a href={`tel:${phone.tel}`} style={outlineBtn}>
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden><path d="M2 2.5a1 1 0 011-1h1.5a.5.5 0 01.5.5l1 3a.5.5 0 01-.15.45L4.6 6.6a8 8 0 005.8 5.8l1.15-1.25a.5.5 0 01.45-.15l3 1a.5.5 0 01.5.5V14a1 1 0 01-1 1H13C7.2 15 2 9.8 2 4v-1.5z" stroke="currentColor" strokeWidth="1.3" /></svg>
      Call patient
    </a>
  ) : null

  let nextStep: ReactNode
  if (actionDone) {
    nextStep = <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>Nothing else to do for now.</div>
  } else if (isCancelled) {
    nextStep = (
      <>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#B91C1C' }}>This appointment was cancelled</div>
        {apt.cancellationReason ? (
          <div style={{ marginTop: 10, padding: '10px 12px', background: C.bg, borderRadius: radius.sm, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 2 }}>Reason given by the patient</div>
            <strong>{apt.cancellationReason}</strong>
            {apt.cancellationNote && <div style={{ color: C.textSub, marginTop: 2 }}>{apt.cancellationNote}</div>}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>No further action is needed.</div>
        )}
      </>
    )
  } else if (isInvoiceRejected && invoice) {
    nextStep = (
      <>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#B91C1C' }}>Invoice sent back</div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, marginBottom: 14, lineHeight: 1.5 }}>
          {invoice.rejectionReason ? `Patient's reason: ${invoice.rejectionReason}` : 'The patient asked you to correct this invoice.'}
        </div>
        <button type="button" style={primaryBtn} onClick={() => navigate(route.spInvoice(invoice.id))}>Fix &amp; resubmit</button>
      </>
    )
  } else if (isInvoiceUploaded) {
    nextStep = (
      <>
        <div style={{ fontSize: 15, fontWeight: 800, color: isPaid ? '#15803D' : C.text }}>
          {isPaid ? '✓ Paid' : 'Invoice sent · waiting for patient'}
        </div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, marginBottom: 14, lineHeight: 1.5 }}>
          {isPaid
            ? `The payment went to your registered account${invoice?.paymentRef ? ` (ref ${invoice.paymentRef})` : ''}.`
            : 'The patient approves it with their PIN, then the payment goes to your registered account.'}
        </div>
        <button type="button" style={outlineBtn} onClick={() => navigate(invoice ? route.spInvoice(invoice.id) : ROUTES.SP_INVOICES)}>
          {invoice ? 'View invoice' : 'View invoices'}
        </button>
      </>
    )
  } else if (hasRecordedVisit) {
    nextStep = (
      <>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Visit recorded</div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, marginBottom: 14, lineHeight: 1.5 }}>
          Upload the invoice so the patient can approve payment.
        </div>
        <button type="button" style={primaryBtn} onClick={uploadInvoice}>Upload invoice</button>
      </>
    )
  } else if (displayStatus === 'new') {
    nextStep = (
      <>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Respond to this request</div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, marginBottom: 14 }}>{dateLong} · {timeLabel}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" disabled={isActionBusy} style={{ ...primaryBtn, opacity: isActionBusy ? 0.6 : 1 }} onClick={() => setStatus('confirmed', 'accepted', 'Unable to accept this appointment right now.')}>
            {isUpdatingStatus ? 'Saving…' : 'Accept request'}
          </button>
          <button type="button" disabled={isActionBusy} style={outlineBtn} onClick={openReschedule}>
            {isRescheduling ? 'Saving…' : 'Propose a new time'}
          </button>
          {callButton}
        </div>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button type="button" disabled={isActionBusy} style={{ ...quietLink, color: '#B91C1C' }} onClick={() => setStatus('cancelled', 'declined', 'Unable to decline this appointment right now.')}>
            Decline request
          </button>
        </div>
      </>
    )
  } else if (displayStatus === 'confirmed') {
    nextStep = (
      <>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
          {days > 0 ? `Visit on ${dateLong}` : days === 0 ? 'Visit today' : `Visit was ${dateLong}`}
        </div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, marginBottom: 14 }}>
          {timeLabel}{when ? ` · ${when}` : ''}
        </div>
        <button type="button" style={primaryBtn} onClick={recordVisit}>
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M4.5 7h5M7 4.5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          Record visit
        </button>
        <div style={{ fontSize: 12, color: C.textSub, marginTop: 8, lineHeight: 1.5, textAlign: 'center' }}>
          Once you've seen the patient, write the treatment summary. Works before the booked date too.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          {callButton}
          <button type="button" disabled={isActionBusy} style={outlineBtn} onClick={openReschedule}>
            {isRescheduling ? 'Saving…' : 'Propose a new time'}
          </button>
        </div>
      </>
    )
  } else {
    nextStep = (
      <>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Record the visit</div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, marginBottom: 14, lineHeight: 1.5 }}>
          Write the treatment summary. The patient sees it in their visit history.
        </div>
        <button type="button" style={primaryBtn} onClick={recordVisit}>Record visit</button>
      </>
    )
  }

  const nextStepCard = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {actionDone && ACTION_DONE[actionDone] && (
        <div role="status" style={{ padding: '12px 14px', borderRadius: radius.md, background: ACTION_DONE[actionDone].bg, color: ACTION_DONE[actionDone].fg, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
          {ACTION_DONE[actionDone].msg}
        </div>
      )}
      {actionError && (
        <div role="alert" style={{ padding: '12px 14px', borderRadius: radius.md, background: 'rgba(239,68,68,0.10)', color: '#B91C1C', fontSize: 13, lineHeight: 1.5 }}>
          {actionError}
        </div>
      )}
      <GGCard padding="20px">
        <SectionLabel>Next step</SectionLabel>
        {nextStep}
      </GGCard>
    </div>
  )

  const hasAttachments = !!apt.attachments && apt.attachments.length > 0
  const hasHealthNotes = (apt.medicalHistory?.length ?? 0) > 0 || (apt.allergies?.length ?? 0) > 0

  const detailArea = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <GGCard padding={isMobile ? '18px' : '22px 24px'}>
        <SectionLabel>Request</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: 14, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
          <Fact label="Service" value={apt.service} />
          <Fact label="Date" value={new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} />
          <Fact label="Time" value={timeLabel} />
          <Fact label="Requested" value={formatDate(apt.requestedAt || apt.date, { month: 'short', day: 'numeric' })} />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>Patient's note</div>
          {apt.description?.trim() ? (
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.65, paddingLeft: 12, borderLeft: `3px solid ${C.blue100}` }}>
              {apt.description}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.textLight }}>No note added.</div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>
            Attachments{hasAttachments ? ` (${apt.attachments!.length})` : ''}
          </div>
          {!hasAttachments ? (
            <div style={{ fontSize: 13, color: C.textLight }}>None</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apt.attachments!.map((a, i) => {
                const att = normalizeAtt(a)
                return (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: radius.sm }}
                  >
                    <AttachIcon type={att.type} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                      {att.size && <div style={{ fontSize: 11, color: C.textSub, marginTop: 1 }}>{att.size}</div>}
                    </div>
                    {att.url && (
                      <button type="button" onClick={e => void handleDownloadAttachment(a, e)} style={{ ...quietLink, textDecoration: 'none', color: CYAN_DEEP, fontWeight: 700 }}>
                        Download
                      </button>
                    )}
                    <button type="button" onClick={() => setViewingAtt(att)} style={{ ...quietLink, textDecoration: 'none', color: CYAN_DEEP, fontWeight: 700 }}>
                      View
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </GGCard>

      {hasHealthNotes && (
        <GGCard padding={isMobile ? '18px' : '22px 24px'}>
          <SectionLabel>Health notes</SectionLabel>
          {apt.medicalHistory && apt.medicalHistory.length > 0 && (
            <div style={{ marginBottom: apt.allergies?.length ? 14 : 0 }}>
              <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>Known conditions</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {apt.medicalHistory.map(c => <Pill key={c} fg="#8A4D00" bg="rgba(245,166,35,0.14)">{c}</Pill>)}
              </div>
            </div>
          )}
          {apt.allergies && apt.allergies.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>Allergies</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {apt.allergies.map(a => <Pill key={a} fg="#B91C1C" bg="rgba(239,68,68,0.10)">{a}</Pill>)}
              </div>
            </div>
          )}
        </GGCard>
      )}
    </div>
  )

  return (
    <SPLayout title="Appointment" notifCount={2}>
      {viewingAtt && (
        <AppointmentAttachmentModal
          attachment={viewingAtt}
          onClose={() => setViewingAtt(null)}
        />
      )}

      {rescheduleOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => !isRescheduling && setRescheduleOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,30,66,0.6)', backdropFilter: 'blur(4px)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: 460, width: '100%', boxShadow: '0 32px 80px rgba(13,30,66,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, fontFamily: font.family, letterSpacing: '-0.01em' }}>Propose Reschedule</div>
              <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>Choose a new date and time to notify the patient.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <GGDatePicker
                label="New Date"
                value={rescheduleDate}
                onChange={setRescheduleDate}
                min={new Date().toISOString().slice(0, 10)}
              />
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: font.family }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSub }}>New Time</span>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  style={{ padding: '11px 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '14px', fontFamily: font.family }}
                />
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: font.family }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSub }}>Note for Patient</span>
              <textarea
                value={rescheduleNote}
                onChange={e => setRescheduleNote(e.target.value)}
                rows={4}
                placeholder="Optional note explaining the new proposed time."
                style={{ padding: '11px 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '14px', fontFamily: font.family, resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <GGButton variant="secondary" size="sm" disabled={isRescheduling} onClick={() => setRescheduleOpen(false)}>
                Cancel
              </GGButton>
              <GGButton
                variant="primary"
                size="sm"
                disabled={isRescheduling || !rescheduleDate || !rescheduleTime}
                onClick={() => {
                  setActionError(null)
                  rescheduleAppointmentMutation.mutate(
                    {
                      id: apt.id,
                      payload: {
                        date: rescheduleDate,
                        time: rescheduleTime,
                        note: rescheduleNote.trim() || undefined,
                      },
                    },
                    {
                      onSuccess: () => {
                        setActionDone('rescheduled')
                        setRescheduleOpen(false)
                      },
                      onError: error => setActionError(error instanceof Error ? error.message : 'Unable to propose a new time right now.'),
                    },
                  )
                }}
              >
                {isRescheduling ? 'Saving...' : 'Send Proposal'}
              </GGButton>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18, fontFamily: font.family }}>
        <button
          type="button"
          onClick={() => navigate(ROUTES.SP_APPOINTMENTS)}
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, color: CYAN_DEEP, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Appointments
        </button>

        <GGCard padding={isMobile ? '18px' : '20px 24px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <GGAvatar name={!apt.forSelf && apt.beneficiary ? apt.beneficiary.name : apt.patient} size={48} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.text, letterSpacing: '-0.015em' }}>
                {!apt.forSelf && apt.beneficiary ? apt.beneficiary.name : apt.patient}
              </div>
              <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>
                {!apt.forSelf && apt.beneficiary
                  ? <>{apt.beneficiary.relation}{apt.beneficiary.age ? `, ${apt.beneficiary.age}` : ''} · booked by <span style={{ color: CYAN_DEEP, fontWeight: 600 }}>{apt.patient}</span></>
                  : 'Booked for themselves'}
                {apt.phone && <> · <a href={`tel:${phone.tel}`} style={{ color: C.textSub }}>{phone.display}</a></>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Pill fg={status.fg} bg={status.bg}>{status.label}</Pill>
                {when && <Pill fg={CYAN_DEEP} bg={C.blue100}>{when}</Pill>}
              </div>
              <span style={{ fontSize: 12, color: C.textLight }}>{apt.id}</span>
            </div>
          </div>
        </GGCard>

        <ProgressSteps steps={steps} label="Appointment progress" />

        {isNarrow ? (
          <>
            {nextStepCard}
            {detailArea}
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
            {detailArea}
            <div style={{ position: 'sticky', top: 20 }}>{nextStepCard}</div>
          </div>
        )}
      </div>
    </SPLayout>
  )
}
