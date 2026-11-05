import type { ReactElement } from 'react'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

export interface LedgerPrivacyOverviewProps {
  hasPin: boolean
  pinExpired: boolean
  /** Providers who can see the history right now. */
  activeCount: number
  /** LEDGER_VIEWED + UNLOCK_SUCCESS events in the last 30 days. */
  views30d: number
  /** UNLOCK_FAILED events in the last 30 days. */
  failedAttempts30d: number
}

const TONE = {
  green: { fg: '#15803D', bg: 'rgba(34,197,94,0.12)' },
  cyan: { fg: '#0B7BC0', bg: C.blue100 },
  amber: { fg: '#B45309', bg: 'rgba(245,166,35,0.14)' },
} as const

type Tone = (typeof TONE)[keyof typeof TONE]

interface PrivacyState {
  tone: Tone
  pill: string
  headline: string
  sentence: string
}

/** Picks the single state to show, in priority order. */
function privacyState({ hasPin, pinExpired, activeCount }: Pick<LedgerPrivacyOverviewProps, 'hasPin' | 'pinExpired' | 'activeCount'>): PrivacyState {
  if (!hasPin) {
    return {
      tone: TONE.amber,
      pill: 'PIN needed',
      headline: 'No Ledger PIN yet',
      sentence: 'No provider can open your history until you create a PIN.',
    }
  }
  if (pinExpired) {
    return {
      tone: TONE.amber,
      pill: 'PIN expired',
      headline: 'Your PIN has expired',
      sentence: 'Providers can’t open your history until you set a new PIN.',
    }
  }
  if (activeCount > 0) {
    return {
      tone: TONE.cyan,
      pill: 'Shared',
      headline: `Shared with ${activeCount} provider${activeCount > 1 ? 's' : ''}`,
      sentence: 'They can see your visits and prescriptions until their 24 hours run out, or you end it.',
    }
  }
  return {
    tone: TONE.green,
    pill: 'Private',
    headline: 'Your history is private',
    sentence: 'Nobody can see it right now. A provider needs your PIN to open it.',
  }
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3z" />
    </svg>
  )
}

export function LedgerPrivacyOverview({ hasPin, pinExpired, activeCount, views30d, failedAttempts30d }: LedgerPrivacyOverviewProps): ReactElement {
  const { isMobile, isDesktop } = useResponsive()
  const state = privacyState({ hasPin, pinExpired, activeCount })

  const stats = [
    { label: 'Active access', value: activeCount, warn: false },
    { label: 'Views · 30 days', value: views30d, warn: false },
    { label: 'Wrong PIN · 30 days', value: failedAttempts30d, warn: failedAttempts30d > 0 },
  ]

  return (
    <GGCard padding={isMobile ? '18px 16px' : '22px 24px'}>
      <div style={{ fontFamily: font.family }}>
        <div
          role="status"
          aria-label={`Ledger privacy: ${state.headline}`}
          style={{ display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <span style={{ width: 48, height: 48, borderRadius: radius.md, background: state.tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldIcon color={state.tone.fg} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{state.headline}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>{state.sentence}</p>
          </div>
          {isDesktop && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: radius.full, color: state.tone.fg, background: state.tone.bg, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {state.pill}
            </span>
          )}
        </div>

        <div aria-hidden style={{ height: 1, background: C.border, margin: '18px 0 16px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 8 : 10 }}>
          {stats.map(stat => (
            <div
              key={stat.label}
              style={{ minWidth: 0, background: stat.warn ? 'rgba(245,166,35,0.10)' : C.bg, borderRadius: radius.md, padding: isMobile ? '10px' : '14px 16px' }}
            >
              <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: stat.warn ? '#B45309' : C.text, lineHeight: 1.1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.35, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </GGCard>
  )
}
