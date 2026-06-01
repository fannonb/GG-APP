import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatTime12h } from '@/utils/format'
import { MOCK_APPOINTMENTS, MOCK_PAST_APPOINTMENTS, MOCK_USER } from '@/mock/patient.mock'
import { useAuthStore } from '@/store/auth.store'
import type { Appointment } from '@/types/user.types'

type FilterTab = 'upcoming' | 'past' | 'all'

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  confirmed: { color: C.blue500,  bg: 'rgba(56,182,255,0.1)',  border: 'rgba(56,182,255,0.28)', label: 'Confirmed' },
  pending:   { color: '#F59E0B',  bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.28)', label: 'Pending'   },
  completed: { color: C.navy800,  bg: 'rgba(9,28,68,0.07)',    border: 'rgba(9,28,68,0.18)',    label: 'Completed' },
  cancelled: { color: C.error,    bg: C.errorBg,               border: 'rgba(229,71,77,0.28)',  label: 'Cancelled' },
}

const CAT_LABEL: Record<string, string> = {
  doctor:     'General Practice',
  pharmacy:   'Pharmacy',
  laboratory: 'Laboratory',
  radiology:  'Radiology',
  hospital:   'Hospital',
  clinic:     'Clinic',
}

function StatusIcon({ status, color }: { status: string; color: string }) {
  if (status === 'confirmed' || status === 'completed')
    return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  if (status === 'pending')
    return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke={color} strokeWidth="1.2"/><path d="M5 3v2.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/><circle cx="5" cy="7" r="0.65" fill={color}/></svg>
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>
}

