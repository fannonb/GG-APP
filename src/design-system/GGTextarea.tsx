import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { C, font, radius } from './tokens'

interface GGTextareaProps {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void
  required?: boolean
  rows?: number
}

export function GGTextarea({ label, placeholder, value, onChange, required = false, rows = 4 }: GGTextareaProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>
          {label}
          {required && <span style={{ color: C.error }}> *</span>}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        style={{
          padding: '10px 14px',
          fontSize: '14px',
          fontFamily: font.family,
          fontWeight: 500,
          color: C.text,
          background: focused ? '#fff' : C.bg,
          border: `1.5px solid ${focused ? C.blue500 : C.border}`,
          borderRadius: radius.sm,
          outline: 'none',
          transition: 'all 0.15s ease',
          resize: 'vertical',
          boxShadow: focused ? '0 0 0 3px rgba(74,173,223,0.12)' : 'none',
          boxSizing: 'border-box',
          width: '100%',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  )
}
