import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'
import { useAdminNotifications } from '@/hooks/api/useAdminQueries'
import { useMarkAdminNotificationReadMutation } from '@/hooks/api/useAdminMutations'
import { useOwedByProvider, usePayoutDetail, usePayoutList, usePayoutSummary, useRecordPayout } from '@/hooks/api/useAdminPayouts'
import { CountryLabel, InsightsHeader } from '@/features/admin/metrics/MetricsKit'
import { countryName, exportCsv, money, toMetricsCountry } from '@/features/admin/metrics/metricsFormat'
import { PanelSection, Pager, PlainHeader, SearchBox, SidePanel, StatusTabs } from '@/features/admin/accounts/AccountListKit'
import { ROUTES } from '@/router/routes'
import { formatDate, formatRelativeTime } from '@/utils/format'
import type { OwedByProvider, PayoutInvoice, PayoutTab } from '@/api/services/admin-payouts.service'
import type { MetricsCountry } from '@/types/admin-metrics.types'

const CYAN_DEEP = '#0B7BC0'
const PAGE_SIZE = 25
const METHOD: Record<string, string> = { MPESA: 'M-Pesa', BANK: 'Bank', MOBILE_MONEY: 'Mobile money' }

const amountOf = (inv: Pick<PayoutInvoice, 'provider' | 'amount'>) => (inv.provider.country ? money(inv.provider.country, inv.amount) : inv.amount.toLocaleString('en-US'))

