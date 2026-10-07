import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { usePatientPrescriptionRequests } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { route } from '@/router/routes'
import { formatAmount, formatDate, formatRelativeTime } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { useUserStore } from '@/store/user.store'
import { UnderlineTabs } from '@/components/UnderlineTabs'
import type { PrescriptionRequest } from '@/types/prescription.types'
import {
  isPrescriptionPaid as isPaid,
  prescriptionMedicineSummary as medicineSummary,
  prescriptionProgress,
  prescriptionStage as stageOf,
  type PrescriptionStage,
} from './prescriptionStatus'

type TabId = 'active' | 'past'
type Stage = PrescriptionStage

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'
const AMBER = { fg: '#B45309', bg: 'rgba(245,166,35,0.14)' }
const CYAN = { fg: CYAN_DEEP, bg: C.blue100 }
const GREEN = { fg: '#15803D', bg: 'rgba(34,197,94,0.12)' }
const GREY = { fg: C.textSub, bg: C.bg }

const GROUP: Record<Stage, { tab: TabId; heading: string; rank: number }> = {
  reviewQuote: { tab: 'active', heading: 'Needs your attention', rank: 0 },
  approvePayment: { tab: 'active', heading: 'Needs your attention', rank: 0 },
  ready: { tab: 'active', heading: 'In progress', rank: 1 },
  preparing: { tab: 'active', heading: 'In progress', rank: 1 },
  awaitInvoice: { tab: 'active', heading: 'In progress', rank: 1 },
  awaitQuote: { tab: 'active', heading: 'In progress', rank: 1 },
  done: { tab: 'past', heading: '', rank: 2 },
  closed: { tab: 'past', heading: '', rank: 2 },
}

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

function Pill({ tone, children }: { tone: { fg: string; bg: string }; children: ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: radius.full, color: tone.fg, background: tone.bg, whiteSpace: 'nowrap' }}>{children}</span>
}

function useRowBasics(request: PrescriptionRequest, fallbackCurrency: string) {
  const currency = getCountryByCode(request.countryCode ?? '')?.currencySymbol ?? fallbackCurrency
  const total = (request.quotedAmount ?? 0) + (request.deliveryFee ?? 0)
  return {
    amount: total > 0 ? formatAmount(total, currency) : null,
    delivery: request.fulfillmentMode === 'delivery',
    who: request.forSelf ? 'For you' : `For ${request.for}`,
  }
}

