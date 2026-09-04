import { C, font } from '@/design-system/tokens'
import { LOGO } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'
import type { ReactNode } from 'react'

type Tab = 'patient' | 'sp'

interface AuthBrandPanelProps {
  tab: Tab
}

interface TrustCue {
  title: string
  body: string
  icon: ReactNode
}

interface BrandContent {
  headline: string
  sub: string
  cues: TrustCue[]
}

const CONTENT: Record<Tab, BrandContent> = {
  patient: {
    headline: 'Healthcare access, simplified.',
    sub: 'Get care today from verified providers. Pay later through approved healthcare credit.',
    cues: [
      {
        title: 'Verified providers',
        body: 'Licensed hospitals, clinics, pharmacies, labs, and doctors.',
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 1L2 3v4.5C2 11.5 8 15 8 15s6-3.5 6-7.5V3l-6-2z" />
            <path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Healthcare-only credit',
        body: 'Approved funds are used for medical services—not general spending.',
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="1" y="3.5" width="14" height="9" rx="1.5" />
            <path d="M1 6.5h14" />
          </svg>
        ),
      },
      {
        title: 'Triple-PIN payment protection',
        body: 'Every payment requires three deliberate PIN confirmations.',
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="6" width="10" height="8" rx="2" />
            <path d="M5 6V4a3 3 0 016 0v2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  sp: {
    headline: 'Grow your practice with verified demand.',
    sub: 'Receive patient bookings and guaranteed disbursements after PIN-authorized invoices.',
    cues: [
      {
        title: 'Verified patient bookings',
        body: 'Engage patients who are already onboarding into the GG’APP network.',
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M5.5 8l1.5 1.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Guaranteed disbursement',
        body: 'Funds are released after patient authorization—not after collection risk.',
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8.5 1.5L2 9h5v5.5L14 7H9z" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Admin verification',
        body: 'License review typically completes within 2–3 business days.',
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
            <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
            <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
            <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
          </svg>
        ),
      },
    ],
  },
}

/** Exact ground from public/gg-logo-v4.png — must match the rail or the tile reads as a box. */
const LOGO_NAVY = C.navy800 // #091C44

/**
 * Desktop brand rail for auth screens.
 * Narrow, quiet, logo-aligned — no simulated wallet or alternate role colors.
 */
export function AuthBrandPanel({ tab }: AuthBrandPanelProps) {
  const { isDesktop } = useResponsive()
  if (!isDesktop) return null

  const content = CONTENT[tab]

  return (
    <aside
      style={{
        width: 'clamp(380px, 38vw, 520px)',
        flexShrink: 0,
        // Solid logo navy first so the mark dissolves into the rail; deep fade only at the bottom.
        background: `linear-gradient(180deg, ${LOGO_NAVY} 0%, ${LOGO_NAVY} 72%, ${C.navy900} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 36px 32px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        boxSizing: 'border-box',
        fontFamily: font.family,
      }}
    >
      {/* Cyan atmosphere kept below the logo lockup so it never tints the tile edge */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          bottom: '-8%',
          left: -100,
          background: 'radial-gradient(circle, rgba(56,182,255,0.08) 0%, transparent 72%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: 0,
          }}
        >
          {/* Logo sits on an untinted plate of the same navy — no radius/glow that reveals a box */}
          <div
            style={{
              width: 112,
              height: 96,
              marginBottom: 22,
              background: LOGO_NAVY,
              position: 'relative',
            }}
          >
            <img
              src={LOGO}
              alt="GG'APP"
              width={112}
              height={112}
              style={{
                objectFit: 'contain',
                display: 'block',
                width: 112,
                height: 112,
                transform: 'translateY(-8px)',
                borderRadius: 0,
              }}
            />
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              marginBottom: 10,
            }}
          >
            {content.headline}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'rgba(255,255,255,0.76)',
              lineHeight: 1.55,
              marginBottom: 32,
              maxWidth: 340,
            }}
          >
            {content.sub}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {content.cues.map(cue => (
              <div key={cue.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'rgba(56,182,255,0.12)',
                    border: '1px solid rgba(56,182,255,0.28)',
                    color: C.blue500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cue.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                    {cue.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)', lineHeight: 1.45 }}>
                    {cue.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 28, fontSize: 11, color: 'rgba(255,255,255,0.46)', flexShrink: 0 }}>
          GG&apos;APP · Gateway Global Healthcare Platform
        </div>
      </div>
    </aside>
  )
}
