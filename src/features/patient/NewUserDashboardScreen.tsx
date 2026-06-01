import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatDate } from '@/utils/format'
import { MOCK_NEWS, MOCK_USER } from '@/mock/patient.mock'
import { getCountryByCode } from '@/config/countries'
import { FlagImg } from '@/components/FlagImg'
import type { NewsItem } from '@/types/user.types'

// ─── Service categories ───────────────────────────────────────────────────────
const categories = [
  { id: 'pharmacy',           label: 'Pharmacy',           nearby: 8,  isComingSoon: false },
  { id: 'laboratory',         label: 'Laboratory',         nearby: 5,  isComingSoon: false },
  { id: 'doctor',             label: 'Doctor',             nearby: 12, isComingSoon: false },
  { id: 'radiology',          label: 'Radiology',          nearby: 3,  isComingSoon: false },
  { id: 'hospital',           label: 'Hospital',           nearby: 4,  isComingSoon: false },
  { id: 'clinic',             label: 'Clinic',             nearby: 7,  isComingSoon: false },
  { id: 'global_specialists', label: 'Global Specialists', nearby: 0,  isComingSoon: true  },
]

const catIcons: Record<string, React.ReactNode> = {
  pharmacy:           <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/><line x1="13" y1="8" x2="13" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  laboratory:         <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M10 4v9L5 20a2 2 0 001.8 2.9h12.4A2 2 0 0021 20l-5-7V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  doctor:             <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M5 22c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="18" r="3" fill="white" stroke="currentColor" strokeWidth="1.5"/><path d="M18 16.5v1.5h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  radiology:          <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M13 8v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="13" r="1.5" fill="currentColor"/></svg>,
  hospital:           <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="6" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 22V14h6v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="10" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 12h18" stroke="currentColor" strokeWidth="1.5"/></svg>,
  clinic:             <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M13 4L5 9v13h5v-5h6v5h5V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="9" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10.5" y1="11.5" x2="15.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  global_specialists: <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><path d="M16 5a15 15 0 000 22M5 16h22M8 10a18 18 0 0016 0M8 22a18 18 0 0016 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
}

// ─── Onboarding steps ─────────────────────────────────────────────────────────
const SETUP_STEPS = [
  { n: 1, label: 'Create Account',         desc: 'Personal details, email and password registered.',             status: 'done'    as const, cta: null,               ctaPath: null },
  { n: 2, label: 'Verify Email',           desc: 'Your email address has been confirmed.',                       status: 'done'    as const, cta: null,               ctaPath: null },
  { n: 3, label: 'Set Payment PIN',        desc: 'A 4–6 digit PIN required before you can authorise payments.',  status: 'action'  as const, cta: 'Set Up PIN →',     ctaPath: null },
  { n: 4, label: 'Apply for Credit',       desc: 'Submit your application so funds can be loaded to your wallet.', status: 'next'  as const, cta: 'Apply Now →',      ctaPath: '/app/credit/disclaimer' },
  { n: 5, label: 'Book First Appointment', desc: 'Find a verified provider near you and book your first visit.', status: 'pending' as const, cta: 'Browse Providers →', ctaPath: '/app/services' },
]

