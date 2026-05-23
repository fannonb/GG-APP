import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GGCard, GGButton, GGAvatar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate, formatDateShort } from '@/utils/format'
import { MOCK_SP_PATIENTS } from '@/mock/sp.mock'
import type { SPPatient } from '@/types/appointment.types'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px', fontFamily: font.family }}>{children}</div>
}

function statusChip(status: string) {
  const m: Record<string, { bg: string; color: string; label: string }> = {
    paid:     { bg: C.successBg, color: '#0D6B47', label: 'Paid' },
    pending:  { bg: C.warningBg, color: '#8A4D00', label: 'Pending' },
    disputed: { bg: C.errorBg,   color: '#A83236', label: 'Disputed' },
  }
  const t = m[status] ?? m.paid
  return <span style={{ padding: '3px 10px', borderRadius: radius.full, background: t.bg, color: t.color, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>{t.label}</span>
}

export function SPPatientDetailScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const p: SPPatient = (location.state as { patient: SPPatient } | null)?.patient ?? MOCK_SP_PATIENTS[0]
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('visits')

  const age = new Date().getFullYear() - new Date(p.dob).getFullYear()

  const visitTimeline = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {p.visitHistory.map((v, idx) => (
        <div key={v.id} style={{ display: 'flex', gap: '0', position: 'relative' }}>
          {/* Timeline spine */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', flexShrink: 0, paddingTop: '22px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: idx === 0 ? C.blue500 : C.borderDark, border: `2px solid ${idx === 0 ? C.blue500 : C.border}`, flexShrink: 0, zIndex: 1 }} />
            {idx < p.visitHistory.length - 1 && <div style={{ width: 2, flex: 1, background: C.border, marginTop: '4px', minHeight: '40px' }} />}
          </div>

          {/* Visit card */}
          <div style={{ flex: 1, paddingBottom: '20px', paddingLeft: '4px' }}>
            <GGCard padding="20px">
              {/* Visit header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: C.text }}>{formatDate(v.date)}</span>
                    {idx === 0 && <span style={{ fontSize: '10px', fontWeight: 700, color: C.blue500, background: C.blue100, padding: '2px 8px', borderRadius: radius.full, letterSpacing: '0.05em' }}>LATEST</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.textSub }}>{v.service}</span>
                    <span style={{ fontSize: '11px', color: C.textLight }}>{v.appointmentId}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {statusChip(v.status)}
                  <span style={{ fontSize: '14px', fontWeight: 800, color: C.text }}>{formatCurrency(v.amount)}</span>
                </div>
              </div>

              {/* For beneficiary pill */}
              {v.forBeneficiary && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '4px 11px', borderRadius: radius.full, background: C.blue100, border: '1px solid rgba(74,173,223,0.3)', marginBottom: '14px' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="4" cy="3.5" r="1.8" stroke={C.blue500} strokeWidth="1.1"/><path d="M1 10c0-1.7 1.3-3 3-3" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/><circle cx="9" cy="4.5" r="1.8" stroke={C.blue500} strokeWidth="1.1"/><path d="M6 11c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: C.blue500, fontFamily: font.family }}>
                    For beneficiary: {v.forBeneficiary.name} ({v.forBeneficiary.relation}, Age {v.forBeneficiary.age})
                  </span>
                </div>
              )}

              {/* Vitals grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
                {[
                  { label: 'Blood Pressure', val: v.vitals.bp },
                  { label: 'Temperature',    val: v.vitals.temp },
                  { label: 'Weight',         val: v.vitals.weight },
                  { label: 'O₂ Sats',        val: v.vitals.sats },
                ].map(({ label, val }) => (
                  <div key={label} style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', fontFamily: font.family }}>{label}</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: C.text, fontFamily: font.family }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Clinical sections */}
              {[
                { label: 'Diagnosis & Clinical Findings', val: v.diagnosis, color: C.navy800, bg: '#F0F4FF', border: '#C7D2FE' },
                { label: 'Treatment / Prescription',      val: v.treatment, color: '#0D6B47', bg: C.successBg, border: 'rgba(34,201,138,0.2)' },
                { label: 'Follow-up Instructions',        val: v.followUp,  color: '#8A4D00', bg: C.warningBg, border: 'rgba(245,166,35,0.2)' },
              ].map(({ label, val, color, bg, border }) => (
                <div key={label} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px', fontFamily: font.family }}>{label}</div>
                  <div style={{ fontSize: '13px', color, lineHeight: 1.7, background: bg, padding: '11px 14px', borderRadius: radius.sm, border: `1px solid ${border}`, fontFamily: font.family }}>{val}</div>
                </div>
              ))}

              {/* Services rendered */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontFamily: font.family }}>Services Rendered</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {v.services.map(s => (
                    <span key={s} style={{ fontSize: '11px', color: C.textSub, background: C.bg, border: `1px solid ${C.border}`, padding: '3px 10px', borderRadius: radius.full, fontFamily: font.family }}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Internal Note — toggleable */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px', marginTop: '4px' }}>
                <button onClick={() => setExpandedNote(expandedNote === v.id ? null : v.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, fontSize: '12px', fontWeight: 600, fontFamily: font.family, padding: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M4 6.5h5M4 4.5h5M4 8.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                  Internal Quality Note
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition: 'transform 0.15s', transform: expandedNote === v.id ? 'rotate(180deg)' : 'none' }}><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                </button>
                {expandedNote === v.id && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: C.textSub, lineHeight: 1.7, background: '#F9FAFB', padding: '10px 13px', borderRadius: radius.sm, border: `1px dashed ${C.border}`, fontFamily: font.family, fontStyle: 'italic' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', fontStyle: 'normal' }}>SP Internal Note — not visible to patient</span>
                    {v.internalNote}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: C.textLight, fontFamily: font.family }}>Invoice: {v.invoiceRef}</span>
              </div>
            </GGCard>
          </div>
        </div>
      ))}
    </div>
  )

  const profileSidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <GGCard padding="20px">
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ margin: '0 auto 10px', display: 'inline-block' }}><GGAvatar name={p.name} size={64} /></div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>{p.name}</div>
          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px', fontFamily: font.family }}>{p.gender} · {age} years old</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '8px', padding: '4px 12px', borderRadius: radius.full, background: C.blue100, border: `1px solid ${C.border}` }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1l1 3h3l-2.5 1.8 1 3L6 7.2 3.5 8.8l1-3L2 4h3z" stroke={C.blue500} strokeWidth="1.1" fill="none"/></svg>
            <span style={{ fontSize: '11px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>Blood Type: {p.bloodType}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { label: 'Phone',        val: p.phone },
            { label: 'Date of Birth', val: formatDate(p.dob) },
            { label: 'Address',      val: p.address },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: `1px solid ${C.border}`, gap: '8px' }}>
              <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: C.text, fontFamily: font.family, textAlign: 'right' }}>{val}</span>
            </div>
          ))}
        </div>
      </GGCard>

      <GGCard padding="20px">
        <SectionLabel>Care Summary</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Total Visits', val: p.visits.toString() },
            { label: 'Total Billed', val: formatCurrency(p.totalSpent) },
            { label: 'Last Visit',   val: formatDateShort(p.lastVisit) },
            { label: 'Patient Since', val: formatDateShort(p.visitHistory[p.visitHistory.length - 1]?.date ?? p.lastVisit) },
          ].map(({ label, val }) => (
            <div key={label} style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', fontFamily: font.family }}>{label}</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: C.text, fontFamily: font.family }}>{val}</div>
            </div>
          ))}
        </div>
      </GGCard>

      <GGCard padding="20px">
        <SectionLabel>Medical Profile</SectionLabel>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSub, marginBottom: '7px', fontFamily: font.family }}>Chronic Conditions</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {p.conditions.length > 0
              ? p.conditions.map(c => <span key={c} style={{ fontSize: '11px', color: '#8A4D00', background: C.warningBg, border: '1px solid rgba(245,166,35,0.25)', padding: '4px 10px', borderRadius: radius.full, fontWeight: 600, fontFamily: font.family }}>{c}</span>)
              : <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>None recorded</span>}
          </div>
        </div>
        {p.allergies.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSub, marginBottom: '7px', fontFamily: font.family }}>Allergies</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {p.allergies.map(a => <span key={a} style={{ fontSize: '11px', color: '#A83236', background: C.errorBg, border: '1px solid rgba(229,71,77,0.2)', padding: '4px 10px', borderRadius: radius.full, fontWeight: 600, fontFamily: font.family }}>⚠ {a}</span>)}
            </div>
          </div>
        )}
        {p.currentMedications.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSub, marginBottom: '7px', fontFamily: font.family }}>Current Medications</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {p.currentMedications.map(m => (
                <div key={m} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '12px', color: C.text, fontFamily: font.family }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue500, marginTop: '6px', flexShrink: 0 }} />
                  {m}
                </div>
              ))}
            </div>
          </div>
        )}
      </GGCard>

      {p.beneficiaries.length > 0 && (
        <GGCard padding="20px">
          <SectionLabel>Beneficiaries</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {p.beneficiaries.map(b => (
              <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: radius.sm }}>
                <GGAvatar name={b.name} size={32} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{b.name}</div>
                  <div style={{ fontSize: '11px', color: C.blue500, fontFamily: font.family }}>{b.relation} · Age {b.age}</div>
                </div>
              </div>
            ))}
          </div>
        </GGCard>
      )}

      <GGCard padding="20px">
        <SectionLabel>Quick Actions</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <GGButton variant="success" size="md" fullWidth onClick={() => navigate('/sp/visits/record', { state: { ctx: { patientName: p.name, conditions: p.conditions, allergies: p.allergies, medications: p.currentMedications } } })}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7h5M7 4.5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Record Visit
          </GGButton>
          <GGButton variant="primary" size="md" fullWidth onClick={() => navigate('/sp/invoices/upload')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="0.5" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4h6M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Upload Invoice
          </GGButton>
          <GGButton variant="secondary" size="md" fullWidth onClick={() => navigate('/sp/appointments')}>View Appointments</GGButton>
        </div>
      </GGCard>
    </div>
  )

  return (
    <SPLayout title="Patient Record" subtitle={`${p.name} · ${p.visits} visits`} notifCount={2}>

      {/* Back */}
      <button onClick={() => navigate('/sp/patients')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: radius.sm, border: `1.5px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: C.textSub, fontSize: '13px', fontWeight: 600, fontFamily: font.family, marginBottom: '22px', transition: 'all 0.13s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue500; (e.currentTarget as HTMLButtonElement).style.color = C.blue500 }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.textSub }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Patient History
      </button>

      {isNarrow ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {profileSidebar}
          <div style={{ height: '20px' }} />
          <div style={{ display: 'flex', background: C.bg, borderRadius: '12px', padding: '4px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
            {([['visits', 'Visit Timeline'], ['profile', 'Medical Profile']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ flex: 1, padding: '9px', borderRadius: '9px', border: 'none', background: activeTab === id ? '#fff' : 'transparent', color: activeTab === id ? C.text : C.textSub, fontFamily: font.family, fontSize: '13px', fontWeight: activeTab === id ? 700 : 500, cursor: 'pointer', transition: 'all 0.14s' }}>
                {label}
              </button>
            ))}
          </div>
          {activeTab === 'visits' ? visitTimeline : profileSidebar}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: font.family }}>
              Visit Timeline — {p.visitHistory.length} consultation{p.visitHistory.length !== 1 ? 's' : ''}
            </div>
            {visitTimeline}
          </div>
          <div style={{ position: 'sticky', top: '20px' }}>
            {profileSidebar}
          </div>
        </div>
      )}
    </SPLayout>
  )
}
