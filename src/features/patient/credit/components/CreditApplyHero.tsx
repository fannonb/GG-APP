import { GGButton } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

interface CreditApplyHeroProps {
  onStartApplication: () => void
}

const PILLS = ['Zero upfront cost', 'Under 5 minutes', 'Licensed finance partners']

export function CreditApplyHero({ onStartApplication }: CreditApplyHeroProps) {
  const { isMobile } = useResponsive()

  return (
    <div style={{
      background: `linear-gradient(140deg, ${C.navy800} 0%, ${C.navy700} 60%, #162d62 100%)`,
      borderRadius: radius.xl,
      padding: isMobile ? '36px 24px' : '52px 56px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: shadow.xl,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '32px' : '48px',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', right: -80, top: -80, width: 340, height: 340, borderRadius: '50%', background: 'rgba(56,182,255,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 60, bottom: -120, width: 220, height: 220, borderRadius: '50%', background: 'rgba(56,182,255,0.04)', pointerEvents: 'none' }} />

      {/* Left: copy + CTA */}
      <div style={{ position: 'relative', zIndex: 1, flex: isMobile ? undefined : '1 1 0', minWidth: 0 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(56,182,255,0.15)',
          border: '1px solid rgba(56,182,255,0.3)',
          borderRadius: radius.full,
          padding: '5px 12px',
          marginBottom: '20px',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue500, display: 'inline-block' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: C.blue400, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: font.family }}>
            Healthcare Credit
          </span>
        </div>

        <h2 style={{
          fontSize: isMobile ? '28px' : '38px',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.04em',
          lineHeight: 1.12,
          margin: '0 0 14px',
          fontFamily: font.family,
        }}>
          Apply for Your{'\n'}
          <span style={{ color: C.blue500 }}>Healthcare credit</span>
        </h2>

        <p style={{
          fontSize: isMobile ? '14px' : '15px',
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.7,
          margin: '0 0 28px',
          fontFamily: font.family,
          maxWidth: 420,
        }}>
          Get approved through a licensed finance partner in your country and pay nothing upfront at GG'APP-verified providers.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
          {PILLS.map(label => (
            <span key={label} style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              padding: '6px 14px',
              borderRadius: radius.full,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontFamily: font.family,
            }}>
              {label}
            </span>
          ))}
        </div>

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

      {/* Right: balance preview card */}
      {!isMobile && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          flex: '0 0 auto',
          width: 280,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: radius.lg,
          padding: '28px 24px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: font.family }}>
            What you'll unlock
          </div>

          {/* Balance row */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px', fontFamily: font.family }}>Available balance</div>
            <div style={{ height: 8, background: 'rgba(56,182,255,0.25)', borderRadius: 4, marginBottom: '6px', overflow: 'hidden' }}>
              <div style={{ width: '65%', height: '100%', background: C.blue500, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: font.family }}>Your approved limit appears after application</div>
          </div>

          {/* Stats */}
          {[
            { label: 'Upfront payment', value: 'Z$0 at care' },
            { label: 'Application time', value: 'Under 5 min' },
            { label: 'Finance partner', value: 'Your choice' },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              fontFamily: font.family,
            }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{row.label}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
