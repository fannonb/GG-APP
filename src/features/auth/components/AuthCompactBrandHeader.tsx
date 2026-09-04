import { C, font } from '@/design-system/tokens'
import { LOGO } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'

type Tab = 'patient' | 'sp'

interface AuthCompactBrandHeaderProps {
  tab: Tab
}

/** Exact ground from public/gg-logo-v4.png (#091C44). */
const LOGO_NAVY = C.navy800
const LOGO_CYAN = C.blue500
/** Intrinsic logo aspect (1869×1744) — avoid squashing into a forced square. */
const LOGO_ASPECT = 1869 / 1744

const COPY: Record<Tab, { tagline: string }> = {
  patient: {
    tagline: 'Healthcare access, simplified.',
  },
  sp: {
    tagline: 'Grow your practice.',
  },
}

/**
 * Mobile/tablet auth brand band.
 * Generous lockup so the header balances the form below —
 * logo ground matches the field so the mark reads as part of the band.
 */
export function AuthCompactBrandHeader({ tab }: AuthCompactBrandHeaderProps) {
  const { isTablet } = useResponsive()
  const copy = COPY[tab]
  const logoWidth = isTablet ? 120 : 96
  const logoHeight = Math.round(logoWidth / LOGO_ASPECT)

  return (
    <header
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: LOGO_NAVY,
        padding: isTablet ? '36px 32px 40px' : '28px 20px 32px',
        textAlign: 'center',
      }}
    >
      {/* Soft depth at the bottom edge — still pure navy, no tinted halo on the mark */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isTablet ? 16 : 14,
        }}
      >
        <div
          style={{
            width: logoWidth,
            height: logoHeight,
            background: LOGO_NAVY,
            // Extend the same navy past any image edge / color-management fringe
            boxShadow: `0 0 0 20px ${LOGO_NAVY}`,
          }}
        >
          <img
            src={LOGO}
            alt="GG'APP"
            width={logoWidth}
            height={logoHeight}
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
              width: logoWidth,
              height: logoHeight,
              // Neutralize CSS-vs-PNG navy mismatch on some displays
              backgroundColor: LOGO_NAVY,
            }}
          />
        </div>

        <div
          style={{
            fontFamily: font.family,
            fontSize: isTablet ? 16 : 14.5,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.4,
            color: 'rgba(255, 255, 255, 0.78)',
            maxWidth: isTablet ? 320 : 280,
          }}
        >
          {copy.tagline}
        </div>

        <div
          aria-hidden
          style={{
            width: isTablet ? 40 : 34,
            height: 3,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${LOGO_CYAN}, rgba(56,182,255,0.35))`,
          }}
        />
      </div>
    </header>
  )
}