// ─── News modal ───────────────────────────────────────────────────────────────
function NewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const { isMobile } = useResponsive()
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,21,40,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px' : '32px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(8,21,40,0.25)' }}>
        <div style={{ background: C.navy800, padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(74,173,223,0.06)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '20px', background: 'rgba(74,173,223,0.15)', border: '1px solid rgba(74,173,223,0.4)', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: C.blue500, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: font.family }}>{item.tag}</span>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: '#fff', lineHeight: 1.35, letterSpacing: '-0.03em', fontFamily: font.family }}>{item.title}</div>
        </div>
        <div style={{ padding: '14px 28px', background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', background: C.navy800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={C.blue500} strokeWidth="1.3"/><path d="M7 4v3.5l2 1.5" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family, marginBottom: '2px' }}>Source</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{item.source}</div>
            <div style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family, marginTop: '1px' }}>{formatDate(item.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: C.navy800, border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family, textDecoration: 'none', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Visit Source
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 9.5L9.5 1.5M9.5 1.5H4M9.5 1.5V7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          )}
        </div>
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {item.body.split('\n\n').map((para, i) => (
            <p key={i} style={{ fontSize: '14px', color: C.text, lineHeight: 1.75, marginBottom: i < item.body.split('\n\n').length - 1 ? '16px' : 0, fontFamily: font.family }}>{para}</p>
          ))}
        </div>
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: radius.sm, background: C.navy800, border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NewUserDashboardScreen() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const u = MOCK_USER
  const country = getCountryByCode(u.countryCode)

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const doneCount = SETUP_STEPS.filter(s => s.status === 'done').length

  return (
    <AppLayout title="Dashboard" subtitle="Get started with GG'APP" notifCount={1}>
      {selectedNews && <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* ── 1. Greeting ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>
                {greeting}, {u.name.split(' ')[0]}!
              </div>
              {country && (
                <FlagImg
                  code={country.code}
                  size={isMobile ? 18 : 20}
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12)', borderRadius: '3px' }}
                />
              )}
            </div>
            <div style={{ fontSize: '14px', color: C.textSub, marginTop: '4px' }}>{today}</div>
          </div>
          <GGBadge type="info">Getting Started</GGBadge>
        </div>

        {/* ── 2. Stat tiles ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '12px' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px dashed ${C.border}`, boxShadow: shadow.sm, gridColumn: isMobile ? 'span 2' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Available Balance</div>
              {country && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '1px 6px', borderRadius: '20px', background: C.bg, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                  <FlagImg code={country.code} size={12} />
                  <span style={{ fontSize: '9px', fontWeight: 700, color: C.textSub, fontFamily: font.family }}>{country.currencyCode}</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: C.textLight, letterSpacing: '-0.03em', lineHeight: 1 }}>Not Applied</div>
            <div style={{ marginTop: '8px' }}>
              <span onClick={() => navigate('/app/credit/disclaimer')} style={{ fontSize: '12px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>Apply for credit →</span>
            </div>
          </div>
          <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px dashed ${C.border}`, boxShadow: shadow.sm }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Spent This Month</div>
            <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 800, color: C.textLight, letterSpacing: '-0.04em', lineHeight: 1 }}>—</div>
            <div style={{ fontSize: '12px', color: C.textLight, marginTop: '6px' }}>No transactions yet</div>
          </div>
          <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px dashed ${C.border}`, boxShadow: shadow.sm }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Next Appointment</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: C.textLight, letterSpacing: '-0.03em', lineHeight: 1 }}>None booked</div>
            <div style={{ marginTop: '8px' }}>
              <span onClick={() => navigate('/app/services')} style={{ fontSize: '12px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>Find a service →</span>
            </div>
          </div>
        </div>

        {/* ── 3. Action banner — Set Payment PIN ───────────────────────────── */}
        <div style={{ padding: '18px 22px', background: `linear-gradient(90deg, ${C.warningBg}, #FFFAE8)`, borderRadius: radius.lg, border: '1.5px solid rgba(245,166,35,0.35)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 10px rgba(245,166,35,0.12)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(245,166,35,0.35)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="9" width="14" height="9" rx="2" stroke="#fff" strokeWidth="1.5"/>
              <path d="M7 9V6a3 3 0 016 0v3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="10" cy="13.5" r="1.2" fill="#fff"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#8A4D00', marginBottom: '2px' }}>Action Required: Set Your Payment PIN</div>
            <div style={{ fontSize: '13px', color: '#8A4D00', lineHeight: 1.5 }}>Create a 4–6 digit PIN — required before you can authorise any healthcare payment.</div>
          </div>
          <GGButton variant="warning" size="sm" style={{ background: '#F59E0B', color: '#fff', boxShadow: '0 2px 8px rgba(245,166,35,0.3)', flexShrink: 0 }}>
            Set Up PIN →
          </GGButton>
        </div>

        {/* ── 4. Service grid + Getting Started stepper ────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: '20px' }}>

          {/* Service grid */}
          <GGCard padding="22px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Find a Service</div>
              <span onClick={() => navigate('/app/services')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>See all →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '12px' }}>
              {categories.map(cat => {
                if (cat.isComingSoon) {
                  return (
                    <div key={cat.id} onClick={() => navigate('/app/services')}
                      style={{ gridColumn: isMobile ? 'span 2' : 'span 3', padding: '12px 18px', borderRadius: radius.sm, background: C.bg, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'all 0.18s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = shadow.sm }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '8px', background: 'rgba(153,157,173,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textLight }}>{catIcons[cat.id]}</div>
                        <div><div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{cat.label}</div><div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px' }}>International tertiary care & medical tourism</div></div>
                      </div>
                      <span style={{ display: 'inline-flex', fontSize: '10px', padding: '3px 8px', fontWeight: 600, borderRadius: radius.full, background: 'rgba(153,157,173,0.12)', color: C.textLight, whiteSpace: 'nowrap' }}>Coming Soon</span>
                    </div>
                  )
                }
                return (
                  <div key={cat.id} onClick={() => navigate(`/app/services/${cat.id}`)}
                    style={{ padding: '18px 12px', borderRadius: radius.sm, background: C.bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.18s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = shadow.sm }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(56,182,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue500 }}>{catIcons[cat.id]}</div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.text, textAlign: 'center' }}>{cat.label}</span>
                    <span style={{ fontSize: '11px', color: C.textSub }}>{cat.nearby} nearby</span>
                  </div>
                )
              })}
            </div>
          </GGCard>

          {/* Getting Started — vertical stepper */}
          <GGCard padding="24px">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Getting Started</div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: C.blue500, background: 'rgba(56,182,255,0.1)', padding: '3px 10px', borderRadius: '20px' }}>
                {doneCount}/{SETUP_STEPS.length} done
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '4px', background: 'rgba(9,28,68,0.07)', borderRadius: '2px', marginBottom: '22px', overflow: 'hidden' }}>
              <div style={{ width: `${(doneCount / SETUP_STEPS.length) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.navy800}, ${C.blue500})`, borderRadius: '2px', transition: 'width 0.5s ease' }} />
            </div>

            {/* Steps */}
            <div style={{ position: 'relative' }}>
              {/* Vertical connecting track */}
              <div style={{ position: 'absolute', left: '16px', top: '17px', bottom: '17px', width: '2px', background: C.border, zIndex: 0 }} />

              {SETUP_STEPS.map((step, i) => {
                const isLast = i === SETUP_STEPS.length - 1
                const isAction = step.status === 'action'
                const nodeBg =
                  step.status === 'done'    ? C.navy800 :
                  step.status === 'action'  ? '#F59E0B'  :
                  step.status === 'next'    ? C.blue500  : 'transparent'
                const nodeBorder = step.status === 'pending' ? `2px solid ${C.border}` : 'none'
                const nodeShadow =
                  step.status === 'action' ? '0 3px 12px rgba(245,158,11,0.35)' :
                  step.status === 'next'   ? '0 2px 10px rgba(56,182,255,0.25)' :
                  step.status === 'done'   ? '0 2px 8px rgba(9,28,68,0.15)' : 'none'

                return (
                  <div key={step.n} style={{ display: 'flex', gap: '14px', paddingTop: i === 0 ? '0' : '12px', paddingBottom: isLast ? '0' : '0', position: 'relative' }}>
                    {/* Circle node */}
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: nodeBg, border: nodeBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1, boxShadow: nodeShadow, marginTop: i === 0 ? '0' : '0' }}>
                      {step.status === 'done' && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {step.status === 'action' && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1L8.5 5.2H13L9.6 7.6 11 12 7 9.4 3 12l1.4-4.4L1 5.2h4.5z" fill="rgba(255,255,255,0.3)" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {(step.status === 'next' || step.status === 'pending') && (
                        <span style={{ fontSize: '12px', fontWeight: 800, color: step.status === 'next' ? '#fff' : C.textLight }}>{step.n}</span>
                      )}
                    </div>

                    {/* Content — action step gets amber accent panel */}
                    <div style={{
                      flex: 1, minWidth: 0,
                      paddingTop: '4px',
                      paddingBottom: isLast ? '0' : '12px',
                      paddingLeft: isAction ? '10px' : '0',
                      paddingRight: isAction ? '10px' : '0',
                      marginLeft: isAction ? '-4px' : '0',
                      marginRight: isAction ? '-4px' : '0',
                      background: isAction ? 'rgba(245,158,11,0.06)' : 'transparent',
                      borderLeft: isAction ? '3px solid #F59E0B' : 'none',
                      borderRadius: isAction ? `0 ${radius.sm} ${radius.sm} 0` : '0',
                      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: step.status === 'pending' ? 500 : 700, color: step.status === 'pending' ? C.textLight : C.text, letterSpacing: '-0.01em' }}>
                          {step.label}
                        </span>
                        {step.status === 'done' && (
                          <span style={{ fontSize: '9px', fontWeight: 800, color: C.navy800, background: 'rgba(9,28,68,0.07)', padding: '1px 7px', borderRadius: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Done</span>
                        )}
                        {step.status === 'action' && (
                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#B45309', background: 'rgba(245,158,11,0.12)', padding: '1px 7px', borderRadius: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Required</span>
                        )}
                        {step.status === 'next' && (
                          <span style={{ fontSize: '9px', fontWeight: 800, color: C.blue500, background: 'rgba(56,182,255,0.1)', padding: '1px 7px', borderRadius: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Up Next</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: isAction ? '#92400E' : C.textSub, lineHeight: 1.5, opacity: step.status === 'pending' ? 0.5 : 1 }}>
                        {step.desc}
                      </div>
                      {step.cta && step.status !== 'pending' && (
                        <span
                          onClick={() => step.ctaPath ? navigate(step.ctaPath) : undefined}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: isAction ? '#D97706' : C.blue500, cursor: 'pointer', marginTop: '6px' }}>
                          {step.cta}
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </GGCard>
        </div>

        {/* ── 5. Health News ─────────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Health News</div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: C.blue500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live Feed</span>
          </div>
          <div className={(isMobile || isTablet) ? 'hide-scrollbar' : undefined}
            style={(isMobile || isTablet)
              ? { display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }
              : { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {MOCK_NEWS.map((item, index) => {
              const itemStyles = [
                { cardBg: `linear-gradient(135deg, ${C.navy800} 0%, #152B55 100%)`, textColor: '#FFFFFF', arrowColor: C.blue300, borderColor: 'rgba(255,255,255,0.08)', dividerColor: 'rgba(255,255,255,0.08)', hoverBorder: C.blue500, hoverShadow: '0 12px 28px rgba(56,182,255,0.15)', labelColor: 'rgba(255,255,255,0.4)', badgeFill: 'rgba(56,182,255,0.18)', tagColor: C.blue300 },
                { cardBg: 'linear-gradient(135deg, #EBF8FF 0%, #FFFFFF 100%)', textColor: C.navy800, arrowColor: C.blue500, borderColor: 'rgba(56,182,255,0.15)', dividerColor: 'rgba(56,182,255,0.12)', hoverBorder: C.blue500, hoverShadow: '0 12px 28px rgba(56,182,255,0.12)', labelColor: C.textLight, badgeFill: 'rgba(56,182,255,0.08)', tagColor: '#0369A1' },
                { cardBg: '#FFFFFF', textColor: C.navy800, arrowColor: C.navy800, borderColor: C.border, dividerColor: 'rgba(9,28,68,0.08)', hoverBorder: C.navy800, hoverShadow: '0 12px 28px rgba(9,28,68,0.10)', labelColor: C.textLight, badgeFill: 'rgba(9,28,68,0.05)', tagColor: C.navy800 },
              ]
              const cfg = itemStyles[index] || itemStyles[2]
              return (
                <div key={item.id} onClick={() => setSelectedNews(item)}
                  style={{ background: cfg.cardBg, borderRadius: '16px', border: `1px solid ${cfg.borderColor}`, padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '210px', boxShadow: '0 4px 12px rgba(9,28,68,0.01)', transition: 'all 0.18s ease-in-out', ...(isMobile || isTablet ? { flexShrink: 0, width: isMobile ? 'calc(85vw - 32px)' : 'calc(60vw - 32px)', scrollSnapAlign: 'start' } : {}), position: 'relative' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = cfg.hoverShadow; e.currentTarget.style.borderColor = cfg.hoverBorder }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(9,28,68,0.01)'; e.currentTarget.style.borderColor = cfg.borderColor }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.65 }}>
                      <path d="M2 12L12 2M12 2H5M12 2v7" stroke={cfg.arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: cfg.textColor, lineHeight: 1.45, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '16px' }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: `1px dashed ${cfg.dividerColor}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '9px', fontWeight: 700, color: cfg.labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' }}>Verified Source</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: cfg.textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source}</div>
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: cfg.tagColor, background: cfg.badgeFill, padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace', flexShrink: 0 }}>
                      {formatDate(item.date, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
