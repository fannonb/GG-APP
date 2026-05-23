import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatDateShort } from '@/utils/format'
import { MOCK_NEWS } from '@/mock/patient.mock'

const ONBOARDING_STEPS = [
  { n: 1, title: 'Create Account',          status: 'completed' as const, desc: 'Personal details, email and password registered.',                                       cta: null,           ctaScreen: null },
  { n: 2, title: 'Verify Email',            status: 'completed' as const, desc: 'Your email address has been confirmed.',                                                  cta: null,           ctaScreen: null },
  { n: 3, title: 'Set Payment PIN',         status: 'action'    as const, desc: 'Create a 4–6 digit PIN used to authorise every payment. Required before you can pay any invoice.', cta: 'Set Up PIN →',  ctaScreen: null },
  { n: 4, title: 'Apply for Credit',        status: 'next'      as const, desc: 'Submit your credit application so the finance partner can load funds to your wallet.',     cta: 'Apply Now →',  ctaScreen: '/app/credit/disclaimer' },
  { n: 5, title: 'Find a Provider',         status: 'upcoming'  as const, desc: 'Browse verified pharmacies, doctors, labs, hospitals and clinics near you.',              cta: 'Browse →',     ctaScreen: '/app/services' },
  { n: 6, title: 'Authorise First Payment', status: 'upcoming'  as const, desc: 'Once your provider submits an invoice, review it and confirm payment with your PIN.',    cta: null,           ctaScreen: null },
]

const STATUS_STYLES = {
  completed: { bg: C.successBg, border: 'rgba(34,201,138,0.25)', text: '#0D7A52', tag: 'COMPLETED',  tagColor: C.success   },
  action:    { bg: C.warningBg, border: 'rgba(245,166,35,0.3)',  text: '#8A4D00', tag: 'ACTION',     tagColor: C.warning   },
  next:      { bg: C.blue100,   border: 'rgba(74,173,223,0.25)', text: C.navy800, tag: 'UP NEXT',    tagColor: C.blue500   },
  upcoming:  { bg: C.bg,        border: C.border,                text: C.textSub, tag: 'UPCOMING',   tagColor: C.textLight },
}