/** Sent → Quote → Paid → Ready → Collected, derived from the order and its invoice. */
function MiniProgress({ request }: { request: PrescriptionRequest }) {
  const steps = prescriptionProgress(request)
  const current = steps.findIndex(step => !step.done)
  return (
    <ol aria-label="Order progress" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, i) => {
        const isCurrent = i === current
        const prevDone = i > 0 && steps[i - 1].done
        return (
          <li key={step.label} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}>
            {i > 0 && <span aria-hidden style={{ position: 'absolute', top: 6, right: '50%', width: '100%', height: 2, background: prevDone && step.done ? '#86EFAC' : C.border }} />}
            <span
              aria-hidden
              style={{
                position: 'relative',
                zIndex: 1,
                width: 14,
                height: 14,
                borderRadius: '50%',
                boxSizing: 'border-box',
                background: step.done ? '#16A34A' : '#fff',
                border: step.done ? 'none' : `2px solid ${isCurrent ? CYAN_DEEP : C.border}`,
                boxShadow: '0 0 0 3px #fff',
              }}
            />
            <span style={{ fontSize: 11, fontWeight: isCurrent ? 700 : 500, color: step.done ? C.textSub : isCurrent ? C.text : C.textLight, whiteSpace: 'nowrap' }}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function statusFor(stage: Stage, request: PrescriptionRequest, delivery: boolean): { text: string; tone: { fg: string; bg: string } } {
  switch (stage) {
    case 'reviewQuote': return { text: 'The pharmacy sent a price', tone: AMBER }
    case 'approvePayment': return { text: 'Invoice waiting for your approval', tone: AMBER }
    case 'awaitQuote': return { text: 'Waiting for the pharmacy’s quote', tone: CYAN }
    case 'awaitInvoice': return { text: 'Quote accepted · invoice on its way', tone: CYAN }
    case 'preparing': return { text: 'Being prepared', tone: CYAN }
    case 'ready':
      return {
        text: `${delivery ? 'Ready · being delivered' : 'Ready for pickup'}${request.readyAt ? ` since ${formatRelativeTime(request.readyAt)}` : ''}`,
        tone: GREEN,
      }
    case 'done':
      return {
        text: `${delivery ? 'Delivered' : 'Collected'}${request.fulfilledAt ? ` ${formatDate(request.fulfilledAt, { month: 'short', day: 'numeric' })}` : ''}${isPaid(request) ? ' · Paid ✓' : ''}`,
        tone: GREEN,
      }
    case 'closed':
      return { text: request.status === 'rejected' ? 'Declined by the pharmacy' : 'Cancelled', tone: GREY }
  }
}

function ActiveCard({ request, stage, fallbackCurrency }: { request: PrescriptionRequest; stage: Stage; fallbackCurrency: string }) {
  const navigate = useNavigate()
  const { amount, delivery, who } = useRowBasics(request, fallbackCurrency)
  const status = statusFor(stage, request, delivery)
  const needsYou = GROUP[stage].rank === 0
  const open = () => navigate(route.patientPrescription(request.id))

  let action: ReactNode = null
  if (stage === 'reviewQuote') {
    action = <button type="button" style={{ ...actionBtn, width: '100%' }} onClick={open}>Review quote{amount ? ` · ${amount}` : ''}</button>
  } else if (stage === 'approvePayment') {
    action = (
      <button type="button" style={{ ...actionBtn, width: '100%' }} onClick={() => request.invoiceId && navigate(route.patientInvoice(request.invoiceId))}>
        {amount ? `Approve ${amount}` : 'Approve payment'}
      </button>
    )
  }

  return (
    <article
      onClick={open}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 18,
        background: '#fff',
        border: `1px solid ${needsYou ? 'rgba(245,166,35,0.5)' : C.border}`,
        boxShadow: needsYou ? '0 4px 14px rgba(245,166,35,0.10)' : 'none',
        borderRadius: radius.lg,
        cursor: 'pointer',
        fontFamily: font.family,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span aria-hidden style={{ width: 40, height: 40, borderRadius: 12, background: needsYou ? AMBER.bg : C.blue100, color: needsYou ? AMBER.fg : CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <rect x="3.25" y="1.75" width="9.5" height="12.5" rx="1.75" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5.25v4.5M5.75 7.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{medicineSummary(request)}</div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
            {request.provider ?? 'Pharmacy'} · {who} · {delivery ? 'Delivery' : 'Pick up'}
          </div>
        </div>
        {amount && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{amount}</div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{request.id}</div>
          </div>
        )}
      </div>

      <MiniProgress request={request} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: status.tone.fg }}>{status.text}</span>
        {action && <div onClick={event => event.stopPropagation()}>{action}</div>}
      </div>
    </article>
  )
}

function PastRow({ request, stage, fallbackCurrency, isLast }: { request: PrescriptionRequest; stage: Stage; fallbackCurrency: string; isLast: boolean }) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { amount, delivery } = useRowBasics(request, fallbackCurrency)
  const status = statusFor(stage, request, delivery)
  return (
    <button
      type="button"
      onClick={() => navigate(route.patientPrescription(request.id))}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 18px',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        cursor: 'pointer',
        fontFamily: font.family,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{medicineSummary(request)}</div>
        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {request.provider ?? 'Pharmacy'} · {request.id}
          {isMobile ? '' : ` · ${request.forSelf ? 'for you' : `for ${request.for}`}`}
        </div>
      </div>
      {!isMobile && <Pill tone={status.tone}>{status.text}</Pill>}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
        {amount && <div style={{ fontSize: 14, fontWeight: 700, color: stage === 'closed' ? C.textLight : C.text }}>{amount}</div>}
        {isMobile && <div style={{ fontSize: 11, fontWeight: 600, color: status.tone.fg, marginTop: 2 }}>{status.text}</div>}
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, color: C.textLight }}>
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export function PrescriptionRequestsScreen() {
  const navigate = useNavigate()
  const { data = [], isLoading } = usePatientPrescriptionRequests()
  const { isMobile } = useResponsive()
  const requests = data as PrescriptionRequest[]
  const userCountry = useUserStore(s => s.user.countryCode)
  const fallbackCurrency = getCountryByCode(userCountry)?.currencySymbol ?? ''
  const [chosenTab, setChosenTab] = useState<TabId | null>(null)

  const staged = useMemo(() => requests.map(request => ({ request, stage: stageOf(request) })), [requests])
  const active = staged
    .filter(i => GROUP[i.stage].tab === 'active')
    .sort((a, b) => GROUP[a.stage].rank - GROUP[b.stage].rank || b.request.submittedAt.localeCompare(a.request.submittedAt))
  const past = staged
    .filter(i => GROUP[i.stage].tab === 'past')
    .sort((a, b) => (b.request.fulfilledAt ?? b.request.submittedAt).localeCompare(a.request.fulfilledAt ?? a.request.submittedAt))
  const tab: TabId = chosenTab ?? (active.length > 0 ? 'active' : 'past')
  const items = tab === 'active' ? active : past

  const headingOf = ({ request, stage }: { request: PrescriptionRequest; stage: Stage }) =>
    GROUP[stage].heading
    || new Date(request.fulfilledAt ?? request.declinedAt ?? request.submittedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const groups: { heading: string; rows: typeof items }[] = []
  for (const item of items) {
    const heading = headingOf(item)
    const last = groups[groups.length - 1]
    if (last && last.heading === heading) last.rows.push(item)
    else groups.push({ heading, rows: [item] })
  }

  const sendButton = (
    <button type="button" onClick={() => navigate(route.providerList('pharmacy'))} style={actionBtn}>
      + Send a prescription
    </button>
  )

  return (
    <AppLayout title="Prescriptions" notifCount={0}>
      <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: font.family }}>
        {isLoading && requests.length === 0 ? (
          <GGCard padding="28px">
            <div style={{ fontSize: 14, color: C.textSub }}>Loading prescriptions…</div>
          </GGCard>
        ) : requests.length === 0 ? (
          <div style={{ padding: '44px 24px', textAlign: 'center', background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>No prescriptions yet</div>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 6, marginBottom: 18, lineHeight: 1.6 }}>
              Send a prescription to a pharmacy and they&apos;ll reply with a price. You pay only after pickup or delivery.
            </div>
            {sendButton}
          </div>
        ) : (
          <>
            <UnderlineTabs
              tabs={[
                { id: 'active', label: 'Active', count: active.length },
                { id: 'past', label: 'Past', count: past.length },
              ]}
              active={tab}
              onChange={setChosenTab}
              trailing={sendButton}
            />
            {items.length === 0 ? (
              <div style={{ padding: '36px 24px', textAlign: 'center', background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, fontSize: 14, color: C.textSub }}>
                {tab === 'active' ? 'Nothing in progress right now.' : 'No past prescriptions yet.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {groups.map(group => (
                  <section key={group.heading} aria-label={group.heading} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 0' }}>
                      {group.heading}
                    </div>
                    {tab === 'active' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
                        {group.rows.map(({ request, stage }) => (
                          <ActiveCard key={request.id} request={request} stage={stage} fallbackCurrency={fallbackCurrency} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, overflow: 'hidden' }}>
                        {group.rows.map(({ request, stage }, index) => (
                          <PastRow key={request.id} request={request} stage={stage} fallbackCurrency={fallbackCurrency} isLast={index === group.rows.length - 1} />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
