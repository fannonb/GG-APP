import { C, font } from '@/design-system/tokens'
import { LOGO } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'

type Tab = 'patient' | 'sp'

interface AuthCompactBrandHeaderProps {
  tab: Tab
}

const COPY: Record<Tab, { tagline: string; accentRgb: string; accent: string }> = {
  patient: {
    tagline: 'Healthcare Access, Simplified.',
    accentRgb: '56, 182, 255',
    accent: C.blue500,
  },
  sp: {
    tagline: 'Grow Your Practice.',
    accentRgb: '16, 185, 129',
    accent: '#10B981',
  },
}

/**
 * Compact brand chrome for mobile/tablet auth screens.
 * Horizontal lockup replaces the old stacked logo + pill cluster.
 */
export function AuthCompactBrandHeader({ tab }: AuthCompactBrandHeaderProps) {
  const { isTablet } = useResponsive()
  const copy = COPY[tab]

  return (
    <header
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 72%, #030915 100%)`,
        padding: isTablet ? '28px 32px 26px' : '24px 22px 22px',
        borderBottom: 'none',
      }}
    >
      {/* Soft accent glow — atmosphere without clutter */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: isTablet ? 320 : 260,
          height: isTablet ? 320 : 260,
          borderRadius: '50%',
          right: '-80px',
          top: '-110px',
          background: `radial-gradient(circle, rgba(${copy.accentRgb}, 0.22) 0%, rgba(${copy.accentRgb}, 0) 68%)`,
          pointerEvents: 'none',
          transition: 'background 0.35s ease',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          left: '-70px',
          bottom: '-90px',
          background: `radial-gradient(circle, rgba(${copy.accentRgb}, 0.1) 0%, transparent 70%)`,
          pointerEvents: 'none',
          transition: 'background 0.35s ease',
        }}
      />

      {/* Brand lockup */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: isTablet ? 18 : 14,
        }}
      >
        <img
          src={LOGO}
          alt=""
          width={isTablet ? 76 : 64}
          height={isTablet ? 76 : 64}
          style={{
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0,
            filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.3))',
          }}
        />
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              fontFamily: font.family,
              fontSize: isTablet ? 26 : 22,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              color: '#fff',
            }}
          >
            GG&apos;APP
          </div>
          <div
            style={{
              fontFamily: font.family,
              fontSize: isTablet ? 14.5 : 13.5,
              fontWeight: 500,
              letterSpacing: '-0.01em',
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.68)',
              transition: 'color 0.3s ease',
            }}
          >
            {copy.tagline}
          </div>
        </div>
      </div>

      {/* Accent rail — ties header to role without pill clutter */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: `linear-gradient(90deg, ${copy.accent} 0%, rgba(${copy.accentRgb}, 0.15) 55%, transparent 100%)`,
          transition: 'background 0.35s ease',
        }}
      />
    </header>
  )
}
