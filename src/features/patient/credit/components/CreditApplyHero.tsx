import { GGButton } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

interface CreditApplyHeroProps {
  onStartApplication: () => void
}

const STEPS = [
  'Apply in a few minutes',
  'Finance patner reviews and approves your request',
  'Use your balance at verified providers',
]

export function CreditApplyHero({ onStartApplication }: CreditApplyHeroProps) {
  const { isMobile } = useResponsive()

  return (
    <div style={{
      background: `linear-gradient(140deg, ${C.navy800} 0%, ${C.navy700} 60%, #162d62 100%)`,
      borderRadius: radius.xl,
      padding: isMobile ? '32px 24px' : '44px 48px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: shadow.xl,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr',
      gap: isMobile ? '28px' : '40px',
      alignItems: 'center',
    }}>
      <div style={{ position: 'absolute', right: -80, top: -80, width: 340, height: 340, borderRadius: '50%', background: 'rgba(56,182,255,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 60, bottom: -120, width: 220, height: 220, borderRadius: '50%', background: 'rgba(56,182,255,0.04)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(56,182,255,0.15)',
          border: '1px solid rgba(56,182,255,0.3)',
          borderRadius: radius.full,
          padding: '5px 12px',
          marginBottom: '18px',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue500, display: 'inline-block' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: C.blue400, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: font.family }}>
            Healthcare Credit
          </span>
        </div>

        <h2 style={{
          fontSize: isMobile ? '28px' : '36px',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.04em',
          lineHeight: 1.12,
          margin: '0 0 14px',
          fontFamily: font.family,
        }}>
          Pay at care with{' '}
          <span style={{ color: C.blue500 }}>zero upfront</span>
        </h2>

        <p style={{
          fontSize: isMobile ? '14px' : '15px',
          color: 'rgba(255,255,255,0.68)',
          lineHeight: 1.7,
          margin: '0 0 28px',
          fontFamily: font.family,
          maxWidth: 460,
        }}>
          Apply once, get reviewed by GG&apos;APP, and use your approved balance at any verified provider.
        </p>

        <GGButton
          variant="primary"
          size="lg"
          onClick={onStartApplication}
          fullWidth={isMobile}
          style={{ fontWeight: 700, minWidth: isMobile ? undefined : 220 }}
        >
          Start Application →
        </GGButton>
      </div>

      <div style={{
        position: 'relative',
        zIndex: 1,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: radius.lg,
        padding: isMobile ? '22px 20px' : '28px 24px',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: font.family }}>
          How it works
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {STEPS.map((step, index) => (
            <div key={step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(56,182,255,0.18)',
                border: '1px solid rgba(56,182,255,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '11px',
                fontWeight: 800,
                color: C.blue400,
                fontFamily: font.family,
              }}>
                {index + 1}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, fontFamily: font.family, paddingTop: '2px' }}>
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
