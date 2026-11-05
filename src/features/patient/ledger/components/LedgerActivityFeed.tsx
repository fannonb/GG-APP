import { useState } from 'react'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { Pager, usePaged } from '@/components/paging'
import type { LedgerAccessEvent } from '@/types/ledger.types'

export interface LedgerActivityFeedProps {
  events: LedgerAccessEvent[]
  /** Fixed "now" timestamp from the parent, used for Today / Yesterday labels. */
  now: number
  isLoading: boolean
}

const CYAN_DEEP = '#0B7BC0'
const DAY = 86_400_000

type FilterKey = 'all' | 'access' | 'wrong' | 'pin'
/** Visual family of one event: decides the icon, its colours and the filter it belongs to. */
type Kind = 'open' | 'ended' | 'wrong' | 'pin'

interface FeedRow {
  label: string
  event: LedgerAccessEvent
  count: number
  kind: Kind
}

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'access', label: 'Access' },
  { key: 'wrong', label: 'Wrong PIN' },
  { key: 'pin', label: 'PIN changes' },
]

const FILTER_OF: Record<Kind, Exclude<FilterKey, 'all'>> = {
  open: 'access',
  ended: 'access',
  wrong: 'wrong',
  pin: 'pin',
}

const VISUAL: Record<Kind, { fg: string; bg: string }> = {
  open: { fg: CYAN_DEEP, bg: C.blue100 },
  ended: { fg: C.textSub, bg: C.bg },
  wrong: { fg: '#B45309', bg: 'rgba(245,166,35,0.14)' },
  pin: { fg: C.textSub, bg: C.bg },
}

const stateStyle: React.CSSProperties = { padding: '18px 0', fontSize: 14, color: C.textSub }

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function dayLabel(iso: string, now: number) {
  const day = new Date(iso)
  const today = new Date(now)
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOf(today) - startOf(day)) / DAY)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return longDate(iso)
}

function describe(event: LedgerAccessEvent): string {
  const who = event.provider?.name ?? 'A provider'
  switch (event.action) {
    case 'PIN_CREATED': return 'You created your Ledger PIN'
    case 'PIN_ROTATED': return 'You changed your Ledger PIN'
    case 'PIN_REVOKED': return 'You turned off your Ledger PIN'
    case 'UNLOCK_SUCCESS': return `${who} opened your history with your PIN`
    case 'UNLOCK_FAILED': return `${who} entered a wrong PIN`
    case 'LEDGER_VIEWED': return `${who} viewed your history`
    case 'GRANT_REVOKED': return `You ended ${who}’s access`
    case 'GRANT_EXPIRED': return `${who}’s access ended after 24 hours`
    default: return String(event.action)
  }
}

function kindOf(action: LedgerAccessEvent['action']): Kind {
  switch (action) {
    case 'UNLOCK_SUCCESS':
    case 'LEDGER_VIEWED':
      return 'open'
    case 'GRANT_REVOKED':
    case 'GRANT_EXPIRED':
      return 'ended'
    case 'UNLOCK_FAILED':
      return 'wrong'
    case 'PIN_CREATED':
    case 'PIN_ROTATED':
    case 'PIN_REVOKED':
    default:
      return 'pin'
  }
}

/** Only these two actions fold into one line when the same provider repeats them. */
const foldable = (action: LedgerAccessEvent['action']) => action === 'LEDGER_VIEWED' || action === 'UNLOCK_FAILED'

/**
 * Newest first, filtered, then one row per event. A repeat of the same action from the same
 * provider folds into the row directly above it (same day only), so the sequence stays truthful.
 */
