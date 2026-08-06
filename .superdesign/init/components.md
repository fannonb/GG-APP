# Shared UI primitives

Framework: React 19 + TypeScript + Vite. Component library: custom GG'APP primitives. Styling is primarily React inline styles backed by `src/design-system/tokens.ts`; no Tailwind, CSS Modules, or third-party UI kit is configured.

The complete sources below are the canonical reusable primitives. Authentication-specific shared brand components are documented in `layouts.md` because they define page structure rather than basic controls.

## GGButton
- Source: `src/design-system/GGButton.tsx`
- Description: Brand button primitive with visual variants, sizes, loading state, and full-width option.

```tsx
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { C, font, radius } from './tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'navy' | 'warning'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface GGButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: CSSProperties
  type?: 'button' | 'submit' | 'reset'
}

const SIZES: Record<ButtonSize, CSSProperties> = {
  xs: { padding: '5px 12px',  fontSize: '12px', height: '28px' },
  sm: { padding: '7px 16px',  fontSize: '13px', height: '34px' },
  md: { padding: '10px 22px', fontSize: '14px', height: '42px' },
  lg: { padding: '13px 30px', fontSize: '16px', height: '52px' },
}

export function GGButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  style: sx,
  type = 'button',
}: GGButtonProps) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const isDisabled = disabled || loading

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: font.family,
    fontWeight: 600,
    borderRadius: radius.sm,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.16s ease',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.5 : 1,
    letterSpacing: '-0.01em',
  }

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: hovered ? '#3B9FD4' : C.blue500,
      color: '#fff',
      boxShadow: hovered ? '0 4px 16px rgba(74,173,223,0.45)' : '0 2px 6px rgba(74,173,223,0.22)',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
    navy: {
      background: hovered ? C.navy600 : C.navy800,
      color: '#fff',
      boxShadow: hovered ? '0 4px 14px rgba(13,30,66,0.28)' : 'none',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
    secondary: {
      background: hovered ? C.blue100 : C.bg,
      color: C.navy800,
      border: `1.5px solid ${hovered ? C.blue500 : C.border}`,
    },
    ghost: {
      background: hovered ? C.bg : 'transparent',
      color: C.textSub,
    },
    danger: {
      background: hovered ? '#d43e44' : C.error,
      color: '#fff',
      boxShadow: hovered ? '0 4px 14px rgba(229,71,77,0.3)' : 'none',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
    success: {
      background: hovered ? '#18b07a' : C.success,
      color: '#fff',
      boxShadow: hovered ? '0 4px 14px rgba(34,201,138,0.3)' : 'none',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
    outline: {
      background: hovered ? C.blue100 : 'transparent',
      color: C.blue500,
      border: `1.5px solid ${C.blue500}`,
    },
    warning: {
      background: hovered ? '#e09520' : C.warning,
      color: '#fff',
      boxShadow: hovered ? '0 4px 14px rgba(245,166,35,0.3)' : 'none',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
  }

  return (
    <>
      {loading && <style>{'@keyframes gg-spin { to { transform: rotate(360deg) } }'}</style>}
      <button
        type={type}
        onClick={isDisabled ? undefined : onClick}
        style={{ ...base, ...SIZES[size], ...variants[variant], opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer', ...(sx ?? {}) }}
        onMouseEnter={() => !isDisabled && setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false) }}
        onMouseDown={() => !isDisabled && setPressed(true)}
        onMouseUp={() => setPressed(false)}
      >
        {loading && (
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              display: 'inline-block',
              animation: 'gg-spin 0.8s linear infinite',
            }}
          />
        )}
        {children}
      </button>
    </>
  )
}
```

## GGInput
- Source: `src/design-system/GGInput.tsx`
- Description: Labeled input primitive with validation, adornments, refs, and configurable focus treatment.

```tsx
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
```

## GGDatePicker
- Source: `src/design-system/GGDatePicker.tsx`
- Description: Date input primitive matching the branded form-field treatment.

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { C, font, radius, shadow } from './tokens'

interface GGDatePickerProps {
  label?: string
  value?: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
  hint?: string
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function parseISO(value?: string): { year: number; month: number; day: number } | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) }
}

