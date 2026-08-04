import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency } from '@/utils/format'
import { useHealthNews, useSPDashboard } from '@/hooks/api'
import { HealthNewsSection } from '@/components/HealthNewsSection'
import { FlagImg } from '@/components/FlagImg'
import { getCountryByName } from '@/config/countries'
import {
  SP_ONBOARDING_STEP_COUNT,
} from '@/store/auth.store'
import { useSpOnboardingProgress } from '@/hooks/useSpOnboardingProgress'
import { ROUTES } from '@/router/routes'

const SETUP_STEP_DEFS = [
  { n: 1, label: 'Create Account',           desc: 'Your provider account has been registered.',                          cta: null,                    ctaPath: null },
  { n: 2, label: 'Application Approved',   desc: 'GG\'APP admin verified your licence and activated your account.',       cta: null,                    ctaPath: null },
  { n: 3, label: 'Complete Practice Profile', desc: 'Add your facility details, services, and payout account.',             cta: 'Complete Profile →',    ctaPath: ROUTES.SP_SETTINGS },
  { n: 4, label: 'Receive First Appointment', desc: "Patients will find you on GG'APP and send booking requests.",         cta: 'View Appointments →',   ctaPath: ROUTES.SP_APPOINTMENTS },
  { n: 5, label: 'Upload First Invoice',     desc: 'After a visit, submit an invoice for patient authorization.',          cta: 'Upload Invoice →',      ctaPath: ROUTES.SP_INVOICE_UPLOAD },
] as const

