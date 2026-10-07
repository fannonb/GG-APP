import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useSPAppointments, useSPInvoices, useUpdateSPAppointmentStatusMutation } from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { route, ROUTES } from '@/router/routes'
import type { Appointment } from '@/types/appointment.types'
import type { SPInvoice } from '@/types/invoice.types'
import { SPWeekCalendar } from './SPWeekCalendar'
import { formatTime12h } from '@/utils/format'
import { appointmentHasRecordedVisit, getAppointmentDisplayStatus, getDaysUntilAppointment } from '@/utils/appointments'
import { UnderlineTabs } from '@/components/UnderlineTabs'

type TabId = 'action' | 'upcoming' | 'calendar' | 'past'
type Kind = 'new' | 'unrecorded' | 'uninvoiced' | 'rejected' | 'upcoming' | 'awaiting' | 'paid' | 'done' | 'cancelled'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'
const AMBER = { fg: '#B45309', bg: 'rgba(245,166,35,0.14)' }
const GREEN = { fg: '#15803D', bg: 'rgba(34,197,94,0.12)' }
const RED = { fg: '#B91C1C', bg: 'rgba(239,68,68,0.10)' }
const GREY = { fg: C.textSub, bg: C.bg }

const actionBtn: React.CSSProperties = {
  height: 34,
  padding: '0 14px',
  borderRadius: radius.sm,
  border: 'none',
  background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
  boxShadow: '0 4px 10px rgba(11,123,192,0.22)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

function classify(apt: Appointment, invoice?: SPInvoice): Kind {
  const status = getAppointmentDisplayStatus(apt)
  const recorded = appointmentHasRecordedVisit(apt)
  const invoiced = !!apt.hasInvoice || !!invoice
  if (status === 'cancelled') return 'cancelled'
  if (status === 'new') return 'new'
  if (invoice?.status === 'rejected') return 'rejected'
  if (invoice?.status === 'paid' || invoice?.status === 'authorized') return 'paid'
  if (invoice?.status === 'pending') return 'awaiting'
  if (invoiced) return 'done'
  if (recorded) return 'uninvoiced'
  if (status === 'completed' || getDaysUntilAppointment(apt.date) < 0) return 'unrecorded'
  return 'upcoming'
}

const TAB_OF: Record<Kind, TabId> = {
  new: 'action',
  unrecorded: 'action',
  uninvoiced: 'action',
  rejected: 'action',
  upcoming: 'upcoming',
  awaiting: 'past',
  paid: 'past',
  done: 'past',
  cancelled: 'past',
}

function sortKey(apt: Appointment) {
  return `${apt.date.slice(0, 10)}T${apt.time}`
}

function agoLabel(days: number) {
  const n = Math.abs(days)
  if (n === 0) return 'today'
  if (n === 1) return 'yesterday'
  if (n < 14) return `${n} days ago`
  return `${Math.round(n / 7)} weeks ago`
}

function countdown(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

function dayHeading(dateStr: string) {
  const days = getDaysUntilAppointment(dateStr)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function Pill({ tone, children }: { tone: { fg: string; bg: string }; children: ReactNode }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: radius.full, color: tone.fg, background: tone.bg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function DateTile({ date, muted }: { date: Date; muted: boolean }) {
  return (
    <div
      style={{
        width: 52,
        minWidth: 52,
        padding: '6px 0',
        borderRadius: 12,
        textAlign: 'center',
        alignSelf: 'flex-start',
        background: muted ? C.bg : `linear-gradient(160deg, #38B6FF 0%, ${CYAN_DEEP} 100%)`,
        color: muted ? C.textSub : '#fff',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>
        {date.toLocaleDateString('en-US', { month: 'short' })}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: muted ? C.text : '#fff' }}>{date.getDate()}</div>
    </div>
  )
}

function AppointmentCard({ apt, kind, invoice }: { apt: Appointment; kind: Kind; invoice?: SPInvoice }) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const updateStatus = useUpdateSPAppointmentStatusMutation()
  const days = getDaysUntilAppointment(apt.date)
  const date = new Date(apt.date)
  const seenBy = !apt.forSelf && apt.beneficiary ? apt.beneficiary : null
  const accepting = updateStatus.isPending && updateStatus.variables?.id === apt.id

  const open = () => navigate(route.spAppointment(apt.id), { state: { apt } })
  const recordVisit = () => navigate(ROUTES.SP_VISIT_RECORD, {
    state: { ctx: { patientId: apt.patientId, patientName: apt.patient, appointmentId: apt.id, conditions: apt.medicalHistory, allergies: apt.allergies } },
  })
  const uploadInvoice = () => navigate(ROUTES.SP_INVOICE_UPLOAD, {
    state: { prefill: { appointmentId: apt.id, patientId: apt.patientId, patientName: apt.patient, visitId: apt.visitId } },
  })

  let tag: ReactNode
  let action: ReactNode = null
  switch (kind) {
    case 'new':
      tag = <Pill tone={AMBER}>New request</Pill>
      action = (
        <button
          type="button"
          style={{ ...actionBtn, opacity: accepting ? 0.6 : 1 }}
          disabled={accepting}
          onClick={() => updateStatus.mutate({ id: apt.id, payload: { status: 'confirmed' } })}
        >
          {accepting ? 'Accepting…' : 'Accept'}
        </button>
      )
      break
    case 'unrecorded':
      tag = <Pill tone={AMBER}>⚠ Visit not recorded · {agoLabel(days)}</Pill>
      action = <button type="button" style={actionBtn} onClick={recordVisit}>Record visit</button>
      break
    case 'uninvoiced':
      tag = <Pill tone={AMBER}>Invoice not sent</Pill>
      action = <button type="button" style={actionBtn} onClick={uploadInvoice}>Upload invoice</button>
      break
    case 'upcoming':
      tag = (
        <>
          <Pill tone={GREEN}>Confirmed</Pill>
          <Pill tone={{ fg: CYAN_DEEP, bg: C.blue100 }}>{countdown(days)}</Pill>
        </>
      )
      action = <button type="button" style={actionBtn} onClick={recordVisit}>Record visit</button>
      break
    case 'rejected':
      tag = <Pill tone={RED}>Invoice sent back by patient</Pill>
      action = (
        <button type="button" style={actionBtn} onClick={() => invoice && navigate(route.spInvoice(invoice.id))}>
          Fix &amp; resubmit
        </button>
      )
      break
    case 'awaiting':
      tag = <Pill tone={{ fg: CYAN_DEEP, bg: C.blue100 }}>Invoice sent · waiting for patient</Pill>
      break
    case 'paid':
      tag = <Pill tone={GREEN}>Paid ✓</Pill>
      break
    case 'done':
      tag = <Pill tone={GREY}>Completed · Invoice sent</Pill>
      break
    case 'cancelled':
      tag = <Pill tone={RED}>Cancelled{apt.cancellationReason ? ' by patient' : ''}</Pill>
      break
  }

  const muted = kind === 'done' || kind === 'paid' || kind === 'awaiting' || kind === 'cancelled'

  return (
    <article
      onClick={open}
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        padding: isMobile ? '14px' : '14px 18px',
        background: '#fff',
        border: `1px solid ${kind === 'rejected' ? 'rgba(239,68,68,0.35)' : kind === 'unrecorded' || kind === 'uninvoiced' ? 'rgba(245,166,35,0.45)' : C.border}`,
        borderRadius: radius.lg,
        cursor: 'pointer',
        fontFamily: font.family,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}
    >
      <DateTile date={date} muted={muted} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{seenBy ? seenBy.name : apt.patient}</span>
          {seenBy && <span style={{ fontSize: 12, color: C.textSub }}>booked by {apt.patient}</span>}
        </div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 3 }}>
          {apt.service} · {formatTime12h(apt.time)}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{tag}</div>
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, width: isMobile && action ? '100%' : 'auto', justifyContent: 'flex-end' }}
        onClick={event => event.stopPropagation()}
      >
        {action}
        <button
          type="button"
          aria-label={`Open appointment ${apt.id}`}
          onClick={open}
          style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.textLight, display: 'flex' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </article>
  )
}

