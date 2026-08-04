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