function formatDisplay(value?: string): string {
  const parsed = parseISO(value)
  if (!parsed) return ''
  const date = new Date(parsed.year, parsed.month, parsed.day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function GGDatePicker({
  label,
  value,
  onChange,
  required = false,
  error,
  hint,
  min,
  max,
  placeholder = 'Select date',
  disabled = false,
}: GGDatePickerProps) {
  const today = useMemo(() => new Date(), [])
  const selected = parseISO(value)
  const minParsed = parseISO(min)
  const maxParsed = parseISO(max)

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selected?.year ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.month ?? today.getMonth())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setViewYear(selected?.year ?? today.getFullYear())
    setViewMonth(selected?.month ?? today.getMonth())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const isDisabledDate = (year: number, month: number, day: number) => {
    const iso = toISO(year, month, day)
    if (minParsed && iso < toISO(minParsed.year, minParsed.month, minParsed.day)) return true
    if (maxParsed && iso > toISO(maxParsed.year, maxParsed.month, maxParsed.day)) return true
    return false
  }

  const yearOptions = useMemo(() => {
    const hi = maxParsed?.year ?? today.getFullYear() + 10
    const lo = minParsed?.year ?? today.getFullYear() - 110
    const years: number[] = []
    for (let y = hi; y >= lo; y -= 1) years.push(y)
    return years
  }, [minParsed, maxParsed, today])

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const totalDays = daysInMonth(viewYear, viewMonth)
  const prevMonthDays = daysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1)

  const cells: Array<{ day: number; year: number; month: number; inMonth: boolean }> = []
  for (let i = 0; i < firstWeekday; i += 1) {
    const month = viewMonth === 0 ? 11 : viewMonth - 1
    const year = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ day: prevMonthDays - firstWeekday + 1 + i, year, month, inMonth: false })
  }
  for (let d = 1; d <= totalDays; d += 1) {
    cells.push({ day: d, year: viewYear, month: viewMonth, inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const trailingIndex = cells.length - (firstWeekday + totalDays)
    const month = viewMonth === 11 ? 0 : viewMonth + 1
    const year = viewMonth === 11 ? viewYear + 1 : viewYear
    cells.push({ day: trailingIndex + 1, year, month, inMonth: false })
  }

  const goToMonth = (delta: number) => {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewYear(y)
    setViewMonth(m)
  }

  const selectDay = (year: number, month: number, day: number) => {
    if (isDisabledDate(year, month, day)) return
    onChange(toISO(year, month, day))
    setOpen(false)
  }

  const goToToday = () => {
    if (isDisabledDate(today.getFullYear(), today.getMonth(), today.getDate())) return
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    onChange(toISO(today.getFullYear(), today.getMonth(), today.getDate()))
    setOpen(false)
  }

  const selectStyle = {
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    fontWeight: 700,
    color: C.text,
    fontFamily: font.family,
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} ref={containerRef}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, letterSpacing: '-0.01em', fontFamily: font.family }}>
          {label}
          {required && <span style={{ color: C.error }}> *</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '10px 14px',
            fontSize: '14px',
            fontFamily: font.family,
            fontWeight: 500,
            color: selected ? C.text : C.textLight,
            background: open ? '#fff' : C.bg,
            border: `1.5px solid ${error ? C.error : open ? C.blue500 : C.border}`,
            borderRadius: radius.sm,
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: open ? `0 0 0 3px ${error ? 'rgba(229,71,77,0.1)' : 'rgba(74,173,223,0.12)'}` : 'none',
            boxSizing: 'border-box',
            opacity: disabled ? 0.6 : 1,
            textAlign: 'left',
          }}
        >
          <span>{selected ? formatDisplay(value) : placeholder}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: C.textSub }}>
            <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: 300,
              background: '#fff',
              border: `1.5px solid ${C.border}`,
              borderRadius: radius.sm,
              boxShadow: shadow.lg,
              zIndex: 200,
              padding: '14px',
              fontFamily: font.family,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '6px' }}>
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                aria-label="Previous month"
                style={{ width: 26, height: 26, border: `1px solid ${C.border}`, borderRadius: radius.xs, background: C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub, flexShrink: 0 }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M6.5 1.5l-4 3.5 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))} style={selectStyle}>
                  {MONTH_LABELS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))} style={selectStyle}>
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={() => goToMonth(1)}
                aria-label="Next month"
                style={{ width: 26, height: 26, border: `1px solid ${C.border}`, borderRadius: radius.xs, background: C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub, flexShrink: 0 }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 1.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {WEEKDAY_LABELS.map(w => (
                <div key={w} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: C.textLight, padding: '4px 0' }}>{w}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {cells.map((cell, i) => {
                const isSelected = !!selected && selected.year === cell.year && selected.month === cell.month && selected.day === cell.day
                const isToday = cell.year === today.getFullYear() && cell.month === today.getMonth() && cell.day === today.getDate()
                const isDisabledCell = isDisabledDate(cell.year, cell.month, cell.day)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isDisabledCell}
                    onClick={() => selectDay(cell.year, cell.month, cell.day)}
                    style={{
                      aspectRatio: '1',
                      border: isToday && !isSelected ? `1.5px solid ${C.blue500}` : 'none',
                      borderRadius: radius.xs,
                      background: isSelected ? C.blue500 : 'transparent',
                      color: isDisabledCell ? C.textLight : isSelected ? '#fff' : cell.inMonth ? C.text : C.textLight,
                      fontSize: '12px',
                      fontWeight: isSelected || isToday ? 700 : 500,
                      fontFamily: font.family,
                      cursor: isDisabledCell ? 'not-allowed' : 'pointer',
                      opacity: isDisabledCell ? 0.4 : 1,
                    }}
                    onMouseEnter={e => { if (!isSelected && !isDisabledCell) e.currentTarget.style.background = C.blue100 }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                style={{ border: 'none', background: 'none', color: C.textSub, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family, padding: '4px 6px' }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={goToToday}
                style={{ border: 'none', background: 'none', color: C.blue500, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: font.family, padding: '4px 6px' }}
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
      {error && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, fontFamily: font.family }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{hint}</span>}
    </div>
  )
}
```

## GGSelect
- Source: `src/design-system/GGSelect.tsx`
- Description: Labeled select primitive with validation and placeholder handling.

```tsx
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
```

## GGTextarea
- Source: `src/design-system/GGTextarea.tsx`
- Description: Labeled multiline input primitive with validation.

```tsx
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
```

## GGCard
- Source: `src/design-system/GGCard.tsx`
- Description: Surface/card primitive using shared radius, border, and shadow tokens.

```tsx
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { radius, shadow } from './tokens'

interface GGCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
  padding?: string
  noPad?: boolean
}

export function GGCard({ 
  children, 
  style: sx, 
  onClick, 
  padding = '24px', 
  noPad = false, 
  onMouseEnter,
  onMouseLeave,
  ...rest 
}: GGCardProps) {
  const [hovered, setHovered] = useState(false)
  const clickable = !!onClick

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => {
        if (clickable) setHovered(true)
        if (onMouseEnter) onMouseEnter(e)
      }}
      onMouseLeave={(e) => {
        if (clickable) setHovered(false)
        if (onMouseLeave) onMouseLeave(e)
      }}
      style={{
        background: '#fff',
        borderRadius: radius.lg,
        boxShadow: hovered ? shadow.md : shadow.sm,
        padding: noPad ? 0 : padding,
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        cursor: clickable ? 'pointer' : 'default',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
```

## GGBadge
- Source: `src/design-system/GGBadge.tsx`
- Description: Compact semantic status badge.

```tsx
import type { ReactNode } from 'react'
import { C, font, radius } from './tokens'

export type BadgeType = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'navy' | 'outline' | 'open' | 'closed' | 'pending'
type BadgeSize = 'sm' | 'md'

interface GGBadgeProps {
  children: ReactNode
  type?: BadgeType
  size?: BadgeSize
}

const STYLES: Record<BadgeType, { background: string; color: string; border?: string }> = {
  default:  { background: C.bg,        color: C.textSub },
  primary:  { background: C.blue100,   color: C.blue500 },
  success:  { background: C.successBg, color: C.success },
  warning:  { background: C.warningBg, color: C.warning },
  error:    { background: C.errorBg,   color: C.error },
  info:     { background: C.blue100,   color: C.navy700 },
  navy:     { background: C.navy800,   color: '#fff' },
  outline:  { background: 'transparent', color: C.textSub, border: `1px solid ${C.border}` },
  open:     { background: C.successBg,   color: C.success },
  closed:   { background: C.errorBg,     color: C.error },
  pending:  { background: C.warningBg,   color: C.warning },
}

const SIZE_STYLES: Record<BadgeSize, { fontSize: string; padding: string }> = {
  sm: { fontSize: '11px', padding: '3px 9px' },
  md: { fontSize: '13px', padding: '5px 12px' },
}

export function GGBadge({ children, type = 'default', size = 'sm' }: GGBadgeProps) {
  const s = STYLES[type]
  const sz = SIZE_STYLES[size]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: font.family,
      fontWeight: 600,
      borderRadius: radius.full,
      border: s.border ?? 'none',
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      ...s,
      ...sz,
    }}>
      {children}
    </span>
  )
}
```

## GGAvatar
- Source: `src/design-system/GGAvatar.tsx`
- Description: Avatar primitive with image and fallback initials.

```tsx
import { C, font } from './tokens'

interface GGAvatarProps {
  name?: string
  size?: number
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function GGAvatar({ name = '', size = 40 }: GGAvatarProps) {
  const label = name ? initials(name) : '?'
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: C.blue500, // Solid Electric Sky Blue brand color
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: Math.round(size * 0.38) + 'px',
      fontWeight: 700,
      fontFamily: font.family,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {label}
    </div>
  )
}
```

## GGDivider
- Source: `src/design-system/GGDivider.tsx`
- Description: Horizontal separator with optional label.

```tsx
import { C, font } from './tokens'

interface GGDividerProps {
  label?: string
  margin?: string
}

export function GGDivider({ label, margin = '4px 0' }: GGDividerProps) {
  if (!label) {
    return <div style={{ height: '1px', background: C.border, margin }} />
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin }}>
      <div style={{ flex: 1, height: '1px', background: C.border }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: C.textLight, fontFamily: font.family, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: C.border }} />
    </div>
  )
}
```

## StarRating
- Source: `src/design-system/StarRating.tsx`
- Description: Interactive/read-only star rating control.

```tsx
import { C, font } from './tokens'

