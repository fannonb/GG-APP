import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { ROUTES } from '@/router/routes'
import { usePatientCreditActivity } from '@/hooks/api/useAdminAccounts'
import type { CreditInvoiceEntry, CreditLimitEntry } from '@/api/services/admin-accounts.service'
import { exportCsv } from '@/features/admin/metrics/metricsFormat'
import { formatDate } from '@/utils/format'

const CYAN_DEEP = '#0B7BC0'
const PAGE = 20

type Filter = 'all' | 'spending' | 'limits'
type Entry = CreditInvoiceEntry | CreditLimitEntry

const INVOICE_STATUS: Record<CreditInvoiceEntry['status'], { label: string; color: string }> = {
  waiting: { label: 'Waiting for patient', color: '#B45309' },
  approved: { label: 'Awaiting payout', color: CYAN_DEEP },
  paid: { label: 'Provider paid', color: '#15803D' },
  disputed: { label: 'Disputed', color: '#B91C1C' },
  declined: { label: 'Declined by patient', color: C.textSub },
}

const LIMIT_TITLE: Record<CreditLimitEntry['change'], string> = {
  approved: 'Credit approved',
  increase: 'Limit increase approved',
  admin: 'Limit changed by admin',
}

function monthOf(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function EntryIcon({ entry }: { entry: Entry }) {
  const isLimit = entry.kind === 'limit'
  const color = isLimit ? '#15803D' : CYAN_DEEP
  return (
    <span style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isLimit ? '#DCFCE7' : '#E0F2FE' }}>
      {isLimit ? (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M3.5 1.5h9v13l-2-1.3-2.5 1.3-2.5-1.3-2 1.3z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M6 5.5h4M6 8.5h4" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '3px 0' }}>
      <span style={{ color: C.textSub }}>{label}</span>
      <span style={{ color: C.text, fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  )
}

function InvoiceDetails({ entry, money }: { entry: CreditInvoiceEntry; money: (n: number) => string }) {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entry.lineItems.length > 0 && (
        <div>
          {entry.lineItems.map((li, i) => <Detail key={`${li.name}-${i}`} label={li.name} value={money(li.amount)} />)}
        </div>
      )}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
        <Detail label="Invoice total" value={money(entry.amount)} />
        <Detail label="From credit" value={entry.splitRecorded || entry.status === 'waiting' || entry.status === 'declined' ? money(entry.fromCredit) : 'Not recorded (older invoice)'} />
        {entry.paidDirect > 0 && <Detail label="Paid directly to provider" value={money(entry.paidDirect)} />}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
        <Detail label="Sent by provider" value={formatDate(entry.submittedAt)} />
        {entry.approvedAt && <Detail label="Approved by patient" value={`${formatDate(entry.approvedAt)}${entry.authRef ? ` · ${entry.authRef}` : ''}`} />}
        {entry.providerPaidAt && <Detail label="Provider paid" value={`${formatDate(entry.providerPaidAt)}${entry.payoutRef ? ` · ${entry.payoutRef}` : ''}`} />}
        {entry.disputeReason && <Detail label="Dispute" value={entry.disputeReason} />}
        {entry.rejectionReason && <Detail label="Declined because" value={entry.rejectionReason} />}
      </div>
      <button
        type="button"
        onClick={() => navigate(`${ROUTES.ADMIN_PAYMENTS}?invoice=${encodeURIComponent(entry.id)}`)}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: CYAN_DEEP, fontSize: 13, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}
      >
        Open in Payments →
      </button>
    </div>
  )
}

function LimitDetails({ entry, money }: { entry: CreditLimitEntry; money: (n: number) => string }) {
  return (
    <div>
      {entry.from != null && entry.to != null && <Detail label="Limit" value={`${money(entry.from)} → ${money(entry.to)}`} />}
      {entry.reason && <Detail label={entry.change === 'admin' ? 'Reason' : 'Application'} value={entry.reason} />}
      {entry.by && <Detail label="Changed by" value={entry.by} />}
    </div>
  )
}

function Row({ entry, money, open, onToggle, first }: { entry: Entry; money: (n: number) => string; open: boolean; onToggle: () => void; first: boolean }) {
  const isLimit = entry.kind === 'limit'
  const title = isLimit ? LIMIT_TITLE[entry.change] : entry.provider.name
  const sub = isLimit
    ? formatDate(entry.at)
    : [entry.service, entry.forName ? `for ${entry.forName}${entry.forRelation ? ` (${entry.forRelation})` : ''}` : null, formatDate(entry.at)].filter(Boolean).join(' · ')

  let amount: string
  let amountColor: string = C.text
  let note: { label: string; color: string }
  if (isLimit) {
    amount = `${entry.amount >= 0 ? '+' : '−'}${money(Math.abs(entry.amount))}`
    amountColor = entry.amount >= 0 ? '#15803D' : '#B91C1C'
    note = { label: entry.to != null ? `New limit ${money(entry.to)}` : 'Added to limit', color: C.textSub }
  } else {
    amount = entry.fromCredit > 0 ? `−${money(entry.fromCredit)}` : money(entry.amount)
    // Unapproved invoices haven't touched credit; older approved ones just lack the split.
    if (entry.fromCredit === 0 && (entry.status === 'waiting' || entry.status === 'declined')) amountColor = C.textLight
    note = INVOICE_STATUS[entry.status]
  }

  return (
    <li style={{ borderTop: first ? 'none' : `1px solid ${C.border}` }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', cursor: 'pointer', fontFamily: font.family }}
      >
        <EntryIcon entry={entry} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: amountColor, whiteSpace: 'nowrap' }}>{amount}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: note.color, marginTop: 1, whiteSpace: 'nowrap' }}>{note.label}</div>
        </div>
      </button>
      {open && (
        <div style={{ margin: '0 4px 12px 50px', padding: '10px 12px', background: C.bg, borderRadius: radius.sm }}>
          {isLimit ? <LimitDetails entry={entry} money={money} /> : <InvoiceDetails entry={entry} money={money} />}
        </div>
      )}
    </li>
  )
}