export function NewUserDashboardScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()

  const completedCount = ONBOARDING_STEPS.filter(s => s.status === 'completed').length
  const totalSteps     = ONBOARDING_STEPS.length
  const pct            = Math.round((completedCount / totalSteps) * 100)
  const today          = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // action step is shown as dominant banner — exclude from grid
  const gridSteps = ONBOARDING_STEPS.filter(s => s.status !== 'action')

  return (
    <AppLayout title="Dashboard" subtitle="Get started with GG'APP" notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Hero banner */}
        <div style={{ background: 'linear-gradient(135deg, #091F40 0%, #0D3270 45%, #1059B0 80%, #1A7BD4 100%)', borderRadius: '16px', padding: isMobile ? '24px 20px' : '32px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', right: -80, top: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: -10, top: -10, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: -50, bottom: -70, width: 280, height: 280, borderRadius: '50%', background: 'rgba(74,173,223,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '42%', top: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
          {/* Shine */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 55%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            {/* Left: greeting + badges */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: font.family }}>Welcome to GG'APP</div>
              <div style={{ fontSize: isMobile ? '26px' : '34px', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.2)', fontFamily: font.family }}>Hello, James!</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', marginTop: '8px', fontFamily: font.family }}>{today} · Account activated</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                {[
                  { label: 'New Account',    color: C.blue500,  check: false },
                  { label: 'Email Verified', color: '#22C98A',  check: true  },
                ].map(b => (
                  <div key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
                    {b.check && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#22C98A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    <span style={{ fontSize: '11px', fontWeight: 700, color: b.color, letterSpacing: '0.04em', fontFamily: font.family }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: progress */}
            <div style={{ textAlign: 'right', minWidth: 160 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: font.family }}>Onboarding Progress</div>
              <div style={{ fontSize: '52px', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, fontFamily: font.family }}>
                <span style={{ color: '#fff' }}>{pct}</span>
                <span style={{ fontSize: '28px', color: 'rgba(255,255,255,0.75)' }}>%</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '6px', fontFamily: font.family }}>{completedCount} of {totalSteps} steps complete</div>
              <div style={{ marginTop: '12px', width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginLeft: 'auto', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #4AADDF, #22C98A)', borderRadius: '3px', boxShadow: '0 0 8px rgba(74,173,223,0.6)', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* PIN action banner — dominant, full width */}
        <div style={{ padding: '18px 22px', background: `linear-gradient(90deg, ${C.warningBg}, #FFFAE8)`, borderRadius: radius.lg, border: `1.5px solid rgba(245,166,35,0.35)`, display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 10px rgba(245,166,35,0.12)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(245,166,35,0.35)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#fff" strokeWidth="1.5"/><line x1="10" y1="6" x2="10" y2="11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/><circle cx="10" cy="14" r="1" fill="#fff"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#8A4D00', marginBottom: '2px' }}>Action Required: Set Payment PIN</div>
            <div style={{ fontSize: '13px', color: '#8A4D00', lineHeight: 1.5 }}>Create a 4–6 digit PIN before you can authorise any healthcare payments.</div>
          </div>
          <GGButton variant="warning" size="sm" style={{ background: C.warning, color: '#fff', boxShadow: '0 2px 8px rgba(245,166,35,0.3)', flexShrink: 0 }}>Set Up PIN →</GGButton>
        </div>

        {/* Onboarding journey grid — 5 remaining steps (action step excluded) */}
        <GGCard padding="28px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Your Onboarding Journey</div>
            <GGBadge type="info">{completedCount}/{totalSteps} complete</GGBadge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '12px' }}>
            {gridSteps.map(step => {
              const sc = STATUS_STYLES[step.status]
              return (
                <div key={step.n} style={{ padding: '16px', borderRadius: radius.sm, background: sc.bg, border: `1.5px solid ${sc.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.status === 'completed' ? C.success : step.status === 'next' ? C.blue500 : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {step.status === 'completed'
                        ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l3 3 4-4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <span style={{ fontSize: '11px', fontWeight: 700, color: step.status === 'next' ? '#fff' : 'rgba(255,255,255,0.7)' }}>{step.n}</span>}
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: sc.tagColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{sc.tag}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: sc.text, marginBottom: '6px' }}>{step.title}</div>
                  <div style={{ fontSize: '12px', color: step.status === 'upcoming' ? C.textLight : sc.text, lineHeight: 1.5, marginBottom: step.cta ? '10px' : 0, opacity: step.status === 'upcoming' ? 0.75 : 1 }}>{step.desc}</div>
                  {step.cta && (
                    <span onClick={() => step.ctaScreen ? navigate(step.ctaScreen) : undefined}
                      style={{ fontSize: '13px', fontWeight: 700, color: C.blue500, cursor: 'pointer' }}>
                      {step.cta}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </GGCard>

        {/* Credit wallet (not applied) + What is GG'APP */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
          {/* Credit wallet — 1 ring */}
          <div style={{ background: 'linear-gradient(135deg, #091F40 0%, #0D3270 45%, #1059B0 80%, #1A7BD4 100%)', borderRadius: '14px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -40, bottom: -40, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 20, top: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>Credit Wallet</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: C.blue500, letterSpacing: '-0.04em', marginBottom: '8px' }}>Not yet applied</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '18px' }}>Apply for healthcare credit to start accessing services at zero upfront cost.</div>
              {['Funds loaded instantly on approval', 'Use only with verified providers', 'Managed by CapiMed Financial Services'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={C.blue500} strokeWidth="1.1"/><path d="M4.5 7l2 2 3-3" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{f}</span>
                </div>
              ))}
              <div style={{ marginTop: '20px' }}>
                <GGButton variant="primary" size="sm" onClick={() => navigate('/app/credit/disclaimer')}>Apply for Credit →</GGButton>
              </div>
            </div>
          </div>

          <GGCard padding="28px">
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '10px' }}>What is GG'APP?</div>
            <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.7, marginBottom: '18px' }}>
              GG'APP connects you with verified healthcare providers and funds your care through an approved credit facility — so you get treatment today, without worrying about upfront costs.
            </div>
            {[
              { title: 'No Upfront Cost',    desc: "Your approved credit covers the cost — the finance partner manages your account directly.", color: C.blue500 },
              { title: 'Verified Providers', desc: "Every hospital, clinic and pharmacy is vetted and approved by GG'APP admin.",               color: C.success  },
              { title: 'Secure Payments',    desc: 'Triple-PIN authorization and HMAC-SHA256 signing protect every transaction.',               color: C.blue500  },
            ].map(f => (
              <div key={f.title} style={{ padding: '12px 14px', borderRadius: radius.sm, border: `1px solid ${C.border}`, borderLeft: `3px solid ${f.color}`, marginBottom: '10px', background: C.bg }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>{f.title}</div>
                <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </GGCard>
        </div>

        {/* Health News */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>Health News</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: C.blue500, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: font.family }}>Live</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: C.blue500, cursor: 'pointer', fontFamily: font.family }}>See all →</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            {/* Featured dark card */}
            <div style={{ background: C.navy800, borderRadius: '12px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 172, cursor: 'pointer' }}>
              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(74,173,223,0.5)', background: 'rgba(74,173,223,0.12)' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: C.blue500, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: font.family }}>{MOCK_NEWS[0].tag}</span>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.45, marginTop: '18px', marginBottom: '14px', fontFamily: font.family }}>{MOCK_NEWS[0].title}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', fontFamily: font.family }}>{MOCK_NEWS[0].source} · {formatDateShort(MOCK_NEWS[0].date)}</div>
              </div>
            </div>
            {/* 2 stacked cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {MOCK_NEWS.slice(1).map(item => (
                <div key={item.id} style={{ padding: '16px 18px', background: '#fff', borderRadius: '12px', border: `1px solid ${C.border}`, cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px', transition: 'box-shadow 0.14s' }}
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
                    <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>{item.source} · {formatDateShort(item.date)}</span>
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
