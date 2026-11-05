import { Pager, usePaged } from '@/features/admin/paging'
import { useMemo, useState } from 'react'
import { GGButton, GGCard, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import {
  useApproveAdminCreditApplicationMutation,
  useRejectAdminCreditApplicationMutation,
} from '@/hooks/api/useAdminMutations'
import { useAdminCreditApplications } from '@/hooks/api/useAdminQueries'
import { formatCurrency, formatDate } from '@/utils/format'
import { getFinancePartnerSummary } from '@/features/patient/credit/credit.constants'
import type { AdminCreditApplication } from '@/types/credit.types'
import { currencySymbolFor } from '@/hooks/useCurrency'
import { Initials, PlainHeader, SearchBox, SidePanel, SortHeader, StatusTabs, type SortDir } from '@/features/admin/accounts/AccountListKit'
import { CountryBadge, countryCode } from '@/features/admin/AdminShared'

type SortKey = 'name' | 'requested' | 'submitted'

/** Credit is granted in the application's market currency. */
const currencyOf = (app: AdminCreditApplication) => currencySymbolFor(app.marketCountryCode ?? app.country)

function StatusBadge({ status }: { status: AdminCreditApplication['status'] }) {
  const map = {
    submitted: { bg: C.warningBg, color: '#92400E', label: 'Pending Review' },
    approved: { bg: C.successBg, color: C.success, label: 'Approved' },
    rejected: { bg: C.errorBg, color: C.error, label: 'Rejected' },
  } as const
  const config = map[status]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 12px',
      borderRadius: radius.full,
      background: config.bg,
      border: `1px solid ${C.border}`,
      fontSize: '11px',
      fontWeight: 700,
      color: config.color,
      whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, textAlign: 'right', fontFamily: font.family }}>{value}</span>
    </div>
  )
}

