import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import {
  useAdminApplications,
} from '@/hooks/api/useAdminQueries'
import {
  useApproveAdminApplicationMutation,
  useRejectAdminApplicationMutation,
  useRequestAdminApplicationInfoMutation,
} from '@/hooks/api/useAdminMutations'
import { formatDate, formatPhone } from '@/utils/format'
import type { SPApplication, SPApplicationStatus, UploadedDocument } from '@/types/admin.types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Whole days between the submission date and now. */
function daysWaiting(submitted: string): number {
  const diff = Date.now() - new Date(submitted).getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

/** SLA colour: red past 14 days, emphasised past 7, muted otherwise. */
function slaColor(days: number): string {
  if (days > 14) return C.error
  if (days > 7) return C.navy800
  return C.textSub
}

/** The document that most likely backs the typed licence/registration number. */
function findLicenseDoc(docs: UploadedDocument[]): UploadedDocument | undefined {
  return docs.find(d => /licen|permit|registration|regist/i.test(d.name))
}

function StatusBadge({ status }: { status: SPApplicationStatus }) {
  const map: Record<SPApplicationStatus, { bg: string; color: string; label: string }> = {
    pending:        { bg: C.bg,       color: C.textSub,  label: 'Pending Review' },
    approved:       { bg: C.blue100,  color: C.navy800,  label: 'Approved' },
    rejected:       { bg: C.errorBg,  color: C.error,    label: 'Rejected' },
    info_requested: { bg: C.blue100,  color: C.navy800,  label: 'Info Requested' },
  }
  const s = map[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: radius.full, background: s.bg, border: `1px solid ${C.border}`, fontSize: '11px', fontWeight: 700, color: s.color, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', paddingBottom: '6px', borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 12px', background: C.bg, borderRadius: radius.xs, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, wordBreak: 'break-all' }}>{value || '—'}</div>
    </div>
  )
}