function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '6px 0 2px', fontFamily: font.family }}>
      {children}
    </div>
  )
}

function groupBy(list: Appointment[], keyOf: (apt: Appointment) => string) {
  const groups: { key: string; items: Appointment[] }[] = []
  for (const apt of list) {
    const key = keyOf(apt)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(apt)
    else groups.push({ key, items: [apt] })
  }
  return groups
}

const EMPTY: Record<TabId, { title: string; sub: string }> = {
  action: { title: "You're all caught up", sub: 'New requests, visits to record and invoices to send will show up here.' },
  upcoming: { title: 'No upcoming visits', sub: 'Confirmed appointments will appear here in date order.' },
  calendar: { title: 'Nothing this week', sub: 'Confirmed appointments will appear on the week view.' },
  past: { title: 'No past appointments', sub: 'Completed and cancelled visits will appear here.' },
}

export function SPAppointmentsScreen() {
  const { data: appointments = [], isLoading } = useSPAppointments()
  const { data: invoices = [] } = useSPInvoices()
  const { isMobile } = useResponsive()
  const [query, setQuery] = useState('')
  const [chosenTab, setChosenTab] = useState<TabId | null>(null)

  const invoiceByAppointment = useMemo(() => {
    const map = new Map<string, SPInvoice>()
    for (const invoice of invoices) {
      if (!invoice.appointmentId) continue
      const existing = map.get(invoice.appointmentId)
      // A resubmitted invoice supersedes the earlier one for the same visit.
      if (!existing || invoice.submittedAt > existing.submittedAt) map.set(invoice.appointmentId, invoice)
    }
    return map
  }, [invoices])

  const classified = useMemo(
    () => appointments.map(apt => ({ apt, kind: classify(apt, invoiceByAppointment.get(apt.id)) })),
    [appointments, invoiceByAppointment],
  )

  const q = query.trim().toLowerCase()
  const visible = q
    ? classified.filter(({ apt }) =>
        [apt.patient, apt.beneficiary?.name ?? '', apt.service, apt.id].join(' ').toLowerCase().includes(q))
    : classified

  const byTab = (tab: TabId) => visible.filter(item => TAB_OF[item.kind] === tab)
  const actionRank: Partial<Record<Kind, number>> = { rejected: 0, new: 1, unrecorded: 2, uninvoiced: 3 }
  const actionItems = byTab('action').sort((a, b) =>
    (actionRank[a.kind] ?? 9) - (actionRank[b.kind] ?? 9) || sortKey(a.apt).localeCompare(sortKey(b.apt)))
  const upcomingItems = byTab('upcoming').sort((a, b) => sortKey(a.apt).localeCompare(sortKey(b.apt)))
  const pastItems = byTab('past').sort((a, b) => sortKey(b.apt).localeCompare(sortKey(a.apt)))

  const rawTab: TabId = chosenTab ?? (classified.some(i => TAB_OF[i.kind] === 'action') ? 'action' : 'upcoming')
  const tab: TabId = isMobile && rawTab === 'calendar' ? 'upcoming' : rawTab
  const kindOf = new Map(classified.map(i => [i.apt.id, i.kind]))

  const renderGroups = (items: { apt: Appointment }[], heading: (apt: Appointment) => string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groupBy(items.map(i => i.apt), heading).map(group => (
        <section key={group.key} aria-label={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <GroupHeading>{group.key}</GroupHeading>
          {group.items.map(apt => (
            <AppointmentCard key={apt.id} apt={apt} kind={kindOf.get(apt.id)!} invoice={invoiceByAppointment.get(apt.id)} />
          ))}
        </section>
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <SPLayout title="Appointments">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading appointments...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const current = tab === 'action' ? actionItems : tab === 'upcoming' ? upcomingItems : pastItems
  const actionHeading = (apt: Appointment) => {
    const kind = kindOf.get(apt.id)
    return kind === 'rejected'
      ? 'Invoices sent back'
      : kind === 'new' ? 'New requests' : kind === 'unrecorded' ? 'Visits to record' : 'Invoices to send'
  }
  const calendarItems = visible.filter(({ kind }) => kind !== 'cancelled').map(({ apt }) => apt)

  return (
    <SPLayout title="Appointments">
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: font.family }}>
        <UnderlineTabs
          tabs={[
            { id: 'action', label: 'Needs action', count: actionItems.length },
            { id: 'upcoming', label: 'Upcoming', count: upcomingItems.length },
            ...(isMobile ? [] : [{ id: 'calendar' as const, label: 'Week view' }]),
            { id: 'past', label: 'Past', count: pastItems.length },
          ]}
          active={tab}
          onChange={setChosenTab}
          trailing={!isMobile && (
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search patient or service"
              aria-label="Search appointments"
              style={{ width: 240, height: 36, padding: '0 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13, fontFamily: font.family, color: C.text, outline: 'none' }}
            />
          )}
        />
        {isMobile && (
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search patient or service"
            aria-label="Search appointments"
            style={{ height: 40, padding: '0 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', fontSize: 14, fontFamily: font.family, color: C.text, outline: 'none' }}
          />
        )}

        {tab === 'calendar' ? (
          <SPWeekCalendar appointments={calendarItems} />
        ) : current.length === 0 ? (
          <div style={{ padding: '44px 24px', textAlign: 'center', background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{q ? `No matches for “${query.trim()}”` : EMPTY[tab].title}</div>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 6 }}>{q ? 'Try a different name or service.' : EMPTY[tab].sub}</div>
          </div>
        ) : tab === 'action' ? (
          renderGroups(actionItems, actionHeading)
        ) : tab === 'upcoming' ? (
          renderGroups(upcomingItems, apt => dayHeading(apt.date))
        ) : (
          renderGroups(pastItems, apt => new Date(apt.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
        )}
      </div>
    </SPLayout>
  )
}
