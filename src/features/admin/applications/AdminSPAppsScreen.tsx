import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminApplications } from '@/hooks/api/useAdminQueries'
import { ROUTES } from '@/router/routes'
import { formatDate } from '@/utils/format'
import { Pager, usePaged } from '@/features/admin/paging'
import { Initials, PlainHeader, SearchBox, SidePanel, StatusTabs } from '@/features/admin/accounts/AccountListKit'
import { CountryBadge, countryCode } from '@/features/admin/AdminShared'
import type { SPApplication } from '@/types/admin.types'
import { ApplicationReviewPanel } from './ApplicationReviewPanel'
import { ImportLeadsList } from './ImportLeadsList'
import { ProviderImportPanel } from './ProviderImportPanel'
import { SetupLinksList } from './SetupLinksList'
import { fetchNeedsEmailCount, providerImportKeys } from './providerImport.api'
import { applicationStatus, daysWaiting } from './applicationStatus'

type Tab = 'review' | 'links' | 'approved' | 'rejected'

const needsReview = (a: SPApplication) => a.status === 'pending' || a.status === 'info_requested'
const needsSetupLink = (a: SPApplication) => a.status === 'approved' && !!a.importedAt && !a.activatedAt

/** Provider replies first (the ball is back with us), then whoever has waited longest. */
function reviewOrder(a: SPApplication, b: SPApplication) {
  return Number(!!b.resubmitted) - Number(!!a.resubmitted) || new Date(a.submitted).getTime() - new Date(b.submitted).getTime()
}