/** The Credit tab's record of how a patient used their credit, plus what set their limit. */
export function PatientCreditActivity({ userId, patientName, money }: { userId: string; patientName: string; money: (n: number) => string }) {
  const { data, isLoading, error } = usePatientCreditActivity(userId)
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)

  const items = useMemo(() => (data?.items ?? []).filter(e => filter === 'all' || (filter === 'limits' ? e.kind === 'limit' : e.kind === 'invoice')), [data, filter])

  if (isLoading) return <div style={{ fontSize: 13.5, color: C.textSub }}>Loading activity…</div>
  if (error || !data) return <div style={{ fontSize: 13.5, color: '#B91C1C' }}>{error instanceof Error ? error.message : 'Couldn’t load credit activity.'}</div>

  const { summary } = data
  const visible = items.slice(0, shown)
  const gap = summary.used - summary.spentFromCredit

  const stats: Array<[string, string, string]> = [
    ['Spent with credit', money(summary.spentFromCredit), `${summary.paidVisits} ${summary.paidVisits === 1 ? 'invoice' : 'invoices'}`],
    ['Paid directly', money(summary.paidDirect), 'Above their credit'],
    ['For family', money(summary.forFamily), summary.spentFromCredit > 0 ? `${Math.round((summary.forFamily / summary.spentFromCredit) * 100)}% of spending` : 'None yet'],
  ]

  const download = () => exportCsv(`${patientName.replace(/\s+/g, '-').toLowerCase()}-credit-activity.csv`, data.items.map(e => e.kind === 'invoice'
    ? { Date: e.at.slice(0, 10), Type: 'Invoice', Reference: e.reference, Provider: e.provider.name, Service: e.service, For: e.forName ?? 'Self', Total: e.amount, 'From credit': e.fromCredit, 'Paid directly': e.paidDirect, Status: INVOICE_STATUS[e.status].label }
    : { Date: e.at.slice(0, 10), Type: LIMIT_TITLE[e.change], Reference: e.reason ?? '', Provider: '', Service: '', For: '', Total: e.amount, 'From credit': '', 'Paid directly': '', Status: e.to != null ? `New limit ${e.to}` : '' }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {stats.map(([label, value, sub]) => (
          <div key={label} style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, padding: '10px 12px', minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.textSub }}>{label}</div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: C.text, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
            <div style={{ fontSize: 11.5, color: C.textLight, marginTop: 1 }}>{sub}</div>
          </div>
        ))}
      </div>

      {(summary.waiting > 0 || summary.disputed > 0) && (
        <div style={{ fontSize: 13, color: C.text, background: '#FEF3C7', borderRadius: radius.sm, padding: '8px 12px' }}>
          {[summary.waiting > 0 ? `${summary.waiting} ${summary.waiting === 1 ? 'invoice is' : 'invoices are'} waiting for the patient to approve` : null, summary.disputed > 0 ? `${summary.disputed} disputed` : null].filter(Boolean).join(' · ')}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div role="tablist" style={{ display: 'inline-flex', background: C.bg, borderRadius: radius.full, padding: 3 }}>
          {([['all', 'All'], ['spending', 'Spending'], ['limits', 'Limit changes']] as Array<[Filter, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              onClick={() => { setFilter(id); setShown(PAGE); setOpenId(null) }}
              style={{ border: 'none', borderRadius: radius.full, padding: '5px 12px', fontSize: 12.5, fontWeight: 700, fontFamily: font.family, cursor: 'pointer', background: filter === id ? '#fff' : 'transparent', color: filter === id ? C.text : C.textSub, boxShadow: filter === id ? '0 1px 3px rgba(15,23,42,0.1)' : 'none' }}
            >
              {label}
            </button>
          ))}
        </div>
        {data.items.length > 0 && (
          <button type="button" onClick={download} style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 0, color: CYAN_DEEP, fontSize: 13, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}>
            Export CSV
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div style={{ fontSize: 13.5, color: C.textSub, padding: '8px 0' }}>
          {filter === 'limits' ? 'No limit changes yet.' : 'No invoices yet. Spending shows here once a provider bills this patient.'}
        </div>
      ) : (
        <div>
          {visible.map((entry, i) => {
            const month = monthOf(entry.at)
            const heading = i === 0 || monthOf(visible[i - 1].at) !== month ? month : null
            return (
              <div key={entry.id}>
                {heading && <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSub, padding: '10px 4px 2px' }}>{heading}</div>}
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  <Row entry={entry} money={money} open={openId === entry.id} onToggle={() => setOpenId(id => (id === entry.id ? null : entry.id))} first={!!heading} />
                </ul>
              </div>
            )
          })}
          {items.length > shown && (
            <button type="button" onClick={() => setShown(s => s + PAGE)} style={{ marginTop: 8, width: '100%', height: 38, borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 13, fontWeight: 600, fontFamily: font.family, cursor: 'pointer' }}>
              Show more ({items.length - shown} left)
            </button>
          )}
        </div>
      )}

      {filter !== 'limits' && Math.abs(gap) >= 1 && (
        <div style={{ fontSize: 12, color: C.textLight }}>
          The account shows {money(summary.used)} used, {money(Math.abs(gap))} {gap > 0 ? 'more' : 'less'} than the invoices above add up to.
        </div>
      )}
    </div>
  )
}
