import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGAvatar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatDate } from '@/utils/format'
import { MOCK_SP_APPOINTMENTS } from '@/mock/sp.mock'
import type { Appointment } from '@/types/appointment.types'

const STATUS_MAP: Record<string, { bg: string; color: string; border?: string; label: string; icon?: string; accentBorder: string }> = {
  new:       { bg: 'transparent', color: C.navy800, border: `1px solid ${C.navy800}`, label: 'New Request', accentBorder: C.navy800 },
  confirmed: { bg: C.navy800,   color: '#FFFFFF', label: 'Confirmed', accentBorder: C.navy800 },
  completed: { bg: C.blue100,   color: C.navy800, label: 'Completed', accentBorder: C.blue500, icon: '✓' },
  cancelled: { bg: C.errorBg,   color: C.textSub, label: 'Cancelled', accentBorder: C.textSub },
}

function SPStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.new
  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '5px', 
      padding: '3px 10px', 
      borderRadius: radius.full, 
      background: s.bg, 
      border: s.border ?? 'none',
      fontSize: '11px', 
      fontWeight: 700, 
      color: s.color, 
      fontFamily: font.family 
    }}>
      {s.icon ? (
        <span style={{ marginRight: '2px', fontWeight: 900 }}>{s.icon}</span>
      ) : (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      )}
      {s.label}
    </span>
  )
}
function AppointmentCard({ apt }: { apt: Appointment }) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()

  return (
    <div style={{ background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Main content */}
      <div style={{ flex: 1, padding: isMobile ? '16px' : '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>
          <GGAvatar name={apt.patient} size={44} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: C.text, cursor: 'pointer' }}
              onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>
              {apt.patient}
            </span>
            {!apt.forSelf && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: C.blue500, background: C.blue100, padding: '2px 8px', borderRadius: radius.full, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Beneficiary
              </span>
            )}
          </div>

          {/* Details Row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: C.text, fontWeight: 700, background: C.bg, padding: '3px 8px', borderRadius: radius.sm }}>
              {apt.service}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.text, fontWeight: 500 }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={C.blue500} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V4.5A1.5 1.5 0 013.5 3h9A1.5 1.5 0 0114 4.5z" />
                <path d="M1 6h14M5 1v3M11 1v3" />
              </svg>
              {formatDate(apt.date)} at {apt.time}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.text, fontWeight: 500 }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={C.blue500} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.333 2.667v10.666a1.333 1.333 0 001.334 1.334h10.666a1.333 1.333 0 001.334-1.334V2.667A1.333 1.333 0 0013.333 1.333H2.667A1.333 1.333 0 001.333 2.667z" />
              </svg>
              {apt.phone}
            </span>
            {apt.attachments.length > 0 && (
              <span style={{ fontSize: '12px', color: C.blue500, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 6.5a3 3 0 01-3 3H3a2 2 0 010-4h5a1 1 0 010 2H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                {apt.attachments.length} attachment{apt.attachments.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Beneficiary indicator */}
          {!apt.forSelf && apt.beneficiary && (
            <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: C.bg, padding: '6px 12px', borderRadius: radius.sm, borderLeft: `2.5px solid ${C.blue500}` }}>
              <span style={{ fontWeight: 600, color: C.text }}>For:</span>
              <span>{apt.beneficiary.name} ({apt.beneficiary.relation}, Age {apt.beneficiary.age})</span>
            </div>
          )}

          <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5, background: '#fff', borderLeft: `3px solid ${C.border}`, padding: '4px 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {apt.description}
          </div>
        </div>
      </div>

      {/* Right action panel — fixed 180px */}
      {!isMobile && (
        <div style={{ width: 180, flexShrink: 0, borderLeft: `1px solid ${C.border}`, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
          <SPStatusBadge status={apt.status} />
          <div style={{ fontSize: '11px', color: C.textSub, fontWeight: 600 }}>{apt.id}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
            {apt.status === 'new' && <>
              <GGButton variant="primary" size="sm" fullWidth onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>Accept</GGButton>
              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                <GGButton variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>Details</GGButton>
                <GGButton variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>Decline</GGButton>
              </div>
            </>}
            {apt.status === 'confirmed' && <>
              <GGButton variant="primary" size="sm" fullWidth onClick={() => navigate('/sp/invoices/upload')}>Upload Invoice</GGButton>
              <GGButton variant="secondary" size="sm" fullWidth onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>Details</GGButton>
            </>}
            {apt.status === 'completed' && <>
              <GGButton variant="secondary" size="sm" fullWidth onClick={() => navigate('/sp/invoices/upload')}>Upload Invoice</GGButton>
              <GGButton variant="ghost" size="sm" fullWidth onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>Details</GGButton>
            </>}
            {apt.status === 'cancelled' && (
              <GGButton variant="ghost" size="sm" fullWidth onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>View Details</GGButton>
            )}
          </div>
        </div>
      )}

      {/* Mobile action row */}
      {isMobile && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <SPStatusBadge status={apt.status} />
          {apt.status === 'new' && <>
            <GGButton variant="primary" size="sm" onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>Accept</GGButton>
            <GGButton variant="ghost" size="sm" onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>Decline</GGButton>
          </>}
          {apt.status === 'confirmed' && <GGButton variant="primary" size="sm" onClick={() => navigate('/sp/invoices/upload')}>Upload Invoice</GGButton>}
          <GGButton variant="secondary" size="sm" onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>Details</GGButton>
        </div>
      )}
    </div>
  )
}

