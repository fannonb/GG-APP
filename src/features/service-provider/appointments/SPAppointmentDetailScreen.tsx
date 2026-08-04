import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGBadge, GGAvatar, GGDatePicker } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { getCountryByCode } from '@/config/countries'
import { useRescheduleSPAppointmentMutation, useSPAppointment, useUpdateSPAppointmentStatusMutation } from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAttachmentPreviewUrl } from '@/hooks/useAttachmentPreviewUrl'
import { ROUTES } from '@/router/routes'
import { formatDate, formatPhone } from '@/utils/format'
import { getAppointmentDisplayStatus } from '@/utils/appointments'
import { downloadInvoiceAttachment, isImageAttachmentUrl } from '@/utils/invoice-attachment'
import type { Appointment, Attachment } from '@/types/appointment.types'

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px', fontFamily: font.family }}>{children}</div>
}

function InfoRow({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family, textAlign: 'right', maxWidth: '60%' }}>{val}</span>
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

const statusMap: Record<string, { bg: string; color: string; label: string }> = {
  new:       { bg: C.warningBg, color: '#8A4D00', label: 'New Request' },
  confirmed: { bg: C.blue100,   color: '#1A5D8A', label: 'Confirmed' },
  completed: { bg: C.successBg, color: '#0D6B47', label: 'Completed' },
  cancelled: { bg: C.errorBg,   color: '#A83236', label: 'Cancelled' },
}

const actionBanners: Record<string, { bg: string; color: string; msg: string }> = {
  accepted:    { bg: C.successBg, color: '#0D6B47', msg: 'Appointment accepted. The patient will be notified shortly.' },
  declined:    { bg: C.errorBg,   color: '#A83236', msg: 'Appointment declined. The patient has been notified.' },
  rescheduled: { bg: C.warningBg, color: '#8A4D00', msg: 'Reschedule proposal sent to the patient for their approval.' },
}

