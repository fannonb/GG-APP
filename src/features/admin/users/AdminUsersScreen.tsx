import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminCreditApplications, useAdminUsers } from '@/hooks/api/useAdminQueries'
import { adminService } from '@/api/services/admin.service'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'
import { CountryBadge, countryCode, COUNTRY_CURRENCIES } from '@/features/admin/AdminShared'
import { AccountHistory, PatientAccountActions } from '@/features/admin/accounts/AccountManagement'
import {
  DefList, Initials, PanelSection, PanelTabs, Pager, PlainHeader, SearchBox, SidePanel, SortHeader, StatusPill, StatusTabs, type SortDir,
} from '@/features/admin/accounts/AccountListKit'
import { exportCsv } from '@/features/admin/metrics/metricsFormat'
import { PatientCreditActivity } from './PatientCreditActivity'
import { formatDate, formatRelativeTime } from '@/utils/format'
import type { AdminUser } from '@/types/admin.types'

const CYAN_DEEP = '#0B7BC0'
const PAGE_SIZE = 25

type StatusTab = 'all' | 'active' | 'pending_verification' | 'suspended'
type SortKey = 'name' | 'credit' | 'activity' | 'joined'
type PanelTab = 'overview' | 'credit' | 'history'

const currencyOf = (user: AdminUser) => (COUNTRY_CURRENCIES[user.country] ?? '').replace(/\.$/, '').replace(/^Ksh$/i, 'KSh')
const money = (user: AdminUser, value: number) => `${currencyOf(user)} ${Math.round(value).toLocaleString('en-US')}`

const CREDIT_LABEL: Record<string, { label: string; fg: string; bg: string }> = {
  approved: { label: 'Approved', fg: '#15803D', bg: '#DCFCE7' },
  pending: { label: 'Applied', fg: '#B45309', bg: '#FEF3C7' },
  rejected: { label: 'Declined', fg: '#B91C1C', bg: '#FEE2E2' },
  not_applied: { label: 'No credit', fg: C.textSub, bg: C.bg },
}

function CreditCell({ user }: { user: AdminUser }) {
  const style = CREDIT_LABEL[user.creditStatus] ?? CREDIT_LABEL.not_applied
  if (user.creditStatus !== 'approved' || user.creditLimit <= 0) {
    return <span style={{ fontSize: 12, fontWeight: 700, color: style.fg, background: style.bg, padding: '3px 9px', borderRadius: radius.full }}>{style.label}</span>
  }
  const pct = Math.min(100, Math.round((user.creditUsed / user.creditLimit) * 100))
  return (
    <div style={{ minWidth: 140 }}>
      <div style={{ fontSize: 13, color: C.text }}>
        <strong>{money(user, user.creditUsed)}</strong> <span style={{ color: C.textSub }}>of {money(user, user.creditLimit)}</span>
      </div>
      <div style={{ height: 5, marginTop: 5, borderRadius: 3, background: C.bg, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct > 85 ? '#DC2626' : CYAN_DEEP }} />
      </div>
    </div>
  )
}

function NationalId({ user }: { user: AdminUser }) {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toggle = async () => {
    if (revealed) { setRevealed(null); return }
    setBusy(true)
    setError(null)
    try { setRevealed((await adminService.revealNationalId(user.id)).nationalId) } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t reveal the ID.') } finally { setBusy(false) }
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.04em' }}>{revealed ?? user.nationalId ?? '—'}</span>
      <button type="button" onClick={() => void toggle()} disabled={busy} style={{ background: 'none', border: 'none', padding: 0, color: CYAN_DEEP, fontWeight: 700, fontSize: 13, fontFamily: font.family, cursor: 'pointer' }}>
        {busy ? 'Revealing…' : revealed ? 'Hide' : 'Reveal'}
      </button>
      {error && <span style={{ fontSize: 12, color: '#B91C1C' }}>{error}</span>}
    </span>
  )
}

function age(dob: string) {
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) years -= 1
  return years
}

