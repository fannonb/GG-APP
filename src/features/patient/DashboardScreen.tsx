import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_USER, MOCK_TRANSACTIONS, MOCK_NEWS } from '@/mock/patient.mock'
import { useAuthStore } from '@/store/auth.store'
import { NewUserDashboardScreen } from './NewUserDashboardScreen'
import type { NewsItem } from '@/types/user.types'

const categories = [
  { id: 'pharmacy',   label: 'Pharmacy',   nearby: 8  },
  { id: 'laboratory', label: 'Laboratory', nearby: 5  },
  { id: 'doctor',     label: 'Doctor',     nearby: 12 },
  { id: 'radiology',  label: 'Radiology',  nearby: 3  },
  { id: 'hospital',   label: 'Hospital',   nearby: 4  },
  { id: 'clinic',     label: 'Clinic',     nearby: 7  },
]

const catIcons: Record<string, React.ReactNode> = {
  pharmacy:   <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/><line x1="13" y1="8" x2="13" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  laboratory: <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M10 4v9L5 20a2 2 0 001.8 2.9h12.4A2 2 0 0021 20l-5-7V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  doctor:     <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M5 22c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="18" r="3" fill="white" stroke="currentColor" strokeWidth="1.5"/><path d="M18 16.5v1.5h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  radiology:  <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M13 8v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="13" r="1.5" fill="currentColor"/></svg>,
  hospital:   <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="6" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 22V14h6v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="10" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 12h18" stroke="currentColor" strokeWidth="1.5"/></svg>,
  clinic:     <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M13 4L5 9v13h5v-5h6v5h5V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="9" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10.5" y1="11.5" x2="15.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
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
  const { isMobile } = useResponsive()
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)

  if (userMode === 'new') return <NewUserDashboardScreen />

  const u = MOCK_USER
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
            <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>
              Good morning, {u.name.split(' ')[0]}
            </div>
            <div style={{ fontSize: '14px', color: C.textSub, marginTop: '4px' }}>{today}</div>
          </div>
          <GGBadge type="success">Credit Active</GGBadge>
        </div>

        {/* 3 stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: '14px' }}>
          {[
            { label: 'Available Credit', val: formatCurrency(u.creditAvailable), sub: `of ${formatCurrency(u.creditLimit)} limit`, color: C.blue500, bg: C.blue100 },
            { label: 'Spent This Month', val: formatCurrency(spentThisMonth),    sub: `${MOCK_TRANSACTIONS.filter(t => new Date(t.date).getMonth() === new Date().getMonth()).length} transactions`, color: C.success, bg: C.successBg },
            { label: 'Beneficiaries',    val: '3',                               sub: 'Registered on account', color: C.warning, bg: C.warningBg },
          ].map(tile => (
            <div key={tile.label} style={{ padding: '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}`, boxShadow: shadow.sm }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>{tile.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: tile.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{tile.val}</div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '6px' }}>{tile.sub}</div>
            </div>
          ))}
        </div>

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {categories.map(cat => (
                <div key={cat.id} onClick={() => navigate('/app/services')}
                  style={{ padding: '14px 8px', borderRadius: radius.sm, background: C.bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = shadow.md }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  <span style={{ color: C.navy800 }}>{catIcons[cat.id]}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: C.text, textAlign: 'center' }}>{cat.label}</span>
                  <span style={{ fontSize: '11px', color: C.textSub }}>{cat.nearby} nearby</span>
                </div>
              ))}
            </div>
          </GGCard>

          {/* Slim transactions */}
          <GGCard padding="22px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Recent Transactions</div>
              <span onClick={() => navigate('/app/transactions')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {MOCK_TRANSACTIONS.slice(0, 5).map((tx, i) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke={C.success} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.provider}</div>
                    <div style={{ fontSize: '11px', color: C.textSub }}>{formatDate(tx.date, { month: 'short', day: 'numeric' })}</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, flexShrink: 0 }}>-{formatCurrency(tx.amount)}</div>
                </div>
              ))}
            </div>
          </GGCard>
        </div>

        {/* Health News */}
        <div>
          {/* Section header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>Health News</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: C.blue500, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: font.family }}>Live</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: C.blue500, cursor: 'pointer', fontFamily: font.family }}>See all →</span>
            </div>
          </div>

          {/* Two-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            {/* Featured dark card */}
            <div onClick={() => setSelectedNews(MOCK_NEWS[0])} style={{ background: C.navy800, borderRadius: '12px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 172, cursor: 'pointer', transition: 'opacity 0.14s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(74,173,223,0.5)', background: 'rgba(74,173,223,0.12)' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: C.blue500, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: font.family }}>{MOCK_NEWS[0].tag}</span>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.45, marginTop: '18px', marginBottom: '14px', fontFamily: font.family }}>{MOCK_NEWS[0].title}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', fontFamily: font.family }}>{MOCK_NEWS[0].source} · {formatDate(MOCK_NEWS[0].date, { month: 'short', day: 'numeric' })}</div>
              </div>
            </div>

            {/* 2 stacked cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {MOCK_NEWS.slice(1).map(item => (
                <div key={item.id} onClick={() => setSelectedNews(item)} style={{ padding: '16px 18px', background: '#fff', borderRadius: '12px', border: `1px solid ${C.border}`, cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px', transition: 'box-shadow 0.14s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(74,173,223,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, lineHeight: 1.45, fontFamily: font.family }}>{item.title}</div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <path d="M2 12L12 2M12 2H5M12 2v7" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '20px', background: C.blue100 }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: C.blue500, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font.family }}>{item.tag}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>{item.source} · {formatDate(item.date, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
