import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useFulfillPrescriptionRequestMutation, useMarkPrescriptionReadyMutation, useSPPrescriptionRequests } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { route } from '@/router/routes'
import { formatAmount, formatDate, formatRelativeTime } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { UnderlineTabs } from '@/components/UnderlineTabs'
import type { PrescriptionFulfillmentMode, PrescriptionRequest } from '@/types/prescription.types'

type TabId = 'todo' | 'waiting' | 'completed' | 'closed'
type Stage = 'quote' | 'invoice' | 'prepare' | 'handoff' | 'awaitQuote' | 'awaitPayment' | 'fulfilled' | 'closed'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'
const AMBER = { fg: '#B45309', bg: 'rgba(245,166,35,0.14)' }
const CYAN = { fg: CYAN_DEEP, bg: C.blue100 }
const GREEN = { fg: '#15803D', bg: 'rgba(34,197,94,0.12)' }
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

function isPaid(r: PrescriptionRequest) {
  return r.invoiceStatus === 'paid' || r.invoiceStatus === 'authorized'
}

function stageOf(r: PrescriptionRequest): Stage {
  switch (r.status) {
    case 'submitted': return 'quote'
    case 'quoted': return 'awaitQuote'
    case 'accepted':
    case 'preparing':
      if (isPaid(r)) return 'prepare'
      return r.invoiceId ? 'awaitPayment' : 'invoice'
    case 'ready': return 'handoff'
    case 'fulfilled': return 'fulfilled'
    default: return 'closed'
  }
}

const TAB_OF: Record<Stage, TabId> = {
  quote: 'todo',
  invoice: 'todo',
  prepare: 'todo',
  handoff: 'todo',
  awaitQuote: 'waiting',
  awaitPayment: 'waiting',
  fulfilled: 'completed',
  closed: 'closed',
}

const STAGE_ORDER: Stage[] = ['quote', 'invoice', 'prepare', 'handoff', 'awaitQuote', 'awaitPayment', 'fulfilled', 'closed']

const STAGE_HEADING: Partial<Record<Stage, string>> = {
  quote: 'To quote',
  invoice: 'To invoice · patient accepted the quote',
  prepare: 'To prepare · paid',
  handoff: 'Ready to hand over',
  awaitQuote: 'Quote sent',
  awaitPayment: 'Invoice sent',
}

function medicineSummary(r: PrescriptionRequest) {
  const items = r.quotedItems ?? []
  if (items.length === 0) return r.attachment?.name ? 'Prescription uploaded' : 'Prescription request'
  const first = [items[0].name, items[0].quantity].filter(Boolean).join(' ')
  return items.length > 1 ? `${first} +${items.length - 1} more` : first
}

function Pill({ tone, children }: { tone: { fg: string; bg: string }; children: ReactNode }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: radius.full, color: tone.fg, background: tone.bg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function ModeTag({ mode }: { mode: PrescriptionFulfillmentMode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.textSub }}>
      {mode === 'delivery' ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )}
      {mode === 'delivery' ? 'Delivery' : 'Pickup'}
    </span>
  )
}

