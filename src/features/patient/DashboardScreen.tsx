import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate, formatTime12h } from '@/utils/format'
import { MOCK_USER, MOCK_TRANSACTIONS, MOCK_NEWS, MOCK_APPOINTMENTS } from '@/mock/patient.mock'
import { useAuthStore } from '@/store/auth.store'
import { getCountryByCode } from '@/config/countries'
import { FlagImg } from '@/components/FlagImg'
import { NewUserDashboardScreen } from './NewUserDashboardScreen'
import type { NewsItem } from '@/types/user.types'

const categories = [
  { id: 'pharmacy',   label: 'Pharmacy',   nearby: 8  },
  { id: 'laboratory', label: 'Laboratory', nearby: 5  },
  { id: 'doctor',     label: 'Doctor',     nearby: 12 },
  { id: 'radiology',  label: 'Radiology',  nearby: 3  },
  { id: 'hospital',   label: 'Hospital',   nearby: 4  },
  { id: 'clinic',     label: 'Clinic',     nearby: 7  },
  { id: 'global_specialists', label: 'Global Specialists', nearby: 0, isComingSoon: true },
]

const catIcons: Record<string, React.ReactNode> = {
  pharmacy:   <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/><line x1="13" y1="8" x2="13" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  laboratory: <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M10 4v9L5 20a2 2 0 001.8 2.9h12.4A2 2 0 0021 20l-5-7V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  doctor:     <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M5 22c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="18" r="3" fill="white" stroke="currentColor" strokeWidth="1.5"/><path d="M18 16.5v1.5h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  radiology:  <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M13 8v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="13" r="1.5" fill="currentColor"/></svg>,
  hospital:   <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="6" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 22V14h6v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="10" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 12h18" stroke="currentColor" strokeWidth="1.5"/></svg>,
  clinic:     <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M13 4L5 9v13h5v-5h6v5h5V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="9" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10.5" y1="11.5" x2="15.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  global_specialists: <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><path d="M16 5a15 15 0 000 22M5 16h22M8 10a18 18 0 0016 0M8 22a18 18 0 0016 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
}

function NewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const { isMobile } = useResponsive()
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,21,40,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px' : '32px' }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(8,21,40,0.25)' }}>
        {/* Modal header */}
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

        {/* Source bar */}
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
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: C.navy800, border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family, textDecoration: 'none', flexShrink: 0, transition: 'opacity 0.14s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Visit Source
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 9.5L9.5 1.5M9.5 1.5H4M9.5 1.5V7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {item.body.split('\n\n').map((para, i) => (
            <p key={i} style={{ fontSize: '14px', color: C.text, lineHeight: 1.75, marginBottom: i < item.body.split('\n\n').length - 1 ? '16px' : 0, fontFamily: font.family }}>{para}</p>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: radius.sm, background: C.navy800, border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}>Close</button>
        </div>
      </div>
    </div>
  )
}

