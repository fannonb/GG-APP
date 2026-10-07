import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminProviders } from '@/hooks/api/useAdminQueries'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'
import { CountryBadge, countryCode, COUNTRY_CURRENCIES } from '@/features/admin/AdminShared'
import { AccountHistory, ProviderAccountActions } from '@/features/admin/accounts/AccountManagement'
import {
  DefList, Initials, PanelSection, PanelTabs, Pager, PlainHeader, SearchBox, SidePanel, SortHeader, StatusPill, StatusTabs, type SortDir,
} from '@/features/admin/accounts/AccountListKit'
import { exportCsv } from '@/features/admin/metrics/metricsFormat'
import { formatDate } from '@/utils/format'
import type { AdminProvider } from '@/types/admin.types'

const PAGE_SIZE = 25
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TYPES = ['All types', 'Hospital', 'Clinic', 'Doctor', 'Pharmacy', 'Laboratory', 'Radiology']

type StatusTab = 'all' | 'active' | 'suspended'
type SortKey = 'name' | 'rating' | 'bookings' | 'earnings' | 'joined'
type PanelTab = 'overview' | 'payouts' | 'documents' | 'history'

const currencyOf = (p: AdminProvider) => (COUNTRY_CURRENCIES[p.country] ?? '').replace(/\.$/, '').replace(/^Ksh$/i, 'KSh')
const money = (p: AdminProvider, value: number) => `${currencyOf(p)} ${Math.round(value).toLocaleString('en-US')}`
const payoutLabel = { MPESA: 'M-Pesa', BANK: 'Bank', MOBILE_MONEY: 'Mobile money', mpesa: 'M-Pesa', bank: 'Bank', mobile_money: 'Mobile money' } as Record<string, string>

function Rating({ value }: { value?: number }) {
  if (!value) return <span style={{ color: C.textLight }}>No reviews</span>
  return <span style={{ whiteSpace: 'nowrap' }}><span style={{ color: '#F59E0B' }}>★</span> {value.toFixed(1)}</span>
}

