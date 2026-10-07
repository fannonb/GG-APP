import { useState, type ReactNode } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

/** alert = something went wrong · action = waiting on you · info = in progress · success = good news */
export type AttentionTone = 'alert' | 'action' | 'info' | 'success'

export type AttentionIcon =
  | 'invoice'
  | 'calendar'
  | 'calendar-x'
  | 'clock'
  | 'payment'
  | 'prescription'
  | 'credit'
  | 'star'
  | 'shield'
  | 'check'
  | 'alert'

export interface AttentionItem {
  id: string
  tone: AttentionTone
  icon?: AttentionIcon
  title: string
  detail: ReactNode
  /** Short tag beside the title, e.g. "Tomorrow" or an amount. */
  meta?: string
  actionLabel: string
  onAction: () => void | Promise<unknown>
  secondaryAction?: { label: string; onAction: () => void | Promise<unknown> }
  onDismiss?: () => void
}

const CYAN = '#0B7BC0'

const TONES: Record<AttentionTone, { fg: string; bg: string; rank: number; defaultIcon: AttentionIcon }> = {
  alert:   { fg: '#B91C1C', bg: 'rgba(239,68,68,0.10)',  rank: 0, defaultIcon: 'alert' },
  action:  { fg: '#B45309', bg: 'rgba(245,166,35,0.14)', rank: 1, defaultIcon: 'alert' },
  info:    { fg: CYAN,      bg: C.blue100,               rank: 2, defaultIcon: 'clock' },
  success: { fg: '#15803D', bg: 'rgba(34,197,94,0.12)',  rank: 3, defaultIcon: 'check' },
}

const ICONS: Record<AttentionIcon, ReactNode> = {
  alert: (
    <>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75v3.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" />
    </>
  ),
  clock: (
    <>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75V8l2.25 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  check: (
    <>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.25 8.25l1.9 1.9 3.6-3.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  invoice: (
    <>
      <path d="M4 2.25h8a.75.75 0 01.75.75v10.5l-1.6-1-1.55 1-1.6-1-1.6 1-1.55-1-1.6 1V3A.75.75 0 014 2.25z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.75 5.75h4.5M5.75 8.25h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.25 6.5h11.5M5.5 1.75v2.5M10.5 1.75v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  'calendar-x': (
    <>
      <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.25 6.5h11.5M5.5 1.75v2.5M10.5 1.75v2.5M6.5 8.5l3 3M9.5 8.5l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  payment: (
    <>
      <rect x="1.75" y="3.75" width="12.5" height="8.5" rx="1.75" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.75 6.75h12.5M4.5 9.75h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  prescription: (
    <>
      <rect x="3.25" y="1.75" width="9.5" height="12.5" rx="1.75" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5.25v4.5M5.75 7.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  credit: (
    <>
      <path d="M8 1.75l5.25 2.5v3.5c0 3.1-2.2 5.6-5.25 6.5-3.05-.9-5.25-3.4-5.25-6.5v-3.5L8 1.75z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.75 8l1.6 1.6 2.9-3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  shield: (
    <>
      <path d="M8 1.75l5.25 2.5v3.5c0 3.1-2.2 5.6-5.25 6.5-3.05-.9-5.25-3.4-5.25-6.5v-3.5L8 1.75z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 5.5v3M8 10.5v.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  star: (
    <path d="M8 2l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2l-3.6 1.9.7-4L2.2 6.3l4-.6L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  ),
}

/** Beyond this many rows the list collapses so the main cards stay near the top. */
const COLLAPSED_COUNT = 3

/**
 * Single home for everything the user should act on or know about now,
 * shared by the patient and provider dashboards.
 */
export function DashboardAttention({ items, title = 'Needs your attention' }: { items: AttentionItem[]; title?: string }) {
  const { isMobile } = useResponsive()
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  if (items.length === 0) return null

  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => TONES[a.item.tone].rank - TONES[b.item.tone].rank || a.index - b.index)
    .map(({ item }) => item)

  const hiddenCount = expanded ? 0 : Math.max(0, sorted.length - COLLAPSED_COUNT)
  const visible = hiddenCount > 0 ? sorted.slice(0, COLLAPSED_COUNT) : sorted
  const needsYou = sorted.filter(i => i.tone === 'alert' || i.tone === 'action').length

  const run = async (key: string, fn: () => void | Promise<unknown>) => {
    setBusy(key)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section
      aria-label={title}
      style={{
        background: '#fff',
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        padding: isMobile ? '14px 16px' : '18px 22px',
        fontFamily: font.family,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{title}</div>
        {needsYou > 0 && (
          <span
            title={`${needsYou} waiting on you`}
            style={{
              minWidth: 20,
              height: 20,
              padding: '0 6px',
              borderRadius: radius.full,
              background: TONES.action.bg,
              color: TONES.action.fg,
              fontSize: 11,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {needsYou}
          </span>
        )}
      </div>

      <div>
        {visible.map((item, i) => {
          const tone = TONES[item.tone]
          const emphasised = item.tone === 'alert' || item.tone === 'action'
          const primaryKey = `${item.id}:primary`
          const secondaryKey = `${item.id}:secondary`
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: 12,
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: tone.bg,
                  color: tone.fg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  {ICONS[item.icon ?? tone.defaultIcon]}
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>{item.title}</div>
                  {item.meta && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: radius.full,
                        background: tone.bg,
                        color: tone.fg,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.meta}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: C.textSub, marginTop: 2, lineHeight: 1.45 }}>{item.detail}</div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexShrink: 0,
                  width: isMobile ? '100%' : 'auto',
                  paddingLeft: isMobile ? 48 : 0,
                  boxSizing: 'border-box',
                }}
              >
                {item.secondaryAction && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run(secondaryKey, item.secondaryAction!.onAction)}
                    style={buttonStyle(false, isMobile, busy !== null)}
                  >
                    {busy === secondaryKey ? 'Saving…' : item.secondaryAction.label}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void run(primaryKey, item.onAction)}
                  style={buttonStyle(emphasised, isMobile, busy !== null)}
                >
                  {busy === primaryKey ? 'Saving…' : item.actionLabel}
                </button>
                {item.onDismiss && (
                  <button
                    type="button"
                    onClick={item.onDismiss}
                    aria-label={`Dismiss: ${item.title}`}
                    title="Dismiss"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: radius.sm,
                      border: 'none',
                      background: 'transparent',
                      color: C.textLight,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {sorted.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          style={{
            all: 'unset',
            display: 'block',
            width: '100%',
            textAlign: 'center',
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
            fontSize: 13,
            fontWeight: 700,
            color: CYAN,
            cursor: 'pointer',
          }}
        >
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
        </button>
      )}
    </section>
  )
}

function buttonStyle(primary: boolean, isMobile: boolean, disabled: boolean): React.CSSProperties {
  return {
    height: 34,
    padding: '0 14px',
    borderRadius: radius.sm,
    border: primary ? 'none' : '1px solid rgba(11,123,192,0.35)',
    background: primary ? 'linear-gradient(135deg, #1A9BE6 0%, #0B7BC0 100%)' : '#fff',
    boxShadow: primary ? '0 4px 10px rgba(11,123,192,0.22)' : 'none',
    color: primary ? '#fff' : CYAN,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: font.family,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.7 : 1,
    whiteSpace: 'nowrap',
    flex: isMobile ? 1 : 'none',
  }
}
