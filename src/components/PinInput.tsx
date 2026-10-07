import { useRef, useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'

const CYAN_DEEP = '#0B7BC0'

/**
 * Digit boxes for a 4–6 digit PIN. One hidden input holds the value so paste,
 * autofill and backspace all behave like a normal field; the boxes only draw it.
 */
export function PinInput({
  value,
  onChange,
  length = 6,
  label,
  hint,
  error,
  autoFocus,
  onEnter,
}: {
  value: string
  onChange: (value: string) => void
  length?: number
  label: string
  hint?: string
  error?: string
  autoFocus?: boolean
  onEnter?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const id = `pin-${label.replace(/\W+/g, '-').toLowerCase()}`
  const focusIndex = Math.min(value.length, length - 1)

  return (
    <div style={{ fontFamily: font.family }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', gap: 8 }} onClick={() => inputRef.current?.focus()}>
        <input
          ref={inputRef}
          id={id}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          maxLength={length}
          aria-invalid={!!error}
          onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, length))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={event => { if (event.key === 'Enter') onEnter?.() }}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'text', fontSize: 16 }}
        />
        {Array.from({ length }, (_, i) => {
          const filled = i < value.length
          const isCaret = focused && i === focusIndex
          return (
            <span
              key={i}
              aria-hidden
              style={{
                width: 46,
                height: 52,
                borderRadius: radius.sm,
                border: `1.5px solid ${error ? C.error : filled || isCaret ? CYAN_DEEP : C.border}`,
                background: filled ? C.blue100 : '#fff',
                boxShadow: isCaret ? '0 0 0 3px rgba(11,123,192,0.15)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 1,
                minWidth: 0,
              }}
            >
              {filled && <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.text }} />}
            </span>
          )
        })}
      </div>
      {error
        ? <div role="alert" style={{ fontSize: 12, color: C.error, marginTop: 6 }}>{error}</div>
        : hint && <div style={{ fontSize: 12, color: C.textSub, marginTop: 6 }}>{hint}</div>}
    </div>
  )
}
