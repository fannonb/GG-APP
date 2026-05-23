import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { C, font, radius } from './tokens'

export interface SelectOption {
  value: string
  label: string
}

interface GGSelectProps {
  label?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void
  options: SelectOption[]
  required?: boolean
  placeholder?: string
}

export function GGSelect({ label, value, onChange, options, required = false, placeholder }: GGSelectProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, letterSpacing: '-0.01em', fontFamily: font.family }}>
          {label}
          {required && <span style={{ color: C.error }}> *</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '10px 36px 10px 14px',
            fontSize: '14px',
            fontFamily: font.family,
            fontWeight: 500,
            color: value ? C.text : C.textLight,
            background: focused ? '#fff' : C.bg,
            border: `1.5px solid ${focused ? C.blue500 : C.border}`,
            borderRadius: radius.sm,
            outline: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            appearance: 'none',
            boxShadow: focused ? '0 0 0 3px rgba(74,173,223,0.12)' : 'none',
            boxSizing: 'border-box',
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg
          style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="10" height="6" viewBox="0 0 10 6" fill="none"
        >
          <path d="M1 1l4 4 4-4" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
