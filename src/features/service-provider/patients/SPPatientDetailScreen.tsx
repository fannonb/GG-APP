import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGAvatar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { getCountryByCode } from '@/config/countries'
import { useSPPatient } from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate, formatPhone } from '@/utils/format'
import { ROUTES, route } from '@/router/routes'
import type { SPPatient } from '@/types/appointment.types'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '11px',
        fontWeight: 700,
        color: C.textSub,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: '12px',
        fontFamily: font.family,
      }}
    >
      {children}
    </div>
  )
}

function statusChip(status: string) {
  const m: Record<string, { bg: string; color: string; border: string; label: string }> = {
    paid:       { bg: C.bg, color: C.navy800, border: C.border, label: 'Paid' },
    authorized: { bg: C.blue100, color: C.navy800, border: C.border, label: 'Authorized' },
    pending:    { bg: C.bg, color: C.textSub, border: C.borderDark, label: 'Pending' },
    rejected:   { bg: C.errorBg, color: C.error, border: 'transparent', label: 'Rejected' },
  }
  const t = m[status] ?? m.paid
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: radius.full,
        background: t.bg,
        color: t.color,
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontFamily: font.family,
        border: `1px solid ${t.border}`,
      }}
    >
      {t.label}
    </span>
  )
}

function filterChipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: radius.full,
    fontSize: '12px',
    fontFamily: font.family,
    fontWeight: active ? 700 : 600,
    background: active ? C.navy800 : '#fff',
    color: active ? '#fff' : C.textSub,
    border: `1px solid ${active ? C.navy800 : C.border}`,
    cursor: 'pointer',
  }
}

