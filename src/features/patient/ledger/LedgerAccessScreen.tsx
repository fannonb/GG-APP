import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useLedgerAccessLog, useLedgerStatus, useRevokeLedgerGrantMutation, useRevokeLedgerPinMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { formatTimeLeft } from '@/utils/ledger-access'
import type { LedgerAccessEvent } from '@/types/ledger.types'

const CYAN_DEEP = '#0B7BC0'
const DAY = 86_400_000

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

function openedWhen(iso: string, now: number) {
  const day = dayLabel(iso, now)
  return `${day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day} at ${time(iso)}`
}

function describe(event: LedgerAccessEvent): { text: string; tone: 'info' | 'warn' | 'neutral' } {
  const who = event.provider?.name ?? 'A provider'
  switch (event.action) {
    case 'PIN_CREATED': return { text: 'You created your Ledger PIN', tone: 'neutral' }
    case 'PIN_ROTATED': return { text: 'You changed your Ledger PIN', tone: 'neutral' }
    case 'PIN_REVOKED': return { text: 'You turned off your Ledger PIN', tone: 'neutral' }
    case 'UNLOCK_SUCCESS': return { text: `${who} opened your history with your PIN`, tone: 'info' }
    case 'UNLOCK_FAILED': return { text: `${who} entered a wrong PIN`, tone: 'warn' }
    case 'LEDGER_VIEWED': return { text: `${who} viewed your history`, tone: 'info' }
    case 'GRANT_REVOKED': return { text: `You ended ${who}’s access`, tone: 'neutral' }
    case 'GRANT_EXPIRED': return { text: `${who}’s access ended after 24 hours`, tone: 'neutral' }
    default: return { text: String(event.action), tone: 'neutral' }
  }
}

const DOT = { info: CYAN_DEEP, warn: '#D97706', neutral: C.textLight }

