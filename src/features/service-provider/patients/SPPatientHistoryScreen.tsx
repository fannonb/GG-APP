import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGAvatar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { formatDate, formatCurrency } from '@/utils/format'
import { MOCK_SP_PATIENTS } from '@/mock/sp.mock'

export function SPPatientHistoryScreen() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const filtered = MOCK_SP_PATIENTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <SPLayout title="Patient History" subtitle="Returning patients and care records">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke={C.textSub} strokeWidth="1.3"/>
            <path d="M10 10l3 3" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients…"
            style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: '14px', fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Patient cards */}
        {filtered.map(p => (
          <GGCard key={p.id} padding="22px" onClick={() => navigate('/sp/patients/' + p.id, { state: { patient: p } })} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <GGAvatar name={p.name} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{p.name}</div>
                  <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>{p.gender} · {new Date().getFullYear() - new Date(p.dob).getFullYear()} yrs</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: C.textSub }}>Last visit: <strong style={{ color: C.text }}>{formatDate(p.lastVisit)}</strong></span>
                  <span style={{ fontSize: '12px', color: C.textSub }}>{p.visits} visits</span>
                  <span style={{ fontSize: '12px', color: C.textSub }}>Billed: <strong style={{ color: C.text }}>{formatCurrency(p.totalSpent)}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {p.conditions.length > 0
                    ? p.conditions.map(c => (
                        <span key={c} style={{ fontSize: '11px', color: '#8A4D00', background: C.warningBg, border: '1px solid rgba(245,166,35,0.25)', padding: '3px 10px', borderRadius: radius.full, fontFamily: font.family }}>{c}</span>
                      ))
                    : <span style={{ fontSize: '11px', color: C.textSub, background: C.bg, border: `1px solid ${C.border}`, padding: '3px 10px', borderRadius: radius.full, fontFamily: font.family }}>No chronic conditions</span>
                  }
                  {p.allergies.length > 0 && p.allergies.map(a => (
                    <span key={a} style={{ fontSize: '11px', color: '#A83236', background: C.errorBg, border: '1px solid rgba(229,71,77,0.2)', padding: '3px 10px', borderRadius: radius.full, fontFamily: font.family }}>⚠ {a}</span>
                  ))}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: C.textSub }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </GGCard>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: C.textSub, fontFamily: font.family, fontSize: '14px' }}>No patients match your search.</div>
        )}
      </div>
    </SPLayout>
  )
}