export function DashboardScreen() {
  const { userMode } = useAuthStore()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)

  if (userMode === 'new') return <NewUserDashboardScreen />

  const u = MOCK_USER
  const country = getCountryByCode(u.countryCode)
  const currency = country?.currencySymbol ?? 'Z$'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const spentThisMonth = MOCK_TRANSACTIONS
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((s, t) => s + t.amount, 0)

  return (
    <AppLayout title="Dashboard" subtitle="Your healthcare overview" notifCount={3}>
      {selectedNews && <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Greeting */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>
                Good morning, {u.name.split(' ')[0]}
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
          <GGBadge type="success">Balance Active</GGBadge>
        </div>

        {/* 3 stat tiles */}
        {(() => {
          const nextApt = MOCK_APPOINTMENTS.find(a => a.status !== 'cancelled')
          const nextAptDate = nextApt ? new Date(nextApt.date) : null
          const nextAptLabel = nextAptDate
            ? nextAptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + formatTime12h(nextApt!.time)
            : 'No upcoming'
          const nextAptSub = nextApt ? nextApt.provider : 'Book via Find Service'
          return (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '12px' }}>
              {/* Available Balance */}
              <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}`, boxShadow: shadow.sm, gridColumn: isMobile ? 'span 2' : 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Available Balance</div>
                  {country && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '1px 6px', borderRadius: '20px', background: C.bg, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                      <FlagImg code={country.code} size={12} />
                      <span style={{ fontSize: '9px', fontWeight: 700, color: C.textSub, fontFamily: font.family }}>{country.currencyCode}</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 800, color: C.blue500, letterSpacing: '-0.04em', lineHeight: 1 }}>{formatCurrency(u.creditAvailable, currency)}</div>
                <div style={{ fontSize: isMobile ? '11px' : '12px', color: C.textSub, marginTop: '6px' }}>of {formatCurrency(u.creditLimit, currency)} limit</div>
              </div>

              {/* Spent This Month */}
              <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}`, boxShadow: shadow.sm }}>
                <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Spent This Month</div>
                <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 800, color: C.success, letterSpacing: '-0.04em', lineHeight: 1 }}>{formatCurrency(spentThisMonth, currency)}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <div style={{ fontSize: isMobile ? '11px' : '12px', color: C.textSub }}>{MOCK_TRANSACTIONS.filter(t => new Date(t.date).getMonth() === new Date().getMonth()).length} transactions</div>
                  <span onClick={() => navigate('/app/transactions')} style={{ fontSize: '11px', color: C.blue500, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>History →</span>
                </div>
              </div>

              {/* Next Appointment */}
              <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}`, boxShadow: shadow.sm, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Next Appointment</div>
                  {nextApt && (
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', color: nextApt.status === 'confirmed' ? C.success : C.warning, background: nextApt.status === 'confirmed' ? C.successBg : C.warningBg }}>
                      {nextApt.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{nextAptLabel}</div>
                <div style={{ fontSize: isMobile ? '11px' : '12px', color: C.textSub, marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextAptSub}</div>
              </div>
            </div>
          )
        })()}

        {/* Pending action banner */}
        <div style={{ padding: '18px 22px', background: `linear-gradient(90deg, ${C.warningBg}, #FFFAE8)`, borderRadius: radius.lg, border: `1.5px solid rgba(245,166,35,0.35)`, display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 10px rgba(245,166,35,0.12)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(245,166,35,0.35)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#fff" strokeWidth="1.5"/><line x1="10" y1="6" x2="10" y2="11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/><circle cx="10" cy="14" r="1" fill="#fff"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#8A4D00', marginBottom: '2px' }}>Invoice Pending Authorization</div>
            <div style={{ fontSize: '13px', color: '#8A4D00', lineHeight: 1.5 }}>
              <strong>INV-2026-0842</strong> · City Medical Centre · {formatCurrency(450)} awaiting your approval
            </div>
          </div>
          <GGButton variant="warning" size="sm" onClick={() => navigate('/app/invoices/INV-2026-0842')} style={{ background: C.warning, color: '#fff', boxShadow: '0 2px 8px rgba(245,166,35,0.3)', flexShrink: 0 }}>
            Review & Authorize →
          </GGButton>
        </div>

        {/* Find a Service (60%) + Recent Transactions (40%) */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: '20px' }}>

          {/* Service grid */}
          <GGCard padding="22px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Find a Service</div>
              <span onClick={() => navigate('/app/services')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>See all →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '12px' }}>
              {categories.map(cat => {
                if (cat.id === 'global_specialists') {
                  return (
                    <div key={cat.id} onClick={() => navigate('/app/services')}
                      style={{ 
                        gridColumn: isMobile ? 'span 2' : 'span 3',
                        padding: '12px 18px', 
                        borderRadius: radius.sm, 
                        background: C.bg, 
                        border: 'none',
                        cursor: 'pointer', 
                        display: 'flex', 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '12px', 
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={e => { 
                        e.currentTarget.style.transform = 'translateY(-1px)'; 
                        e.currentTarget.style.boxShadow = shadow.sm;
                      }}
                      onMouseLeave={e => { 
                        e.currentTarget.style.transform = 'none'; 
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '38px', 
                          height: '38px', 
                          borderRadius: '8px', 
                          background: 'rgba(153, 157, 173, 0.12)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: C.textLight 
                        }}>
                          {catIcons[cat.id]}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{cat.label}</div>
                          <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px' }}>International tertiary care & medical tourism</div>
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '10px',
                        padding: '3px 8px',
                        fontFamily: font.family,
                        fontWeight: 600,
                        borderRadius: radius.full,
                        background: 'rgba(153, 157, 173, 0.12)',
                        color: C.textLight,
                        letterSpacing: '0.01em',
                        whiteSpace: 'nowrap'
                      }}>
                        Coming Soon
                      </span>
                    </div>
                  )
                }

                return (
                  <div key={cat.id} onClick={() => navigate(`/app/services/${cat.id}`)}
                    style={{ 
                      padding: '18px 12px', 
                      borderRadius: radius.sm, 
                      background: C.bg, 
                      border: 'none',
                      cursor: 'pointer', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '8px', 
                      transition: 'all 0.18s ease',
                      boxShadow: 'none'
                    }}
                    onMouseEnter={e => { 
                      e.currentTarget.style.transform = 'translateY(-2px)'; 
                      e.currentTarget.style.boxShadow = shadow.sm;
                    }}
                    onMouseLeave={e => { 
                      e.currentTarget.style.transform = 'none'; 
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                    <div style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '10px', 
                      background: 'rgba(56, 182, 255, 0.08)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: C.blue500,
                      marginBottom: '2px',
                      transition: 'transform 0.18s ease'
                    }}>
                      {catIcons[cat.id]}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.text, textAlign: 'center', letterSpacing: '-0.01em' }}>{cat.label}</span>
                    <span style={{ fontSize: '11px', color: C.textSub }}>{cat.nearby} nearby</span>
                  </div>
                )
              })}
            </div>
          </GGCard>

          {/* Upcoming Appointments */}
          <GGCard padding="24px">
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '9px', background: 'rgba(74,173,223,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="2.5" width="14" height="12" rx="2" stroke={C.blue500} strokeWidth="1.4"/>
                    <path d="M1 6.5h14M5 1v3M11 1v3" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="8" cy="10.5" r="1.4" fill={C.blue500}/>
                  </svg>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Appointments</div>
              </div>
              <span onClick={() => navigate('/app/appointments')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>View all →</span>
            </div>

            {MOCK_APPOINTMENTS.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <svg width="36" height="36" viewBox="0 0 32 32" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}><rect x="3" y="5" width="26" height="24" rx="4" stroke={C.border} strokeWidth="1.6"/><path d="M3 12h26M10 2v6M22 2v6" stroke={C.border} strokeWidth="1.6" strokeLinecap="round"/></svg>
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.textSub }}>No upcoming appointments</div>
                <div style={{ fontSize: '12px', color: C.textLight, marginTop: '5px' }}>Book via Find Service</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {MOCK_APPOINTMENTS.map((apt, i) => {
                  const aptDate = new Date(apt.date)
                  const dayNum = aptDate.getDate()
                  const monthStr = aptDate.toLocaleDateString('en-US', { month: 'short' })
                  const isConfirmed = apt.status === 'confirmed'
                  const isBeneficiary = apt.for !== u.name
                  return (
                    <div
                      key={apt.id}
                      style={{ display: 'flex', gap: '14px', padding: '16px 0', borderBottom: i < MOCK_APPOINTMENTS.length - 1 ? `1px solid ${C.border}` : 'none' }}
                    >
                      {/* Date badge — prominent */}
                      <div style={{
                        width: 54, minWidth: 54, height: 62,
                        borderRadius: '14px',
                        background: isConfirmed
                          ? `linear-gradient(145deg, rgba(74,173,223,0.18), rgba(74,173,223,0.08))`
                          : `linear-gradient(145deg, rgba(245,166,35,0.18), rgba(245,166,35,0.08))`,
                        border: `1.5px solid ${isConfirmed ? 'rgba(74,173,223,0.3)' : 'rgba(245,166,35,0.3)'}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: isConfirmed ? '0 2px 8px rgba(74,173,223,0.12)' : '0 2px 8px rgba(245,166,35,0.12)',
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: isConfirmed ? C.blue500 : C.warning, lineHeight: 1, letterSpacing: '-0.04em' }}>{dayNum}</div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: isConfirmed ? C.blue500 : C.warning, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px', opacity: 0.85 }}>{monthStr}</div>
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{apt.provider}</div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke={C.textSub} strokeWidth="1.2"/><path d="M6 3.5v2.5l1.5 1.5" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/></svg>
                          <span style={{ fontSize: '12px', color: C.textSub, fontWeight: 500 }}>{formatTime12h(apt.time)}</span>
                          <span style={{ fontSize: '12px', color: C.border }}>·</span>
                          <span style={{ fontSize: '12px', color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.service}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {isBeneficiary && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', background: 'rgba(74,173,223,0.08)', border: '1px solid rgba(74,173,223,0.2)', flexShrink: 0 }}>
                              <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="3.5" r="2" stroke={C.blue500} strokeWidth="1.2"/><path d="M1 9.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/></svg>
                              <span style={{ fontSize: '11px', color: C.blue500, fontWeight: 600 }}>{apt.for}</span>
                            </div>
                          )}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: isConfirmed ? C.successBg : C.warningBg, border: `1px solid ${isConfirmed ? 'rgba(16,185,129,0.25)' : 'rgba(245,166,35,0.25)'}` }}>
                            {isConfirmed
                              ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke={C.success} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke={C.warning} strokeWidth="1.2"/><path d="M5 3v2.5" stroke={C.warning} strokeWidth="1.4" strokeLinecap="round"/><circle cx="5" cy="7" r="0.6" fill={C.warning}/></svg>
                            }
                            <span style={{ fontSize: '11px', fontWeight: 700, color: isConfirmed ? C.success : C.warning }}>
                              {isConfirmed ? 'Confirmed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </GGCard>
        </div>

        {/* Health News */}
        <div>
          {/* Section header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>Health News</div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: C.blue500, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: font.family }}>Live Feed</span>
          </div>

          {/* Three-column card grid / carousel on mobile+tablet */}
          <div
            className={(isMobile || isTablet) ? 'hide-scrollbar' : undefined}
            style={
              (isMobile || isTablet)
                ? {
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '16px',
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: '8px',
                  }
                : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }
            }>
            {MOCK_NEWS.map((item, index) => {
              // Custom styled brand presets.
              // To establish asymmetrical premium editorial rhythm:
              // Index 0: Dark featured brand-colored card (Navy/Blue)
              // Index 1: Soft warm, energetic green card
              // Index 2: Light crisp brand-blue gradient card
              
              const itemStyles = [
                // 1. Dark Navy Featured Card
                {
                  cardBg: `linear-gradient(135deg, ${C.navy800} 0%, #152B55 100%)`,
                  textColor: '#FFFFFF',
                  arrowColor: C.blue300,
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  dividerColor: 'rgba(255, 255, 255, 0.08)',
                  hoverBorder: C.blue500,
                  hoverShadow: '0 12px 28px rgba(56, 182, 255, 0.15)',
                  labelColor: 'rgba(255, 255, 255, 0.4)',
                  badgeFill: 'rgba(56, 182, 255, 0.18)',
                  tagColor: C.blue300,
                },
                // 2. Light Blue Tinted Card
                {
                  cardBg: 'linear-gradient(135deg, #EBF8FF 0%, #FFFFFF 100%)',
                  textColor: C.navy800,
                  arrowColor: C.blue500,
                  borderColor: 'rgba(56, 182, 255, 0.15)',
                  dividerColor: 'rgba(56, 182, 255, 0.12)',
                  hoverBorder: C.blue500,
                  hoverShadow: '0 12px 28px rgba(56, 182, 255, 0.12)',
                  labelColor: C.textLight,
                  badgeFill: 'rgba(56, 182, 255, 0.08)',
                  tagColor: '#0369A1',
                },
                // 3. Clean White with Navy Accent Card
                {
                  cardBg: '#FFFFFF',
                  textColor: C.navy800,
                  arrowColor: C.navy800,
                  borderColor: C.border,
                  dividerColor: 'rgba(9, 28, 68, 0.08)',
                  hoverBorder: C.navy800,
                  hoverShadow: '0 12px 28px rgba(9, 28, 68, 0.10)',
                  labelColor: C.textLight,
                  badgeFill: 'rgba(9, 28, 68, 0.05)',
                  tagColor: C.navy800,
                },
              ]

              const cfg = itemStyles[index] || itemStyles[2]

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedNews(item)}
                  style={{
                    background: cfg.cardBg,
                    borderRadius: '16px',
                    border: `1px solid ${cfg.borderColor}`,
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '210px',
                    boxShadow: '0 4px 12px rgba(9, 28, 68, 0.01)',
                    transition: 'all 0.18s ease-in-out',
                    ...(isMobile || isTablet ? {
                      flexShrink: 0,
                      width: isMobile ? 'calc(85vw - 32px)' : 'calc(60vw - 32px)',
                      scrollSnapAlign: 'start',
                    } : {}),
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = cfg.hoverShadow
                    e.currentTarget.style.borderColor = cfg.hoverBorder
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(9, 28, 68, 0.01)'
                    e.currentTarget.style.borderColor = cfg.borderColor
                  }}
                >
                  {/* Link arrow */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transition: 'transform 0.18s', opacity: 0.65 }}>
                      <path d="M2 12L12 2M12 2H5M12 2v7" stroke={cfg.arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* Middle: Title */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: cfg.textColor,
                    lineHeight: 1.45,
                    fontFamily: font.family,
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: '16px'
                  }}>
                    {item.title}
                  </div>

                  {/* Bottom: Publisher Metadata Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: `1px dashed ${cfg.dividerColor}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: cfg.labelColor,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginBottom: '2px'
                      }}>
                        Verified Source
                      </div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: cfg.textColor,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        opacity: index === 0 ? 0.95 : 1
                      }}>
                        {item.source}
                      </div>
                    </div>

                    {/* Date capsule aligned right */}
                    <div style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: cfg.tagColor,
                      background: cfg.badgeFill,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      flexShrink: 0
                    }}>
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
