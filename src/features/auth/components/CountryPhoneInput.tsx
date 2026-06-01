import { useState, useRef, useEffect } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { COUNTRIES } from '@/config/countries'
import { FlagImg } from '@/components/FlagImg'

export type { CountryCode } from '@/config/countries'

interface Props {
  required?: boolean
  countryCode: string
  onCountryChange: (code: string) => void
  digits: string
  onDigitsChange: (digits: string) => void
}

export function CountryPhoneInput({ required, countryCode, onCountryChange, digits, onDigitsChange }: Props) {
  const [open, setOpen] = useState(false)
  const [countryFocused, setCountryFocused] = useState(false)
  const [phoneFocused, setPhoneFocused] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selected = COUNTRIES.find(c => c.code === countryCode)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const FieldLabel = ({ text }: { text: string }) => (
    <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, letterSpacing: '-0.01em', fontFamily: font.family }}>
      {text}{required && <span style={{ color: C.error }}> *</span>}
    </label>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Country Field ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <FieldLabel text="Country" />
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setOpen(o => !o); setCountryFocused(true) }}
            onBlur={() => { if (!open) setCountryFocused(false) }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              fontSize: '14px',
              fontFamily: font.family,
              fontWeight: 500,
              color: selected ? C.text : C.textLight,
              background: countryFocused || open ? '#fff' : C.bg,
              border: `1.5px solid ${open || countryFocused ? C.blue500 : C.border}`,
              borderRadius: radius.sm,
              outline: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: open || countryFocused ? '0 0 0 3px rgba(74,173,223,0.12)' : 'none',
              boxSizing: 'border-box',
              textAlign: 'left',
            }}
          >
            {selected ? (
              <>
                <FlagImg code={selected.code} size={22} />
                <span style={{ flex: 1 }}>{selected.name}</span>
              </>
            ) : (
              <span style={{ flex: 1 }}>Select country</span>
            )}
            <svg
              width="10" height="6" viewBox="0 0 10 6" fill="none"
              style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M1 1l4 4 4-4" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: '#fff',
              border: `1.5px solid ${C.border}`,
              borderRadius: radius.sm,
              boxShadow: '0 8px 24px rgba(9,28,68,0.1)',
              zIndex: 200,
              overflow: 'hidden',
            }}>
              {COUNTRIES.map((c, i) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onCountryChange(c.code); setOpen(false); setCountryFocused(false) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '11px 14px',
                    background: countryCode === c.code ? C.blue100 : 'transparent',
                    border: 'none',
                    borderBottom: i < COUNTRIES.length - 1 ? `1px solid ${C.border}` : 'none',
                    cursor: 'pointer',
                    fontFamily: font.family,
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                >
                  <FlagImg code={c.code} size={24} />
                  <span style={{ fontSize: '14px', fontWeight: countryCode === c.code ? 700 : 500, color: C.text, flex: 1 }}>{c.name}</span>
                  <span style={{ fontSize: '13px', color: C.textSub }}>{c.dial}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Phone Number Field ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <FieldLabel text="Phone Number" />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          border: `1.5px solid ${phoneFocused ? C.blue500 : C.border}`,
          borderRadius: radius.sm,
          background: phoneFocused ? '#fff' : C.bg,
          boxShadow: phoneFocused ? '0 0 0 3px rgba(74,173,223,0.12)' : 'none',
          overflow: 'hidden',
          transition: 'all 0.15s ease',
          opacity: !countryCode ? 0.55 : 1,
        }}>
          {/* Prefix: flag + dial code */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '10px 12px',
            borderRight: `1.5px solid ${C.border}`,
            flexShrink: 0,
            userSelect: 'none',
          }}>
            {selected
              ? <FlagImg code={selected.code} size={22} />
              : <div style={{ width: 22, height: 16, borderRadius: '2px', background: C.border }} />
            }
            <span style={{ fontSize: '13px', fontWeight: 700, color: selected ? C.text : C.textLight, fontFamily: font.family, whiteSpace: 'nowrap' }}>
              {selected ? selected.dial : '—'}
            </span>
          </div>

          {/* Digits input */}
          <input
            type="tel"
            inputMode="numeric"
            value={digits}
            placeholder={selected ? selected.phonePlaceholder : 'Select a country first'}
            onChange={e => onDigitsChange(e.target.value.replace(/\D/g, ''))}
            onFocus={() => setPhoneFocused(true)}
            onBlur={() => setPhoneFocused(false)}
            disabled={!countryCode}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '14px',
              fontFamily: font.family,
              fontWeight: 500,
              color: C.text,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              minWidth: 0,
            }}
          />
        </div>
      </div>

    </div>
  )
}