function AppointmentCard({ apt, isPast }: { apt: Appointment; isPast: boolean }) {
  const { isMobile } = useResponsive()
  const navigate = useNavigate()
  const d = new Date(apt.date)
  const cfg = STATUS_CFG[apt.status] ?? STATUS_CFG.completed
  const isBeneficiary = apt.for !== MOCK_USER.name

  const dateBadgeBg = isPast
    ? 'linear-gradient(145deg, rgba(9,28,68,0.06), rgba(9,28,68,0.03))'
    : `linear-gradient(145deg, ${cfg.bg}, ${cfg.bg.replace('0.1)', '0.05)')})`
  const dateBadgeBorder = isPast ? C.border : cfg.border
  const dateColor = isPast ? C.textSub : cfg.color

  return (
    <div
      style={{
        display: 'flex',
        gap: isMobile ? '14px' : '20px',
        padding: isMobile ? '18px 16px' : '22px 24px',
        background: '#fff',
        borderRadius: radius.lg,
        border: `1px solid ${C.border}`,
        boxShadow: shadow.sm,
        transition: 'all 0.18s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = shadow.md
        e.currentTarget.style.borderColor = isPast ? C.borderDark : cfg.border
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = shadow.sm
        e.currentTarget.style.borderColor = C.border
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Date badge */}
      <div style={{
        width: isMobile ? 58 : 68, minWidth: isMobile ? 58 : 68,
        height: isMobile ? 68 : 78,
        borderRadius: '14px',
        background: dateBadgeBg,
        border: `1.5px solid ${dateBadgeBorder}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: isPast ? 'none' : `0 3px 10px ${cfg.bg}`,
      }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: dateColor, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>
          {d.toLocaleDateString('en-US', { weekday: 'short' })}
        </div>
        <div style={{ fontSize: isMobile ? '26px' : '30px', fontWeight: 900, color: dateColor, lineHeight: 1, letterSpacing: '-0.05em', margin: '1px 0' }}>
          {d.getDate()}
        </div>
        <div style={{ fontSize: '10px', fontWeight: 800, color: dateColor, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
          {d.toLocaleDateString('en-US', { month: 'short' })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '14px' : '0', alignItems: isMobile ? 'flex-start' : 'center' }}>

        {/* Info block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category chip */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 9px', borderRadius: radius.full, background: C.bg, border: `1px solid ${C.border}`, marginBottom: '7px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {CAT_LABEL[apt.category] ?? apt.category}
            </span>
          </div>

          <div style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {apt.provider}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '9px' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke={C.textSub} strokeWidth="1.2"/>
              <path d="M6 3.5v2.5l1.5 1.5" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '13px', color: C.textSub, fontWeight: 600 }}>{formatTime12h(apt.time)}</span>
            <span style={{ color: C.border }}>·</span>
            <span style={{ fontSize: '13px', color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.service}</span>
          </div>

          {/* Beneficiary / Self */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {isBeneficiary ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: radius.full, background: 'rgba(56,182,255,0.08)', border: '1px solid rgba(56,182,255,0.2)' }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="3.5" r="2" stroke={C.blue500} strokeWidth="1.2"/>
                  <path d="M1 9.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: '11px', color: C.blue500, fontWeight: 600 }}>{apt.for}</span>
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="3.5" r="2" stroke={C.textLight} strokeWidth="1.2"/>
                  <path d="M1 9.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={C.textLight} strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: '11px', color: C.textLight }}>Self</span>
              </div>
            )}
            {isPast && (
              <span style={{ fontSize: '11px', color: C.textLight, marginLeft: '2px' }}>{d.getFullYear()}</span>
            )}
          </div>
        </div>

        {/* Status + action */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '10px', flexShrink: 0, marginLeft: isMobile ? '0' : '16px' }}>
          {/* Status badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 13px', borderRadius: radius.full, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <StatusIcon status={apt.status} color={cfg.color} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          </div>

          {/* Action */}
          {!isPast && apt.status === 'confirmed' && (
            <button
              style={{ padding: '7px 16px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: 'transparent', fontSize: '12px', fontWeight: 600, color: C.textSub, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.14s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.error; e.currentTarget.style.color = C.error; e.currentTarget.style.background = C.errorBg }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; e.currentTarget.style.background = 'transparent' }}
            >
              Cancel
            </button>
          )}
          {!isPast && apt.status === 'pending' && (
            <span style={{ fontSize: '11px', color: C.textLight, fontStyle: 'italic', maxWidth: '110px', textAlign: 'right', lineHeight: 1.4 }}>Awaiting provider confirmation</span>
          )}
          {isPast && apt.status === 'completed' && (
            <button
              onClick={() => navigate('/app/services')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: radius.sm, border: 'none', background: C.navy800, fontSize: '12px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: font.family, transition: 'opacity 0.14s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Book Again
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          {isPast && apt.status === 'cancelled' && (
            <button
              onClick={() => navigate('/app/services')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: radius.sm, border: `1px solid rgba(56,182,255,0.3)`, background: 'rgba(56,182,255,0.08)', fontSize: '12px', fontWeight: 600, color: C.blue500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.14s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.blue100 }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,182,255,0.08)' }}
            >
              Rebook
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke={C.blue500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ label, sub }: { label: string; sub: string }) {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 24px', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}` }}>
      <div style={{ width: 56, height: 56, borderRadius: '16px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <rect x="2" y="4" width="22" height="20" rx="3" stroke={C.blue500} strokeWidth="1.5"/>
          <path d="M2 10h22M8.5 2v4M17.5 2v4" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M8 16l3 3 6-6" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '20px' }}>{sub}</div>
      <button
        onClick={() => navigate('/app/services')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: radius.sm, border: 'none', background: C.navy800, fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: font.family, transition: 'opacity 0.14s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Find a Service
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6.5 3L9.5 6l-3 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  )
}

export function AppointmentsScreen() {
  const { isMobile } = useResponsive()
  const { userMode } = useAuthStore()
  const [tab, setTab] = useState<FilterTab>('upcoming')

  const isNew = userMode === 'new'
  const upcoming = isNew ? [] : MOCK_APPOINTMENTS.filter(a => a.status !== 'cancelled')
  const past = isNew ? [] : MOCK_PAST_APPOINTMENTS
  const all = [...past, ...upcoming].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const completedCount = past.filter(a => a.status === 'completed').length

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'past',     label: 'Past',     count: past.length },
    { id: 'all',      label: 'All',      count: all.length },
  ]

  // Group past by month for the Past tab
  const pastGrouped = past.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const key = new Date(apt.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(apt)
    return acc
  }, {})

  return (
    <AppLayout title="Appointments" subtitle="Your healthcare schedule" notifCount={2}>
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            {
              label: 'Upcoming',
              val: upcoming.length,
              color: C.blue500,
              icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="1.5" y="3" width="15" height="13.5" rx="2.5" stroke={C.blue500} strokeWidth="1.4"/>
                  <path d="M1.5 7.5h15M6 1.5v3M12 1.5v3" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
                  <circle cx="9" cy="11.5" r="1.8" fill={C.blue500}/>
                </svg>
              ),
            },
            {
              label: 'Completed',
              val: completedCount,
              color: C.navy800,
              icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke={C.navy800} strokeWidth="1.4"/>
                  <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke={C.navy800} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
            },
            {
              label: 'Total',
              val: all.length,
              color: C.textSub,
              icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="1.5" y="3" width="15" height="13.5" rx="2.5" stroke={C.textSub} strokeWidth="1.4"/>
                  <path d="M1.5 7.5h15M6 1.5v3M12 1.5v3" stroke={C.textSub} strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M5 11h8M5 13.5h5" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              ),
            },
          ].map(s => (
            <div key={s.label} style={{ padding: isMobile ? '16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}`, boxShadow: shadow.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                <div style={{ opacity: 0.6 }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: isMobile ? '32px' : '38px', fontWeight: 900, color: s.color, letterSpacing: '-0.06em', lineHeight: 1 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}`, padding: '4px', boxShadow: shadow.sm, gap: '2px' }}>
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: '11px 12px', border: 'none', borderRadius: '12px',
                  cursor: 'pointer', fontFamily: font.family,
                  background: active ? C.navy800 : 'transparent',
                  color: active ? '#fff' : C.textSub,
                  fontSize: '13px', fontWeight: active ? 700 : 500,
                  transition: 'all 0.18s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bg }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {t.label}
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '1px 8px', borderRadius: radius.full,
                  background: active ? C.blue500 : C.bg,
                  color: active ? C.navy800 : C.textSub,
                  border: active ? 'none' : `1px solid ${C.border}`,
                  transition: 'all 0.18s ease',
                }}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Upcoming tab */}
        {tab === 'upcoming' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming.length === 0 ? (
              <EmptyState label="No upcoming appointments" sub="Find a service and request an engagement to get started." />
            ) : (
              <>
                {/* Next up callout */}
                {(() => {
                  const next = upcoming[0]
                  const nextDate = new Date(next.date)
                  const daysAway = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  return (
                    <div style={{ padding: '16px 20px', background: `linear-gradient(100deg, ${C.navy800} 0%, #12244F 100%)`, borderRadius: radius.lg, border: `1px solid rgba(56,182,255,0.18)`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', boxShadow: '0 4px 16px rgba(9,28,68,0.18)' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(56,182,255,0.15)', border: '1px solid rgba(56,182,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <rect x="1.5" y="3" width="15" height="13.5" rx="2.5" stroke={C.blue500} strokeWidth="1.4"/>
                          <path d="M1.5 7.5h15M6 1.5v3M12 1.5v3" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
                          <circle cx="9" cy="11.5" r="1.8" fill={C.blue500}/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: C.blue500, marginBottom: '4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Next Up</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                          {next.provider} · {nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime12h(next.time)}
                        </div>
                      </div>
                      <div style={{ padding: '6px 14px', borderRadius: radius.full, background: C.blue500, fontSize: '12px', fontWeight: 700, color: C.navy800, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                        {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`}
                      </div>
                    </div>
                  )
                })()}
                {upcoming.map(apt => <AppointmentCard key={apt.id} apt={apt} isPast={false} />)}
              </>
            )}
          </div>
        )}

        {/* Past tab */}
        {tab === 'past' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {past.length === 0 ? (
              <EmptyState label="No past appointments yet" sub="Your appointment history will appear here." />
            ) : (
              Object.entries(pastGrouped).map(([month, apts]) => (
                <div key={month}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{month}</div>
                    <div style={{ flex: 1, height: '1px', background: C.border }} />
                    <div style={{ fontSize: '11px', color: C.textLight, whiteSpace: 'nowrap' }}>{apts.length} appointment{apts.length > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {apts.map(apt => <AppointmentCard key={apt.id} apt={apt} isPast={true} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* All tab */}
        {tab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {all.map(apt => {
              const isPast = new Date(apt.date) < new Date()
              return <AppointmentCard key={apt.id} apt={apt} isPast={isPast} />
            })}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
