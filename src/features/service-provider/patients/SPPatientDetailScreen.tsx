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
        color: C.navy800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: '12px',
        fontFamily: font.family,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue500, display: 'inline-block' }} />
      {children}
    </div>
  )
}

function statusChip(status: string) {
  const m: Record<string, { bg: string; color: string; label: string }> = {
    paid:       { bg: 'rgba(34, 197, 94, 0.12)', color: '#15803D', label: 'Paid' },
    authorized: { bg: 'rgba(56, 182, 255, 0.15)', color: C.navy800, label: 'Authorized' },
    pending:    { bg: 'rgba(245, 158, 11, 0.15)', color: '#B45309', label: 'Pending' },
    rejected:   { bg: 'rgba(239, 68, 68, 0.12)',  color: '#B91C1C', label: 'Rejected' },
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
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontFamily: font.family,
        border: `1px solid ${t.color}30`,
      }}
    >
      {t.label}
    </span>
  )
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

  if (isLoading && !p) {
    return (
      <SPLayout title="Patient Ledger Record" subtitle="Loading patient history file...">
        <GGCard padding="32px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke={C.border} strokeWidth="3" />
              <path d="M12 2A10 10 0 0 1 22 12" stroke={C.blue500} strokeWidth="3" strokeLinecap="round" />
            </svg>
            Loading patient medical history & financial ledger...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  if (!p) {
    return (
      <SPLayout title="Patient Ledger Record" subtitle="Patient file not found">
        <GGCard padding="32px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>
              Patient Record Not Found
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>
              We could not locate this patient's clinical ledger file. It may have been deleted or archived.
            </div>
            <GGButton variant="secondary" size="sm" onClick={() => navigate(ROUTES.SP_PATIENTS)}>
              Back to Patient Ledger Directory
            </GGButton>
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const age = p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : null
  const patientCountry = getCountryByCode(p.countryCode ?? '')

  return (
    <SPLayout title="Patient Record" subtitle={`${p.name} · Clinical & Financial Ledger History`} notifCount={2}>
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
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 4px rgba(9,28,68,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = C.blue500
              e.currentTarget.style.color = C.blue500
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.border
              e.currentTarget.style.color = C.navy800
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Patient Ledger Directory
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
                border: 'none',
                background: C.blue500,
                color: C.navy800,
                fontSize: '13px',
                fontWeight: 800,
                fontFamily: font.family,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 10px rgba(56, 182, 255, 0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = C.navy800
                e.currentTarget.style.color = C.blue500
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = C.blue500
                e.currentTarget.style.color = C.navy800
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
                border: `1.5px solid ${C.navy800}`,
                background: C.navy800,
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: font.family,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = C.blue500
                e.currentTarget.style.borderColor = C.blue500
                e.currentTarget.style.color = C.navy800
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = C.navy800
                e.currentTarget.style.borderColor = C.navy800
                e.currentTarget.style.color = '#fff'
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

        {/* HERO BANNER - GP Logo Dark Navy Theme (#050E22 → #091C44) */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.navy900} 0%, ${C.navy800} 100%)`,
            borderRadius: radius.md,
            padding: isMobile ? '20px 16px' : '24px 28px',
            color: '#fff',
            boxShadow: '0 6px 24px rgba(9, 28, 68, 0.2)',
            border: `1.5px solid ${C.navy800}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Main Hero Header */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px' }}>
            
            {/* Left: Patient Avatar & Demographics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <GGAvatar name={p.name} size={isMobile ? 54 : 64} />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: C.blue500,
                    border: '2.5px solid #050E22',
                  }}
                  title="Active Patient File"
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#fff', margin: 0, fontFamily: font.family, letterSpacing: '-0.02em' }}>
                    {p.name}
                  </h1>
                  {p.bloodType && p.bloodType !== 'Unknown' && p.bloodType !== 'Not specified' && (
                    <span style={{ background: 'rgba(56, 182, 255, 0.18)', color: C.blue500, padding: '2px 8px', borderRadius: radius.full, fontWeight: 800, fontSize: '11px', border: '1px solid rgba(56, 182, 255, 0.3)', fontFamily: font.family }}>
                      Blood Type: {p.bloodType}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', fontFamily: font.family, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {p.gender && p.gender !== 'Not specified' && <span>{p.gender}</span>}
                  {p.gender && age && <span>·</span>}
                  {age && <span>{age} years old</span>}
                  {p.dob && <span>· DOB: {formatDate(p.dob)}</span>}
                </div>

                {/* Contact Line */}
                <div style={{ fontSize: '12px', color: C.blue500, fontFamily: font.family, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
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

          </div>

          {/* Embedded Summary Metrics Bar */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: radius.sm,
              padding: isMobile ? '12px' : '14px 18px',
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Total Encounters
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginTop: '2px', fontFamily: font.family }}>
                {p.visits} <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>visits</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Total Billed
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: C.blue500, marginTop: '2px', fontFamily: font.family }}>
                {formatCurrency(p.totalSpent)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Last Visit Date
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px', fontFamily: font.family }}>
                {formatDate(p.lastVisit)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Patient File ID
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.9)', marginTop: '4px', fontFamily: font.family }}>
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
            <div style={{ background: '#fff', padding: '14px 16px', borderRadius: radius.md, border: `1.5px solid ${C.border}`, boxShadow: '0 2px 8px rgba(9,28,68,0.03)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between' }}>
              
              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFilterStatus('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: radius.full,
                    fontSize: '12px',
                    fontFamily: font.family,
                    fontWeight: filterStatus === 'all' ? 700 : 600,
                    background: filterStatus === 'all' ? C.navy800 : C.blue100,
                    color: filterStatus === 'all' ? C.blue500 : C.navy800,
                    border: `1px solid ${filterStatus === 'all' ? C.navy800 : 'rgba(56, 182, 255, 0.3)'}`,
                    cursor: 'pointer',
                  }}
                >
                  All Consultations ({p.visitHistory.length})
                </button>
                <button
                  onClick={() => setFilterStatus('paid')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: radius.full,
                    fontSize: '12px',
                    fontFamily: font.family,
                    fontWeight: filterStatus === 'paid' ? 700 : 600,
                    background: filterStatus === 'paid' ? C.navy800 : C.blue100,
                    color: filterStatus === 'paid' ? C.blue500 : C.navy800,
                    border: `1px solid ${filterStatus === 'paid' ? C.navy800 : 'rgba(56, 182, 255, 0.3)'}`,
                    cursor: 'pointer',
                  }}
                >
                  Paid ({p.visitHistory.filter(v => v.status === 'paid' || v.status === 'authorized').length})
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: radius.full,
                    fontSize: '12px',
                    fontFamily: font.family,
                    fontWeight: filterStatus === 'pending' ? 700 : 600,
                    background: filterStatus === 'pending' ? C.navy800 : C.blue100,
                    color: filterStatus === 'pending' ? C.blue500 : C.navy800,
                    border: `1px solid ${filterStatus === 'pending' ? C.navy800 : 'rgba(56, 182, 255, 0.3)'}`,
                    cursor: 'pointer',
                  }}
                >
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredEncounters.map((v, idx) => (
                  <div
                    key={v.id}
                    style={{
                      background: '#fff',
                      borderRadius: radius.md,
                      border: `1.5px solid ${idx === 0 ? C.blue500 : C.border}`,
                      boxShadow: idx === 0 ? '0 4px 18px rgba(56, 182, 255, 0.14)' : '0 2px 8px rgba(9, 28, 68, 0.03)',
                      padding: isMobile ? '16px' : '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: C.navy800, fontFamily: font.family }}>
                            {formatDate(v.date)}
                          </span>
                          {idx === 0 && (
                            <span style={{ fontSize: '10px', fontWeight: 800, color: C.blue500, background: C.navy800, padding: '2px 8px', borderRadius: radius.full, letterSpacing: '0.05em' }}>
                              LATEST CONSULTATION
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSub, marginTop: '2px', fontFamily: font.family }}>
                          Service: {v.service}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {statusChip(v.status)}
                        <span style={{ fontSize: '15px', fontWeight: 800, color: C.navy800, fontFamily: font.family }}>
                          {formatCurrency(v.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Beneficiary Banner */}
                    {v.forBeneficiary && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: radius.sm, background: C.blue100, border: '1px solid rgba(56, 182, 255, 0.3)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={C.navy800} strokeWidth="2" />
                          <circle cx="9" cy="7" r="4" stroke={C.navy800} strokeWidth="2" />
                        </svg>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>
                          For Beneficiary: {v.forBeneficiary.name} ({v.forBeneficiary.relation}, Age {v.forBeneficiary.age})
                        </span>
                      </div>
                    )}

                    {/* Vitals Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
                      {[
                        { label: 'Blood Pressure', val: v.vitals.bp },
                        { label: 'Temperature', val: v.vitals.temp },
                        { label: 'Glucometer', val: v.vitals.glucose ?? '—' },
                        { label: 'O₂ Sats', val: v.vitals.sats },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ padding: '8px 10px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(56, 182, 255, 0.25)`, textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                            {label}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: C.navy800, fontFamily: font.family, marginTop: '2px' }}>
                            {val}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Clinical Findings Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Diagnosis */}
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.navy800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', fontFamily: font.family }}>
                          Diagnosis & Clinical Findings
                        </div>
                        <div style={{ fontSize: '13px', color: C.navy800, lineHeight: 1.6, background: C.blue100, padding: '10px 12px', borderRadius: radius.sm, border: '1px solid rgba(56, 182, 255, 0.3)', fontFamily: font.family }}>
                          {v.diagnosis}
                        </div>
                      </div>

                      {/* Treatment */}
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', fontFamily: font.family }}>
                          Treatment & Prescription
                        </div>
                        <div style={{ fontSize: '13px', color: '#15803D', lineHeight: 1.6, background: 'rgba(34, 197, 94, 0.08)', padding: '10px 12px', borderRadius: radius.sm, border: '1px solid rgba(34, 197, 94, 0.2)', fontFamily: font.family }}>
                          {v.treatment}
                        </div>
                      </div>

                      {/* Follow-up */}
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', fontFamily: font.family }}>
                          Follow-up Instructions
                        </div>
                        <div style={{ fontSize: '13px', color: '#B45309', lineHeight: 1.6, background: 'rgba(245, 158, 11, 0.08)', padding: '10px 12px', borderRadius: radius.sm, border: '1px solid rgba(245, 158, 11, 0.2)', fontFamily: font.family }}>
                          {v.followUp}
                        </div>
                      </div>
                    </div>

                    {/* Services Rendered Badges */}
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

                    {/* Collapsible Quality Note */}
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginTop: '2px' }}>
                      <button
                        onClick={() => setExpandedNote(expandedNote === v.id ? null : v.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: C.navy800, fontSize: '12px', fontWeight: 700, fontFamily: font.family, padding: 0 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Internal Quality Note
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition: 'transform 0.15s', transform: expandedNote === v.id ? 'rotate(180deg)' : 'none' }}>
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

                    {/* Footer Ref */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: C.textSub, fontFamily: font.family }}>
                        Invoice Reference: {v.invoiceRef}
                      </span>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Sticky Patient Profile & Clinical Care Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: isNarrow ? 'static' : 'sticky', top: '20px' }}>
            
            {/* Demographics Card */}
            <GGCard padding="18px">
              <SectionLabel>Patient Identity & Address</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Full Name', val: p.name },
                  { label: 'Date of Birth', val: formatDate(p.dob) },
                  { label: 'Gender', val: p.gender },
                  { label: 'Blood Group', val: p.bloodType },
                  { label: 'Address', val: p.address },
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
                        <span key={c} style={{ fontSize: '11px', fontWeight: 700, color: C.navy800, background: C.blue100, border: '1px solid rgba(56, 182, 255, 0.3)', padding: '2px 8px', borderRadius: radius.full, fontFamily: font.family }}>
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
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', marginBottom: '4px', fontFamily: font.family }}>
                    Allergies
                  </div>
                  {p.allergies && p.allergies.length > 0 ? (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {p.allergies.map(a => (
                        <span key={a} style={{ fontSize: '11px', fontWeight: 700, color: '#B91C1C', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: radius.full, fontFamily: font.family }}>
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
                    <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: C.blue100, border: '1px solid rgba(56, 182, 255, 0.3)', borderRadius: radius.sm }}>
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