interface StarRatingProps {
  rating: number
  count?: number
}

export function StarRating({ rating, count }: StarRatingProps) {
  const full = Math.floor(rating)
  const empty = 5 - full

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: C.warning, fontSize: '14px', letterSpacing: '1px' }}>
        {'★'.repeat(full)}{'☆'.repeat(empty)}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>
          ({count})
        </span>
      )}
    </div>
  )
}
```

## ProgressBar
- Source: `src/design-system/ProgressBar.tsx`
- Description: Linear progress indicator.

```tsx
import { C, font, radius } from './tokens'

interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  label?: string
  showPct?: boolean
  height?: number
}

export function ProgressBar({ value, max = 100, color = C.blue500, label, showPct = false, height = 8 }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {(label || showPct) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && <span style={{ fontSize: '13px', fontWeight: 500, color: C.textSub, fontFamily: font.family }}>{label}</span>}
          {showPct && <span style={{ fontSize: '12px', fontWeight: 600, color: C.text, fontFamily: font.family }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{
        width: '100%',
        height,
        background: C.border,
        borderRadius: radius.full,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: radius.full,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}
```

## StepIndicator
- Source: `src/design-system/StepIndicator.tsx`
- Description: Multi-step flow progress indicator.

```tsx
import { C, font } from './tokens'

interface StepIndicatorProps {
  steps: string[]
  current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: done ? C.success : active ? C.blue500 : C.bg,
                border: `2px solid ${done ? C.success : active ? C.blue500 : C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: done || active ? '#fff' : C.textLight,
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: font.family,
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: active ? 700 : 500,
                color: active ? C.text : done ? C.textSub : C.textLight,
                fontFamily: font.family,
                whiteSpace: 'nowrap',
              }}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: done ? C.success : C.border,
                margin: '0 8px',
                marginBottom: '22px',
                transition: 'background 0.2s ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

## index
- Source: `src/design-system/index.ts`
- Description: Public barrel exports for the custom design system.

```ts
export * from './tokens'
export * from './GGButton'
export * from './GGInput'
export * from './GGDatePicker'
export * from './GGSelect'
export * from './GGTextarea'
export * from './GGCard'
export * from './GGBadge'
export * from './GGAvatar'
export * from './GGDivider'
export * from './StarRating'
export * from './ProgressBar'
export * from './StepIndicator'
```
