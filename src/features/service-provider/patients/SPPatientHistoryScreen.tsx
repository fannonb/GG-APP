import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGAvatar, GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useSPPatients } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { route } from '@/router/routes'
import { formatCurrency, formatDate } from '@/utils/format'

type SortMode = 'lastVisit' | 'billedHigh' | 'visitsHigh' | 'nameAsc'

export function SPPatientHistoryScreen() {
  const navigate = useNavigate()
  const { data: patients = [], isLoading } = useSPPatients()
  const { isMobile } = useResponsive()

  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('lastVisit')

  // KPI Calculations
  const stats = useMemo(() => {
    const totalPatients = patients.length
    const totalVisits = patients.reduce((acc, p) => acc + (p.visits || 0), 0)
    const totalBilled = patients.reduce((acc, p) => acc + (p.totalSpent || 0), 0)
    const activeCare = patients.filter(
      p => (p.conditions && p.conditions.length > 0) || (p.allergies && p.allergies.length > 0)
    ).length
    return { totalPatients, totalVisits, totalBilled, activeCare }
  }, [patients])

  // Filtered & Sorted Patients
  const filteredPatients = useMemo(() => {
    const result = patients.filter(patient => {
      const q = search.toLowerCase().trim()
      if (!q) return true

      const nameMatch = patient.name.toLowerCase().includes(q)
      const phoneMatch = patient.phone?.toLowerCase().includes(q)
      const emailMatch = patient.email?.toLowerCase().includes(q)

      return nameMatch || phoneMatch || emailMatch
    })

    return result.sort((a, b) => {
      if (sortMode === 'lastVisit') {
        return new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime()
      }
      if (sortMode === 'billedHigh') {
        return (b.totalSpent || 0) - (a.totalSpent || 0)
      }
      if (sortMode === 'visitsHigh') {
        return (b.visits || 0) - (a.visits || 0)
      }
      if (sortMode === 'nameAsc') {
        return a.name.localeCompare(b.name)
      }
      return 0
    })
  }, [patients, search, sortMode])

  if (isLoading) {
    return (
      <SPLayout title="Patient Records">
        <GGCard padding="32px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke={C.border} strokeWidth="3" />
              <path d="M12 2A10 10 0 0 1 22 12" stroke={C.blue500} strokeWidth="3" strokeLinecap="round" />
            </svg>
            Loading patient records...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  return (
    <SPLayout title="Patient Records">
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '20px' }}>
        
        {/* KPI Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: isMobile ? '10px' : '14px',
          }}
        >
          {/* KPI 1 - Total Patients */}
          <div
            style={{
              background: '#fff',
              borderRadius: radius.md,
              padding: isMobile ? '14px 14px' : '18px 20px',
              border: `1.5px solid ${C.border}`,
              boxShadow: '0 2px 10px rgba(9,28,68,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '10px' : '14px',
            }}
          >
            <div style={{ width: isMobile ? 38 : 46, height: isMobile ? 38 : 46, borderRadius: radius.md, background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.navy800, flexShrink: 0 }}>
              <svg width={isMobile ? '18' : '22'} height={isMobile ? '18' : '22'} viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Total Patients
              </div>
              <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: C.navy800, fontFamily: font.family, marginTop: '2px', letterSpacing: '-0.02em' }}>
                {stats.totalPatients}
              </div>
            </div>
          </div>

          {/* KPI 2 - Total Encounters */}
          <div
            style={{
              background: '#fff',
              borderRadius: radius.md,
              padding: isMobile ? '14px 14px' : '18px 20px',
              border: `1.5px solid ${C.border}`,
              boxShadow: '0 2px 10px rgba(9,28,68,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '10px' : '14px',
            }}
          >
            <div style={{ width: isMobile ? 38 : 46, height: isMobile ? 38 : 46, borderRadius: radius.md, background: 'rgba(56, 182, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue500, flexShrink: 0 }}>
              <svg width={isMobile ? '18' : '22'} height={isMobile ? '18' : '22'} viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Total Encounters
              </div>
              <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: C.navy800, fontFamily: font.family, marginTop: '2px', letterSpacing: '-0.02em' }}>
                {stats.totalVisits} <span style={{ fontSize: '11px', fontWeight: 500, color: C.textSub }}>visits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar (Search & Sort) */}
        <div style={{ background: '#fff', padding: isMobile ? '12px 14px' : '16px 20px', borderRadius: radius.md, border: `1.5px solid ${C.border}`, boxShadow: '0 2px 8px rgba(9,28,68,0.03)' }}>
          <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <svg width="16" height="16" viewBox="0 0 15 15" fill="none" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="6.5" cy="6.5" r="4.5" stroke={C.textSub} strokeWidth="1.4" />
                <path d="M10 10l3 3" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search patient records by name, phone..."
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 38px',
                  fontSize: '13px',
                  fontFamily: font.family,
                  color: C.navy800,
                  background: C.bg,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: radius.sm,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: C.textSub,
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
              <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, fontWeight: 600 }}>Sort:</span>
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontFamily: font.family,
                  fontWeight: 700,
                  color: C.navy800,
                  background: C.bg,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: radius.sm,
                  outline: 'none',
                  cursor: 'pointer',
                  flex: isMobile ? 1 : 'none',
                }}
              >
                <option value="lastVisit">Recent Visit</option>
                <option value="billedHigh">Billed (High to Low)</option>
                <option value="visitsHigh">Most Visits</option>
                <option value="nameAsc">Name (A–Z)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Content Section: List Layout */}
        {filteredPatients.length === 0 ? (
          <GGCard padding="36px">
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: C.navy800 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>
                {patients.length === 0 ? 'No patient records found.' : 'No patients match your search criteria.'}
              </div>
              <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family, marginTop: '6px', maxWidth: '400px', margin: '6px auto 16px' }}>
                Try adjusting your search terms to find the patient record.
              </div>
              {search && (
                <GGButton variant="secondary" size="sm" onClick={() => setSearch('')}>
                  Clear Search
                </GGButton>
              )}
            </div>
          </GGCard>
        ) : isMobile ? (
          
          /* MOBILE RESPONSIVE PATIENT LIST */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredPatients.map(patient => {
              const hasGender = patient.gender && patient.gender !== 'Not specified' && patient.gender !== 'Unknown'
              const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : null
              const hasAge = age !== null && !isNaN(age) && age > 0
              const demoStr = [hasGender ? patient.gender : null, hasAge ? `${age} yrs` : null].filter(Boolean).join(', ') || ''

              return (
                <div
                  key={patient.id}
                  onClick={() => navigate(route.spPatient(patient.id), { state: { patient } })}
                  style={{
                    background: '#fff',
                    borderRadius: radius.md,
                    border: `1.5px solid ${C.border}`,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 8px rgba(9,28,68,0.03)',
                    cursor: 'pointer',
                  }}
                >
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <GGAvatar name={patient.name} size={38} />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>
                          {patient.name}
                        </div>
                        <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, marginTop: '1px' }}>
                          {demoStr} {patient.phone ? `· ${patient.phone}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Bar */}
                  <div style={{ background: C.blue100, borderRadius: radius.sm, padding: '8px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', border: `1px solid rgba(56, 182, 255, 0.25)` }}>
                    <div>
                      <div style={{ fontSize: '9px', color: C.textSub, fontFamily: font.family, textTransform: 'uppercase', fontWeight: 700 }}>
                        Visits
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: C.navy800, fontFamily: font.family, marginTop: '1px' }}>
                        {patient.visits}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: C.textSub, fontFamily: font.family, textTransform: 'uppercase', fontWeight: 700 }}>
                        Last Visit
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: C.navy800, fontFamily: font.family, marginTop: '1px' }}>
                        {formatDate(patient.lastVisit)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: C.textSub, fontFamily: font.family, textTransform: 'uppercase', fontWeight: 700 }}>
                        Billed
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: C.navy800, fontFamily: font.family, marginTop: '1px' }}>
                        {formatCurrency(patient.totalSpent)}
                      </div>
                    </div>
                  </div>

                  {/* View Ledger Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(route.spPatient(patient.id), { state: { patient } })
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: radius.sm,
                      border: 'none',
                      background: C.blue500,
                      color: C.navy800,
                      fontSize: '12px',
                      fontWeight: 800,
                      fontFamily: font.family,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 8px rgba(56, 182, 255, 0.25)',
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
                    View Ledger
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                </div>
              )
            })}
          </div>
        ) : (
          
          /* DESKTOP / TABLET CLEAN LIST TABLE */
          <div style={{ background: '#fff', borderRadius: radius.md, border: `1.5px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 10px rgba(9,28,68,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: font.family }}>
              <thead>
                <tr style={{ background: C.navy800, color: '#fff', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 18px' }}>Patient Name</th>
                  <th style={{ padding: '14px 14px' }}>Demographics</th>
                  <th style={{ padding: '14px 14px' }}>Visits</th>
                  <th style={{ padding: '14px 14px' }}>Last Visit</th>
                  <th style={{ padding: '14px 14px' }}>Total Billed</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient, index) => {
                  const hasGender = patient.gender && patient.gender !== 'Not specified' && patient.gender !== 'Unknown'
                  const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : null
                  const hasAge = age !== null && !isNaN(age) && age > 0
                  const demoStr = [hasGender ? patient.gender : null, hasAge ? `${age} yrs` : null].filter(Boolean).join(', ') || '—'

                  return (
                    <tr
                      key={patient.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: index % 2 === 0 ? '#fff' : C.bg,
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.blue100)}
                      onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : C.bg)}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <GGAvatar name={patient.name} size={38} />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800 }}>
                              {patient.name}
                            </div>
                            {patient.phone && (
                              <div style={{ fontSize: '11px', color: C.textSub }}>
                                {patient.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 14px', fontSize: '13px', color: C.navy800 }}>
                        {demoStr}
                      </td>

                      <td style={{ padding: '14px 14px', fontSize: '13px', fontWeight: 700, color: C.navy800 }}>
                        {patient.visits} visits
                      </td>

                      <td style={{ padding: '14px 14px', fontSize: '13px', color: C.navy800 }}>
                        {formatDate(patient.lastVisit)}
                      </td>

                      <td style={{ padding: '14px 14px', fontSize: '14px', fontWeight: 800, color: C.navy800 }}>
                        {formatCurrency(patient.totalSpent)}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => navigate(route.spPatient(patient.id), { state: { patient } })}
                          style={{
                            padding: '7px 16px',
                            borderRadius: radius.sm,
                            border: 'none',
                            background: C.blue500,
                            color: C.navy800,
                            fontSize: '12px',
                            fontWeight: 800,
                            fontFamily: font.family,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 2px 8px rgba(56, 182, 255, 0.25)',
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
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </SPLayout>
  )
}