function ProviderPanel({ provider, onUpdated, onDeleted }: { provider: AdminProvider; onUpdated: (p: AdminProvider) => void; onDeleted: () => void }) {
  const [tab, setTab] = useState<PanelTab>('overview')
  const docs = provider.documents ?? []
  const hours = provider.hours ?? {}
  const payout = provider.payoutAccount

  return (
    <div>
      <header style={{ padding: '22px 22px 16px', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', paddingRight: 44 }}>
          <Initials name={provider.name} size={52} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{provider.name}</h2>
              {provider.status !== 'active' && <StatusPill status={provider.status} />}
              {provider.openStatus === 'closed' && <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub, background: C.bg, padding: '3px 9px', borderRadius: radius.full }}>Not taking patients</span>}
            </div>
            <div style={{ fontSize: 13.5, color: C.textSub, marginTop: 3 }}>{provider.type} · {provider.country}</div>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 2, overflowWrap: 'anywhere' }}>{provider.email}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16, padding: '12px 14px', borderRadius: radius.md, background: C.bg }}>
          <div><div style={{ fontSize: 12, color: C.textSub }}>Bookings</div><div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{provider.totalPatients}</div></div>
          <div><div style={{ fontSize: 12, color: C.textSub }}>Earned</div><div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{money(provider, provider.totalEarnings)}</div></div>
          <div><div style={{ fontSize: 12, color: C.textSub }}>Rating</div><div style={{ fontSize: 17, fontWeight: 800, color: C.text }}><Rating value={provider.rating} /></div></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <ProviderAccountActions provider={provider} onUpdated={onUpdated} onDeleted={onDeleted} />
        </div>
      </header>
      <PanelTabs
        tabs={[{ id: 'overview', label: 'Overview' }, { id: 'payouts', label: 'Payouts' }, { id: 'documents', label: `Documents (${docs.length})` }, { id: 'history', label: 'History' }]}
        value={tab}
        onChange={setTab}
      />

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tab === 'overview' && (
          <>
            <PanelSection title="Details">
              <DefList items={[
                { label: 'Phone', value: provider.phone },
                { label: 'Second email', value: provider.emailSecondary },
                { label: 'Address', value: provider.address, wide: true },
                { label: 'Licence number', value: provider.license },
                { label: 'Joined', value: formatDate(provider.joinedDate) },
                { label: 'Services', value: (provider.serviceTypes ?? []).join(', '), wide: true },
                ...(provider.about || provider.description ? [{ label: 'About', value: provider.about || provider.description, wide: true }] : []),
              ]} />
            </PanelSection>
            <PanelSection title="Opening hours">
              {Object.keys(hours).length === 0 ? (
                <div style={{ fontSize: 13.5, color: C.textSub }}>{provider.hoursText || 'No hours set.'}</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px 20px' }}>
                  {DAYS.map(day => {
                    const h = hours[day]
                    if (!h) return null
                    return (
                      <li key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                        <span style={{ color: C.textSub }}>{day}</span>
                        <span style={{ color: h.open ? C.text : C.textLight, fontWeight: 600 }}>{h.open ? `${h.from}–${h.to}` : 'Closed'}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </PanelSection>
          </>
        )}

        {tab === 'payouts' && (
          <>
            <PanelSection title="Payout account">
              {payout ? (
                <DefList items={[
                  { label: 'Method', value: payoutLabel[payout.method] ?? payout.method },
                  { label: 'Account name', value: payout.accountName },
                  { label: 'Account / paybill', value: payout.accountNumber },
                ]} />
              ) : provider.paymentMethod ? (
                <DefList items={[
                  { label: 'Method', value: payoutLabel[provider.paymentMethod] ?? provider.paymentMethod },
                  { label: 'Paybill', value: provider.mpesaPaybill },
                  { label: 'Bank', value: provider.bankName },
                  { label: 'Account', value: provider.bankAccount },
                ]} />
              ) : (
                <div style={{ fontSize: 13.5, color: '#B45309' }}>No payout account set, so this provider can’t be paid yet.</div>
              )}
            </PanelSection>
            <PanelSection title="Money">
              <DefList items={[
                { label: 'Total invoiced', value: money(provider, provider.totalEarnings) },
                { label: 'Not yet paid out', value: money(provider, provider.pendingPayments) },
              ]} />
            </PanelSection>
          </>
        )}

        {tab === 'documents' && (
          <PanelSection title="Registration documents">
            {docs.length === 0 ? (
              <div style={{ fontSize: 13.5, color: C.textSub }}>No documents on file.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {docs.map((d, i) => (
                  <li key={`${d.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                    <span aria-hidden style={{ width: 34, height: 34, borderRadius: 8, background: C.blue100, color: '#0B7BC0', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{d.type === 'pdf' ? 'PDF' : 'IMG'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>{d.kind ? `${d.kind.charAt(0).toUpperCase()}${d.kind.slice(1).replace('_', ' ')} · ` : ''}{d.size} · {formatDate(d.uploadedAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PanelSection>
        )}

        {tab === 'history' && (
          <PanelSection title="Admin history">
            <AccountHistory kind="providers" id={provider.id} />
          </PanelSection>
        )}
      </div>
    </div>
  )
}

export function AdminProvidersScreen() {
  const { isMobile } = useResponsive()
  const { country } = useAdminCountry()
  const [searchParams] = useSearchParams()
  const { data: providers = [], isLoading, error } = useAdminProviders()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [status, setStatus] = useState<StatusTab>('all')
  const [type, setType] = useState('All types')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'joined', dir: 'desc' })
  const [page, setPage] = useState(0)
  // ?open=<id> opens that account's panel directly (used for links from other pages).
  const [openId, setOpenId] = useState<string | null>(searchParams.get('open'))
  const [overrides, setOverrides] = useState<Record<string, AdminProvider | null>>({})

  const merged = useMemo(() => providers.map(p => (p.id in overrides ? overrides[p.id] : p)).filter((p): p is AdminProvider => !!p), [providers, overrides])
  const q = query.trim().toLowerCase()
  const searched = useMemo(() => merged.filter(p =>
    (country === 'all' || p.country === country)
    && (type === 'All types' || p.type.toLowerCase().includes(type.toLowerCase()))
    && (!q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.license ?? '').toLowerCase().includes(q)),
  ), [merged, country, type, q])
  const counts = { all: searched.length, active: searched.filter(p => p.status === 'active').length, suspended: searched.filter(p => p.status === 'suspended').length }
  const filtered = status === 'all' ? searched : searched.filter(p => p.status === status)
  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    const val = (p: AdminProvider): string | number => {
      switch (sort.key) {
        case 'name': return p.name.toLowerCase()
        case 'rating': return p.rating ?? 0
        case 'bookings': return p.totalPatients
        case 'earnings': return p.totalEarnings
        default: return p.joinedDate
      }
    }
    return [...filtered].sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0))
  }, [filtered, sort])
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const open = merged.find(p => p.id === openId) ?? null

  const onSort = (key: SortKey) => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
  const td: React.CSSProperties = { padding: '12px', borderTop: `1px solid ${C.border}`, verticalAlign: 'middle' }

  return (
    <AdminLayout title="Providers">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: font.family }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchBox value={query} onChange={v => { setQuery(v); setPage(0) }} placeholder="Search practice, email or licence" />
          <select aria-label="Provider type" value={type} onChange={e => { setType(e.target.value); setPage(0) }} style={{ height: 40, padding: '0 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', fontSize: 14, fontFamily: font.family, color: C.text }}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button
            type="button"
            onClick={() => exportCsv('providers.csv', sorted.map(p => ({
              Practice: p.name, Type: p.type, Country: p.country, Status: p.status, Email: p.email, Phone: p.phone, Licence: p.license,
              Rating: p.rating ?? '', Bookings: p.totalPatients, Earned: Math.round(p.totalEarnings), 'Not yet paid out': Math.round(p.pendingPayments),
              Currency: currencyOf(p), Joined: p.joinedDate.slice(0, 10),
            })))}
            style={{ height: 40, padding: '0 14px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 13.5, fontWeight: 600, fontFamily: font.family, cursor: 'pointer' }}
          >
            Export CSV
          </button>
        </div>

        <StatusTabs<StatusTab>
          tabs={[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'active', label: 'Active', count: counts.active },
            { id: 'suspended', label: 'Suspended', count: counts.suspended },
          ]}
          value={status}
          onChange={id => { setStatus(id); setPage(0) }}
        />

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? 0 : '14px 6px 10px' }}>
          {isLoading ? (
            <div style={{ padding: 24, fontSize: 14, color: C.textSub }}>Loading providers…</div>
          ) : error ? (
            <div style={{ padding: 24, fontSize: 14, color: '#B91C1C' }}>{error instanceof Error ? error.message : 'Couldn’t load providers.'}</div>
          ) : pageRows.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', fontSize: 14, color: C.textSub }}>No providers match.</div>
          ) : isMobile ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {pageRows.map((p, i) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setOpenId(p.id)} style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', fontFamily: font.family }}>
                    <Initials name={p.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text }}>{p.name}</div>
                      <div style={{ fontSize: 12.5, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.type} · {p.country} · {p.totalPatients} bookings</div>
                    </div>
                    {p.status !== 'active' && <StatusPill status={p.status} />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="hide-scrollbar" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 820 }}>
                <thead>
                  <tr>
                    <SortHeader label="Practice" sortKey="name" sort={sort} onSort={onSort} />
                    <PlainHeader label="Country" />
                    <SortHeader label="Rating" sortKey="rating" sort={sort} onSort={onSort} />
                    <SortHeader label="Bookings" sortKey="bookings" sort={sort} onSort={onSort} align="right" />
                    <SortHeader label="Earned" sortKey="earnings" sort={sort} onSort={onSort} align="right" />
                    <SortHeader label="Joined" sortKey="joined" sort={sort} onSort={onSort} />
                    <PlainHeader label="" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(p => (
                    <tr key={p.id} onClick={() => setOpenId(p.id)} className="acct-row" style={{ cursor: 'pointer', background: p.id === openId ? C.blue100 : undefined }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Initials name={p.name} />
                          <div style={{ minWidth: 0 }}>
                            <button type="button" onClick={e => { e.stopPropagation(); setOpenId(p.id) }} style={{ all: 'unset', fontWeight: 700, color: C.text, cursor: 'pointer' }}>{p.name}</button>
                            <div style={{ fontSize: 12.5, color: C.textSub }}>{p.type}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}><CountryBadge code={countryCode(p.country)} showName name={p.country} size={14} /></td>
                      <td style={{ ...td, fontSize: 13.5 }}><Rating value={p.rating} /></td>
                      <td style={{ ...td, textAlign: 'right' }}>{p.totalPatients}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(p, p.totalEarnings)}</td>
                      <td style={{ ...td, color: C.textSub, fontSize: 13.5, whiteSpace: 'nowrap' }}>{formatDate(p.joinedDate)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {p.status !== 'active' ? <StatusPill status={p.status} /> : p.openStatus === 'closed' ? <span style={{ fontSize: 12, color: C.textSub }}>Closed</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: isMobile ? '0 14px 12px' : '0 8px' }}>
            <Pager page={page} pageSize={PAGE_SIZE} total={sorted.length} onPage={setPage} />
          </div>
        </div>
        <style>{'.acct-row:hover { background: #F5F9FD; }'}</style>
      </div>

      <SidePanel open={!!open} onClose={() => setOpenId(null)} label={open ? open.name : 'Provider'}>
        {open && (
          <ProviderPanel
            key={open.id}
            provider={open}
            onUpdated={p => setOverrides(o => ({ ...o, [p.id]: p }))}
            onDeleted={() => { setOverrides(o => ({ ...o, [open.id]: null })); setOpenId(null) }}
          />
        )}
      </SidePanel>
    </AdminLayout>
  )
}
