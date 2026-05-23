import { useState } from 'react'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Dispute, DisputeStatus } from '@/types/admin.types'
import { MOCK_DISPUTES } from '@/mock/admin.mock'

export function AdminDisputesScreen() {
  const [disputes, setDisputes] = useState<Dispute[]>(MOCK_DISPUTES)
  const [resolutions, setResolutions] = useState<Record<string, string>>({})
  const [resolved, setResolved] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<DisputeStatus | 'all'>('all')

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)

  const handleResolve = (id: string, favour: 'patient' | 'provider') => {
    const text = resolutions[id] ?? ''
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved' as DisputeStatus, resolution: favour, note: text } : d))
    setResolved(prev => ({ ...prev, [id]: favour }))
  }

  const TABS: { id: DisputeStatus | 'all'; label: string }[] = [
    { id: 'all',      label: 'All' },
    { id: 'open',     label: 'Open' },
    { id: 'resolved', label: 'Resolved' },
  ]

  return (
    <AdminLayout title="Disputes" subtitle="Resolve billing disputes between patients and providers">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              style={{ padding: '7px 18px', borderRadius: radius.full, border: `1.5px solid ${filter === t.id ? C.error : C.border}`, background: filter === t.id ? C.errorBg : '#fff', color: filter === t.id ? C.error : C.textSub, fontSize: '12px', fontWeight: filter === t.id ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.12s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
            No disputes in this category.
          </div>
        )}

        {filtered.map(d => {
          const isResolved = d.status === 'resolved'
          const winner = resolved[d.id]
          return (
            <GGCard key={d.id} padding="0" style={{ overflow: 'hidden', borderLeft: isResolved ? `3px solid ${C.success}` : `3px solid ${C.error}` }}>

              {/* Header */}
              <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{d.id}</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>Invoice {d.invoice} · Submitted {formatDate(d.submitted)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: isResolved ? C.success : C.error }}>{formatCurrency(d.amount)}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: radius.full, background: isResolved ? C.successBg : C.errorBg, fontSize: '11px', fontWeight: 700, color: isResolved ? '#0D6B47' : C.error }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: isResolved ? C.success : C.error, display: 'inline-block' }} />
                    {isResolved ? 'Resolved' : 'Open'}
                  </span>
                </div>
              </div>

              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Parties */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '12px 16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Patient</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{d.patient}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: C.textSub, fontWeight: 600, textAlign: 'center' }}>vs</div>
                  <div style={{ padding: '12px 16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Provider</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{d.provider}</div>
                  </div>
                </div>

                {/* Dispute reason */}
                <div style={{ padding: '14px 16px', background: '#FFFBF2', borderRadius: radius.sm, border: `1px solid rgba(245,166,35,0.25)` }}>
                  <div style={{ fontSize: '10px', color: '#8A4D00', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Dispute Reason</div>
                  <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6 }}>{d.reason}</div>
                </div>

                {/* Resolved outcome */}
                {isResolved && (winner || d.resolution) && (
                  <div style={{ padding: '12px 16px', background: C.successBg, borderRadius: radius.sm, border: `1px solid rgba(34,201,138,0.2)`, fontSize: '13px', color: '#0D6B47', fontWeight: 600 }}>
                    Resolved in favour of <strong>{winner ?? d.resolution}</strong>.
                    {d.note && <div style={{ fontSize: '12px', fontWeight: 400, marginTop: '4px', color: '#0D7A52' }}>{d.note}</div>}
                  </div>
                )}

                {/* Resolution controls */}
                {!isResolved && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea
                      value={resolutions[d.id] ?? ''}
                      onChange={e => setResolutions(prev => ({ ...prev, [d.id]: e.target.value }))}
                      rows={2} placeholder="Add a resolution note (optional)…"
                      style={{ width: '100%', padding: '10px 12px', fontSize: '13px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <GGButton variant="primary" size="sm" onClick={() => handleResolve(d.id, 'patient')}>
                        Favour Patient
                      </GGButton>
                      <GGButton variant="secondary" size="sm" onClick={() => handleResolve(d.id, 'provider')}>
                        Favour Provider
                      </GGButton>
                    </div>
                  </div>
                )}
              </div>
            </GGCard>
          )
        })}
      </div>
    </AdminLayout>
  )
}
