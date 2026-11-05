import { useRef } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { LEDGER_PIN_EXPIRY_OPTIONS, pinExpiryDate } from './pinExpiry'

const SELECTED_ACCENT = '#0B7BC0'

export interface PinExpiryPickerProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  /** Fixed timestamp from the parent so dates don't shift while the page is open. */
  now: number
}

export function PinExpiryPicker({ value, onChange, now }: PinExpiryPickerProps) {
  const { isMobile } = useResponsive()
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const lastIndex = LEDGER_PIN_EXPIRY_OPTIONS.length - 1
  const selectedIndex = LEDGER_PIN_EXPIRY_OPTIONS.findIndex(option => option.value === value)
  // Roving tab stop: the selected option, or the first one if the value matches none of them.
  const tabStopIndex = selectedIndex === -1 ? 0 : selectedIndex
  const expiryDate = pinExpiryDate(value, now)

  const selectIndex = (index: number) => {
    onChange(LEDGER_PIN_EXPIRY_OPTIONS[index].value)
    buttonRefs.current[index]?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = index === lastIndex ? 0 : index + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = index === 0 ? lastIndex : index - 1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = lastIndex
        break
      default:
        return
    }
    event.preventDefault()
    selectIndex(next)
  }

  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, fontFamily: font.family }}>
      <legend style={{ fontSize: 14, fontWeight: 700, color: C.text, padding: 0, marginBottom: 4 }}>
        When should this PIN stop working?
      </legend>
      <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 12 }}>
        After that, you’ll need to set a new one before a provider can open your history.
      </div>

      <div
        role="radiogroup"
        aria-label="PIN expiry"
        style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 8 }}
      >
        {LEDGER_PIN_EXPIRY_OPTIONS.map((option, index) => {
          const selected = index === selectedIndex
          const optionDate = pinExpiryDate(option.value, now)
          return (
            <button
              key={option.label}
              ref={element => { buttonRefs.current[index] = element }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={index === tabStopIndex ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={event => handleKeyDown(event, index)}
              style={{
                padding: selected ? '12px 8px' : '13px 9px',
                borderRadius: radius.md,
                border: selected ? `2px solid ${SELECTED_ACCENT}` : `1px solid ${C.border}`,
                background: selected ? C.blue100 : '#fff',
                textAlign: 'center',
                fontFamily: font.family,
                cursor: 'pointer',
                minHeight: 72,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                transition: 'border-color 0.12s, background 0.12s',
                gridColumn: isMobile && index === lastIndex ? '1 / -1' : undefined,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: selected ? SELECTED_ACCENT : C.text }}>{option.label}</span>
              <span style={{ fontSize: 11.5, color: C.textSub }}>
                {optionDate === null ? 'No end date' : `until ${optionDate}`}
              </span>
              {option.note && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: radius.full,
                    background: 'rgba(34,197,94,0.12)',
                    color: '#15803D',
                    marginTop: 3,
                  }}
                >
                  {option.note}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 12.5, color: C.textSub }}>
        {expiryDate === null ? (
          'Your PIN keeps working until you change or turn it off.'
        ) : (
          <>
            Your PIN will stop working on <span style={{ fontWeight: 700, color: C.text }}>{expiryDate}</span>.
          </>
        )}
      </div>
    </fieldset>
  )
}
