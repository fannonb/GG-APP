import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGBadge, StarRating } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { MOCK_PROVIDERS } from '@/mock/patient.mock'

const categories = [
  { id: 'doctor',     label: 'Doctor',     desc: 'General & specialist consultations',   count: 12, color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="1.8"/><path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="22" cy="22" r="4" fill="white" stroke="currentColor" strokeWidth="1.5"/><path d="M22 20.5v1.5h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  { id: 'pharmacy',   label: 'Pharmacy',   desc: 'Prescriptions & medications',           count: 8,  color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="5" y="5" width="22" height="22" rx="5" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="9" x2="16" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="9" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg> },
  { id: 'laboratory', label: 'Laboratory', desc: 'Blood tests, pathology & diagnostics',  count: 5,  color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M12 4v12L6 24a3 3 0 002.7 4.3h14.6A3 3 0 0026 24l-6-8V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'radiology',  label: 'Radiology',  desc: 'X-Ray, MRI, CT Scan & ultrasound',     count: 3,  color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.25"/><line x1="16" y1="5" x2="16" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="16" y1="23" x2="16" y2="27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="5" y1="16" x2="9" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="23" y1="16" x2="27" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'hospital',   label: 'Hospital',   desc: 'Emergency, surgery & inpatient care',   count: 4,  color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="8" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M12 28V18h8v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="16" y1="12" x2="16" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="13" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M4 16h24" stroke="currentColor" strokeWidth="1.8"/></svg> },
  { id: 'clinic',     label: 'Clinic',     desc: 'General practice & wellness checks',    count: 7,  color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4L5 11v17h7V20h8v8h7V11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="16" y1="11" x2="16" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="13" y1="14" x2="19" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'global_specialists', label: 'Global Medical Specialist Centers', desc: 'International tertiary care & medical tourism', count: 0, color: 'rgba(153, 157, 173, 0.08)', accent: C.textLight, shadow: 'rgba(9, 28, 68, 0.08)', isComingSoon: true,
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><path d="M16 5a15 15 0 000 22M5 16h22M8 10a18 18 0 0016 0M8 22a18 18 0 0016 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
]

export function FindServiceScreen() {
  const navigate = useNavigate()
  const [hoveredCat, setHoveredCat] = useState<string | null>(null)
  const { isMobile } = useResponsive()

  return (
    <AppLayout title="Find a Service" subtitle="Browse GG'APP-verified healthcare providers near you" notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>

        {/* Search bar */}
        <GGCard padding="18px 22px" style={{ background: 'linear-gradient(135deg, #091F40 0%, #0E3575 100%)', border: 'none', boxShadow: '0 8px 30px rgba(9, 28, 68, 0.15)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <div 
              style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                background: 'rgba(255,255,255,0.08)', 
                border: `1.5px solid rgba(255,255,255,0.15)`, 
                borderRadius: radius.sm, 
                padding: '10px 16px',
                transition: 'all 0.2s ease',
                cursor: 'text'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.13)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4"/><line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" strokeLinecap="round"/></svg>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontFamily: font.family }}>Search providers, services, locations…</span>
            </div>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '10px 16px', 
                background: 'rgba(255,255,255,0.08)', 
                border: `1.5px solid rgba(255,255,255,0.15)`, 
                borderRadius: radius.sm, 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.13)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.3"/><circle cx="7" cy="7" r="2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.3"/></svg>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontFamily: font.family, fontWeight: 500 }}>Harare, ZW</span>
            </div>
          </div>
        </GGCard>

        {/* Category grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '4px', height: '16px', background: C.blue500, borderRadius: '2px' }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Select a Category</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '16px' }}>
            {categories.map(cat => {
              const isHovered = hoveredCat === cat.id
              const isDisabled = cat.isComingSoon
              const restingBg = `linear-gradient(135deg, #ffffff 0%, ${cat.accent}03 100%)`
              const hoverBg = `linear-gradient(135deg, #ffffff 0%, ${cat.accent}12 100%)`
              const restingBorder = `1.5px solid ${cat.accent}20`
              const hoverBorder = `1.5px solid ${cat.accent}`

              return (
                <GGCard key={cat.id} 
                  onClick={() => !isDisabled ? navigate(`/app/services/${cat.id}`) : undefined} 
                  onMouseEnter={() => setHoveredCat(cat.id)}
                  onMouseLeave={() => setHoveredCat(null)}
                  padding="24px" 
                  style={{ 
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.85 : 1,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: isHovered && !isDisabled ? hoverBorder : restingBorder,
                    boxShadow: isHovered && !isDisabled ? `0 8px 24px ${cat.shadow}` : shadow.sm,
                    transform: isHovered && !isDisabled ? 'translateY(-4px)' : 'none',
                    background: isHovered && !isDisabled ? hoverBg : restingBg
                  }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ 
                      width: 60, 
                      height: 60, 
                      borderRadius: '16px', 
                      background: cat.color, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: cat.accent,
                      transform: isHovered && !isDisabled ? 'scale(1.06)' : 'none',
                      transition: 'transform 0.22s ease'
                    }}>
                      {cat.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{cat.label}</div>
                      <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px', lineHeight: 1.4 }}>{cat.desc}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {isDisabled ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          fontSize: '11px',
                          padding: '3px 9px',
                          fontFamily: font.family,
                          fontWeight: 600,
                          borderRadius: radius.full,
                          background: 'rgba(180, 140, 10, 0.08)',
                          color: '#B4900A',
                          letterSpacing: '0.01em',
                          whiteSpace: 'nowrap'
                        }}>
                          Coming Soon
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: cat.accent, fontWeight: 700 }}>{cat.count} providers</span>
                      )}
                      {!isDisabled && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </div>
                  </div>
                </GGCard>
              )
            })}
          </div>
        </div>

        {/* Nearby verified */}
        <GGCard padding="22px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '4px', height: '16px', background: C.blue500, borderRadius: '2px' }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Nearby Verified Providers</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {MOCK_PROVIDERS.slice(0, 3).map((p, i) => (
              <div key={p.id}
                onClick={() => navigate(`/app/services/provider/${p.id}`, { state: { provider: p } })}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '14px', 
                  padding: '12px 14px', 
                  margin: '0 -14px', 
                  borderBottom: i < 2 ? `1px solid ${C.border}` : 'none', 
                  borderLeft: '3px solid transparent',
                  cursor: 'pointer', 
                  borderRadius: `0 ${radius.sm} ${radius.sm} 0`, 
                  transition: 'all 0.18s ease' 
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(56, 182, 255, 0.05)'
                  e.currentTarget.style.borderLeftColor = C.blue500
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderLeftColor = 'transparent'
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{p.name[0]}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', textTransform: 'capitalize' }}>{p.category} · {p.distance}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <StarRating rating={p.rating} />
                  <GGBadge type={p.status === 'open' ? 'open' : 'closed'}>{p.status}</GGBadge>
                </div>
              </div>
            ))}
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
