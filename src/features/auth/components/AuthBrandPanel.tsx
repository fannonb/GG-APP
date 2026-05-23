import { C, font } from '@/design-system/tokens'
import { LOGO } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'

type Tab = 'patient' | 'sp'

interface AuthBrandPanelProps {
  tab: Tab
}

const CONTENT = {
  patient: {
    headline: 'Healthcare Access,\nSimplified.',
    sub: 'Get the care you need today. Pay later through our approved credit facility.',
    bullets: [
      { title: 'Zero Upfront Cost', body: 'Credit covers your visit. Repayment is managed directly by our finance partner, CapiMed.' },
      { title: 'Verified Providers', body: '100% vetted hospitals, clinics, pharmacies, labs and doctors.' },
      { title: 'Secure Payments', body: 'Triple-PIN authorization protects every transaction end-to-end.' },
    ],
    accent: C.blue500,
  },
  sp: {
    headline: 'Grow Your\nPractice.',
    sub: 'Reach more patients and receive instant, guaranteed payments directly to your account.',
    bullets: [
      { title: 'Instant Disbursements', body: 'Payment hits your M-Pesa or bank account the moment a patient authorises.' },
      { title: 'Pre-verified Patients', body: 'All patients are KYC-verified and credit-approved before they can book.' },
      { title: 'Simplified Admin', body: 'Manage appointments, upload invoices, and track earnings in one dashboard.' },
    ],
    accent: C.success,
  },
}

export function AuthBrandPanel({ tab }: AuthBrandPanelProps) {
  const { isMobile, isTablet } = useResponsive()
  if (isMobile) return null

  const c = CONTENT[tab]
  const panelWidth = isTablet ? '35%' : '42%'

  return (
    <div style={{
      width: panelWidth,
      flexShrink: 0,
      margin: '16px 0 16px 16px',
      borderRadius: '20px',
      background: '#091c44',
      display: 'flex',
      flexDirection: 'column',
      padding: isTablet ? '32px 24px' : '48px 44px',
      position: 'relative',
      overflow: 'hidden',
      minHeight: 'calc(100vh - 32px)',
    }}>
      {/* Decorative rings */}
      {[220, 380, 540].map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: r, height: r,
          borderRadius: '50%',
          border: `1px solid rgba(74,173,223,${0.07 - i * 0.015})`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Logo */}
      <div style={{ marginBottom: '40px' }}>
        <img src={LOGO} alt="GG'APP" width={102} height={102} style={{ objectFit: 'contain' }} />
      </div>

      {/* Headline */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: isTablet ? '28px' : '36px',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.04em',
          lineHeight: 1.15,
          whiteSpace: 'pre-line',
          marginBottom: '16px',
          fontFamily: font.family,
        }}>
          {c.headline}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: '40px', fontFamily: font.family }}>
          {c.sub}
        </div>

        {/* Feature bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {c.bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '8px',
                background: `${c.accent}22`,
                border: `1px solid ${c.accent}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '2px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.accent }} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: font.family, marginBottom: '3px' }}>{b.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, fontFamily: font.family }}>{b.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer tag */}
      <div style={{ marginTop: '48px', fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: font.family }}>
        GG'APP · Gateway Global Healthcare Platform
      </div>
    </div>
  )
}