export function SPAppointmentDetailScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const locationAppointment = (location.state as { apt?: Appointment } | null)?.apt
  const { data: appointment, isLoading } = useSPAppointment(id)
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

  useEffect(() => {
    if (!apt) return
    setRescheduleDate(apt.date.slice(0, 10))
    setRescheduleTime(apt.time)
  }, [apt])

  if (isLoading && !apt) {
    return (
      <SPLayout title="Appointment Detail" subtitle="Loading appointment...">
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
      <SPLayout title="Appointment Detail" subtitle="Appointment not found">
        <GGCard padding="24px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
              We could not load this appointment.
            </div>
            <GGButton variant="secondary" size="sm" onClick={() => navigate(ROUTES.SP_APPOINTMENTS)}>
              Back to Appointments
            </GGButton>
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const displayStatus = getAppointmentDisplayStatus(apt)
  const s = statusMap[displayStatus] ?? statusMap.new
  const isInvoiceUploaded = !!apt.hasInvoice
  const isUpdatingStatus = updateAppointmentStatusMutation.isPending
  const isRescheduling = rescheduleAppointmentMutation.isPending
  const isActionBusy = isUpdatingStatus || isRescheduling
  const patientCountry = getCountryByCode(apt.countryCode ?? '')

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

  const detailArea = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Patient banner */}
      <GGCard padding="22px">
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <GGAvatar name={apt.patient} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{apt.patient}</div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{formatPhone(apt.phone, patientCountry?.name, apt.address).display}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 12px', borderRadius: radius.full, fontSize: '11px', fontWeight: 700, background: s.bg, color: s.color, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: font.family }}>{s.label}</span>
                <span style={{ fontSize: '12px', color: C.textSub }}>{apt.id}</span>
              </div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: radius.full, background: apt.forSelf ? C.bg : C.blue100, border: `1px solid ${apt.forSelf ? C.border : 'rgba(74,173,223,0.3)'}` }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                {apt.forSelf
                  ? <><circle cx="6.5" cy="4.5" r="2.5" stroke={C.textSub} strokeWidth="1.2"/><path d="M1.5 12c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/></>
                  : <><circle cx="4.5" cy="4" r="2" stroke={C.blue500} strokeWidth="1.2"/><path d="M1 11c0-2 1.6-3.5 3.5-3.5" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/><circle cx="9.5" cy="5" r="2" stroke={C.blue500} strokeWidth="1.2"/><path d="M6 12c0-2 1.6-3.5 3.5-3.5S13 10 13 12" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/></>
                }
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 600, color: apt.forSelf ? C.textSub : C.blue500, fontFamily: font.family }}>
                {apt.forSelf
                  ? `Appointment for ${apt.patient} (Self)`
                  : `Beneficiary: ${apt.beneficiary?.name} (${apt.beneficiary?.relation}, Age ${apt.beneficiary?.age})`
                }
              </span>
              {!apt.forSelf && <GGBadge type="info">Beneficiary</GGBadge>}
            </div>
          </div>
        </div>
      </GGCard>

      {/* Appointment Details */}
      <GGCard padding="22px">
        <SectionLabel>Appointment Details</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Service Type', val: apt.service },
            { label: 'Date',         val: formatDate(apt.date) },
            { label: 'Time',         val: apt.time },
            { label: 'Requested On', val: formatDate(apt.requestedAt || apt.date) },
          ].map(({ label, val }) => (
            <div key={label} style={{ padding: '11px 13px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px', fontFamily: font.family }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{val}</div>
            </div>
          ))}
        </div>
      </GGCard>

      {/* Patient's Description */}
      <GGCard padding="22px">
        <SectionLabel>Patient's Description</SectionLabel>
        <div style={{ fontSize: '14px', color: C.text, lineHeight: 1.75, background: C.bg, padding: '16px 18px 16px 28px', borderRadius: radius.sm, border: `1px solid ${C.border}`, fontFamily: font.family, fontStyle: 'italic', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '6px', left: '10px', fontSize: '36px', color: C.borderDark, lineHeight: 1, fontFamily: 'Georgia, serif', pointerEvents: 'none' }}>"</span>
          {apt.description}
        </div>
      </GGCard>

      {/* Attachments */}
      {apt.attachments && apt.attachments.length > 0 && (
        <GGCard padding="22px">
          <SectionLabel>Attachments ({apt.attachments.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {apt.attachments.map((a, i) => {
              const att = normalizeAtt(a)
              return (
                <div key={i} onClick={() => setViewingAtt(att)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, cursor: 'pointer', transition: 'all 0.13s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.blue500; (e.currentTarget as HTMLDivElement).style.background = C.blue100 }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.background = C.bg }}>
                  <AttachIcon type={att.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                    {att.size && <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px' }}>{att.size}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {att.url && (
                      <button
                        type="button"
                        onClick={e => void handleDownloadAttachment(a, e)}
                        style={{
                          border: `1px solid ${C.border}`,
                          background: '#fff',
                          borderRadius: radius.sm,
                          padding: '6px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: C.text,
                          cursor: 'pointer',
                          fontFamily: font.family,
                        }}
                      >
                        Download
                      </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: C.blue500 }}>View</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7s2.3-4.5 6-4.5S13 7 13 7s-2.3 4.5-6 4.5S1 7 1 7z" stroke={C.blue500} strokeWidth="1.3"/><circle cx="7" cy="7" r="2" stroke={C.blue500} strokeWidth="1.3"/></svg>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GGCard>
      )}

      {/* Medical History */}
      {((apt.medicalHistory && apt.medicalHistory.length > 0) || (apt.allergies && apt.allergies.length > 0)) && (
        <GGCard padding="22px">
          <SectionLabel>Medical History</SectionLabel>
          {apt.medicalHistory && apt.medicalHistory.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '8px', fontWeight: 500 }}>Known Conditions</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {apt.medicalHistory.map(c => (
                  <span key={c} style={{ padding: '4px 12px', borderRadius: radius.full, background: C.warningBg, color: '#8A4D00', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(245,166,35,0.25)', fontFamily: font.family }}>{c}</span>
                ))}
              </div>
            </div>
          )}
          {apt.allergies && apt.allergies.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '8px', fontWeight: 500 }}>Allergies</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {apt.allergies.map(a => (
                  <span key={a} style={{ padding: '4px 12px', borderRadius: radius.full, background: C.errorBg, color: '#A83236', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(229,71,77,0.2)', fontFamily: font.family }}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </GGCard>
      )}
    </div>
  )

  const sidebarArea = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Action banner */}
      {actionDone && actionBanners[actionDone] && (
        <div style={{ padding: '14px 16px', background: actionBanners[actionDone].bg, borderRadius: radius.sm, border: `1.5px solid ${actionBanners[actionDone].color}30`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
            {actionDone === 'accepted'    && <><circle cx="9" cy="9" r="8" fill={actionBanners.accepted.bg}    stroke={C.success} strokeWidth="1.5"/><path d="M5 9l3 3 5-5" stroke={C.success}  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></>}
            {actionDone === 'declined'    && <><circle cx="9" cy="9" r="8" fill={actionBanners.declined.bg}    stroke={C.error}   strokeWidth="1.5"/><path d="M6 6l6 6M12 6l-6 6" stroke={C.error}  strokeWidth="1.8" strokeLinecap="round"/></>}
            {actionDone === 'rescheduled' && <><circle cx="9" cy="9" r="8" fill={actionBanners.rescheduled.bg} stroke={C.warning} strokeWidth="1.5"/><path d="M9 5v4l3 2" stroke={C.warning} strokeWidth="1.6" strokeLinecap="round"/></>}
          </svg>
          <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6, fontFamily: font.family }}>{actionBanners[actionDone].msg}</div>
        </div>
      )}

      {actionError && (
        <div style={{ padding: '14px 16px', background: C.errorBg, borderRadius: radius.sm, border: '1.5px solid rgba(229,71,77,0.25)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
            <circle cx="9" cy="9" r="8" stroke={C.error} strokeWidth="1.5" />
            <path d="M9 5.5v4.5M9 12.5v.2" stroke={C.error} strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6, fontFamily: font.family }}>{actionError}</div>
        </div>
      )}

      {/* Quick Actions */}
      {(displayStatus === 'new' || displayStatus === 'confirmed') && !isInvoiceUploaded && !actionDone && (
        <GGCard padding="20px">
          <SectionLabel>Actions</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {displayStatus === 'new' && <>
              <GGButton
                variant="success"
                size="md"
                fullWidth
                disabled={isActionBusy}
                onClick={() => {
                  setActionError(null)
                  updateAppointmentStatusMutation.mutate(
                    { id: apt.id, payload: { status: 'confirmed' } },
                    {
                      onSuccess: () => setActionDone('accepted'),
                      onError: error => setActionError(error instanceof Error ? error.message : 'Unable to accept this appointment right now.'),
                    },
                  )
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l4 4 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {isUpdatingStatus ? 'Saving...' : 'Accept Request'}
              </GGButton>
              <GGButton
                variant="secondary"
                size="md"
                fullWidth
                disabled={isActionBusy}
                onClick={() => {
                  setActionError(null)
                  setRescheduleOpen(true)
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 0.5v2M9.5 0.5v2M1.5 5.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                {isRescheduling ? 'Saving...' : 'Propose Reschedule'}
              </GGButton>
              <GGButton
                variant="danger"
                size="md"
                fullWidth
                disabled={isActionBusy}
                onClick={() => {
                  setActionError(null)
                  updateAppointmentStatusMutation.mutate(
                    { id: apt.id, payload: { status: 'cancelled' } },
                    {
                      onSuccess: () => setActionDone('declined'),
                      onError: error => setActionError(error instanceof Error ? error.message : 'Unable to decline this appointment right now.'),
                    },
                  )
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                {isUpdatingStatus ? 'Saving...' : 'Decline Request'}
              </GGButton>
            </>}
            {displayStatus === 'confirmed' && <>
              <GGButton variant="success" size="md" fullWidth onClick={() => navigate('/sp/visits/record', { state: { ctx: { patientId: apt.patientId, patientName: apt.patient, appointmentId: apt.id, conditions: apt.medicalHistory, allergies: apt.allergies } } })}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7h5M7 4.5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Record Visit
              </GGButton>
              <GGButton variant="primary" size="md" fullWidth onClick={() => navigate('/sp/invoices/upload', { state: { prefill: { appointmentId: apt.id, patientId: apt.patientId, patientName: apt.patient } } })}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="0.5" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4h6M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Upload Invoice
              </GGButton>
              <GGButton
                variant="secondary"
                size="md"
                fullWidth
                disabled={isActionBusy}
                onClick={() => {
                  setActionError(null)
                  setRescheduleOpen(true)
                }}
              >
                {isRescheduling ? 'Saving...' : 'Propose Reschedule'}
              </GGButton>
            </>}
          </div>
        </GGCard>
      )}

      {displayStatus === 'completed' && !isInvoiceUploaded && (
        <GGCard padding="20px">
          <SectionLabel>Actions</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <GGButton variant="primary" size="md" fullWidth onClick={() => navigate('/sp/invoices/upload', { state: { prefill: { appointmentId: apt.id, patientId: apt.patientId, patientName: apt.patient } } })}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="0.5" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4h6M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              Upload Invoice
            </GGButton>
          </div>
        </GGCard>
      )}

      {isInvoiceUploaded && (
        <GGCard padding="20px">
          <SectionLabel>Past Appointment</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, fontFamily: font.family }}>
              This appointment has already been invoiced and moved to your past appointments.
            </div>
            <GGButton variant="secondary" size="md" fullWidth onClick={() => navigate(ROUTES.SP_APPOINTMENTS)}>
              View Past Appointments
            </GGButton>
          </div>
        </GGCard>
      )}

      {displayStatus === 'cancelled' && (
        <GGCard padding="20px">
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.errorBg, border: '1.5px solid rgba(229,71,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke={C.error} strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: C.error, fontFamily: font.family, marginBottom: apt.cancellationReason ? '10px' : 0 }}>
                This appointment was cancelled by the patient.
              </div>
              {apt.cancellationReason && (
                <div style={{ background: C.errorBg, border: '1px solid rgba(229,71,77,0.18)', borderRadius: radius.sm, padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: C.error, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '5px', fontFamily: font.family }}>
                    Reason given
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>
                    {apt.cancellationReason}
                  </div>
                  {apt.cancellationNote && (
                    <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, marginTop: '4px', lineHeight: 1.5 }}>
                      {apt.cancellationNote}
                    </div>
                  )}
                </div>
              )}
              {!apt.cancellationReason && (
                <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>No further actions are available.</div>
              )}
            </div>
          </div>
        </GGCard>
      )}

      {/* Summary */}
      <GGCard padding="20px">
        <SectionLabel>Summary</SectionLabel>
        <InfoRow label="Appointment ID" val={apt.id} />
        <InfoRow label="Service" val={apt.service} />
        <InfoRow label="Status" val={<span style={{ padding: '3px 10px', borderRadius: radius.full, background: s.bg, color: s.color, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>{s.label}</span>} />
        <InfoRow label="Date" val={formatDate(apt.date)} />
        <InfoRow label="Time" val={apt.time} />
        <InfoRow label="Attachments" val={`${apt.attachments?.length || 0} file${(apt.attachments?.length || 0) !== 1 ? 's' : ''}`} />
      </GGCard>

      {/* Contact patient */}
      <GGCard padding="20px">
        <SectionLabel>Contact Patient</SectionLabel>
        <a
          href={`tel:${formatPhone(apt.phone, patientCountry?.name, apt.address).tel}`}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.successBg, border: '1px solid rgba(34,201,138,0.2)', borderRadius: radius.sm, textDecoration: 'none' }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2.5a1 1 0 011-1h1.5a.5.5 0 01.5.5l1 3a.5.5 0 01-.15.45L4.6 6.6a8 8 0 005.8 5.8l1.15-1.25a.5.5 0 01.45-.15l3 1a.5.5 0 01.5.5V14a1 1 0 01-1 1H13C7.2 15 2 9.8 2 4v-1.5z" stroke={C.success} strokeWidth="1.3"/></svg>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0D6B47', fontFamily: font.family }}>{formatPhone(apt.phone, patientCountry?.name, apt.address).display}</span>
        </a>
      </GGCard>
    </div>
  )

  return (
    <SPLayout title="Appointment Detail" subtitle={`${apt.patient} · ${apt.id}`} notifCount={2}>
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
              <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, fontFamily: font.family, letterSpacing: '-0.02em' }}>Propose Reschedule</div>
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

      {/* Back button */}
      <button onClick={() => navigate(ROUTES.SP_APPOINTMENTS)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: radius.sm, border: `1.5px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: C.textSub, fontSize: '13px', fontWeight: 600, fontFamily: font.family, marginBottom: '22px', transition: 'all 0.13s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue500; (e.currentTarget as HTMLButtonElement).style.color = C.blue500 }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.textSub }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to Appointments
      </button>

      {isNarrow ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {sidebarArea}
          <div style={{ height: '16px' }} />
          {detailArea}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'flex-start' }}>
          {detailArea}
          <div style={{ position: 'sticky', top: '20px' }}>{sidebarArea}</div>
        </div>
      )}
    </SPLayout>
  )
}