export function AdminCreditAppsScreen() {
  const { isMobile } = useResponsive()
  const { data: applications = [], isLoading, isError, error, refetch } = useAdminCreditApplications()
  const approveMutation = useApproveAdminCreditApplicationMutation()
  const rejectMutation = useRejectAdminCreditApplicationMutation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted')
  const [approvedAmount, setApprovedAmount] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  // Oldest first, so the longest wait is decided first.
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'submitted', dir: 'asc' })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const dir = sort.dir === 'asc' ? 1 : -1
    const value = (app: AdminCreditApplication): string | number =>
      sort.key === 'name' ? app.patientName.toLowerCase() : sort.key === 'requested' ? app.requestedAmount : new Date(app.submittedAt).getTime()
    return applications
      .filter(app => filter === 'all' || app.status === filter)
      .filter(app => !q || app.patientName.toLowerCase().includes(q) || app.reference.toLowerCase().includes(q) || (app.patientEmail ?? '').toLowerCase().includes(q))
      .sort((a, b) => (value(a) > value(b) ? dir : value(a) < value(b) ? -dir : 0))
  }, [applications, filter, search, sort])
  const onSort = (key: SortKey) => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))

  const selected = filtered.find(app => app.id === selectedId)
    ?? applications.find(app => app.id === selectedId)
    ?? null

  const handleSelect = (app: AdminCreditApplication) => {
    setSelectedId(app.id)
    setApprovedAmount(String(app.requestedAmount))
    setRejectNote('')
    setPanelOpen(true)
  }

  const handleApprove = async () => {
    if (!selected) return
    const amount = Number(approvedAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    await approveMutation.mutateAsync({
      id: selected.id,
      payload: { approvedAmount: amount },
    })
  }

  const handleReject = async () => {
    if (!selected) return
    await rejectMutation.mutateAsync({
      id: selected.id,
      payload: { note: rejectNote.trim() || undefined },
    })
  }

  const pendingCount = useMemo(
    () => applications.filter(app => app.status === 'submitted').length,
    [applications],
  )

  const { pageItems, pager } = usePaged(filtered, `${filter}|${search}|${sort.key}|${sort.dir}`)
  const cell: React.CSSProperties = { padding: '12px', borderTop: `1px solid ${C.border}`, verticalAlign: 'middle' }
  const countOf = (status: typeof filter) => applications.filter(app => status === 'all' || app.status === status).length

  return (
    <AdminLayout title="Credit Applications" status={pendingCount > 0 ? `${pendingCount} pending` : undefined}>
      {isError && (
        <GGCard padding="20px" style={{ marginBottom: '16px', border: `1px solid ${C.error}` }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.error, marginBottom: '6px' }}>
            Unable to load credit applications
          </div>
          <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.55, marginBottom: '12px' }}>
            {error instanceof Error ? error.message : 'The credit applications list could not be loaded from the server.'}
          </div>
          <GGButton variant="primary" size="sm" onClick={() => refetch()}>Retry</GGButton>
        </GGCard>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: font.family }}>
        <StatusTabs<typeof filter>
          tabs={[
            { id: 'submitted', label: 'Pending', count: countOf('submitted') },
            { id: 'approved', label: 'Approved', count: countOf('approved') },
            { id: 'rejected', label: 'Rejected', count: countOf('rejected') },
            { id: 'all', label: 'All', count: countOf('all') },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search patient, reference or email" />
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? 0 : '14px 6px 10px' }}>
          {isLoading ? (
            <div style={{ padding: 24, fontSize: 14, color: C.textSub }}>Loading applications…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', fontSize: 14, color: C.textSub }}>
              {applications.length === 0 ? 'No credit applications have been submitted yet.' : 'No applications match.'}
            </div>
          ) : isMobile ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {pageItems.map((app, i) => (
                <li key={app.id}>
                  <button type="button" onClick={() => handleSelect(app)} style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', fontFamily: font.family }}>
                    <Initials name={app.patientName} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text }}>{app.patientName}</div>
                      <div style={{ fontSize: 12.5, color: C.textSub }}>{formatCurrency(app.requestedAmount, currencyOf(app))} · {formatDate(app.submittedAt)}</div>
                    </div>
                    <StatusBadge status={app.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="hide-scrollbar" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 860 }}>
                <thead>
                  <tr>
                    <SortHeader label="Applicant" sortKey="name" sort={sort} onSort={onSort} />
                    <PlainHeader label="Type" />
                    <PlainHeader label="Country" />
                    <SortHeader label="Requested" sortKey="requested" sort={sort} onSort={onSort} align="right" />
                    <SortHeader label="Submitted" sortKey="submitted" sort={sort} onSort={onSort} />
                    <PlainHeader label="Status" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(app => {
                    const market = app.marketCountryCode ?? app.country
                    return (
                      <tr key={app.id} onClick={() => handleSelect(app)} className="credit-row" style={{ cursor: 'pointer', background: panelOpen && selectedId === app.id ? C.blue100 : undefined }}>
                        <td style={cell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Initials name={app.patientName} />
                            <div style={{ minWidth: 0 }}>
                              <button type="button" onClick={e => { e.stopPropagation(); handleSelect(app) }} style={{ all: 'unset', fontWeight: 700, color: C.text, cursor: 'pointer' }}>{app.patientName}</button>
                              <div style={{ fontSize: 12.5, color: C.textSub }}>{app.reference}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...cell, fontSize: 13.5, color: C.textSub, whiteSpace: 'nowrap' }}>{app.type === 'increase' ? 'Limit increase' : 'New application'}</td>
                        <td style={cell}>
                          {market ? <CountryBadge code={countryCode(market)} showName name={app.country ?? market} size={14} /> : '—'}
                          {app.residesAbroad && <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Lives abroad</div>}
                        </td>
                        <td style={{ ...cell, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(app.requestedAmount, currencyOf(app))}</td>
                        <td style={{ ...cell, fontSize: 13.5, color: C.textSub, whiteSpace: 'nowrap' }}>{formatDate(app.submittedAt)}</td>
                        <td style={{ ...cell, textAlign: 'right' }}><StatusBadge status={app.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: isMobile ? '0 14px 12px' : '0 8px' }}><Pager {...pager} /></div>
        </div>
        <style>{'.credit-row:hover { background: #F5F9FD; }'}</style>
      </div>

      <SidePanel open={panelOpen && !!selected} onClose={() => setPanelOpen(false)} label={selected ? selected.patientName : 'Credit application'}>
        {selected && (
          <div style={{ padding: isMobile ? '20px 14px 28px' : '24px 26px 32px', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.015em' }}>{selected.patientName}</div>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px' }}>
                    {selected.reference} · {selected.type === 'increase' ? 'Limit increase' : 'Initial application'}
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div>
                <InfoRow label="Email" value={selected.patientEmail} />
                <InfoRow label="Phone" value={selected.patientPhone || '—'} />
                <InfoRow
                  label="Country of residence"
                  value={selected.residesAbroad
                    ? `${selected.residenceCountry ?? selected.country} (abroad)`
                    : (selected.residenceCountry ?? selected.country ?? '—')}
                />
                {selected.marketCountryCode && (
                  <InfoRow label="Market country" value={selected.marketCountryCode} />
                )}
                <InfoRow label="Finance partner" value={getFinancePartnerSummary(selected.financePartnerId)?.name ?? selected.financePartnerId} />
                <InfoRow label="Employment" value={selected.employment.replace(/-/g, ' ')} />
                <InfoRow label="Monthly income" value={formatCurrency(selected.monthlyIncome, currencyOf(selected))} />
                <InfoRow label="Requested amount" value={formatCurrency(selected.requestedAmount, currencyOf(selected))} />
                {selected.type === 'increase' && (
                  <>
                    <InfoRow label="Current limit" value={formatCurrency(selected.currentCreditLimit, currencyOf(selected))} />
                    <InfoRow label="Current available" value={formatCurrency(selected.currentCreditAvailable, currencyOf(selected))} />
                    {selected.reason && <InfoRow label="Reason" value={selected.reason.replace(/-/g, ' ')} />}
                  </>
                )}
                {selected.notes && <InfoRow label="Notes" value={selected.notes} />}
                <InfoRow label="Submitted" value={formatDate(selected.submittedAt, { day: 'numeric', month: 'long', year: 'numeric' })} />
              </div>

              {selected.status === 'submitted' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <GGInput
                    label="Approved amount"
                    type="number"
                    value={approvedAmount}
                    onChange={event => setApprovedAmount(event.target.value)}
                    hint="Amount loaded to the patient's allocation if approved"
                  />
                  <GGInput
                    label="Decline reason (optional)"
                    value={rejectNote}
                    onChange={event => setRejectNote(event.target.value)}
                    placeholder="Reason shown to the patient if declined"
                  />
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <GGButton
                      variant="primary"
                      size="md"
                      onClick={handleApprove}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      style={{ flex: 1 }}
                    >
                      {approveMutation.isPending ? 'Approving…' : 'Approve & Load Balance'}
                    </GGButton>
                    <GGButton
                      variant="danger"
                      size="md"
                      onClick={handleReject}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      style={{ flex: 1 }}
                    >
                      {rejectMutation.isPending ? 'Declining…' : 'Decline'}
                    </GGButton>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px 18px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>
                  {selected.status === 'approved'
                    ? `Approved for ${formatCurrency(selected.approvedAmount ?? selected.requestedAmount, currencyOf(selected))}${selected.reviewedAt ? ` on ${formatDate(selected.reviewedAt)}` : ''}.`
                    : selected.declineReason ?? 'This application was declined.'}
                </div>
              )}
            </div>
        )}
      </SidePanel>
    </AdminLayout>
  )
}