// ─── Calendar View ──────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function CalendarView() {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const { isMobile } = useResponsive()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const aptsByDay: Record<number, Appointment[]> = {}
  MOCK_SP_APPOINTMENTS.forEach(apt => {
    const d = new Date(apt.date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!aptsByDay[day]) aptsByDay[day] = []
      aptsByDay[day].push(apt)
    }
  })

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const selectedApts = selectedDay ? (aptsByDay[selectedDay] ?? []) : []

  const statusCounts = { new: 0, confirmed: 0, completed: 0, cancelled: 0 }
  Object.values(aptsByDay).flat().forEach(a => { if (a.status in statusCounts) statusCounts[a.status as keyof typeof statusCounts]++ })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: '20px', alignItems: 'start' }}>
      {/* Calendar grid */}
      <GGCard padding="0px" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: C.navy800, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}>‹</button>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{MONTHS[month]} {year}</div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: i === 0 || i === 6 ? C.textSub : C.textSub, letterSpacing: '0.06em', fontFamily: font.family }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={'empty-' + i} style={{ minHeight: 80, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.bg }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const isSelected = day === selectedDay
            const dayApts = aptsByDay[day] ?? []
            const col = (firstDay + i) % 7
            const isWeekend = col === 0 || col === 6

            return (
              <div key={day} onClick={() => setSelectedDay(day)}
                style={{ minHeight: 80, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '6px', cursor: 'pointer', background: isSelected ? C.blue100 : isWeekend ? C.bg : '#fff', transition: 'background 0.12s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.bg }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isWeekend ? C.bg : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: isToday ? 800 : 500, color: isToday ? '#fff' : C.text, width: 22, height: 22, borderRadius: '50%', background: isToday ? C.blue500 : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.family }}>
                    {day}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {dayApts.slice(0, 2).map((a, ai) => {
                    const s = STATUS_MAP[a.status] ?? STATUS_MAP.new
                    const isConfirmed = a.status === 'confirmed'
                    const cellBg = isConfirmed ? C.blue100 : s.bg
                    const cellColor = isConfirmed ? C.navy800 : s.color
                    const cellBorder = isConfirmed ? `1px solid rgba(56, 182, 255, 0.25)` : (s.border ?? 'none')
                    return (
                      <div key={ai} style={{ fontSize: '10px', fontWeight: 600, color: cellColor, background: cellBg, border: cellBorder, borderRadius: '3px', padding: '1px 5px', display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isConfirmed && <span style={{ color: C.blue500, fontSize: '12px', lineHeight: 1 }}>•</span>}
                        {a.patient.split(' ')[0]} {a.time}
                      </div>
                    )
                  })}
                  {dayApts.length > 2 && (
                    <div style={{ fontSize: '10px', color: C.textSub, padding: '1px 5px' }}>+{dayApts.length - 2} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Month summary + legend */}
        <div style={{ padding: '14px 20px', background: C.bg, borderTop: `1px solid ${C.border}`, display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {Object.entries(statusCounts).map(([status, count]) => {
              const s = STATUS_MAP[status] ?? STATUS_MAP.new
              return (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.border, display: 'inline-block' }} />
                  <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family, textTransform: 'capitalize' }}>{status}: {count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </GGCard>

      {/* Day detail panel */}
      <div style={{ position: isMobile ? 'static' : 'sticky', top: 24 }}>
        <GGCard padding="20px">
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>
            {selectedDay ? `${MONTHS[month]} ${selectedDay}, ${year}` : 'Select a day'}
          </div>
          {selectedDay && (
            <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '14px' }}>
              {selectedApts.length === 0 ? 'No appointments' : `${selectedApts.length} appointment${selectedApts.length > 1 ? 's' : ''}`}
            </div>
          )}
          {selectedApts.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: '0 auto 10px', display: 'block' }}><rect x="4" y="6" width="32" height="30" rx="4" stroke={C.border} strokeWidth="1.8"/><path d="M4 14h32" stroke={C.border} strokeWidth="1.8"/><circle cx="13" cy="4" r="2" fill={C.border}/><circle cx="27" cy="4" r="2" fill={C.border}/><line x1="13" y1="2" x2="13" y2="6" stroke={C.border} strokeWidth="1.8" strokeLinecap="round"/><line x1="27" y1="2" x2="27" y2="6" stroke={C.border} strokeWidth="1.8" strokeLinecap="round"/></svg>
              <div style={{ fontSize: '13px', color: C.textSub }}>No appointments this day</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedApts.map(apt => {
                const s = STATUS_MAP[apt.status] ?? STATUS_MAP.new
                return (
                  <div key={apt.id} style={{ padding: '12px 14px', borderRadius: radius.sm, background: C.bg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${s.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{apt.patient}</div>
                      <SPStatusBadge status={apt.status} />
                    </div>
                    <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '4px' }}>{apt.time} · {apt.service}</div>
                    {!apt.forSelf && apt.beneficiary && (
                      <div style={{ fontSize: '11px', color: C.blue500, fontWeight: 600 }}>For: {apt.beneficiary.name}</div>
                    )}
                    <div style={{ marginTop: '10px' }}>
                      <GGButton variant="secondary" size="sm" onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}>View Details</GGButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GGCard>
      </div>
    </div>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function SPAppointmentsScreen() {
  const { isMobile } = useResponsive()
  const [filter, setFilter] = useState('all')
  const [view, setView]     = useState<'list' | 'calendar'>('list')

  const counts = {
    new:       MOCK_SP_APPOINTMENTS.filter(a => a.status === 'new').length,
    confirmed: MOCK_SP_APPOINTMENTS.filter(a => a.status === 'confirmed').length,
    completed: MOCK_SP_APPOINTMENTS.filter(a => a.status === 'completed').length,
  }

  const filtered = filter === 'all'
    ? MOCK_SP_APPOINTMENTS
    : MOCK_SP_APPOINTMENTS.filter(a => a.status === filter)

  return (
    <SPLayout title="Appointments" subtitle="Manage incoming and confirmed bookings" notifCount={2}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: '14px' }}>
          {[
            { label: 'New Requests', val: counts.new,       color: C.blue500,  bg: C.blue100,                     status: 'new'       },
            { label: 'Confirmed',    val: counts.confirmed,  color: C.navy800,  bg: 'rgba(9, 28, 68, 0.08)',       status: 'confirmed' },
            { label: 'Completed',    val: counts.completed,  color: C.textSub,  bg: 'rgba(115, 124, 146, 0.08)',  status: 'completed' },
          ].map(tile => (
            <div key={tile.label} onClick={() => setFilter(tile.status)} style={{ padding: '18px 20px', background: filter === tile.status ? tile.bg : '#fff', borderRadius: radius.lg, border: `1.5px solid ${filter === tile.status ? tile.color + '44' : C.border}`, cursor: 'pointer', transition: 'all 0.14s' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{tile.label}</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: filter === tile.status ? tile.color : C.text, letterSpacing: '-0.04em', lineHeight: 1 }}>{tile.val}</div>
            </div>
          ))}
        </div>

        {/* Filter pills + view toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'new', 'confirmed', 'completed', 'cancelled'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '7px 16px', borderRadius: radius.full, border: `1.5px solid ${filter === f ? C.blue500 : C.border}`, background: filter === f ? C.blue100 : '#fff', color: filter === f ? C.navy800 : C.textSub, fontSize: '13px', fontWeight: filter === f ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.13s', textTransform: 'capitalize' }}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {(['list', 'calendar'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '7px 16px', border: 'none', background: view === v ? C.blue500 : 'transparent', color: view === v ? '#fff' : C.textSub, fontSize: '13px', fontWeight: view === v ? 700 : 500, cursor: 'pointer', fontFamily: font.family, textTransform: 'capitalize', transition: 'all 0.13s' }}>
                {v === 'list' ? 'List' : 'Calendar'}
              </button>
            ))}
          </div>
        </div>

        {/* List view */}
        {view === 'list' && (
          <>
            {filtered.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}` }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}><rect x="4" y="7" width="40" height="37" rx="4" stroke={C.border} strokeWidth="2"/><path d="M4 17h40" stroke={C.border} strokeWidth="2"/><circle cx="16" cy="5" r="2.5" fill={C.border}/><circle cx="32" cy="5" r="2.5" fill={C.border}/><line x1="16" y1="2.5" x2="16" y2="7.5" stroke={C.border} strokeWidth="2" strokeLinecap="round"/><line x1="32" y1="2.5" x2="32" y2="7.5" stroke={C.border} strokeWidth="2" strokeLinecap="round"/><path d="M16 28h16M16 34h10" stroke={C.border} strokeWidth="2" strokeLinecap="round"/></svg>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>No appointments found</div>
                <div style={{ fontSize: '13px', color: C.textSub }}>Try a different filter or check back later.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filtered.map(apt => <AppointmentCard key={apt.id} apt={apt} />)}
              </div>
            )}
          </>
        )}

        {/* Calendar view */}
        {view === 'calendar' && <CalendarView />}
      </div>
    </SPLayout>
  )
}
