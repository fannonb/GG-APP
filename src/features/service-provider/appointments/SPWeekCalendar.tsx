import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { route } from '@/router/routes'
import { formatTime12h } from '@/utils/format'
import { getAppointmentDisplayStatus } from '@/utils/appointments'
import type { Appointment } from '@/types/appointment.types'

const CYAN_DEEP = '#0B7BC0'

function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (d.getDay() + 6) % 7 // Monday-first
  d.setDate(d.getDate() - offset)
  return d
}

function dayKey(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

const navBtn: React.CSSProperties = {
  height: 32,
  minWidth: 32,
  padding: '0 10px',
  borderRadius: radius.sm,
  border: `1px solid ${C.border}`,
  background: '#fff',
  color: C.text,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
}

/** Monday–Sunday schedule grid; each appointment opens its detail page. */
export function SPWeekCalendar({ appointments }: { appointments: Appointment[] }) {
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const todayKey = dayKey(new Date())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const byDay = new Map<string, Appointment[]>()
  for (const apt of appointments) {
    const key = apt.date.slice(0, 10)
    byDay.set(key, [...(byDay.get(key) ?? []), apt])
  }
  for (const list of byDay.values()) list.sort((a, b) => a.time.localeCompare(b.time))

  const weekTotal = days.reduce((n, d) => n + (byDay.get(dayKey(d))?.length ?? 0), 0)
  const shift = (weeks: number) => {
    const next = new Date(weekStart)
    next.setDate(weekStart.getDate() + weeks * 7)
    setWeekStart(next)
  }

  const weekEnd = days[6]
  const sortedKeys = [...byDay.keys()].sort()
  const nextKey = sortedKeys.find(k => k > dayKey(weekEnd))
  const prevKey = [...sortedKeys].reverse().find(k => k < dayKey(weekStart))
  const jumpTarget = nextKey ?? prevKey

  const rangeLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <section aria-label="Week schedule" style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: 16, fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{rangeLabel}</div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
            {weekTotal === 0 ? 'No appointments this week' : `${weekTotal} appointment${weekTotal === 1 ? '' : 's'}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={navBtn} aria-label="Previous week" onClick={() => shift(-1)}>‹</button>
          <button type="button" style={navBtn} onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</button>
          <button type="button" style={navBtn} aria-label="Next week" onClick={() => shift(1)}>›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
        {days.map(day => {
          const key = dayKey(day)
          const isToday = key === todayKey
          const items = byDay.get(key) ?? []
          return (
            <div key={key} style={{ minHeight: 180, borderRadius: radius.md, background: isToday ? C.blue100 : C.bg, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ textAlign: 'center', paddingBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? CYAN_DEEP : C.text }}>{day.getDate()}</div>
              </div>
              {items.map(apt => {
                const status = getAppointmentDisplayStatus(apt)
                const isNew = status === 'new'
                const name = !apt.forSelf && apt.beneficiary ? apt.beneficiary.name : apt.patient
                return (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => navigate(route.spAppointment(apt.id), { state: { apt } })}
                    title={`${name} · ${apt.service}`}
                    style={{
                      all: 'unset',
                      boxSizing: 'border-box',
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: '#fff',
                      borderLeft: `3px solid ${isNew ? '#F59E0B' : status === 'completed' ? C.textLight : CYAN_DEEP}`,
                      boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: isNew ? '#B45309' : CYAN_DEEP }}>
                      {formatTime12h(apt.time)}{isNew ? ' · New' : ''}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ fontSize: 11, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.service}</div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {weekTotal === 0 && jumpTarget && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button type="button" style={{ ...navBtn, color: CYAN_DEEP, borderColor: 'rgba(11,123,192,0.35)' }} onClick={() => setWeekStart(startOfWeek(new Date(jumpTarget)))}>
            {nextKey ? 'Go to next booked week' : 'Go to last booked week'}
          </button>
        </div>
      )}
    </section>
  )
}