function StatusText({ app }: { app: SPApplication }) {
  const s = applicationStatus(app)
  return <span style={{ color: s.color, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
}

/**
 * Provider applications, organised by what the admin has to do next:
 * review them, send imported providers their setup link, or look back at decisions.
 */
export function AdminSPAppsScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { data: fetched = [], isLoading } = useAdminApplications()

  const [tab, setTab] = useState<Tab>('review')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [leadsOpen, setLeadsOpen] = useState(false)
  const { data: leadCount } = useQuery({ queryKey: providerImportKeys.leadsCount, queryFn: fetchNeedsEmailCount })
  // Decisions made here show straight away, before the refetch lands.
  const [overrides, setOverrides] = useState<Record<string, SPApplication>>({})
  const [justApproved, setJustApproved] = useState<SPApplication | null>(null)

  const apps = useMemo(() => fetched.map(a => overrides[a.id] ?? a), [fetched, overrides])
  const openApp = apps.find(a => a.id === openId) ?? null

  const groups = useMemo(() => ({
    review: apps.filter(needsReview).sort(reviewOrder),
    links: apps.filter(needsSetupLink),
    approved: apps.filter(a => a.status === 'approved').sort((a, b) => new Date(b.submitted).getTime() - new Date(a.submitted).getTime()),
    rejected: apps.filter(a => a.status === 'rejected').sort((a, b) => new Date(b.submitted).getTime() - new Date(a.submitted).getTime()),
  }), [apps])

  const rows = useMemo(() => {
    if (tab === 'links') return []
    const q = search.trim().toLowerCase()
    return groups[tab].filter(a => !q
      || a.name.toLowerCase().includes(q)
      || a.email.toLowerCase().includes(q)
      || a.country.toLowerCase().includes(q)
      || a.licenseNumber.toLowerCase().includes(q))
  }, [groups, tab, search])
  const { pageItems, pager } = usePaged(rows, `${tab}|${search}`)

  const update = (updated: SPApplication) => setOverrides(prev => ({ ...prev, [updated.id]: updated }))

  const handleApproved = (app: SPApplication) => {
    update({ ...app, status: 'approved' })
    setOpenId(null)
    setJustApproved(app)
    // An imported provider can't sign in until they get a setup link, so take the admin there.
    if (app.importedAt) setTab('links')
  }

  const tabs = [
    { id: 'review' as const, label: 'To review', count: groups.review.length },
    { id: 'links' as const, label: 'Setup links', count: groups.links.length },
    { id: 'approved' as const, label: 'Approved', count: groups.approved.length },
    { id: 'rejected' as const, label: 'Rejected', count: groups.rejected.length },
  ]

  const cell: React.CSSProperties = { padding: '12px', borderTop: `1px solid ${C.border}`, verticalAlign: 'middle' }
  const emptyText = isLoading ? 'Loading…' : search.trim() ? 'No matches.' : 'No applications.'

  return (
    <AdminLayout title="SP Applications" status={groups.review.length > 0 ? `${groups.review.length} to review` : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: font.family }}>

        {justApproved && (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: radius.sm, background: '#ECFDF5', color: '#065F46', fontSize: 13.5 }}>
            <span style={{ flex: '1 1 260px' }}><strong>{justApproved.name}</strong> approved.</span>
            {!justApproved.importedAt && (
              <button type="button" onClick={() => navigate(ROUTES.ADMIN_PROVIDERS)} style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}>View provider</button>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => setJustApproved(null)} style={{ all: 'unset', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
        )}

        {importing && <ProviderImportPanel onClose={() => setImporting(false)} />}
        {leadsOpen && <ImportLeadsList onClose={() => setLeadsOpen(false)} />}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <StatusTabs<Tab> tabs={tabs} value={tab} onChange={value => { setTab(value); setJustApproved(prev => (value === 'links' ? prev : null)) }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            {!importing && (
              <GGButton variant="secondary" size="sm" onClick={() => setImporting(true)}>Import providers</GGButton>
            )}
            {!leadsOpen && (
              <GGButton variant="secondary" size="sm" onClick={() => setLeadsOpen(true)}>Needs email ({leadCount?.needsEmail ?? 0})</GGButton>
            )}
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search" />
        </div>

        {tab === 'links' ? (
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? 12 : 16 }}>
            <SetupLinksList providers={groups.links} search={search} highlightId={justApproved?.id} />
          </div>
        ) : (
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? 0 : '10px 6px 8px' }}>
            {rows.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 14, color: C.textSub }}>{emptyText}</div>
            ) : isMobile ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {pageItems.map((app, i) => (
                  <li key={app.id}>
                    <button type="button" onClick={() => setOpenId(app.id)} style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', fontFamily: font.family }}>
                      <Initials name={app.name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>{app.name}</div>
                        <div style={{ fontSize: 12.5, color: C.textSub }}>{app.country} · {tab === 'review' ? `${daysWaiting(app.submitted)} days` : formatDate(app.submitted)}</div>
                      </div>
                      <StatusText app={app} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 720 }}>
                  <thead>
                    <tr>
                      <PlainHeader label="Applicant" />
                      <PlainHeader label="Country" />
                      <PlainHeader label={tab === 'review' ? 'Waiting' : 'Applied'} />
                      <PlainHeader label="Status" align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(app => {
                      const d = daysWaiting(app.submitted)
                      return (
                        <tr key={app.id} className="app-row" onClick={() => setOpenId(app.id)} style={{ cursor: 'pointer', background: openId === app.id ? C.blue100 : undefined }}>
                          <td style={cell}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Initials name={app.name} />
                              <div style={{ minWidth: 0 }}>
                                <button type="button" onClick={e => { e.stopPropagation(); setOpenId(app.id) }} style={{ all: 'unset', fontWeight: 600, color: C.text, cursor: 'pointer' }}>{app.name}</button>
                                <div style={{ fontSize: 12.5, color: C.textSub }}>{app.serviceTypes.join(', ')}{app.importedAt ? ' · Imported' : ''}</div>
                              </div>
                            </div>
                          </td>
                          <td style={cell}><CountryBadge code={countryCode(app.country)} showName name={app.country} size={14} /></td>
                          <td style={{ ...cell, fontSize: 13.5, whiteSpace: 'nowrap', color: C.textSub }}>
                            {tab === 'review'
                              ? <span style={{ color: d > 14 ? C.error : C.textSub }}>{d} day{d === 1 ? '' : 's'}</span>
                              : formatDate(app.submitted)}
                          </td>
                          <td style={{ ...cell, textAlign: 'right' }}><StatusText app={app} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > 0 && <div style={{ padding: isMobile ? '0 14px 12px' : '0 8px' }}><Pager {...pager} /></div>}
          </div>
        )}
        <style>{'.app-row:hover { background: #F5F9FD; }'}</style>

        <SidePanel open={!!openApp} onClose={() => setOpenId(null)} label={openApp?.name ?? 'Application'}>
          {openApp && (
            // Keyed by id so the note box starts empty for each application.
            <ApplicationReviewPanel key={openApp.id} app={openApp} onUpdated={update} onApproved={handleApproved} />
          )}
        </SidePanel>
      </div>
    </AdminLayout>
  )
}