function buildRows(events: LedgerAccessEvent[], filter: FilterKey, now: number): FeedRow[] {
  const rows: FeedRow[] = []
  const newestFirst = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  for (const event of newestFirst) {
    const kind = kindOf(event.action)
    if (filter !== 'all' && FILTER_OF[kind] !== filter) continue
    const label = dayLabel(event.createdAt, now)
    const previous: FeedRow | undefined = rows[rows.length - 1]
    const repeat = previous !== undefined
      && previous.label === label
      && foldable(event.action)
      && previous.event.action === event.action
      && (previous.event.provider?.id ?? null) === (event.provider?.id ?? null)
    if (repeat) previous.count += 1
    else rows.push({ label, event, count: 1, kind })
  }
  return rows
}

function chipStyle(selected: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: radius.full,
    border: selected ? `1px solid ${C.blue500}` : `1px solid ${C.border}`,
    background: selected ? C.blue100 : '#fff',
    color: selected ? C.blue500 : C.textSub,
    fontSize: 12,
    fontWeight: selected ? 700 : 500,
    fontFamily: font.family,
    cursor: 'pointer',
  }
}

function Icon({ kind }: { kind: Kind }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'open' && (
        <>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
      {kind === 'ended' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {kind === 'wrong' && (
        <>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      )}
      {kind === 'pin' && (
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      )}
    </svg>
  )
}

function ActivityRow({ row }: { row: FeedRow }) {
  const { event, count, kind } = row
  const { fg, bg } = VISUAL[kind]
  const warn = kind === 'wrong'
  const text = count > 1 ? `${describe(event)} · ${count} times` : describe(event)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: radius.md, background: warn ? 'rgba(245,166,35,0.06)' : undefined }}>
      <span aria-hidden style={{ width: 32, height: 32, borderRadius: radius.full, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon kind={kind} />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: warn ? '#B45309' : C.text, fontWeight: warn ? 600 : 400, lineHeight: 1.45 }}>
        {text}
      </span>
      <span style={{ fontSize: 12.5, color: C.textSub, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{time(event.createdAt)}</span>
    </div>
  )
}

export function LedgerActivityFeed({ events, now, isLoading }: LedgerActivityFeedProps) {
  const { isMobile } = useResponsive()
  const [filter, setFilter] = useState<FilterKey>('all')

  // Chip counts are raw events per category, before any repeats are folded.
  const counts: Record<FilterKey, number> = { all: events.length, access: 0, wrong: 0, pin: 0 }
  for (const event of events) counts[FILTER_OF[kindOf(event.action)]] += 1

  const rows = buildRows(events, filter, now)
  const { pageItems, pager } = usePaged(rows, filter)

  // Regroup the visible page under its day headings. Rows are already in day order.
  const days: Array<{ label: string; rows: FeedRow[] }> = []
  for (const row of pageItems) {
    const last = days[days.length - 1]
    if (last && last.label === row.label) last.rows.push(row)
    else days.push({ label: row.label, rows: [row] })
  }

  return (
    <GGCard padding={isMobile ? '18px 16px' : '22px 24px'}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Activity</h2>
      <p style={{ margin: '3px 0 0', fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
        Every time a provider opens or tries to open your history.
      </p>

      <div role="group" aria-label="Filter activity" style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map(({ key, label }) => {
          const count = counts[key]
          return (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              style={chipStyle(filter === key)}
            >
              {count > 0 ? `${label} · ${count}` : label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div style={stateStyle}>Loading activity…</div>
      ) : events.length === 0 ? (
        <div style={stateStyle}>No activity yet. You’ll see it here when a provider opens your history.</div>
      ) : rows.length === 0 ? (
        <div style={stateStyle}>{filter === 'wrong' ? 'No wrong PIN attempts. Good.' : 'Nothing here yet.'}</div>
      ) : (
        <>
          {days.map((day, index) => (
            <div key={day.label}>
              <h3 style={{ margin: index === 0 ? '14px 0 6px' : '18px 0 6px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textSub }}>
                {day.label}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {day.rows.map(row => <ActivityRow key={row.event.id} row={row} />)}
              </div>
            </div>
          ))}
          <Pager {...pager} />
        </>
      )}
    </GGCard>
  )
}