const btn = (tone: 'primary' | 'plain' = 'plain'): React.CSSProperties => ({
  height: 38,
  padding: '0 14px',
  borderRadius: radius.sm,
  border: tone === 'plain' ? `1px solid ${C.border}` : 'none',
  background: tone === 'primary' ? `linear-gradient(135deg, #1A9BE6, ${CYAN_DEEP})` : '#fff',
  color: tone === 'primary' ? '#fff' : C.text,
  fontSize: 13.5,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

function SourcePill({ payout }: { payout: PayoutInvoice['payout'] }) {
  if (!payout) return null
  const style = payout.mismatch
    ? { label: 'Check amount', fg: '#B45309', bg: '#FEF3C7' }
    : payout.source === 'partner'
      ? { label: payout.partner ? `${payout.partner.charAt(0).toUpperCase()}${payout.partner.slice(1)}` : 'Partner', fg: '#15803D', bg: '#DCFCE7' }
      : { label: payout.source === 'manual' ? 'Recorded' : 'Earlier', fg: C.textSub, bg: C.bg }
  return <span style={{ fontSize: 11.5, fontWeight: 700, color: style.fg, background: style.bg, padding: '2px 8px', borderRadius: radius.full, whiteSpace: 'nowrap' }}>{style.label}</span>
}

// ── record payout dialog ────────────────────────────────────────────────────

function RecordPayoutDialog({ providerName, country, invoiceIds, total, onClose, onDone }: {
  providerName: string
  country: MetricsCountry | null
  invoiceIds: string[]
  total: number
  onClose: () => void
  onDone: (message: string) => void
}) {
  const record = useRecordPayout()
  const [reference, setReference] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px', border: `1px solid ${C.border}`, borderRadius: radius.sm, fontSize: 14, fontFamily: font.family }

  const save = async () => {
    setError(null)
    if (reference.trim().length < 3) { setError('Enter the bank or M-Pesa payment reference.'); return }
    try {
      const res = await record.mutateAsync({ invoiceIds, reference: reference.trim(), paidAt: new Date(paidAt).toISOString(), note: note.trim() || undefined })
      onDone(`Recorded ${country ? money(country, res.amount) : res.amount} to ${providerName} for ${res.invoices} invoice${res.invoices === 1 ? '' : 's'}.`)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t record the payout.')
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(9,28,68,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Record payout" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: radius.lg, padding: 22, fontFamily: font.family, boxShadow: '0 20px 50px rgba(13,30,66,0.25)' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Record payout to {providerName}</h2>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: C.textSub, lineHeight: 1.55 }}>
          {invoiceIds.length} invoice{invoiceIds.length === 1 ? '' : 's'} · <strong style={{ color: C.text }}>{country ? money(country, total) : total}</strong>.
          Use this for payments made outside the finance partner integration; partner payments are recorded automatically.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 600, color: C.text }}>
            Payment reference
            <input autoFocus style={input} value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. QJK7H2LM9X or bank transfer ref" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 600, color: C.text }}>
            Date paid
            <input type="date" style={input} value={paidAt} max={new Date().toISOString().slice(0, 10)} onChange={e => setPaidAt(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 600, color: C.text }}>
            Note (optional)
            <input style={input} value={note} onChange={e => setNote(e.target.value)} />
          </label>
          {error && <div role="alert" style={{ padding: '9px 12px', borderRadius: radius.sm, background: '#FEF2F2', color: '#B91C1C', fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" style={btn()} onClick={onClose}>Cancel</button>
          <button type="button" style={btn('primary')} disabled={record.isPending} onClick={() => void save()}>{record.isPending ? 'Saving…' : 'Record payout'}</button>
        </div>
      </div>
    </div>
  )
}

// ── detail panel ────────────────────────────────────────────────────────────

function InvoicePanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = usePayoutDetail(id)
  if (isLoading || !data) return <div style={{ padding: 24, color: C.textSub, fontSize: 14 }}>Loading…</div>
  const c = data.provider.country
  const statusText: Record<string, string> = { authorized: 'Approved · to pay out', paid: 'Paid out', pending_auth: 'Waiting for patient', disputed: 'Disputed', rejected: 'Rejected' }
  return (
    <div>
      <header style={{ padding: '22px 22px 18px', background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, color: C.textSub, paddingRight: 44 }}>{data.reference} · {statusText[data.status] ?? data.status}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginTop: 4 }}>{amountOf(data)}</div>
        <div style={{ fontSize: 14, color: C.text, marginTop: 6 }}>
          <button type="button" onClick={() => navigate(`${ROUTES.ADMIN_USERS}?open=${data.patientUserId}`)} style={{ all: 'unset', fontWeight: 700, color: CYAN_DEEP, cursor: 'pointer' }}>{data.patient}</button>
          {data.forFamily && <span style={{ color: C.textSub }}> · for {data.forFamily.name}{data.forFamily.relation ? ` (${data.forFamily.relation})` : ''}</span>}
          <span style={{ color: C.textSub }}> → </span>
          <button type="button" onClick={() => navigate(`${ROUTES.ADMIN_PROVIDERS}?open=${data.provider.id}`)} style={{ all: 'unset', fontWeight: 700, color: CYAN_DEEP, cursor: 'pointer' }}>{data.provider.name}</button>
        </div>
      </header>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PanelSection title="What was billed">
          {data.lineItems.length === 0 ? <div style={{ fontSize: 13.5, color: C.textSub }}>{data.service ?? 'No line items.'}</div> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {data.lineItems.map((li, i) => (
                <li key={`${li.name}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', fontSize: 14 }}>
                  <span>{li.name}</span><span style={{ fontWeight: 700 }}>{c ? money(c, li.amount) : li.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </PanelSection>
        <PanelSection title="Timeline">
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {data.timeline.map((t, i) => (
              <li key={`${t.label}-${i}`} style={{ display: 'flex', gap: 10, padding: '7px 0' }}>
                <span aria-hidden style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: CYAN_DEEP, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: 12.5, color: C.textSub }}>{formatDate(t.at)}{t.note ? ` · ${t.note}` : ''}</div>
                </div>
              </li>
            ))}
          </ol>
        </PanelSection>
        {data.payout && (
          <PanelSection title="Payout" action={<SourcePill payout={data.payout} />}>
            <div style={{ fontSize: 14, color: C.text }}>Reference <strong>{data.payout.reference}</strong>{data.paidAt ? ` · ${formatDate(data.paidAt)}` : ''}</div>
            {data.payout.mismatch && <div style={{ fontSize: 13, color: '#B45309', marginTop: 6 }}>The partner’s amount didn’t match the invoices it covered. Check with the finance partner.</div>}
          </PanelSection>
        )}
        <PanelSection title="Provider’s payout account">
          {data.payoutAccount
            ? <div style={{ fontSize: 14, color: C.text }}>{METHOD[data.payoutAccount.method] ?? data.payoutAccount.method} · {data.payoutAccount.accountName} · {data.payoutAccount.accountNumber}</div>
            : <div style={{ fontSize: 13.5, color: '#B45309' }}>No payout account set.</div>}
        </PanelSection>
        {(data.disputeReason || data.rejectionReason) && (
          <PanelSection title={data.disputeReason ? 'Dispute' : 'Rejection'}>
            <div style={{ fontSize: 14, color: C.text }}>{data.disputeReason ?? data.rejectionReason}</div>
          </PanelSection>
        )}
      </div>
    </div>
  )
}

// ── page ────────────────────────────────────────────────────────────────────

export function AdminPaymentsScreen() {
  const { isMobile, isDesktop } = useResponsive()
  const { country, range } = useAdminCountry()
  const code = toMetricsCountry(country)
  const [view, setView] = useState<'invoices' | 'providers'>('invoices')
  const [tab, setTab] = useState<PayoutTab>('to_pay')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // ?invoice=<id> opens that invoice directly (used by the patient's credit activity).
  const [searchParams] = useSearchParams()
  const [openId, setOpenId] = useState<string | null>(searchParams.get('invoice'))
  const [recordFor, setRecordFor] = useState<{ providerName: string; country: MetricsCountry | null; invoiceIds: string[]; total: number } | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const { data: summary = [] } = usePayoutSummary(code, range)
  const { data: list, isLoading, error } = usePayoutList({ tab, country: code, range, q: query, page, pageSize: PAGE_SIZE })
  const { data: owed = [] } = useOwedByProvider(code, view === 'providers')
  const { data: notifications = [] } = useAdminNotifications()
  const markRead = useMarkAdminNotificationReadMutation()
  const alerts = notifications.filter(n => !n.read && n.title === 'Payout needs checking')

  const items = useMemo(() => list?.items ?? [], [list])
  const selectedRows = items.filter(i => selected.has(i.id))
  const selectedProviders = new Set(selectedRows.map(r => r.provider.id))
  const selectedTotal = selectedRows.reduce((s, r) => s + r.amount, 0)

  const switchTab = (t: PayoutTab) => { setTab(t); setPage(0); setSelected(new Set()) }
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const dateLabel = tab === 'to_pay' ? 'Approved' : tab === 'paid' ? 'Paid out' : 'Sent'
  const dateOf = (i: PayoutInvoice) => (tab === 'to_pay' ? i.approvedAt : tab === 'paid' ? i.paidAt : i.submittedAt)
  const td: React.CSSProperties = { padding: '11px 12px', borderTop: `1px solid ${C.border}`, verticalAlign: 'middle', fontSize: 13.5 }

  return (
    <AdminLayout title="Payments">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: font.family }}>
        <InsightsHeader
          subtitle="Provider payouts"
          extra={
            <div role="tablist" aria-label="View" style={{ display: 'inline-flex', padding: 3, gap: 2, background: '#E3ECF6', borderRadius: radius.sm }}>
              {(['invoices', 'providers'] as const).map(v => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} style={{ height: 32, padding: '0 12px', border: 'none', borderRadius: 7, background: view === v ? '#fff' : 'transparent', boxShadow: view === v ? '0 1px 3px rgba(13,30,66,0.12)' : 'none', color: view === v ? C.text : C.textSub, fontSize: 13, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}>
                  {v === 'invoices' ? 'Invoices' : 'Owed by provider'}
                </button>
              ))}
            </div>
          }
        />

        {alerts.map(a => (
          <div key={a.id} role="alert" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: radius.md, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div style={{ flex: 1, fontSize: 13.5, color: '#92400E', lineHeight: 1.5 }}><strong>{a.title}.</strong> {a.body}</div>
            <button type="button" onClick={() => markRead.mutate(a.id)} style={{ background: 'none', border: 'none', color: '#B45309', fontWeight: 700, fontSize: 13, fontFamily: font.family, cursor: 'pointer' }}>Dismiss</button>
          </div>
        ))}
        {done && <div role="status" style={{ padding: '10px 14px', borderRadius: radius.md, background: '#F0FDF4', color: '#15803D', fontSize: 13.5 }}>{done}</div>}

        {/* Money per country, never added across currencies. */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.max(summary.length, 1)}, minmax(0, 1fr))`, gap: 12 }}>
          {summary.map(s => (
            <section key={s.country} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: '14px 16px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}><CountryLabel code={s.country} /></div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: C.textSub }}>To pay out now</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.owed > 0 ? C.text : C.textLight }}>{money(s.country, s.owed)}</div>
                <div style={{ fontSize: 12, color: C.textSub }}>{s.owedCount} invoice{s.owedCount === 1 ? '' : 's'}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 12.5, color: C.textSub }}>
                <span>Approved <strong style={{ color: C.text }}>{money(s.country, s.approved, true)}</strong></span>
                <span>Paid out <strong style={{ color: C.text }}>{money(s.country, s.paidOut, true)}</strong></span>
              </div>
            </section>
          ))}
        </div>

        {view === 'providers' ? (
          <section style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg }}>
            {owed.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', fontSize: 14, color: C.textSub }}>No provider is waiting for a payout.</div>
            ) : owed.map((g: OwedByProvider, i) => (
              <div key={g.provider.id} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 12, padding: '14px 18px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{g.provider.name}</div>
                  <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>
                    {countryName(g.provider.country)} · {g.invoiceCount} invoice{g.invoiceCount === 1 ? '' : 's'}{g.oldestApprovedAt ? ` · oldest approved ${formatRelativeTime(g.oldestApprovedAt)}` : ''}
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 2, color: g.payoutAccount ? C.textSub : '#B45309' }}>
                    {g.payoutAccount ? `${METHOD[g.payoutAccount.method] ?? g.payoutAccount.method} · ${g.payoutAccount.accountName} · ${g.payoutAccount.accountNumber}` : 'No payout account set'}
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{g.provider.country ? money(g.provider.country, g.owed) : g.owed}</div>
                <button type="button" style={btn('primary')} onClick={() => setRecordFor({ providerName: g.provider.name, country: g.provider.country, invoiceIds: g.invoiceIds, total: g.owed })}>Record payout</button>
              </div>
            ))}
          </section>
        ) : (
          <>
            <StatusTabs<PayoutTab>
              tabs={[
                { id: 'to_pay', label: 'To pay out', count: list?.counts.to_pay ?? 0 },
                { id: 'paid', label: 'Paid out', count: list?.counts.paid ?? 0 },
                { id: 'waiting', label: 'Waiting for patient', count: list?.counts.waiting ?? 0 },
                { id: 'disputed', label: 'Disputed', count: list?.counts.disputed ?? 0 },
                { id: 'rejected', label: 'Rejected', count: list?.counts.rejected ?? 0 },
              ]}
              value={tab}
              onChange={switchTab}
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <SearchBox value={query} onChange={v => { setQuery(v); setPage(0) }} placeholder="Search invoice, patient, provider or payout ref" />
              <button type="button" style={btn()} onClick={() => exportCsv(`payments-${tab}.csv`, items.map(i => ({
                Invoice: i.reference, Patient: i.patient, For: i.forFamily?.name ?? 'Self', Provider: i.provider.name, Country: countryName(i.provider.country),
                Service: i.service ?? '', Amount: i.amount, Currency: i.currency ?? '', Approved: i.approvedAt?.slice(0, 10) ?? '', 'Paid out': i.paidAt?.slice(0, 10) ?? '',
                'Payout ref': i.payout?.reference ?? '', Source: i.payout?.source ?? '',
              })))}>Export CSV</button>
            </div>

            {tab === 'to_pay' && selectedRows.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', borderRadius: radius.md, background: C.blue100 }}>
                <span style={{ flex: 1, fontSize: 13.5, color: C.text }}>
                  <strong>{selectedRows.length}</strong> selected
                  {selectedProviders.size === 1 && selectedRows[0].provider.country ? ` · ${money(selectedRows[0].provider.country, selectedTotal)} to ${selectedRows[0].provider.name}` : ''}
                </span>
                {selectedProviders.size > 1
                  ? <span style={{ fontSize: 13, color: '#B45309' }}>A payout goes to one provider. Select invoices for a single provider.</span>
                  : <button type="button" style={btn('primary')} onClick={() => setRecordFor({ providerName: selectedRows[0].provider.name, country: selectedRows[0].provider.country, invoiceIds: selectedRows.map(r => r.id), total: selectedTotal })}>Record payout</button>}
              </div>
            )}

            <section style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? 0 : '12px 6px 10px' }}>
              {isLoading ? <div style={{ padding: 24, fontSize: 14, color: C.textSub }}>Loading…</div>
                : error ? <div style={{ padding: 24, fontSize: 14, color: '#B91C1C' }}>{error instanceof Error ? error.message : 'Couldn’t load payments.'}</div>
                : items.length === 0 ? <div style={{ padding: '36px 16px', textAlign: 'center', fontSize: 14, color: C.textSub }}>{tab === 'to_pay' ? 'Nothing waiting to be paid out.' : 'Nothing here for this period.'}</div>
                : isMobile ? (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {items.map((i, idx) => (
                      <li key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderTop: idx > 0 ? `1px solid ${C.border}` : 'none' }}>
                        {tab === 'to_pay' && <input type="checkbox" aria-label={`Select ${i.reference}`} checked={selected.has(i.id)} onChange={() => toggle(i.id)} />}
                        <button type="button" onClick={() => setOpenId(i.id)} style={{ all: 'unset', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{i.provider.name}</div>
                          <div style={{ fontSize: 12.5, color: C.textSub }}>{i.patient} · {i.reference}</div>
                        </button>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{amountOf(i)}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="hide-scrollbar" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                      <thead>
                        <tr>
                          {tab === 'to_pay' && (
                            <th style={{ padding: '0 0 10px 12px', width: 28 }}>
                              <input type="checkbox" aria-label="Select all" checked={items.length > 0 && items.every(i => selected.has(i.id))} onChange={e => setSelected(e.target.checked ? new Set(items.map(i => i.id)) : new Set())} />
                            </th>
                          )}
                          <PlainHeader label={dateLabel} />
                          <PlainHeader label="Invoice" />
                          <PlainHeader label="Patient" />
                          <PlainHeader label="Provider" />
                          <PlainHeader label="Amount" align="right" />
                          {tab === 'paid' && <PlainHeader label="Payout" />}
                          {(tab === 'disputed' || tab === 'rejected') && <PlainHeader label="Reason" />}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(i => (
                          <tr key={i.id} className="pay-row" onClick={() => setOpenId(i.id)} style={{ cursor: 'pointer', background: selected.has(i.id) ? '#F2F8FD' : undefined }}>
                            {tab === 'to_pay' && (
                              <td style={{ ...td, paddingRight: 0 }} onClick={e => e.stopPropagation()}>
                                <input type="checkbox" aria-label={`Select ${i.reference}`} checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                              </td>
                            )}
                            <td style={{ ...td, whiteSpace: 'nowrap', color: C.textSub }}>{dateOf(i) ? formatDate(dateOf(i)!) : '—'}</td>
                            <td style={td}>
                              <div style={{ fontWeight: 700, color: C.text }}>{i.reference}</div>
                              {i.service && <div style={{ fontSize: 12, color: C.textSub, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.service}</div>}
                            </td>
                            <td style={td}>
                              <div style={{ color: C.text }}>{i.patient}</div>
                              {i.forFamily && <div style={{ fontSize: 12, color: '#7C3AED' }}>for {i.forFamily.name}</div>}
                            </td>
                            <td style={td}>
                              <div style={{ color: C.text }}>{i.provider.name}</div>
                              <div style={{ fontSize: 12, color: C.textSub }}>{countryName(i.provider.country)}</div>
                            </td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{amountOf(i)}</td>
                            {tab === 'paid' && (
                              <td style={td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5 }}>{i.payout?.reference ?? '—'}</span>
                                  <SourcePill payout={i.payout} />
                                </div>
                              </td>
                            )}
                            {(tab === 'disputed' || tab === 'rejected') && <td style={{ ...td, color: C.textSub, maxWidth: 260 }}>{i.disputeReason ?? i.rejectionReason ?? '—'}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              <div style={{ padding: isMobile ? '0 14px 12px' : '0 8px' }}>
                <Pager page={page} pageSize={PAGE_SIZE} total={list?.total ?? 0} onPage={p => { setPage(p); setSelected(new Set()) }} />
              </div>
            </section>
            {isDesktop && tab === 'to_pay' && items.length > 0 && (
              <p style={{ margin: 0, fontSize: 12.5, color: C.textSub }}>
                Payouts made by the finance partner are recorded here automatically. Use <strong>Record payout</strong> only for payments made outside that integration.
              </p>
            )}
            <style>{'.pay-row:hover { background: #F5F9FD; }'}</style>
          </>
        )}
      </div>

      <SidePanel open={!!openId} onClose={() => setOpenId(null)} label="Invoice">
        {openId && <InvoicePanel id={openId} />}
      </SidePanel>
      {recordFor && (
        <RecordPayoutDialog
          {...recordFor}
          onClose={() => setRecordFor(null)}
          onDone={msg => { setDone(msg); setSelected(new Set()); setTimeout(() => setDone(null), 5000) }}
        />
      )}
    </AdminLayout>
  )
}
