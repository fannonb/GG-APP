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
                background: `${c.accent}18`,
                border: `1px solid ${c.accent}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '2px',
                color: c.accent,
              }}>
                {tab === 'patient' ? (
                  i === 0 ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="3.5" width="14" height="9" rx="1.5"/><path d="M1 6.5h14"/></svg> :
                  i === 1 ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 1L2 3v4.5C2 11.5 8 15 8 15s6-3.5 6-7.5V3l-6-2z"/><path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg> :
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6" width="10" height="8" rx="2"/><path d="M5 6V4a3 3 0 016 0v2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  i === 0 ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8.5 1.5L2 9h5v5.5L14 7H9z" strokeLinejoin="round"/></svg> :
                  i === 1 ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 8l1.5 1.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/></svg> :
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="9.5" y="1.5" width="5" height="5" rx="1"/><rect x="1.5" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/></svg>
                )}
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