export function SPNewDashboardScreen() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const { data: dashboard, isLoading } = useSPDashboard()
  const { data: healthNews } = useHealthNews()
  const {
    buildSetupSteps,
    onboardingComplete,
    profileSettingsTab,
    progress,
  } = useSpOnboardingProgress()

  const sp = dashboard?.sp
  const notifications = dashboard?.notifications ?? []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const unreadCount = notifications.filter(n => !n.read).length

  const setupSteps = buildSetupSteps(SETUP_STEP_DEFS)
  const doneCount = setupSteps.filter(step => step.status === 'done').length
  const profileStepDone = progress?.profileComplete ?? false

  const handleStepAction = (stepN: number, ctaPath: string | null) => {
    if (!ctaPath) return

    if (stepN === 3) {
      navigate(ROUTES.SP_SETTINGS, { state: { tab: profileSettingsTab } })
      return
    }

    navigate(ctaPath)
  }

  if (isLoading || !sp) {
    return (
      <SPLayout title="Dashboard" subtitle="Get started with GG'APP">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading provider dashboard...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const countryConfig = getCountryByName(sp?.country || '')
  const countryCode = countryConfig?.code ?? 'ZW'

  const stats = [
    { label: 'Total Earnings',  val: formatCurrency(sp.totalEarnings),  sub: 'All time', color: C.textLight },
    {
      label: 'This Month',
      val: formatCurrency(sp.monthlyEarnings),
      sub: sp.monthlyEarnings > 0 ? 'Authorized this month' : 'No earnings yet',
      color: C.textLight,
    },
    {
      label: 'Total Patients',
      val: sp.totalPatients.toString(),
      sub: sp.totalPatients > 0 ? 'Unique patients served' : 'No patients yet',
      color: C.textLight,
    },
  ]

  return (
    <SPLayout title="Dashboard" subtitle="Get started with GG'APP" notifCount={unreadCount}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>
                {greeting}, {sp.name}
              </div>
              <FlagImg code={countryCode} size={isMobile ? 18 : 20} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12)', borderRadius: '3px' }} />
            </div>
            <div style={{ fontSize: '14px', color: C.textSub, marginTop: '4px' }}>{today}</div>
          </div>
          <GGBadge type={onboardingComplete ? 'success' : 'info'}>
            {onboardingComplete ? 'Setup Complete' : 'Getting Started'}
          </GGBadge>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '12px' }}>
          {stats.map(s => (
            <div key={s.label} style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px dashed ${C.border}`, boxShadow: shadow.sm }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '12px', color: C.textLight, marginTop: '6px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Profile banner */}
        {!profileStepDone && progress && (
          <div style={{ padding: '18px 22px', background: `linear-gradient(90deg, ${C.blue100}, #F0F9FF)`, borderRadius: radius.lg, border: '1.5px solid rgba(56,182,255,0.35)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="#fff" strokeWidth="1.5"/><path d="M4 18c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: C.navy800, marginBottom: '2px' }}>Complete Your Practice Profile</div>
              <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5 }}>
                Still needed: {progress.profilePendingLabels.join(', ')}.
              </div>
            </div>
            <GGButton
              variant="primary"
              size="sm"
              onClick={() => navigate(ROUTES.SP_SETTINGS, { state: { tab: profileSettingsTab } })}
            >
              Complete Profile →
            </GGButton>
          </div>
        )}

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '3fr 2fr', gap: '20px' }}>
          {/* Empty appointments */}
          <GGCard padding="24px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '9px', background: 'rgba(74,173,223,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="2.5" width="14" height="12" rx="2" stroke={C.blue500} strokeWidth="1.4"/>
                    <path d="M1 6.5h14M5 1v3M11 1v3" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="8" cy="10.5" r="1.4" fill={C.blue500}/>
                  </svg>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Upcoming Appointments</div>
              </div>
              <span onClick={() => navigate('/sp/appointments')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '16px', margin: '0 auto 14px', background: 'linear-gradient(145deg, rgba(56,182,255,0.12), rgba(56,182,255,0.04))', border: '1px solid rgba(56,182,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><rect x="3" y="5" width="26" height="24" rx="4" stroke={C.blue500} strokeWidth="1.6"/><path d="M3 12h26M10 2v6M22 2v6" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>No appointments yet</div>
              <div style={{ fontSize: '13px', color: C.textSub, marginTop: '6px', lineHeight: 1.55, maxWidth: 280, marginInline: 'auto' }}>
                {onboardingComplete
                  ? 'Patients will send booking requests here once they find your practice on GG\'APP.'
                  : 'Complete your profile to appear in patient search results.'}
              </div>
            </div>
          </GGCard>

          {onboardingComplete ? (
            <GGCard padding="22px">
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Appointments', screen: '/sp/appointments' },
                  { label: 'Upload Invoice', screen: '/sp/invoices/upload' },
                  { label: 'Settings', screen: '/sp/settings' },
                ].map(action => (
                  <div key={action.label} onClick={() => navigate(action.screen)}
                    style={{ padding: '12px 14px', background: C.bg, borderRadius: radius.sm, cursor: 'pointer', border: `1px solid ${C.border}`, fontSize: '13px', fontWeight: 600, color: C.text, transition: 'all 0.13s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue500; e.currentTarget.style.background = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg }}>
                    {action.label}
                  </div>
                ))}
              </div>
            </GGCard>
          ) : (
            <GGCard padding="24px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>Getting Started</div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: C.blue500, background: 'rgba(56,182,255,0.1)', padding: '3px 10px', borderRadius: '20px' }}>
                  {doneCount}/{SP_ONBOARDING_STEP_COUNT} done
                </span>
              </div>
              <div style={{ height: '4px', background: 'rgba(9,28,68,0.07)', borderRadius: '2px', marginBottom: '22px', overflow: 'hidden' }}>
                <div style={{ width: `${(doneCount / SP_ONBOARDING_STEP_COUNT) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.navy800}, ${C.blue500})`, borderRadius: '2px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '16px', top: '17px', bottom: '17px', width: '2px', background: C.border, zIndex: 0 }} />
                {setupSteps.map((step, i) => {
                  const isLast = i === setupSteps.length - 1
                  const isAction = step.status === 'action'
                  const nodeBg = step.status === 'done' ? C.navy800 : step.status === 'action' ? '#F59E0B' : step.status === 'next' ? C.blue500 : 'transparent'
                  const nodeBorder = step.status === 'pending' ? `2px solid ${C.border}` : 'none'
                  return (
                    <div key={step.n} style={{ display: 'flex', gap: '14px', paddingTop: i === 0 ? '0' : '12px', position: 'relative' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: nodeBg, border: nodeBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                        {step.status === 'done' && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        {(step.status === 'next' || step.status === 'pending') && <span style={{ fontSize: '12px', fontWeight: 800, color: step.status === 'next' ? '#fff' : C.textLight }}>{step.n}</span>}
                        {step.status === 'action' && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.5 5.2H13L9.6 7.6 11 12 7 9.4 3 12l1.4-4.4L1 5.2h4.5z" fill="rgba(255,255,255,0.3)" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/></svg>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: '4px', paddingBottom: isLast ? '0' : '12px', borderBottom: isLast ? 'none' : `1px solid ${C.border}`, paddingLeft: isAction ? '10px' : '0', background: isAction ? 'rgba(245,158,11,0.06)' : 'transparent', borderLeft: isAction ? '3px solid #F59E0B' : 'none', borderRadius: isAction ? `0 ${radius.sm} ${radius.sm} 0` : '0' }}>
                        <div style={{ fontSize: '13px', fontWeight: step.status === 'pending' ? 500 : 700, color: step.status === 'pending' ? C.textLight : C.text }}>{step.label}</div>
                        <div style={{ fontSize: '11px', color: isAction ? '#92400E' : C.textSub, lineHeight: 1.5, marginTop: '3px', opacity: step.status === 'pending' ? 0.5 : 1 }}>{step.desc}</div>
                        {step.cta && step.status !== 'pending' && step.status !== 'done' && (
                          <span onClick={() => handleStepAction(step.n, step.ctaPath)} style={{ display: 'inline-flex', fontSize: '12px', fontWeight: 700, color: isAction ? '#D97706' : C.blue500, cursor: 'pointer', marginTop: '6px' }}>
                            {step.cta}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </GGCard>
          )}
        </div>

        {/* Empty payments */}
        <GGCard padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>Recent Payments</div>
            <span onClick={() => navigate('/sp/payments')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
          </div>
          <div style={{ padding: '36px 22px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: C.textSub }}>No payments yet</div>
            <div style={{ fontSize: '12px', color: C.textLight, marginTop: '5px' }}>Payments appear here after patients authorize your invoices.</div>
          </div>
        </GGCard>

        <HealthNewsSection articles={healthNews} />
      </div>
    </SPLayout>
  )
}
