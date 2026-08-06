import { C, font } from '@/design-system/tokens'
import { LOGO } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'

type Tab = 'patient' | 'sp'

interface AuthCompactBrandHeaderProps {
  tab: Tab
}

/** Logo navy + cyan — exact brand field so the mark dissolves into the header. */
const LOGO_NAVY = C.navy800 // #091C44 — matches logo.png ground
const LOGO_CYAN = C.blue500 // #38B6FF
const LOGO_CYAN_RGB = '56, 182, 255'

const COPY: Record<Tab, { tagline: string }> = {
  patient: {
    tagline: 'Healthcare Access, Simplified.',
  },
  sp: {
    tagline: 'Grow Your Practice.',
  },
}

/**
 * Mobile/tablet auth brand band.
 * Logo is the hero; header ground matches the logo navy so the asset
 * doesn't read as a patched square on a different dark panel.
 */
export function AuthCompactBrandHeader({ tab }: AuthCompactBrandHeaderProps) {
  const { isTablet } = useResponsive()
  const copy = COPY[tab]
  const logoSize = isTablet ? 112 : 96

  return (
    <header
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${LOGO_NAVY} 0%, ${LOGO_NAVY} 62%, #061533 100%)`,
        padding: isTablet ? '36px 32px 40px' : '28px 20px 34px',
        textAlign: 'center',
      }}
    >
      <style>{`
        @keyframes ggAuthBrandIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ggAuthGlow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.04); }
        }
        @keyframes ggAuthTaglineIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Soft cyan field behind logo — blends the mark into brand navy */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: isTablet ? 280 : 230,
          height: isTablet ? 280 : 230,
          borderRadius: '50%',
          left: '50%',
          top: '42%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, rgba(${LOGO_CYAN_RGB}, 0.28) 0%, rgba(${LOGO_CYAN_RGB}, 0.08) 42%, transparent 70%)`,
          pointerEvents: 'none',
          animation: 'ggAuthGlow 5.5s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: isTablet ? 420 : 340,
          height: isTablet ? 220 : 180,
          borderRadius: '50%',
          left: '50%',
          top: -40,
          transform: 'translateX(-50%)',
          background: `radial-gradient(ellipse, rgba(${LOGO_CYAN_RGB}, 0.12) 0%, transparent 72%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Subtle vignette so edges stay deep navy like the logo tile */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(5, 14, 34, 0.45) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Brand lockup — logo carries wordmark; no duplicate GG'APP text */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isTablet ? 14 : 12,
          animation: 'ggAuthBrandIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: logoSize,
            height: logoSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Halo ring matching logo cyan — softens the square edge */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: -10,
              borderRadius: 22,
              background: `linear-gradient(145deg, rgba(${LOGO_CYAN_RGB}, 0.22), rgba(${LOGO_CYAN_RGB}, 0.02) 55%, transparent)`,
              boxShadow: `0 0 40px rgba(${LOGO_CYAN_RGB}, 0.18)`,
              pointerEvents: 'none',
            }}
          />
          <img
            src={LOGO}
            alt="GG'APP"
            width={logoSize}
            height={logoSize}
            style={{
              position: 'relative',
              objectFit: 'contain',
              display: 'block',
              // Soft edge so navy tile merges with matching header ground
              borderRadius: 14,
              boxShadow: `0 0 0 1px rgba(${LOGO_CYAN_RGB}, 0.12), 0 12px 32px rgba(0, 0, 0, 0.28)`,
            }}
          />
        </div>

        <div
          style={{
            fontFamily: font.family,
            fontSize: isTablet ? 15.5 : 14,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            lineHeight: 1.4,
            color: 'rgba(255, 255, 255, 0.78)',
            maxWidth: 280,
            animation: 'ggAuthTaglineIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both',
          }}
        >
          {copy.tagline}
        </div>

        {/* Cyan underline accent — brand signature under tagline */}
        <div
          aria-hidden
          style={{
            width: 36,
            height: 3,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${LOGO_CYAN}, rgba(${LOGO_CYAN_RGB}, 0.25))`,
            boxShadow: `0 0 12px rgba(${LOGO_CYAN_RGB}, 0.45)`,
            animation: 'ggAuthTaglineIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both',
          }}
        />
      </div>

      {/* Soft fade into the form surface — no hard patch edge */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 28,
          background: `linear-gradient(180deg, transparent 0%, ${C.surface} 100%)`,
          opacity: 0.14,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${LOGO_CYAN} 50%, transparent 100%)`,
          opacity: 0.55,
        }}
      />
    </header>
  )
}