function PatientPanel({ user, initialTab = 'overview', onUpdated, onDeleted }: { user: AdminUser; initialTab?: PanelTab; onUpdated: (u: AdminUser) => void; onDeleted: () => void }) {
  const [tab, setTab] = useState<PanelTab>(initialTab)
  const [copied, setCopied] = useState(false)
  const { data: creditApps = [] } = useAdminCreditApplications()
  const apps = creditApps.filter(a => a.patientUserId === user.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const years = age(user.dob)
  const available = Math.max(0, user.creditLimit - user.creditUsed)
  const pct = user.creditLimit > 0 ? Math.min(100, Math.round((user.creditUsed / user.creditLimit) * 100)) : 0

  const copyId = async () => {
    try { await navigator.clipboard.writeText(user.id); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }

  return (
    <div>
      <header style={{ padding: '22px 22px 16px', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', paddingRight: 44 }}>
          <Initials name={user.name} size={52} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{user.name}</h2>
              {user.status !== 'active' && <StatusPill status={user.status} />}
            </div>
            <div style={{ fontSize: 13.5, color: C.textSub, marginTop: 3, overflowWrap: 'anywhere' }}>{user.email}</div>
            <button type="button" onClick={() => void copyId()} style={{ background: 'none', border: 'none', padding: 0, marginTop: 3, fontSize: 12, color: C.textLight, fontFamily: font.family, cursor: 'pointer' }}>
              {copied ? 'Copied' : 'Copy patient ID'}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <PatientAccountActions user={user} currency={currencyOf(user)} onUpdated={onUpdated} onDeleted={onDeleted} />
        </div>
      </header>
      <PanelTabs tabs={[{ id: 'overview', label: 'Overview' }, { id: 'credit', label: 'Credit' }, { id: 'history', label: 'History' }]} value={tab} onChange={setTab} />

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tab === 'overview' && (
          <>
            <PanelSection title="Details">
              <DefList items={[
                { label: 'Phone', value: user.phone },
                { label: 'Country', value: <CountryBadge code={countryCode(user.country)} showName name={user.country} size={14} /> },
                { label: 'Date of birth', value: user.dob ? `${formatDate(user.dob)}${years != null ? ` · ${years} years` : ''}` : null },
                { label: 'Gender', value: user.gender || 'Not recorded' },
                { label: 'Signed up', value: `${formatDate(user.memberSince)} · ${user.signUpMethod === 'google' ? 'Google' : 'Email'}` },
                { label: 'Email verified', value: user.emailVerified === false ? <span style={{ color: '#B45309', fontWeight: 600 }}>Not yet</span> : 'Yes' },
                { label: 'Last activity', value: user.lastActivityAt ? formatRelativeTime(user.lastActivityAt) : 'No bookings or invoices yet' },
                { label: 'Payments made', value: String(user.transactionCount) },
                { label: 'National ID', value: <NationalId user={user} />, wide: true },
              ]} />
            </PanelSection>
            <PanelSection title={`Family members (${user.family?.length ?? user.beneficiariesCount})`}>
              {(user.family?.length ?? 0) === 0 ? (
                <div style={{ fontSize: 13.5, color: C.textSub }}>No family members added.</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {user.family!.map((m, i) => (
                    <li key={`${m.name}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', fontSize: 14 }}>
                      <span style={{ fontWeight: 600, color: C.text }}>{m.name}</span>
                      <span style={{ color: C.textSub }}>{m.relation}</span>
                    </li>
                  ))}
                </ul>
              )}
            </PanelSection>
          </>
        )}

        {tab === 'credit' && (
          <>
            <PanelSection title="Healthcare credit">
              {user.creditStatus === 'approved' && user.creditLimit > 0 ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[['Limit', user.creditLimit], ['Used', user.creditUsed], ['Available', available]].map(([label, value]) => (
                      <div key={label as string}>
                        <div style={{ fontSize: 12, color: C.textSub }}>{label}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginTop: 2 }}>{money(user, value as number)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 8, marginTop: 12, borderRadius: 4, background: C.bg, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct > 85 ? '#DC2626' : CYAN_DEEP }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6 }}>
                    {pct}% used{user.financePartner ? ` · Financed by ${user.financePartner === 'equity' ? 'Equity' : 'Moneymart'}` : ''}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13.5, color: C.textSub }}>
                  {user.creditStatus === 'pending' ? 'Their credit application is waiting for review.' : user.creditStatus === 'rejected' ? 'Their last credit application was declined.' : 'This patient hasn’t applied for credit yet.'}
                </div>
              )}
            </PanelSection>
            <PanelSection title="Credit activity">
              <PatientCreditActivity userId={user.id} patientName={user.name} money={value => money(user, value)} />
            </PanelSection>
            <PanelSection title="Credit applications">
              {apps.length === 0 ? (
                <div style={{ fontSize: 13.5, color: C.textSub }}>No applications.</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {apps.map((a, i) => (
                    <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{a.type === 'increase' ? 'Increase' : 'First application'} · {money(user, a.requestedAmount)}</div>
                        <div style={{ fontSize: 12, color: C.textSub }}>{a.reference} · {formatDate(a.submittedAt)}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: radius.full, ...(a.status === 'approved' ? { color: '#15803D', background: '#DCFCE7' } : a.status === 'rejected' ? { color: '#B91C1C', background: '#FEE2E2' } : { color: '#B45309', background: '#FEF3C7' }) }}>
                        {a.status === 'approved' ? `Approved${a.approvedAmount ? ` ${money(user, a.approvedAmount)}` : ''}` : a.status === 'rejected' ? 'Declined' : 'Waiting'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </PanelSection>
          </>
        )}

        {tab === 'history' && (
          <PanelSection title="Admin history">
            <AccountHistory kind="users" id={user.id} />
          </PanelSection>
        )}
      </div>
    </div>
  )
}

export function AdminUsersScreen() {
  const { isMobile } = useResponsive()
  const { country } = useAdminCountry()
  const [searchParams] = useSearchParams()
  const { data: users = [], isLoading, error } = useAdminUsers()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [status, setStatus] = useState<StatusTab>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'joined', dir: 'desc' })
  const [page, setPage] = useState(0)
  // ?open=<id> opens that account's panel directly (used for links from other pages).
  const [openId, setOpenId] = useState<string | null>(searchParams.get('open'))
  // Edits made in the panel show straight away while the list refetches.
  const [overrides, setOverrides] = useState<Record<string, AdminUser | null>>({})

  const merged = useMemo(() => users.map(u => (u.id in overrides ? overrides[u.id] : u)).filter((u): u is AdminUser => !!u), [users, overrides])
  const inCountry = useMemo(() => merged.filter(u => country === 'all' || u.country === country), [merged, country])
  const q = query.trim().toLowerCase()
  const searched = useMemo(() => inCountry.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q)), [inCountry, q])
  const counts = {
    all: searched.length,
    active: searched.filter(u => u.status === 'active').length,
    pending_verification: searched.filter(u => u.status === 'pending_verification').length,
    suspended: searched.filter(u => u.status === 'suspended').length,
  }
  const filtered = status === 'all' ? searched : searched.filter(u => u.status === status)
  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    const val = (u: AdminUser): string | number => {
      switch (sort.key) {
        case 'name': return u.name.toLowerCase()
        case 'credit': return u.creditLimit > 0 ? u.creditUsed / u.creditLimit : -1
        case 'activity': return u.lastActivityAt ?? ''
        default: return u.memberSince
      }
    }
    return [...filtered].sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0))
  }, [filtered, sort])
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const open = merged.find(u => u.id === openId) ?? null

  const onSort = (key: SortKey) => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
  const td: React.CSSProperties = { padding: '12px', borderTop: `1px solid ${C.border}`, verticalAlign: 'middle' }

  return (
    <AdminLayout title="Patients">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: font.family }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchBox value={query} onChange={v => { setQuery(v); setPage(0) }} placeholder="Search name, email or phone" />
          <button
            type="button"
            onClick={() => exportCsv('patients.csv', sorted.map(u => ({
              Name: u.name, Email: u.email, Phone: u.phone, Country: u.country, Status: u.status,
              'Credit status': u.creditStatus, 'Credit limit': u.creditLimit, 'Credit used': u.creditUsed,
              'Family members': u.beneficiariesCount, Payments: u.transactionCount,
              Joined: u.memberSince.slice(0, 10), 'Last activity': u.lastActivityAt?.slice(0, 10) ?? '',
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
            { id: 'pending_verification', label: 'Not verified', count: counts.pending_verification },
            { id: 'suspended', label: 'Suspended', count: counts.suspended },
          ]}
          value={status}
          onChange={id => { setStatus(id); setPage(0) }}
        />

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? 0 : '14px 6px 10px' }}>
          {isLoading ? (
            <div style={{ padding: 24, fontSize: 14, color: C.textSub }}>Loading patients…</div>
          ) : error ? (
            <div style={{ padding: 24, fontSize: 14, color: '#B91C1C' }}>{error instanceof Error ? error.message : 'Couldn’t load patients.'}</div>
          ) : pageRows.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', fontSize: 14, color: C.textSub }}>No patients match.</div>
          ) : isMobile ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {pageRows.map((u, i) => (
                <li key={u.id}>
                  <button type="button" onClick={() => setOpenId(u.id)} style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', fontFamily: font.family }}>
                    <Initials name={u.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text }}>{u.name}</div>
                      <div style={{ fontSize: 12.5, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.country} · {u.creditStatus === 'approved' ? `${money(u, u.creditUsed)} of ${money(u, u.creditLimit)}` : (CREDIT_LABEL[u.creditStatus] ?? CREDIT_LABEL.not_applied).label}</div>
                    </div>
                    {u.status !== 'active' && <StatusPill status={u.status} />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="hide-scrollbar" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 760 }}>
                <thead>
                  <tr>
                    <SortHeader label="Patient" sortKey="name" sort={sort} onSort={onSort} />
                    <PlainHeader label="Country" />
                    <SortHeader label="Credit" sortKey="credit" sort={sort} onSort={onSort} />
                    <SortHeader label="Last activity" sortKey="activity" sort={sort} onSort={onSort} />
                    <SortHeader label="Joined" sortKey="joined" sort={sort} onSort={onSort} />
                    <PlainHeader label="" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(u => (
                    <tr key={u.id} onClick={() => setOpenId(u.id)} className="acct-row" style={{ cursor: 'pointer', background: u.id === openId ? C.blue100 : undefined }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Initials name={u.name} />
                          <div style={{ minWidth: 0 }}>
                            <button type="button" onClick={e => { e.stopPropagation(); setOpenId(u.id) }} style={{ all: 'unset', fontWeight: 700, color: C.text, cursor: 'pointer' }}>{u.name}</button>
                            <div style={{ fontSize: 12.5, color: C.textSub }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}><CountryBadge code={countryCode(u.country)} showName name={u.country} size={14} /></td>
                      <td style={td}><CreditCell user={u} /></td>
                      <td style={{ ...td, color: u.lastActivityAt ? C.text : C.textLight, fontSize: 13.5 }}>{u.lastActivityAt ? formatRelativeTime(u.lastActivityAt) : 'None yet'}</td>
                      <td style={{ ...td, color: C.textSub, fontSize: 13.5, whiteSpace: 'nowrap' }}>{formatDate(u.memberSince)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{u.status !== 'active' && <StatusPill status={u.status} />}</td>
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

      <SidePanel open={!!open} onClose={() => setOpenId(null)} label={open ? open.name : 'Patient'}>
        {open && (
          <PatientPanel
            key={open.id}
            user={open}
            initialTab={open.id === searchParams.get('open') && ['overview', 'credit', 'history'].includes(searchParams.get('tab') ?? '') ? searchParams.get('tab') as PanelTab : undefined}
            onUpdated={u => setOverrides(o => ({ ...o, [u.id]: u }))}
            onDeleted={() => { setOverrides(o => ({ ...o, [open.id]: null })); setOpenId(null) }}
          />
        )}
      </SidePanel>
    </AdminLayout>
  )
}
