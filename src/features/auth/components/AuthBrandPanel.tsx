import { Link } from 'react-router-dom'
import { C, font } from '@/design-system/tokens'
import { LOGO_MARK, LOGO_WORDMARK, ROUTES } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'

type Tab = 'patient' | 'sp'

interface AuthBrandPanelProps {
  tab: Tab
}

interface Step {
  title: string
  body: string
}

interface BrandContent {
  eyebrow: string
  headline: [string, string]
  sub: string
  steps: Step[]
}

const CONTENT: Record<Tab, BrandContent> = {
  patient: {
    eyebrow: 'For patients',
    headline: ['Get care today.', 'Pay over time.'],
    sub: 'Visit verified providers and settle the bill with approved healthcare credit — nothing to pay at the counter.',
    steps: [
      { title: 'Apply for healthcare credit', body: 'Reviewed by our licensed finance partner.' },
      { title: 'Book a verified provider', body: 'Hospitals, clinics, pharmacies, labs and radiology.' },
      { title: 'Approve the bill with your PIN', body: 'No payment moves without your say-so.' },
    ],
  },
  sp: {
    eyebrow: 'For healthcare providers',
    headline: ['Treat patients.', 'Get paid on approval.'],
    sub: 'Receive bookings from credit-approved patients and get paid as soon as they approve your invoice.',
    steps: [
      { title: 'Get verified', body: 'We review your licence within 2–3 business days.' },
      { title: 'Receive patient bookings', body: 'Requests arrive with notes and attachments.' },
      { title: 'Get paid directly', body: 'Straight to your M-Pesa Paybill or bank account.' },
    ],
  },
}

/**
 * Desktop brand rail for auth screens.
 * One promise + a three-step "how it works" — the mental model a first-time
 * visitor needs, rather than a feature checklist.
 */
export function AuthBrandPanel({ tab }: AuthBrandPanelProps) {
  const { isDesktop } = useResponsive()
  if (!isDesktop) return null

  const content = CONTENT[tab]

  return (
    <aside
      style={{
        width: 'clamp(400px, 40vw, 560px)',
        flexShrink: 0,
        background: `linear-gradient(165deg, ${C.navy700} 0%, ${C.navy800} 45%, ${C.navy900} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 48px 32px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        boxSizing: 'border-box',
        fontFamily: font.family,
        color: '#fff',
      }}
    >
      {/* Oversized mark bleeding off the corner fills the rail without adding content */}
      <img
        src={LOGO_MARK}
        alt=""
        aria-hidden
        style={{
          position: 'absolute',
          width: 820,
          right: -470,
          bottom: -120,
          opacity: 0.05,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      <img
        src={LOGO_WORDMARK}
        alt="GG'APP"
        style={{ height: 28, width: 'auto', display: 'block', alignSelf: 'flex-start', position: 'relative' }}
      />

      <div
        key={tab}
        className="gg-brand-swap"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          padding: '48px 0',
          maxWidth: 420,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: C.blue500,
            marginBottom: 16,
          }}
        >
          {content.eyebrow}
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(34px, 3.2vw, 44px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.08,
            marginBottom: 18,
          }}
        >
          {content.headline[0]}
          <br />
          <span style={{ color: C.blue500 }}>{content.headline[1]}</span>
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.6,
            marginBottom: 40,
          }}
        >
          {content.sub}
        </p>

        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {content.steps.map((step, i) => {
            const last = i === content.steps.length - 1
            return (
              <li key={step.title} style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: `1.5px solid ${C.blue500}`,
                      color: C.blue500,
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </div>
                  {!last && (
                    <div style={{ width: 1.5, flex: 1, minHeight: 18, background: 'rgba(56,182,255,0.25)' }} />
                  )}
                </div>
                <div style={{ paddingBottom: last ? 0 : 22, paddingTop: 3 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{step.title}</div>
                  <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.5 }}>
                    {step.body}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        <span>A Gateway Global product</span>
        <span style={{ display: 'flex', gap: 16 }}>
          <Link to={ROUTES.TERMS} style={{ color: 'inherit', textDecoration: 'none' }}>
            Terms
          </Link>
          <Link to={ROUTES.PRIVACY_POLICY} style={{ color: 'inherit', textDecoration: 'none' }}>
            Privacy
          </Link>
        </span>
      </div>

      <style>{`
        .gg-brand-swap { animation: ggBrandIn 0.35s ease both }
        @keyframes ggBrandIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .gg-brand-swap { animation: none } }
      `}</style>
    </aside>
  )
}