function PrescriptionRow({ request, stage }: { request: PrescriptionRequest; stage: Stage }) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const markReady = useMarkPrescriptionReadyMutation()
  const fulfill = useFulfillPrescriptionRequestMutation()
  const [error, setError] = useState<string | null>(null)
  const currency = getCountryByCode(request.countryCode ?? '')?.currencySymbol ?? ''
  const total = (request.quotedAmount ?? 0) + (request.deliveryFee ?? 0)
  const delivery = request.fulfillmentMode === 'delivery'
  const open = () => navigate(route.spPrescription(request.id))
  const busy = markReady.isPending || fulfill.isPending

  const run = async (fn: () => Promise<unknown>, failMsg: string) => {
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : failMsg)
    }
  }

  let status: ReactNode
  let action: ReactNode = null
  switch (stage) {
    case 'quote':
      status = <Pill tone={AMBER}>Submitted {formatRelativeTime(request.submittedAt)}</Pill>
      action = <button type="button" style={actionBtn} onClick={open}>Send quote</button>
      break
    case 'invoice':
      status = <Pill tone={AMBER}>Quote accepted{request.acceptedAt ? ` ${formatRelativeTime(request.acceptedAt)}` : ''}</Pill>
      action = <button type="button" style={actionBtn} onClick={open}>Send invoice</button>
      break
    case 'prepare':
      status = <Pill tone={GREEN}>Paid · prepare order</Pill>
      action = (
        <button
          type="button"
          style={{ ...actionBtn, opacity: busy ? 0.6 : 1 }}
          disabled={busy}
          onClick={() => void run(() => markReady.mutateAsync(request.id), 'Could not mark this order ready.')}
        >
          {markReady.isPending ? 'Saving…' : 'Mark ready'}
        </button>
      )
      break
    case 'handoff':
      status = <Pill tone={AMBER}>Ready{request.readyAt ? ` since ${formatRelativeTime(request.readyAt)}` : ''}</Pill>
      action = (
        <button
          type="button"
          style={{ ...actionBtn, opacity: busy ? 0.6 : 1 }}
          disabled={busy}
          onClick={() => {
            const label = delivery ? 'delivered' : 'collected'
            if (!window.confirm(`Mark ${request.id} as ${label}? The patient will be notified.`)) return
            void run(() => fulfill.mutateAsync(request.id), `Could not mark this order ${label}.`)
          }}
        >
          {fulfill.isPending ? 'Saving…' : delivery ? 'Mark delivered' : 'Mark collected'}
        </button>
      )
      break
    case 'awaitQuote':
      status = <Pill tone={CYAN}>Quote sent{request.quotedAt ? ` ${formatRelativeTime(request.quotedAt)}` : ''}</Pill>
      break
    case 'awaitPayment':
      status = <Pill tone={CYAN}>Invoice sent · waiting for payment</Pill>
      break
    case 'fulfilled':
      status = <Pill tone={GREEN}>{delivery ? 'Delivered' : 'Collected'}{request.fulfilledAt ? ` ${formatDate(request.fulfilledAt, { month: 'short', day: 'numeric' })}` : ''}</Pill>
      break
    case 'closed':
      status = <Pill tone={GREY}>{request.status === 'rejected' ? 'Declined by you' : 'Cancelled by patient'}</Pill>
      break
  }

  const showAmount = total > 0 && stage !== 'quote'
  const amountLabel = stage === 'fulfilled' || stage === 'prepare' || stage === 'handoff' ? 'Paid' : 'Quoted'

  return (
    <article
      onClick={open}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: isMobile ? 14 : '14px 18px',
        background: '#fff',
        border: `1px solid ${stage === 'quote' || stage === 'invoice' || stage === 'handoff' ? 'rgba(245,166,35,0.45)' : stage === 'prepare' ? 'rgba(34,197,94,0.4)' : C.border}`,
        borderRadius: radius.lg,
        cursor: 'pointer',
        fontFamily: font.family,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{request.forSelf ? request.patient || 'Patient' : request.for}</span>
          {!request.forSelf && request.patient && <span style={{ fontSize: 12, color: C.textSub }}>booked by {request.patient}</span>}
          <span style={{ fontSize: 12, color: C.textLight }}>{request.id}</span>
        </div>
        <div style={{ fontSize: 13, color: C.text, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {medicineSummary(request)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          {status}
          <ModeTag mode={request.fulfillmentMode} />
        </div>
        {error && <div role="alert" style={{ fontSize: 12, color: '#B91C1C', marginTop: 6 }}>{error}</div>}
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}
        onClick={event => event.stopPropagation()}
      >
        {showAmount && (
          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <div style={{ fontSize: 11, color: C.textSub }}>{amountLabel}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{formatAmount(total, currency)}</div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {action}
          <button
            type="button"
            aria-label={`Open ${request.id}`}
            onClick={open}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.textLight, display: 'flex' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  )
}

const EMPTY: Record<TabId, { title: string; sub: string }> = {
  todo: { title: 'Nothing to do right now', sub: 'New prescriptions to quote, orders to invoice, prepare or hand over will show up here.' },
  waiting: { title: 'Nothing waiting on patients', sub: 'Quotes and invoices you have sent will wait here until the patient responds.' },
  completed: { title: 'No completed orders yet', sub: 'Collected and delivered orders will appear here.' },
  closed: { title: 'No closed requests', sub: 'Declined and cancelled requests will appear here.' },
}

export function SPPrescriptionsScreen() {
  const { data = [], isLoading } = useSPPrescriptionRequests()
  const { isMobile } = useResponsive()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'all' | PrescriptionFulfillmentMode>('all')
  const [chosenTab, setChosenTab] = useState<TabId | null>(null)

  const staged = useMemo(() => data.map(request => ({ request, stage: stageOf(request) })), [data])

  const q = query.trim().toLowerCase()
  const visible = staged.filter(({ request }) => {
    if (mode !== 'all' && request.fulfillmentMode !== mode) return false
    if (!q) return true
    const blob = [request.patient, request.for, request.id, ...(request.quotedItems ?? []).map(i => i.name)].join(' ').toLowerCase()
    return blob.includes(q)
  })

  const inTab = (tab: TabId) => visible.filter(item => TAB_OF[item.stage] === tab)
  const counts: Record<TabId, number> = {
    todo: inTab('todo').length,
    waiting: inTab('waiting').length,
    completed: inTab('completed').length,
    closed: inTab('closed').length,
  }
  const tab: TabId = chosenTab ?? (staged.some(i => TAB_OF[i.stage] === 'todo') ? 'todo' : 'waiting')

  const items = inTab(tab).sort((a, b) => {
    const byStage = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
    if (byStage) return byStage
    // Work queues run oldest first; history runs newest first.
    return tab === 'todo' || tab === 'waiting'
      ? a.request.submittedAt.localeCompare(b.request.submittedAt)
      : (b.request.fulfilledAt ?? b.request.submittedAt).localeCompare(a.request.fulfilledAt ?? a.request.submittedAt)
  })

  const headingOf = (stage: Stage, r: PrescriptionRequest) =>
    STAGE_HEADING[stage] ??
    new Date(r.fulfilledAt ?? r.declinedAt ?? r.submittedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const groups: { heading: string; rows: typeof items }[] = []
  for (const item of items) {
    const heading = headingOf(item.stage, item.request)
    const last = groups[groups.length - 1]
    if (last && last.heading === heading) last.rows.push(item)
    else groups.push({ heading, rows: [item] })
  }

  if (isLoading) {
    return (
      <SPLayout title="Prescriptions">
        <GGCard padding="24px">
          <div style={{ fontSize: 14, color: C.textSub, fontFamily: font.family }}>Loading prescriptions...</div>
        </GGCard>
      </SPLayout>
    )
  }

  const controls = (
    <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search patient, RX or medicine"
        aria-label="Search prescriptions"
        style={{ flex: 1, width: isMobile ? 'auto' : 240, height: 36, padding: '0 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13, fontFamily: font.family, color: C.text, outline: 'none' }}
      />
      <select
        value={mode}
        onChange={e => setMode(e.target.value as typeof mode)}
        aria-label="Filter by pickup or delivery"
        style={{ height: 36, padding: '0 10px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13, fontFamily: font.family, color: C.text }}
      >
        <option value="all">Pickup & delivery</option>
        <option value="pickup">Pickup only</option>
        <option value="delivery">Delivery only</option>
      </select>
    </div>
  )

  return (
    <SPLayout title="Prescriptions">
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: font.family }}>
        <UnderlineTabs
          tabs={[
            { id: 'todo', label: 'To do', count: counts.todo },
            { id: 'waiting', label: 'Waiting on patient', count: counts.waiting },
            { id: 'completed', label: 'Completed', count: counts.completed },
            { id: 'closed', label: 'Closed', count: counts.closed },
          ]}
          active={tab}
          onChange={setChosenTab}
          trailing={isMobile ? undefined : controls}
        />
        {isMobile && controls}

        {items.length === 0 ? (
          <div style={{ padding: '44px 24px', textAlign: 'center', background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{q || mode !== 'all' ? 'No matching prescriptions' : EMPTY[tab].title}</div>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 6 }}>{q || mode !== 'all' ? 'Try a different search or filter.' : EMPTY[tab].sub}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groups.map(group => (
              <section key={group.heading} aria-label={group.heading} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '6px 0 2px' }}>
                  {group.heading}
                </div>
                {group.rows.map(({ request, stage }) => (
                  <PrescriptionRow key={request.id} request={request} stage={stage} />
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </SPLayout>
  )
}
