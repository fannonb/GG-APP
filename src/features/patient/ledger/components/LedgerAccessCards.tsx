import { useState } from 'react'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { formatTimeLeft } from '@/utils/ledger-access'
import type { LedgerAccessGrantView, LedgerStatusResponse } from '@/types/ledger.types'

const BLUE_DEEP = '#0B7BC0'
const AMBER = '#B45309'
const GREEN = '#15803D'
const DAY = 86_400_000
const TWO_HOURS = 2 * 3_600_000

const titleStyle = { margin: 0, fontSize: 16, fontWeight: 800, color: C.text }

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

function capitalise(word: string) {
  const lower = word.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function Initials({ name }: { name: string }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  return (
    <span aria-hidden style={{ width: 40, height: 40, borderRadius: radius.full, background: C.blue100, color: BLUE_DEEP, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {letters}
    </span>
  )
}

function LockIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={BLUE_DEEP} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

export interface ActiveAccessCardProps {
  grants: LedgerAccessGrantView[]      // already filtered to status === 'active'
  now: number
  onEnd: (grantId: string) => void
  /** Grant id currently being ended, to show a loading state on that row only. */
  endingId: string | null
}

export function ActiveAccessCard({ grants, now, onEnd, endingId }: ActiveAccessCardProps) {
  const { isMobile } = useResponsive()

  return (
    <GGCard padding={isMobile ? '18px 16px' : '22px 24px'} style={{ fontFamily: font.family }}>
      <h2 style={titleStyle}>Who can see your history</h2>
      <p style={{ margin: '3px 0 0', fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
        Each provider gets 24 hours from when you give them your PIN.
      </p>

      {grants.length === 0 ? (
        <div style={{ marginTop: 14, padding: '16px', background: C.bg, borderRadius: radius.md, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span aria-hidden style={{ width: 36, height: 36, borderRadius: radius.full, background: 'rgba(34,197,94,0.12)', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LockIcon />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>Nobody right now. Your history is private.</div>
            <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>When you share your PIN with a provider, they’ll appear here.</div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {grants.map(grant => {
            const expiresMs = new Date(grant.expiresAt).getTime()
            const total = expiresMs - new Date(grant.unlockedAt).getTime()
            const left = Math.max(0, expiresMs - now)
            const pct = total > 0 ? Math.min(100, (left / total) * 100) : 0
            const low = left < TWO_HOURS
            return (
              <div key={grant.id} style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <Initials name={grant.provider.name} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{grant.provider.name}</div>
                  <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>
                    {capitalise(grant.provider.category)} · Opened {openedWhen(grant.unlockedAt, now)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 8, maxWidth: 280, fontSize: 12, color: C.textSub }}>
                    <span>Time left</span>
                    <span style={{ fontWeight: 600, color: C.text }}>{formatTimeLeft(grant.expiresAt, now)}</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    aria-label="Time left"
                    style={{ marginTop: 8, height: 6, borderRadius: 3, background: C.bg, overflow: 'hidden', maxWidth: 280 }}
                  >
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: low ? AMBER : BLUE_DEEP }} />
                  </div>
                </div>
                <GGButton
                  variant="secondary"
                  size="sm"
                  loading={endingId === grant.id}
                  onClick={() => onEnd(grant.id)}
                  style={{ color: C.error }}
                >
                  End access
                </GGButton>
              </div>
            )
          })}
        </div>
      )}
    </GGCard>
  )
}

export interface LedgerPinCardProps {
  status: LedgerStatusResponse | undefined
  onChangePin: () => void
  onTurnOff: () => void
  turningOff: boolean
}

export function LedgerPinCard({ status, onChangePin, onTurnOff, turningOff }: LedgerPinCardProps) {
  const { isMobile } = useResponsive()
  const [confirmOff, setConfirmOff] = useState(false)

  const hasPin = status?.hasPin ?? false
  const pinExpired = status?.pinExpired ?? false
  const active = hasPin && !pinExpired
  const statusColor = active ? GREEN : AMBER
  const statusLabel = pinExpired ? 'Expired' : hasPin ? 'On' : 'Not set'
  const detail = pinExpired
    ? 'Providers can’t open your history until you set a new PIN.'
    : hasPin
      ? [
          status?.pinCreatedAt ? `Set on ${longDate(status.pinCreatedAt)}` : null,
          status?.pinExpiresAt ? `expires ${longDate(status.pinExpiresAt)}` : 'no expiry date',
        ].filter(Boolean).join(' · ')
      : 'Without a PIN, no provider can open your history.'

  return (
    <GGCard padding={isMobile ? '18px 16px' : '22px 24px'} style={{ fontFamily: font.family }}>
      <h2 style={titleStyle}>Your Ledger PIN</h2>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: radius.full, background: statusColor, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
        </div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>{detail}</div>
      </div>

      <GGButton
        variant={active ? 'secondary' : 'primary'}
        size="md"
        fullWidth
        onClick={onChangePin}
        style={{ marginTop: 14 }}
      >
        {active ? 'Change PIN' : pinExpired ? 'Set a new PIN' : 'Create PIN'}
      </GGButton>

      {active && (
        <div style={{ margin: '16px 0 0', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {confirmOff ? (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 10 }}>
              <div style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
                Turning off your PIN ends all current access and stops new providers from opening your history.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <GGButton variant="secondary" size="sm" onClick={() => setConfirmOff(false)}>Keep it on</GGButton>
                <GGButton variant="danger" size="sm" loading={turningOff} onClick={onTurnOff}>Turn off</GGButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmOff(true)}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 600, color: C.textSub, cursor: 'pointer', fontFamily: font.family }}
            >
              Turn off PIN
            </button>
          )}
        </div>
      )}
    </GGCard>
  )
}

const SAFETY_TIPS = [
  'Only share your PIN with a provider you are with, for the visit you are having.',
  'Providers see visits and prescriptions, never other providers’ private notes.',
  'If you think someone has your PIN, change it. That ends everyone’s access at once.',
]

export function LedgerSafetyCard() {
  const { isMobile } = useResponsive()

  return (
    <GGCard padding={isMobile ? '18px 16px' : '22px 24px'} style={{ fontFamily: font.family }}>
      <h2 style={titleStyle}>Keeping your history safe</h2>
      <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SAFETY_TIPS.map(tip => (
          <li key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>
            <ShieldCheckIcon />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </GGCard>
  )
}