function DocIcon({ isPdf }: { isPdf: boolean }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: radius.xs, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: isPdf ? C.errorBg : C.blue100,
      border: `1px solid ${isPdf ? C.error + '33' : C.blue500 + '33'}`,
    }}>
      {isPdf ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="1" width="14" height="16" rx="2" fill={C.error} opacity="0.15"/>
          <rect x="2" y="1" width="14" height="16" rx="2" stroke={C.error} strokeWidth="1.2"/>
          <path d="M5 6h8M5 9h8M5 12h5" stroke={C.error} strokeWidth="1" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="1" width="14" height="16" rx="2" fill={C.blue500} opacity="0.12"/>
          <rect x="2" y="1" width="14" height="16" rx="2" stroke={C.blue500} strokeWidth="1.2"/>
          <circle cx="6.5" cy="7" r="1.5" stroke={C.blue500} strokeWidth="1"/>
          <path d="M3 13l3-3 3 3 2-2 4 4" stroke={C.blue500} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function DocRow({ doc, isLicense, onView }: { doc: UploadedDocument; isLicense: boolean; onView: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: isLicense ? C.blue100 + '88' : C.bg, borderRadius: radius.sm, border: `1px solid ${isLicense ? C.blue500 + '44' : C.border}` }}>
      <DocIcon isPdf={doc.type === 'pdf'} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</span>
          {isLicense && (
            <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 800, color: C.navy800, background: C.blue100, border: `1px solid ${C.blue500}44`, padding: '1px 7px', borderRadius: radius.full, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Licence
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px' }}>{doc.size} · Uploaded {formatDate(doc.uploadedAt)}</div>
      </div>
      <button onClick={onView} style={{ padding: '5px 12px', borderRadius: radius.full, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: '11px', fontWeight: 600, color: C.textSub, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' }}>
        View
      </button>
    </div>
  )
}

/** A card whose body can be collapsed to reduce noise during review. */
function CollapsibleCard({ label, summary, defaultOpen = false, children }: { label: string; summary?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <GGCard padding="0">
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 22px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: font.family, textAlign: 'left' }}
      >
        <span style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>{label}</span>
        {summary && !open && <span style={{ fontSize: '12px', color: C.textLight, fontWeight: 500 }}>{summary}</span>}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M3.5 5L7 8.5 10.5 5" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div style={{ padding: '0 22px 22px' }}>{children}</div>}
    </GGCard>
  )
}

const FILTER_TABS: { id: SPApplicationStatus | 'all'; label: string }[] = [
  { id: 'all',            label: 'All' },
  { id: 'pending',        label: 'Pending' },
  { id: 'info_requested', label: 'Info Requested' },
  { id: 'rejected',       label: 'Rejected' },
]

export function AdminSPAppsScreen() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const { data: fetchedApps = [] } = useAdminApplications()
  const approveMutation = useApproveAdminApplicationMutation()
  const requestInfoMutation = useRequestAdminApplicationInfoMutation()
  const rejectMutation = useRejectAdminApplicationMutation()

  const [apps, setApps]             = useState<SPApplication[]>([])
  const [selected, setSelected]     = useState<SPApplication | null>(null)
  const [note, setNote]             = useState('')
  const [noteError, setNoteError]   = useState(false)
  const [filterStatus, setFilter]   = useState<SPApplicationStatus | 'all'>('all')
  const [actionDone, setActionDone] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [approvedAppName, setApprovedAppName] = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [search, setSearch]         = useState('')
  const [sortOldest, setSortOldest] = useState(true)
  const [checks, setChecks]         = useState<Record<string, boolean>>({})
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const reviewable = fetchedApps.filter(a => a.status !== 'approved')
    setApps(reviewable)
    setSelected(current => {
      if (!reviewable.length) return null
      if (!current) return reviewable[0]
      return reviewable.find(app => app.id === current.id) ?? reviewable[0]
    })
  }, [fetchedApps])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return apps
      .filter(a => a.status !== 'approved')
      .filter(a => filterStatus === 'all' || a.status === filterStatus)
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.licenseNumber.toLowerCase().includes(q))
      .sort((a, b) => {
        const d = new Date(a.submitted).getTime() - new Date(b.submitted).getTime()
        return sortOldest ? d : -d
      })
  }, [apps, filterStatus, search, sortOldest])

  const licenseDoc = selected ? findLicenseDoc(selected.documents) : undefined

  // Per-application advisory verification checklist.
  const checklist = useMemo(() => {
    if (!selected) return []
    return [
      { id: 'license', label: 'Licence number matches the uploaded licence document', auto: !!licenseDoc },
      { id: 'docs',    label: `All required documents provided (${selected.documents.length})`, auto: selected.documents.length >= 2 },
      { id: 'payment', label: 'Disbursement / payout details are complete', auto: selected.paymentMethod === 'mpesa' ? !!selected.mpesaPaybill : !!(selected.bankName && selected.bankAccount) },
      { id: 'contact', label: 'Contact email and phone are valid', auto: !!selected.email && !!selected.phone },
    ]
  }, [selected, licenseDoc])

  const checkKey = (id: string) => `${selected?.id}:${id}`
  const allChecked = selected != null && checklist.every(c => checks[checkKey(c.id)])

  const selectApp = (app: SPApplication) => {
    setSelected(app); setNote(''); setNoteError(false); setActionDone(null); setMobileDetail(true)
  }

  const handleAction = async (action: SPApplicationStatus) => {
    if (!selected) return
    // A written reason is mandatory when rejecting or requesting more info.
    if ((action === 'rejected' || action === 'info_requested') && !note.trim()) {
      setNoteError(true)
      noteRef.current?.focus()
      return
    }
    try {
      if (action === 'approved') {
        await approveMutation.mutateAsync({ id: selected.id, payload: { note: note.trim() || undefined } })
        const approvedId = selected.id
        setApprovedAppName(selected.name)
        setApps(prev => {
          const remaining = prev.filter(app => app.id !== approvedId)
          setSelected(remaining[0] ?? null)
          if (isNarrow) {
            setMobileDetail(remaining.length > 0)
          }
          return remaining
        })
      } else if (action === 'info_requested') {
        const updated = await requestInfoMutation.mutateAsync({
          id: selected.id,
          payload: { note: note.trim() },
        })
        setApps(prev => prev.map(app => (app.id === updated.id ? updated : app)))
        setSelected(updated)
      } else {
        const updated = await rejectMutation.mutateAsync({
          id: selected.id,
          payload: { note: note.trim() },
        })
        setApps(prev => prev.map(app => (app.id === updated.id ? updated : app)))
        setSelected(updated)
      }

      if (action !== 'approved') {
        setApps(prev => prev.map(app => (app.id === selected.id ? { ...app, status: action } : app)))
        setSelected(prev => (prev ? { ...prev, status: action } : prev))
      }
      setActionDone(action)
      setActionNote(note.trim())
      setNote('')
      setNoteError(false)
      setTimeout(() => {
        setActionDone(null)
        setApprovedAppName(null)
      }, 6000)
    } catch {
      setActionDone(null)
      setActionNote('')
      setApprovedAppName(null)
      setNoteError(true)
    }
  }

  const days = selected ? daysWaiting(selected.submitted) : 0
  const decided = selected?.status === 'rejected'

  return (
    <AdminLayout title="SP Applications" subtitle="Review pending provider onboarding requests — approved providers appear in Providers">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: font.family }}>

        {actionDone === 'approved' && approvedAppName && (
          <div style={{
            padding: '13px 16px', borderRadius: radius.sm, fontSize: '13px',
            background: '#ECFDF5', color: '#065F46',
            border: '1px solid #6EE7B766',
          }}>
            <div style={{ fontWeight: 600 }}>
              <strong>{approvedAppName}</strong> approved — this provider is now listed under Providers.
            </div>
            <button
              onClick={() => navigate(ROUTES.ADMIN_PROVIDERS)}
              style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#065F46', background: 'rgba(6,95,70,0.08)', border: '1px solid rgba(6,95,70,0.2)', borderRadius: radius.sm, padding: '5px 12px', cursor: 'pointer', fontFamily: font.family }}
            >
              View in Providers →
            </button>
          </div>
        )}

        {/* Filter tabs + search + sort */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTER_TABS.map(t => {
              const active = filterStatus === t.id
              const count  = t.id === 'all' ? apps.length : apps.filter(a => a.status === t.id).length
              return (
                <button key={t.id} onClick={() => setFilter(t.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: radius.full, border: `1.5px solid ${active ? C.navy800 : C.border}`, background: active ? C.navy800 : '#fff', color: active ? '#fff' : C.textSub, fontSize: '12px', fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.12s' }}>
                  {t.label}
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '0 6px', minWidth: 16, height: 16, lineHeight: '16px', textAlign: 'center', borderRadius: radius.full, background: active ? 'rgba(255,255,255,0.22)' : C.bg, color: active ? '#fff' : C.textLight }}>{count}</span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '0 12px', height: 34, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.full, minWidth: 180 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke={C.textLight} strokeWidth="1.4"/>
                <path d="M9.5 9.5L12.5 12.5" stroke={C.textLight} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, ID, licence…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontFamily: font.family, color: C.text, minWidth: 0 }}
              />
            </div>
            {/* Sort */}
            <button onClick={() => setSortOldest(o => !o)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: 34, padding: '0 14px', borderRadius: radius.full, border: `1.5px solid ${C.border}`, background: '#fff', color: C.textSub, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M4 2v10M4 12l-2-2M4 12l2-2M10 12V2M10 2L8 4M10 2l2 2" stroke={C.textSub} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {sortOldest ? 'Oldest first' : 'Newest first'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '330px 1fr', gap: '20px', alignItems: 'flex-start' }}>

          {/* Application list — on mobile, hidden while viewing a detail */}
          {(!isNarrow || !mobileDetail) && (
          <GGCard padding="0" style={{ overflow: 'hidden', ...(isNarrow ? {} : { position: 'sticky', top: 0 }) }}>
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>No applications match</div>
            )}
            {filtered.map((app, i) => {
              const d = daysWaiting(app.submitted)
              const pendingLike = app.status === 'pending' || app.status === 'info_requested'
              return (
                <div key={app.id}
                  onClick={() => selectApp(app)}
                  style={{
                    padding: '14px 18px',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                    cursor: 'pointer',
                    background: selected?.id === app.id ? C.blue100 : '#fff',
                    borderLeft: selected?.id === app.id ? `3px solid ${C.blue500}` : '3px solid transparent',
                    transition: 'all 0.12s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.name}</div>
                      <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>{app.serviceTypes.join(' · ')} · {app.country}</div>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '7px' }}>
                    {pendingLike ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, color: slaColor(d) }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: slaColor(d) }} />
                        Waiting {d} day{d !== 1 ? 's' : ''}{d > 14 ? ' · overdue' : ''}
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: C.textLight }}>Submitted {formatDate(app.submitted)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </GGCard>
          )}

          {/* Detail panel — on mobile, shown only after selecting */}
          {(!isNarrow || mobileDetail) && (selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Mobile: return to the application list */}
              {isNarrow && (
                <button onClick={() => setMobileDetail(false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', alignSelf: 'flex-start', padding: '8px 14px', borderRadius: radius.full, border: `1.5px solid ${C.border}`, background: '#fff', color: C.textSub, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke={C.textSub} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Back to applications
                </button>
              )}

              {/* Sticky decision bar — name + SLA + actions, always reachable */}
              <div style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg,
                boxShadow: shadow.sm, padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '17px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{selected.name}</span>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: C.textSub }}>{selected.id}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.textLight }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: slaColor(days) }}>
                        Waiting {days} day{days !== 1 ? 's' : ''}{days > 14 ? ' · overdue' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <GGButton variant="success" size="sm" onClick={() => handleAction('approved')}>
                      Approve
                    </GGButton>
                    <GGButton variant="secondary" size="sm" onClick={() => handleAction('info_requested')} disabled={selected.status === 'info_requested'}>
                      Request Info
                    </GGButton>
                    <GGButton variant="danger" size="sm" onClick={() => handleAction('rejected')} disabled={selected.status === 'rejected'}>
                      Reject
                    </GGButton>
                  </div>
                </div>
              </div>

              {actionDone && actionDone !== 'approved' && (
                <div style={{
                  padding: '13px 16px', borderRadius: radius.sm, fontSize: '13px',
                  background: actionDone === 'rejected' ? C.errorBg : C.blue100,
                  color: actionDone === 'rejected' ? C.error : C.navy800,
                  border: `1px solid ${actionDone === 'rejected' ? C.error + '33' : C.blue500 + '33'}`,
                }}>
                  <div style={{ fontWeight: 600 }}>
                    Application marked as <strong>{actionDone.replace('_', ' ')}</strong>.
                  </div>
                  {actionNote && (actionDone === 'rejected' || actionDone === 'info_requested') && (
                    <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: `1px solid ${actionDone === 'rejected' ? C.error + '22' : C.blue500 + '22'}`, fontWeight: 500, lineHeight: 1.5 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.75 }}>Note sent to applicant</span>
                      <div style={{ marginTop: '3px' }}>“{actionNote}”</div>
                    </div>
                  )}
                </div>
              )}

              {/* Verification checklist */}
              <GGCard padding="22px">
                <SectionLabel>Verification Checklist</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {checklist.map(item => {
                    const on = !!checks[checkKey(item.id)]
                    return (
                      <button key={item.id} onClick={() => setChecks(p => ({ ...p, [checkKey(item.id)]: !on }))}
                        style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 12px', background: on ? C.blue100 + '66' : C.bg, border: `1px solid ${on ? C.blue500 + '44' : C.border}`, borderRadius: radius.sm, cursor: 'pointer', fontFamily: font.family, textAlign: 'left', transition: 'all 0.12s' }}>
                        <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: radius.xs, border: `1.5px solid ${on ? C.blue500 : C.borderDark}`, background: on ? C.blue500 : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {on && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: C.text }}>{item.label}</span>
                        {!item.auto && (
                          <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 800, color: C.error, background: C.errorBg, padding: '2px 7px', borderRadius: radius.full, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Check
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {!allChecked && !decided && (
                  <div style={{ marginTop: '10px', fontSize: '11px', color: C.textLight }}>
                    Tick each item as you verify it. Approving before all items are checked is allowed but not recommended.
                  </div>
                )}
              </GGCard>

              {/* Practice overview */}
              <GGCard padding="22px">
                <SectionLabel>Practice Details</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                  <InfoRow label="Country"          value={selected.country} />
                  <InfoRow label="Primary Email"    value={selected.email} />
                  <InfoRow label="Phone"            value={formatPhone(selected.phone, selected.country).display} />
                  {selected.emailSecondary && <InfoRow label="Secondary Email" value={selected.emailSecondary} />}
                </div>

                <SectionLabel>Registration &amp; Licensing</SectionLabel>
                {/* License number — blue highlight, linked to its backing document */}
                <div style={{ padding: '14px 16px', background: C.blue100, borderRadius: radius.sm, border: `1.5px solid ${C.blue500}44`, marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: C.navy800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Medical Practice Registration No.</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, letterSpacing: '0.03em', fontFamily: "'Courier New', monospace" }}>{selected.licenseNumber}</div>
                    </div>
                    {licenseDoc ? (
                      <button onClick={() => setPreviewDoc(licenseDoc)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 13px', borderRadius: radius.full, border: `1.5px solid ${C.blue500}`, background: '#fff', color: C.blue500, fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' }}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 7s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4z" stroke={C.blue500} strokeWidth="1.3"/><circle cx="7" cy="7" r="1.8" stroke={C.blue500} strokeWidth="1.3"/></svg>
                        View licence file
                      </button>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: C.error, background: C.errorBg, padding: '4px 10px', borderRadius: radius.full }}>No licence file</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selected.serviceTypes.map(t => (
                    <span key={t} style={{ padding: '5px 14px', borderRadius: radius.full, background: C.blue100, border: `1px solid ${C.blue500}33`, fontSize: '12px', fontWeight: 700, color: C.navy800 }}>
                      {t}
                    </span>
                  ))}
                </div>
              </GGCard>

              {/* Uploaded documents */}
              <GGCard padding="22px">
                <SectionLabel>Uploaded Documents ({selected.documents.length})</SectionLabel>
                {selected.documents.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: C.bg, borderRadius: radius.sm }}>
                    No documents uploaded
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selected.documents.map((doc, i) => (
                      <DocRow key={i} doc={doc} isLicense={doc === licenseDoc} onView={() => setPreviewDoc(doc)} />
                    ))}
                  </div>
                )}
              </GGCard>

              {/* Secondary detail — collapsed to keep the review focused */}
              <CollapsibleCard label="Opening Hours" summary={`${DAYS.filter(d => selected.hours[d]?.open).length} days open`}>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
                  {DAYS.map((day, i) => {
                    const h = selected.hours[day]
                    if (!h) return null
                    return (
                      <div key={day} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px',
                        borderBottom: i < DAYS.length - 1 ? `1px solid ${C.border}` : 'none',
                        background: h.open ? '#fff' : C.bg,
                      }}>
                        <span style={{ width: 38, fontSize: '13px', fontWeight: 700, color: h.open ? C.text : C.textLight, fontFamily: font.family }}>{day}</span>
                        {h.open ? (
                          <>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue500, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: C.text, fontWeight: 500 }}>{h.from} – {h.to}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.border, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: C.textLight, fontStyle: 'italic' }}>Closed</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CollapsibleCard>

              <CollapsibleCard label="Payment / Disbursement Details" summary={selected.paymentMethod === 'mpesa' ? 'M-Pesa Paybill' : 'Bank Transfer'}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: radius.full, background: C.blue100, border: `1px solid ${C.blue500}33`, marginBottom: '14px' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="3" width="12" height="8" rx="1.5" stroke={C.blue500} strokeWidth="1.2"/>
                    <path d="M1 6h12" stroke={C.blue500} strokeWidth="1"/>
                    <path d="M3.5 9h2M8 9h2.5" stroke={C.blue500} strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: C.navy800 }}>
                    {selected.paymentMethod === 'mpesa' ? 'M-Pesa Paybill' : 'Bank Transfer'}
                  </span>
                </div>

                {selected.paymentMethod === 'mpesa' ? (
                  <div style={{ padding: '14px 16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Paybill Number</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '0.05em', fontFamily: "'Courier New', monospace" }}>{selected.mpesaPaybill}</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                    <InfoRow label="Bank Name"      value={selected.bankName ?? ''} />
                    <InfoRow label="Account Number" value={selected.bankAccount ?? ''} />
                    {selected.bankBranch && <InfoRow label="Branch / SWIFT" value={selected.bankBranch} />}
                  </div>
                )}
              </CollapsibleCard>

              {/* Decision note */}
              <GGCard padding="22px">
                <SectionLabel>Decision Note</SectionLabel>
                <div style={{ marginBottom: '10px', fontSize: '12px', color: C.textSub }}>
                  Required when rejecting or requesting more info — the applicant sees this message.
                </div>
                <textarea
                  ref={noteRef}
                  value={note}
                  onChange={e => { setNote(e.target.value); if (e.target.value.trim()) setNoteError(false) }}
                  rows={3}
                  placeholder="Add a note for the applicant — e.g. reason for rejection or what additional information is required…"
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${noteError ? C.error : C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
                />
                {noteError && (
                  <div style={{ marginTop: '7px', fontSize: '12px', fontWeight: 600, color: C.error }}>
                    Please add a note explaining the decision before rejecting or requesting info.
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <GGButton variant="success" size="sm" onClick={() => handleAction('approved')}>
                    Approve Application
                  </GGButton>
                  <GGButton variant="secondary" size="sm" onClick={() => handleAction('info_requested')} disabled={selected.status === 'info_requested'}>
                    Request More Info
                  </GGButton>
                  <GGButton variant="danger" size="sm" onClick={() => handleAction('rejected')} disabled={selected.status === 'rejected'}>
                    Reject
                  </GGButton>
                </div>
              </GGCard>

            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
              Select an application to review
            </div>
          ))}
        </div>
      </div>

      {/* Document preview modal */}
      {previewDoc && (
        <div onClick={() => setPreviewDoc(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(5,14,34,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 100%)', background: '#fff', borderRadius: radius.lg, boxShadow: shadow.xl, overflow: 'hidden', fontFamily: font.family }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <DocIcon isPdf={previewDoc.type === 'pdf'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewDoc.name}</div>
                <div style={{ fontSize: '11px', color: C.textSub }}>{previewDoc.size} · {previewDoc.type.toUpperCase()} · Uploaded {formatDate(previewDoc.uploadedAt)}</div>
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ width: 30, height: 30, borderRadius: radius.sm, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ padding: '40px 20px', textAlign: 'center', background: C.bg }}>
              <div style={{ width: 64, height: 64, margin: '0 auto 14px', borderRadius: radius.lg, background: '#fff', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DocIcon isPdf={previewDoc.type === 'pdf'} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Preview unavailable in demo</div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
                In production this opens the uploaded file inline. The reviewer can read the document without leaving the application.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
              <GGButton variant="secondary" size="sm" onClick={() => setPreviewDoc(null)}>Close</GGButton>
              <GGButton variant="primary" size="sm" onClick={() => setPreviewDoc(null)}>Download</GGButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