/** Group by day and fold repeated "viewed" events from the same provider into one line. */
function groupEvents(events: LedgerAccessEvent[], now: number) {
  const days: Array<{ label: string; rows: Array<{ event: LedgerAccessEvent; count: number }> }> = []
  for (const event of [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) {
    const label = dayLabel(event.createdAt, now)
    let day = days[days.length - 1]
    if (!day || day.label !== label) {
      day = { label, rows: [] }
      days.push(day)
    }
    const repeat = event.action === 'LEDGER_VIEWED'
      ? day.rows.find(row => row.event.action === 'LEDGER_VIEWED' && row.event.provider?.id === event.provider?.id)
      : undefined
    if (repeat) repeat.count += 1
    else day.rows.push({ event, count: 1 })
  }
  return days
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <GGCard padding="20px">
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>{title}</h2>
      {subtitle && <p style={{ margin: '3px 0 0', fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{subtitle}</p>}
      <div style={{ marginTop: 14 }}>{children}</div>
    </GGCard>
  )
}

function Initials({ name }: { name: string }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  return (
    <span aria-hidden style={{ width: 40, height: 40, borderRadius: radius.full, background: C.blue100, color: CYAN_DEEP, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {letters}
    </span>
  )
}

const textBtn = (color: string): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  padding: '6px 4px',
  fontSize: 14,
  fontWeight: 700,
  color,
  cursor: 'pointer',
  fontFamily: font.family,
  whiteSpace: 'nowrap',
})

export function LedgerAccessScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const statusQuery = useLedgerStatus()
  const accessQuery = useLedgerAccessLog()
  const revokeGrant = useRevokeLedgerGrantMutation()
  const revokePin = useRevokeLedgerPinMutation()
  const [now] = useState(() => Date.now())
  const [confirmOff, setConfirmOff] = useState(false)

  const status = statusQuery.data
  const activeGrants = (accessQuery.data?.grants ?? []).filter(grant => grant.status === 'active')
  const days = groupEvents(accessQuery.data?.events ?? [], now)
  const hasPin = status?.hasPin ?? false
  const pinExpired = status?.pinExpired ?? false

  return (
    <AppLayout title="Ledger access" back>
      <div style={{ maxWidth: 760, margin: '0 auto', fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card
          title="Who can see your history now"
          subtitle="A provider gets 24 hours each time you give them your PIN. You can end it early."
        >
          {activeGrants.length === 0 ? (
            <div style={{ fontSize: 14, color: C.textSub }}>Nobody. Your history is private right now.</div>
          ) : (
            activeGrants.map((grant, index) => {
              const total = new Date(grant.expiresAt).getTime() - new Date(grant.unlockedAt).getTime()
              const left = Math.max(0, new Date(grant.expiresAt).getTime() - now)
              const pct = total > 0 ? Math.min(100, (left / total) * 100) : 0
              return (
                <div key={grant.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: index > 0 ? `1px solid ${C.border}` : 'none' }}>
                  <Initials name={grant.provider.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{grant.provider.name}</div>
                    <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>
                      Opened {openedWhen(grant.unlockedAt, now)} · {formatTimeLeft(grant.expiresAt, now)}
                    </div>
                    <div aria-hidden style={{ marginTop: 7, height: 4, borderRadius: 2, background: C.bg, overflow: 'hidden', maxWidth: 240 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: CYAN_DEEP }} />
                    </div>
                  </div>
                  <button type="button" disabled={revokeGrant.isPending} onClick={() => revokeGrant.mutate(grant.id)} style={textBtn(C.error)}>
                    End access
                  </button>
                </div>
              )
            })
          )}
        </Card>

        <Card title="Your Ledger PIN">
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: pinExpired || !hasPin ? '#B45309' : C.text }}>
                {pinExpired ? 'Expired' : hasPin ? 'On' : 'Not set'}
              </div>
              <div style={{ fontSize: 13, color: C.textSub, marginTop: 2, lineHeight: 1.5 }}>
                {pinExpired
                  ? 'Providers can’t open your history until you set a new PIN.'
                  : hasPin
                    ? [
                        status?.pinCreatedAt ? `Set on ${longDate(status.pinCreatedAt)}` : null,
                        status?.pinExpiresAt ? `expires ${longDate(status.pinExpiresAt)}` : 'no expiry date',
                      ].filter(Boolean).join(' · ')
                    : 'Without a PIN, no provider can open your history.'}
              </div>
            </div>
            <GGButton variant={hasPin && !pinExpired ? 'secondary' : 'primary'} size="md" fullWidth={isMobile} onClick={() => navigate(ROUTES.LEDGER_PIN)}>
              {hasPin && !pinExpired ? 'Change PIN' : pinExpired ? 'Set a new PIN' : 'Create PIN'}
            </GGButton>
          </div>

          {hasPin && !pinExpired && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              {confirmOff ? (
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
                    Turning off your PIN ends all current access and stops new providers from opening your history.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <GGButton variant="secondary" size="sm" onClick={() => setConfirmOff(false)}>Keep it on</GGButton>
                    <GGButton variant="danger" size="sm" loading={revokePin.isPending} onClick={() => revokePin.mutate(undefined, { onSuccess: () => setConfirmOff(false) })}>Turn off</GGButton>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmOff(true)} style={{ ...textBtn(C.textSub), padding: 0, fontWeight: 600 }}>
                  Turn off PIN
                </button>
              )}
            </div>
          )}
        </Card>

        <Card title="Activity" subtitle="Every time a provider opens or tries to open your history.">
          {accessQuery.isLoading ? (
            <div style={{ fontSize: 14, color: C.textSub }}>Loading…</div>
          ) : days.length === 0 ? (
            <div style={{ fontSize: 14, color: C.textSub }}>No activity yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {days.map(day => (
                <div key={day.label}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: C.textSub }}>{day.label}</h3>
                  {day.rows.map(({ event, count }) => {
                    const { text, tone } = describe(event)
                    return (
                      <div key={event.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                        <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: DOT[tone], flexShrink: 0, transform: 'translateY(-1px)' }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: tone === 'warn' ? '#B45309' : C.text, fontWeight: tone === 'warn' ? 600 : 400, lineHeight: 1.5 }}>
                          {text}{count > 1 ? ` (${count} times)` : ''}
                        </span>
                        <span style={{ fontSize: 12.5, color: C.textSub, whiteSpace: 'nowrap' }}>{time(event.createdAt)}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </Card>

        <p style={{ margin: '0 4px', fontSize: 12.5, color: C.textSub, lineHeight: 1.6 }}>
          Providers only see visits and prescriptions, never other providers’ private notes. If you think someone has your PIN, change it. That ends everyone’s access at once.
        </p>
      </div>
    </AppLayout>
  )
}
