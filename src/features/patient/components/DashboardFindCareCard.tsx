import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'

const categories = [
  { id: 'pharmacy',           label: 'Pharmacy'           },
  { id: 'laboratory',         label: 'Laboratory'         },
  { id: 'doctor',             label: 'Doctor'             },
  { id: 'radiology',          label: 'Radiology'          },
  { id: 'hospital',           label: 'Hospital'           },
  { id: 'clinic',             label: 'Clinic'             },
]

const catIcons: Record<string, React.ReactNode> = {
  pharmacy:   <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><rect x="4" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/><line x1="13" y1="8" x2="13" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  laboratory: <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><path d="M10 4v9L5 20a2 2 0 001.8 2.9h12.4A2 2 0 0021 20l-5-7V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  doctor:     <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M5 22c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="18" r="3" fill="white" stroke="currentColor" strokeWidth="1.5"/><path d="M18 16.5v1.5h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  radiology:  <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M13 8v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="13" r="1.5" fill="currentColor"/></svg>,
  hospital:   <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><rect x="4" y="6" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 22V14h6v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="10" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 12h18" stroke="currentColor" strokeWidth="1.5"/></svg>,
  clinic:     <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><path d="M13 4L5 9v13h5v-5h6v5h5V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="9" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10.5" y1="11.5" x2="15.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
}

export function DashboardFindCareCard() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()

  return (
    <GGCard padding={isMobile ? '16px' : '20px 22px'} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.01em', fontFamily: font.family }}>Find care</div>
          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>Verified providers near you</div>
        </div>
        <button type="button" onClick={() => navigate(ROUTES.FIND_SERVICE)} style={{ all: 'unset', fontSize: '13px', color: '#0B7BC0', fontWeight: 700, cursor: 'pointer', fontFamily: font.family, marginTop: 2 }}>See all →</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', flex: 1 }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => navigate(`/app/services/${cat.id}`)}
            style={{
              padding: '14px 6px',
              borderRadius: radius.md,
              background: '#F3F8FD',
              border: '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.16s ease, border-color 0.16s ease',
              fontFamily: font.family,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = C.blue100
              e.currentTarget.style.borderColor = 'rgba(56,182,255,0.35)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#F3F8FD'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', color: '#0B7BC0', boxShadow: '0 2px 8px rgba(11,123,192,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{catIcons[cat.id]}</div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: C.text, textAlign: 'center', letterSpacing: 0, fontFamily: font.family }}>{cat.label}</span>
          </button>
        ))}
      </div>
    </GGCard>
  )
}
