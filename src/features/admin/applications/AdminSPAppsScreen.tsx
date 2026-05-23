import { useState } from 'react'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatDate } from '@/utils/format'
import type { SPApplication, SPApplicationStatus } from '@/types/admin.types'
import { MOCK_SP_APPLICATIONS } from '@/mock/admin.mock'

const ACCENT = '#F5A623'

function StatusBadge({ status }: { status: SPApplicationStatus }) {
  const map: Record<SPApplicationStatus, { bg: string; color: string; label: string }> = {
    pending:        { bg: C.warningBg, color: '#8A4D00', label: 'Pending' },
    approved:       { bg: C.successBg, color: '#0D6B47', label: 'Approved' },
    rejected:       { bg: C.errorBg,   color: '#A83236', label: 'Rejected' },
    info_requested: { bg: C.blue100,   color: '#1A5D8A', label: 'Info Requested' },
  }
  const s = map[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: radius.full, background: s.bg, fontSize: '11px', fontWeight: 700, color: s.color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

export function AdminSPAppsScreen() {
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet

  const [apps, setApps] = useState<SPApplication[]>(MOCK_SP_APPLICATIONS)
  const [selected, setSelected] = useState<SPApplication | null>(apps[0] ?? null)
  const [note, setNote] = useState('')
  const [filterStatus, setFilterStatus] = useState<SPApplicationStatus | 'all'>('all')
  const [actionDone, setActionDone] = useState<string | null>(null)

  const filtered = filterStatus === 'all' ? apps : apps.filter(a => a.status === filterStatus)

  const handleAction = (action: SPApplicationStatus) => {
    if (!selected) return
    setApps(prev => prev.map(a => a.id === selected.id ? { ...a, status: action } : a))
    setSelected(prev => prev ? { ...prev, status: action } : prev)
    setActionDone(action)
    setNote('')
    setTimeout(() => setActionDone(null), 3000)
  }

  const FILTER_TABS: { id: SPApplicationStatus | 'all'; label: string }[] = [
    { id: 'all',            label: 'All' },
    { id: 'pending',        label: 'Pending' },
    { id: 'info_requested', label: 'Info Requested' },
    { id: 'approved',       label: 'Approved' },
    { id: 'rejected',       label: 'Rejected' },
  ]

  return (
    <AdminLayout title="SP Applications" subtitle="Review and action provider onboarding requests">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => setFilterStatus(t.id)}
              style={{ padding: '7px 16px', borderRadius: radius.full, border: `1.5px solid ${filterStatus === t.id ? ACCENT : C.border}`, background: filterStatus === t.id ? '#FFF8E6' : '#fff', color: filterStatus === t.id ? ACCENT : C.textSub, fontSize: '12px', fontWeight: filterStatus === t.id ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.12s' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1.5fr', gap: '20px', alignItems: 'flex-start' }}>

          {/* Application list */}
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>No applications</div>
            )}
            {filtered.map((app, i) => (
              <div key={app.id}
                onClick={() => { setSelected(app); setNote('') }}
                style={{ padding: '16px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', background: selected?.id === app.id ? C.bg : '#fff', borderLeft: selected?.id === app.id ? `3px solid ${ACCENT}` : '3px solid transparent', transition: 'all 0.12s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{app.name}</div>
                    <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{app.type} · {app.country}</div>
                    <div style={{ fontSize: '11px', color: C.textLight, marginTop: '3px' }}>Submitted {formatDate(app.submitted)}</div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              </div>
            ))}
          </GGCard>

          {/* Detail panel */}
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: isNarrow ? 'static' : 'sticky', top: '20px' }}>

              {actionDone && (
                <div style={{ padding: '12px 16px', background: actionDone === 'approved' ? C.successBg : actionDone === 'rejected' ? C.errorBg : C.blue100, borderRadius: radius.sm, fontSize: '13px', fontWeight: 600, color: actionDone === 'approved' ? '#0D6B47' : actionDone === 'rejected' ? '#A83236' : '#1A5D8A' }}>
                  Application marked as <strong>{actionDone.replace('_', ' ')}</strong>.
                </div>
              )}

              <GGCard padding="24px">
                <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, marginBottom: '4px' }}>{selected.name}</div>
                <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '16px' }}>{selected.type} · {selected.country}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { label: 'Application ID',      val: selected.id },
                    { label: 'Submitted',            val: formatDate(selected.submitted) },
                    { label: 'Email',                val: selected.email },
                    { label: 'Licence / Reg. No.',  val: selected.license },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{item.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, wordBreak: 'break-all' }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: C.text }}>Note (optional)</div>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                  placeholder="Add a note for rejection reason or additional info request…"
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }} />

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <GGButton variant="success" size="sm" onClick={() => handleAction('approved')}
                    disabled={selected.status === 'approved'}>
                    Approve
                  </GGButton>
                  <GGButton variant="secondary" size="sm" onClick={() => handleAction('info_requested')}
                    disabled={selected.status === 'info_requested'}>
                    Request Info
                  </GGButton>
                  <GGButton variant="danger" size="sm" onClick={() => handleAction('rejected')}
                    disabled={selected.status === 'rejected'}>
                    Reject
                  </GGButton>
                </div>
              </GGCard>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
