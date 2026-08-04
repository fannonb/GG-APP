import { useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { C, font, radius } from './tokens'

interface GGInputProps {
  label?: string
  placeholder?: string
  type?: string
  name?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  inputRef?: Ref<HTMLInputElement>
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  rightEl?: ReactNode
  focusColor?: string
  focusShadow?: string
}

export function GGInput({
  label,
  placeholder,
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  onKeyDown,
  inputRef,
  error,
  hint,
  required = false,
  disabled = false,
  rightEl,
  focusColor = C.blue500,
  focusShadow = 'rgba(74,173,223,0.12)',
}: GGInputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, letterSpacing: '-0.01em', fontFamily: font.family }}>
          {label}
          {required && <span style={{ color: C.error }}> *</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px 14px',
            paddingRight: rightEl ? '44px' : '14px',
            fontSize: '14px',
            fontFamily: font.family,
            fontWeight: 500,
            color: C.text,
            background: focused ? '#fff' : C.bg,
            border: `1.5px solid ${error ? C.error : focused ? focusColor : C.border}`,
            borderRadius: radius.sm,
            outline: 'none',
            transition: 'all 0.15s ease',
            boxShadow: focused
              ? `0 0 0 3px ${error ? 'rgba(229,71,77,0.1)' : focusShadow}`
              : 'none',
            boxSizing: 'border-box',
            opacity: disabled ? 0.6 : 1,
          }}
          onFocus={() => setFocused(true)}
          onBlur={e => {
            setFocused(false)
            onBlur?.(e)
          }}
        />
        {rightEl && (
          <span style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: C.textSub }}>
            {rightEl}
          </span>
        )}
      </div>
      {error && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, fontFamily: font.family }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{hint}</span>}
    </div>
  )
}
