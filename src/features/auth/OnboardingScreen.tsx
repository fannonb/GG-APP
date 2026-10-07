import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { ROUTES } from '@/router/routes'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { IOSInstallSheet } from '@/components/InstallApp'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'
const MARK_LIGHT = '/gg-mark-light.png'

const s = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const HOW_IT_WORKS: Array<{ title: string; desc: string; icon: ReactNode }> = [
  {
    title: 'Apply for healthcare credit',
    desc: 'Reviewed by our licensed finance partner.',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="11" rx="2" {...s} /><path d="M2.5 8h15M6 12.5h3" {...s} /></svg>,
  },
  {
    title: 'Book a verified provider',
    desc: 'Hospitals, clinics, pharmacies, labs and radiology.',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2.5l6 2.4v4.4c0 3.8-2.6 6.6-6 7.7-3.4-1.1-6-3.9-6-7.7V4.9l6-2.4z" {...s} /><path d="M7.3 9.8l1.9 1.9 3.6-3.7" {...s} /></svg>,
  },
  {
    title: 'Approve the bill with your PIN',
    desc: 'Nothing is paid without your say-so.',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="8.5" width="12" height="8.5" rx="2" {...s} /><path d="M7 8.5V6a3 3 0 016 0v2.5" {...s} /></svg>,
  },
]

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: 52,
  border: 'none',
  borderRadius: radius.sm,
  background: `linear-gradient(135deg, ${CYAN_MID}, ${CYAN_DEEP})`,
  boxShadow: '0 8px 20px rgba(11,123,192,0.25)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
}

const textBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 12,
  fontSize: 15,
  fontWeight: 600,
  color: C.textSub,
  cursor: 'pointer',
  fontFamily: font.family,
}

export function OnboardingScreen() {
  const navigate = useNavigate()
  const install = useInstallPrompt()
  const [step, setStep] = useState(0)
  const [showIOS, setShowIOS] = useState(false)

  // The install step only appears where installing is actually possible.
  const steps = install.canInstall ? ['welcome', 'how', 'install'] as const : ['welcome', 'how', 'done'] as const
  const current = steps[step]
  const finish = () => navigate(ROUTES.DASHBOARD, { replace: true })
  const next = () => (step < steps.length - 1 ? setStep(step + 1) : finish())

  const startInstall = async () => {
    if (install.mode === 'ios') { setShowIOS(true); return }
    await install.install()
    finish()
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'radial-gradient(ellipse 90% 60% at 50% 0%, #FFFFFF 0%, #EAF5FD 70%, #DDEFFB 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'calc(20px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
        fontFamily: font.family,
      }}
    >
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        <div aria-label={`Step ${step + 1} of ${steps.length}`} style={{ display: 'flex', gap: 6 }}>
          {steps.map((id, i) => (
            <span key={id} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, background: i <= step ? CYAN_DEEP : '#C9DBEA', transition: 'all 0.25s' }} />
          ))}
        </div>
        {step < steps.length - 1 && <button type="button" onClick={finish} style={textBtn}>Skip</button>}
      </div>

      <div style={{ flex: 1, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, padding: '24px 0' }}>
        {current === 'welcome' && (
          <div style={{ textAlign: 'center' }}>
            <img src={MARK_LIGHT} alt="" aria-hidden style={{ width: 104, height: 'auto' }} />
            <h1 style={{ margin: '28px 0 10px', fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>Your email is confirmed</h1>
            <p style={{ margin: 0, fontSize: 16, color: C.textSub, lineHeight: 1.6 }}>
              Welcome to GG’APP. Get care from verified providers today and pay over time with healthcare credit.
            </p>
          </div>
        )}

        {current === 'how' && (
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>How GG’APP works</h1>
            <p style={{ margin: '0 0 20px', fontSize: 15, color: C.textSub }}>Three steps from need to care.</p>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}` }}>
              {HOW_IT_WORKS.map((item, i) => (
                <li key={item.title} style={{ display: 'flex', gap: 14, padding: '16px 18px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                  <span aria-hidden style={{ width: 42, height: 42, borderRadius: radius.full, background: C.blue100, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: C.textSub, marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {current === 'install' && (
          <div style={{ textAlign: 'center' }}>
            <img src="/icons/icon-192.png" alt="" width={96} height={96} style={{ borderRadius: 22, boxShadow: '0 12px 30px rgba(13,30,66,0.18)' }} />
            <h1 style={{ margin: '28px 0 10px', fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>Add GG’APP to your home screen</h1>
            <p style={{ margin: 0, fontSize: 16, color: C.textSub, lineHeight: 1.6 }}>
              Open it like any other app. It loads faster, works on a weak connection, and needs no app store.
            </p>
          </div>
        )}

        {current === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <span aria-hidden style={{ width: 88, height: 88, margin: '0 auto', borderRadius: radius.full, background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <h1 style={{ margin: '28px 0 10px', fontSize: 26, fontWeight: 800, color: C.text }}>You’re all set</h1>
            <p style={{ margin: 0, fontSize: 16, color: C.textSub, lineHeight: 1.6 }}>
              Start by applying for credit, or find a provider near you.
            </p>
          </div>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {current === 'install' ? (
          <>
            <button type="button" onClick={() => void startInstall()} style={primaryBtn}>Install the app</button>
            <button type="button" onClick={finish} style={textBtn}>Maybe later</button>
          </>
        ) : (
          <button type="button" onClick={next} style={primaryBtn}>
            {current === 'done' ? 'Go to my dashboard' : 'Continue'}
          </button>
        )}
      </div>

      {showIOS && <IOSInstallSheet onClose={() => { setShowIOS(false); finish() }} />}
    </div>
  )
}