export function SPPatientDetailScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet

  const locationPatient = (location.state as { patient?: SPPatient } | null)?.patient
  const { data: patient, isLoading } = useSPPatient(id)
  const p = patient ?? locationPatient

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all')
  const [expandedId, setExpandedId] = useState<string | false | null>(null)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  // Filtered Encounters
  const filteredEncounters = useMemo(() => {
    if (!p?.visitHistory) return []
    return p.visitHistory.filter(v => {
      if (filterStatus === 'paid' && v.status !== 'paid' && v.status !== 'authorized') return false
      if (filterStatus === 'pending' && v.status !== 'pending') return false

      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        v.service.toLowerCase().includes(q) ||
        v.diagnosis.toLowerCase().includes(q) ||
        v.treatment.toLowerCase().includes(q) ||
        v.invoiceRef.toLowerCase().includes(q)
      )
    })
  }, [p?.visitHistory, filterStatus, search])

  const openEncounterId = expandedId === false ? null : expandedId ?? filteredEncounters[0]?.id ?? null

  if (isLoading && !p) {
    return (
      <SPLayout title="Patient Record">
        <GGCard padding="32px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke={C.border} strokeWidth="3" />
              <path d="M12 2A10 10 0 0 1 22 12" stroke={C.blue500} strokeWidth="3" strokeLinecap="round" />
            </svg>
            Loading patient medical history & clinical record...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  if (!p) {
    return (
      <SPLayout title="Patient Record">
        <GGCard padding="32px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>
              Patient Record Not Found
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>
              We could not locate this patient's clinical record file. It may have been deleted or archived.
            </div>
            <GGButton variant="secondary" size="sm" onClick={() => navigate(ROUTES.SP_PATIENTS)}>
              Back to Patient Records Directory
            </GGButton>
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const age = p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : null
  const patientCountry = getCountryByCode(p.countryCode ?? '')

  return (
    <SPLayout title="Patient Record" notifCount={2}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Top Back Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => navigate(ROUTES.SP_PATIENTS)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: radius.sm,
              border: `1.5px solid ${C.border}`,
              background: '#fff',
              cursor: 'pointer',
              color: C.navy800,
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: font.family,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Patient Records Directory
          </button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(route.spRecordVisit(), {
                state: {
                  ctx: {
                    patientId: p.id,
                    patientName: p.name,
                    conditions: p.conditions,
                    allergies: p.allergies,
                    medications: p.currentMedications,
                  },
                },
              })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: radius.sm,
                border: `1.5px solid ${C.navy800}`,
                background: C.navy800,
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: font.family,
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Record Visit
            </button>

            <button
              onClick={() => navigate(route.spPatientLedger(p.id))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: radius.sm,
                border: `1.5px solid ${C.border}`,
                background: '#fff',
                color: C.navy800,
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: font.family,
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Health Ledger
            </button>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: radius.md,
            padding: isMobile ? '18px 16px' : '20px 24px',
            border: `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <GGAvatar name={p.name} size={isMobile ? 48 : 56} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: C.navy800, margin: 0, fontFamily: font.family, letterSpacing: '-0.02em' }}>
                  {p.name}
                </h1>
                {p.bloodType && p.bloodType !== 'Unknown' && p.bloodType !== 'Not specified' && (
                  <span style={{ background: C.bg, color: C.navy800, padding: '2px 8px', borderRadius: radius.full, fontWeight: 700, fontSize: '11px', border: `1px solid ${C.border}`, fontFamily: font.family }}>
                    Blood type {p.bloodType}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {p.gender && p.gender !== 'Not specified' && <span>{p.gender}</span>}
                {p.gender && age && <span>·</span>}
                {age && <span>{age} years old</span>}
                {p.dob && <span>· DOB {formatDate(p.dob)}</span>}
              </div>
              <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {p.phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2"/></svg>
                    {formatPhone(p.phone, patientCountry?.name, p.address).display}
                  </span>
                )}
                {p.email && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2"/></svg>
                    {p.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              background: C.bg,
              borderRadius: radius.sm,
              padding: isMobile ? '12px' : '14px 16px',
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: '12px',
              border: `1px solid ${C.border}`,
            }}
          >
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Total encounters
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, marginTop: '2px', fontFamily: font.family }}>
                {p.visits} <span style={{ fontSize: '11px', fontWeight: 500, color: C.textSub }}>visits</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Total billed
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, marginTop: '2px', fontFamily: font.family }}>
                {formatCurrency(p.totalSpent)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Last visit
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800, marginTop: '4px', fontFamily: font.family }}>
                {formatDate(p.lastVisit)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Patient file ID
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
                {p.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN BODY CONTENT: Left Encounters Ledger + Right Patient Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 300px', gap: '20px', alignItems: 'flex-start' }}>
          
          {/* LEFT COLUMN: Encounter Timeline Ledger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Toolbar for Encounters Ledger */}
            <div style={{ background: '#fff', padding: '14px 16px', borderRadius: radius.md, border: `1px solid ${C.border}`, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between' }}>
              
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setFilterStatus('all')} style={filterChipStyle(filterStatus === 'all')}>
                  All consultations ({p.visitHistory.length})
                </button>
                <button type="button" onClick={() => setFilterStatus('paid')} style={filterChipStyle(filterStatus === 'paid')}>
                  Paid ({p.visitHistory.filter(v => v.status === 'paid' || v.status === 'authorized').length})
                </button>
                <button type="button" onClick={() => setFilterStatus('pending')} style={filterChipStyle(filterStatus === 'pending')}>
                  Pending ({p.visitHistory.filter(v => v.status === 'pending').length})
                </button>
              </div>

              {/* Search input inside toolbar */}
              <div style={{ position: 'relative', width: isMobile ? '100%' : '200px' }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter encounters..."
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontFamily: font.family,
                    color: C.navy800,
                    background: C.bg,
                    border: `1.5px solid ${C.border}`,
                    borderRadius: radius.sm,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

            </div>

            {/* Encounter Cards List */}
            {filteredEncounters.length === 0 ? (
              <GGCard padding="28px">
                <div style={{ textAlign: 'center', color: C.textSub, fontSize: '13px', fontFamily: font.family }}>
                  No consultation records match your filter criteria.
                </div>
              </GGCard>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredEncounters.map((v, idx) => {
                  const open = v.id === openEncounterId
                  return (
                  <div
                    key={v.id}
                    style={{
                      background: '#fff',
                      borderRadius: radius.md,
                      border: `1px solid ${open ? C.navy800 : C.border}`,
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? false : v.id)}
                      aria-expanded={open}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: open ? C.bg : '#fff',
                        border: 'none',
                        padding: isMobile ? '14px 16px' : '16px 20px',
                        cursor: 'pointer',
                        fontFamily: font.family,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: C.navy800 }}>
                            {formatDate(v.date)}
                          </span>
                          {idx === 0 && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: C.navy800, background: '#fff', padding: '2px 8px', borderRadius: radius.full, letterSpacing: '0.05em', border: `1px solid ${C.border}` }}>
                              Latest
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSub, marginTop: '2px' }}>
                          {v.service}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        {statusChip(v.status)}
                        <span style={{ fontSize: '15px', fontWeight: 800, color: C.navy800 }}>
                          {formatCurrency(v.amount)}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                          style={{ transform: open ? 'rotate(180deg)' : 'none', color: C.textSub }}
                        >
                          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>

                    {open && (
                    <div style={{ padding: isMobile ? '0 16px 16px' : '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: `1px solid ${C.border}` }}>
                    {v.forBeneficiary && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', marginTop: '14px', borderRadius: radius.sm, background: C.bg, border: `1px solid ${C.border}` }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={C.navy800} strokeWidth="2" />
                          <circle cx="9" cy="7" r="4" stroke={C.navy800} strokeWidth="2" />
                        </svg>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>
                          For Beneficiary: {v.forBeneficiary.name} ({v.forBeneficiary.relation}, Age {v.forBeneficiary.age})
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px', marginTop: v.forBeneficiary ? 0 : '14px' }}>
                      {[
                        { label: 'Blood Pressure', val: v.vitals.bp },
                        { label: 'Temperature', val: v.vitals.temp },
                        { label: 'Glucometer', val: v.vitals.glucose ?? '—' },
                        { label: 'O₂ Sats', val: v.vitals.sats },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ padding: '8px 10px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                            {label}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: C.navy800, fontFamily: font.family, marginTop: '2px' }}>
                            {val}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', fontFamily: font.family }}>
                          Diagnosis
                        </div>
                        <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6, background: C.bg, padding: '10px 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, fontFamily: font.family }}>
                          {v.diagnosis || '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', fontFamily: font.family }}>
                          Treatment
                        </div>
                        <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6, background: C.bg, padding: '10px 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, fontFamily: font.family }}>
                          {v.treatment || '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', fontFamily: font.family }}>
                          Follow-up
                        </div>
                        <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6, background: C.bg, padding: '10px 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, fontFamily: font.family }}>
                          {v.followUp || '—'}
                        </div>
                      </div>
                    </div>

                    {v.services && v.services.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontFamily: font.family }}>
                          Services Rendered
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {v.services.map(s => (
                            <span key={s} style={{ fontSize: '11px', fontWeight: 600, color: C.navy800, background: C.bg, border: `1px solid ${C.border}`, padding: '3px 9px', borderRadius: radius.full, fontFamily: font.family }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedNote(expandedNote === v.id ? null : v.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: C.navy800, fontSize: '12px', fontWeight: 700, fontFamily: font.family, padding: 0 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Internal Quality Note
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: expandedNote === v.id ? 'rotate(180deg)' : 'none' }}>
                          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>

                      {expandedNote === v.id && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: C.textSub, lineHeight: 1.6, background: C.bg, padding: '10px 12px', borderRadius: radius.sm, border: `1px dashed ${C.border}`, fontFamily: font.family, fontStyle: 'italic' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: C.navy800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '3px', fontStyle: 'normal' }}>
                            SP Internal Note — Confidential
                          </span>
                          {v.internalNote}
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: C.textSub, fontFamily: font.family }}>
                        Invoice Reference: {v.invoiceRef}
                      </span>
                    </div>
                    </div>
                    )}
                  </div>
                  )
                })}
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Sticky Patient Profile & Clinical Care Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: isNarrow ? 'static' : 'sticky', top: '20px' }}>
            
            {/* Demographics Card */}
            <GGCard padding="18px">
              <SectionLabel>Patient Identity</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Full Name', val: p.name },
                  { label: 'Date of Birth', val: formatDate(p.dob) },
                  { label: 'Gender', val: p.gender },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '6px', borderBottom: `1px solid ${C.border}`, gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.navy800, fontFamily: font.family, textAlign: 'right' }}>{val}</span>
                  </div>
                ))}
              </div>
            </GGCard>

            {/* Clinical Conditions & Allergies */}
            <GGCard padding="18px">
              <SectionLabel>Clinical Summary</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Conditions */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', marginBottom: '4px', fontFamily: font.family }}>
                    Chronic Conditions
                  </div>
                  {p.conditions && p.conditions.length > 0 ? (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {p.conditions.map(c => (
                        <span key={c} style={{ fontSize: '11px', fontWeight: 600, color: C.navy800, background: C.bg, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: radius.full, fontFamily: font.family }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>None recorded</span>
                  )}
                </div>

                {/* Allergies */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.error, textTransform: 'uppercase', marginBottom: '4px', fontFamily: font.family }}>
                    Allergies
                  </div>
                  {p.allergies && p.allergies.length > 0 ? (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {p.allergies.map(a => (
                        <span key={a} style={{ fontSize: '11px', fontWeight: 700, color: C.error, background: C.errorBg, border: '1px solid transparent', padding: '2px 8px', borderRadius: radius.full, fontFamily: font.family }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>None recorded</span>
                  )}
                </div>

              </div>
            </GGCard>

            {/* Beneficiaries Card */}
            {p.beneficiaries && p.beneficiaries.length > 0 && (
              <GGCard padding="18px">
                <SectionLabel>Registered Beneficiaries</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {p.beneficiaries.map(b => (
                    <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.sm }}>
                      <GGAvatar name={b.name} size={32} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>
                          {b.name}
                        </div>
                        <div style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>
                          {b.relation} · Age {b.age}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GGCard>
            )}

          </div>

        </div>

      </div>
    </SPLayout>
  )
}
