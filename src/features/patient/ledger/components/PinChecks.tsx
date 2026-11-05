import type { CSSProperties, ReactElement } from 'react'
import { C, font } from '@/design-system/tokens'
import type { LedgerPinCheck } from './pinRules'
import { checkLedgerPin } from './pinRules'

type Tone = 'ok' | 'fail' | 'advisory' | 'neutral'
type GlyphKind = 'check' | 'cross' | 'bang'

const TONE: Record<Tone, { fg: string; bg: string; text: string }> = {
  ok: { fg: '#15803D', bg: 'rgba(34,197,94,0.12)', text: C.text },
  fail: { fg: C.error, bg: C.errorBg, text: C.error },
  advisory: { fg: '#B45309', bg: 'rgba(245,166,35,0.14)', text: '#B45309' },
  neutral: { fg: C.textSub, bg: C.borderDark, text: C.textSub },
}

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

function rowStyle(tone: Tone): CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, lineHeight: 1.4, color: TONE[tone].text, fontFamily: font.family }
}

function StatusIcon({ tone, glyph }: { tone: Tone; glyph: GlyphKind | null }) {
  const { fg, bg } = TONE[tone]
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 16, height: 16, borderRadius: '50%', background: bg, color: fg }}
    >
      {glyph && (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" focusable="false">
          {glyph === 'check' && <polyline points="20 6 9 17 4 12" />}
          {glyph === 'cross' && (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          )}
          {glyph === 'bang' && (
            <>
              <line x1="12" y1="5" x2="12" y2="14" />
              <line x1="12" y1="18.5" x2="12" y2="19" />
            </>
          )}
        </svg>
      )}
    </span>
  )
}

function describeCheck(check: LedgerPinCheck, pinEmpty: boolean): { tone: Tone; glyph: GlyphKind | null; prefix: string; label: string } {
  if (pinEmpty) return { tone: 'neutral', glyph: null, prefix: '', label: check.label }
  if (check.ok) return { tone: 'ok', glyph: 'check', prefix: 'Met: ', label: check.label }
  if (check.blocking) return { tone: 'fail', glyph: 'cross', prefix: 'Not met: ', label: check.label }
  return { tone: 'advisory', glyph: 'bang', prefix: 'Warning: ', label: `${check.label} (allowed, but easy to guess)` }
}

export function PinChecklist({ pin }: { pin: string }): ReactElement {
  const pinEmpty = pin === ''
  return (
    <ul
      aria-live="polite"
      style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: font.family }}
    >
      {checkLedgerPin(pin).map(check => {
        const row = describeCheck(check, pinEmpty)
        return (
          <li key={check.id} style={rowStyle(row.tone)}>
            <StatusIcon tone={row.tone} glyph={row.glyph} />
            {row.prefix !== '' && <span style={visuallyHidden}>{row.prefix}</span>}
            <span>{row.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function PinMatchStatus({ pin, confirmPin }: { pin: string; confirmPin: string }): ReactElement | null {
  if (confirmPin === '') return null
  if (confirmPin.length < pin.length && pin.startsWith(confirmPin)) return null

  const matched = pin !== '' && confirmPin === pin
  const tone: Tone = matched ? 'ok' : 'fail'
  return (
    <div role="status" aria-live="polite" style={{ marginTop: 8, fontFamily: font.family }}>
      <div style={rowStyle(tone)}>
        <StatusIcon tone={tone} glyph={matched ? 'check' : 'cross'} />
        <span style={visuallyHidden}>{matched ? 'Met: ' : 'Not met: '}</span>
        <span>{matched ? 'PINs match' : 'These don’t match yet'}</span>
      </div>
    </div>
  )
}
