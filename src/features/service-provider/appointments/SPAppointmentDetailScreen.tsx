import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GGCard, GGButton, GGBadge, GGAvatar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatDate } from '@/utils/format'
import { MOCK_SP_APPOINTMENTS } from '@/mock/sp.mock'
import type { Appointment } from '@/types/appointment.types'

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
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const apt: Appointment = (location.state as { apt: Appointment } | null)?.apt ?? MOCK_SP_APPOINTMENTS[0]
  const [viewingAtt, setViewingAtt] = useState<{ name: string; type: string; size: string | null } | null>(null)
  const [actionDone, setActionDone] = useState<string | null>(null)

  const s = statusMap[apt.status] ?? statusMap.new

  const normalizeAtt = (a: import('@/types/appointment.types').Attachment) => ({
    name: a.name,
    type: a.type === 'document' ? 'doc' : a.type,
    size: a.size ?? null,
  })

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
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{apt.phone}</div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.blue500 }}>View</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7s2.3-4.5 6-4.5S13 7 13 7s-2.3 4.5-6 4.5S1 7 1 7z" stroke={C.blue500} strokeWidth="1.3"/><circle cx="7" cy="7" r="2" stroke={C.blue500} strokeWidth="1.3"/></svg>
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

      {/* Quick Actions */}
      {(apt.status === 'new' || apt.status === 'confirmed') && !actionDone && (
        <GGCard padding="20px">
          <SectionLabel>Actions</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {apt.status === 'new' && <>
              <GGButton variant="success" size="md" fullWidth onClick={() => setActionDone('accepted')}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l4 4 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Accept Request
              </GGButton>
              <GGButton variant="secondary" size="md" fullWidth onClick={() => setActionDone('rescheduled')}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 0.5v2M9.5 0.5v2M1.5 5.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Propose Reschedule
              </GGButton>
              <GGButton variant="danger" size="md" fullWidth onClick={() => setActionDone('declined')}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                Decline Request
              </GGButton>
            </>}
            {apt.status === 'confirmed' && <>
              <GGButton variant="success" size="md" fullWidth onClick={() => navigate('/sp/visits/record', { state: { ctx: { patientName: apt.patient, appointmentId: apt.id, conditions: apt.medicalHistory, allergies: apt.allergies } } })}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7h5M7 4.5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Record Visit
              </GGButton>
              <GGButton variant="primary" size="md" fullWidth onClick={() => navigate('/sp/invoices/upload')}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="0.5" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4h6M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Upload Invoice
              </GGButton>
              <GGButton variant="secondary" size="md" fullWidth onClick={() => setActionDone('rescheduled')}>Propose Reschedule</GGButton>
            </>}
          </div>
        </GGCard>
      )}

      {apt.status === 'completed' && (
        <GGCard padding="20px">
          <SectionLabel>Actions</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <GGButton variant="success" size="md" fullWidth onClick={() => navigate('/sp/visits/record', { state: { ctx: { patientName: apt.patient, appointmentId: apt.id, conditions: apt.medicalHistory, allergies: apt.allergies } } })}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7h5M7 4.5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              Record Visit
            </GGButton>
            <GGButton variant="primary" size="md" fullWidth onClick={() => navigate('/sp/invoices/upload')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="0.5" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4h6M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              Upload Invoice
            </GGButton>
          </div>
        </GGCard>
      )}

      {apt.status === 'cancelled' && (
        <GGCard padding="20px">
          <div style={{ padding: '10px 0', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.errorBg, border: '1.5px solid rgba(229,71,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke={C.error} strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family, lineHeight: 1.6 }}>This appointment was cancelled. No further actions are available.</div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.successBg, border: '1px solid rgba(34,201,138,0.2)', borderRadius: radius.sm }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2.5a1 1 0 011-1h1.5a.5.5 0 01.5.5l1 3a.5.5 0 01-.15.45L4.6 6.6a8 8 0 005.8 5.8l1.15-1.25a.5.5 0 01.45-.15l3 1a.5.5 0 01.5.5V14a1 1 0 01-1 1H13C7.2 15 2 9.8 2 4v-1.5z" stroke={C.success} strokeWidth="1.3"/></svg>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0D6B47', fontFamily: font.family }}>{apt.phone}</span>
        </div>
      </GGCard>
    </div>
  )

  return (
    <SPLayout title="Appointment Detail" subtitle={`${apt.patient} · ${apt.id}`} notifCount={2}>
      {/* Attachment viewer overlay */}
      {viewingAtt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setViewingAtt(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,30,66,0.6)', backdropFilter: 'blur(4px)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(13,30,66,0.3)' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>{viewingAtt.name}</div>
            <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '16px' }}>File preview not available in this environment.</div>
            <GGButton variant="secondary" size="sm" onClick={() => setViewingAtt(null)}>Close</GGButton>
          </div>
        </div>
      )}

      {/* Back button */}
      <button onClick={() => navigate('/sp/appointments')}
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
