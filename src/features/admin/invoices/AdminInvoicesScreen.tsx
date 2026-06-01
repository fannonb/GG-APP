import { useState } from 'react'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { formatCurrency, formatDate } from '@/utils/format'
import type { AdminInvoice, AdminInvoiceStatus } from '@/types/admin.types'
import { MOCK_ADMIN_INVOICES } from '@/mock/admin.mock'

export function AdminInvoicesScreen() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>(MOCK_ADMIN_INVOICES)
  const [filter, setFilter] = useState<AdminInvoiceStatus | 'all'>('all')
  const [cleared, setCleared] = useState<Set<string>>(new Set())

  const filtered = filter === 'all' ? invoices : invoices.filter(inv => inv.status === filter)

  const handleClearFlag = (id: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'clear' as AdminInvoiceStatus, flag: undefined } : inv))
    setCleared(prev => new Set([...prev, id]))
  }

  const handleApprove = (id: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'approved' as AdminInvoiceStatus } : inv))
  }

  const handleReject = (id: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'rejected' as AdminInvoiceStatus } : inv))
  }

  const TABS: { id: AdminInvoiceStatus | 'all'; label: string }[] = [
    { id: 'all',      label: 'All' },
    { id: 'flagged',  label: 'Flagged' },
    { id: 'clear',    label: 'Clear' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ]

  const statusStyle: Record<AdminInvoiceStatus, { bg: string; color: string; label: string }> = {
    flagged:  { bg: C.warningBg,  color: '#8A4D00', label: 'Flagged' },
    clear:    { bg: C.successBg,  color: '#0D6B47', label: 'Clear' },
    approved: { bg: C.successBg,  color: '#0D6B47', label: 'Approved' },
    rejected: { bg: C.errorBg,    color: '#A83236', label: 'Rejected' },
  }

  return (
    <AdminLayout title="Invoice Review" subtitle="Review flagged invoices submitted by service providers">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Flagged',  count: invoices.filter(i => i.status === 'flagged').length,  color: C.warning },
            { label: 'Clear',    count: invoices.filter(i => i.status === 'clear').length,    color: C.success },
            { label: 'Approved', count: invoices.filter(i => i.status === 'approved').length, color: C.blue500 },
            { label: 'Rejected', count: invoices.filter(i => i.status === 'rejected').length, color: C.error },
          ].map(s => (
            <GGCard key={s.label} padding="16px" style={{ background: '#fff' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.count}</div>
            </GGCard>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TABS.map(t => {
            const isFlagged = t.id === 'flagged'
            return (
              <button key={t.id} onClick={() => setFilter(t.id)}
                style={{ padding: '7px 16px', borderRadius: radius.full, border: `1.5px solid ${filter === t.id ? (isFlagged ? C.warning : C.blue500) : C.border}`, background: filter === t.id ? (isFlagged ? C.warningBg : C.blue100) : '#fff', color: filter === t.id ? (isFlagged ? '#8A4D00' : C.blue500) : C.textSub, fontSize: '12px', fontWeight: filter === t.id ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.12s' }}>
                {t.label}
              </button>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
            No invoices in this category.
          </div>
        )}

        {filtered.map(inv => {
          const s = statusStyle[inv.status]
          const isFlagged = inv.status === 'flagged'
          return (
            <GGCard key={inv.id} padding="0" style={{ overflow: 'hidden', borderLeft: isFlagged ? `3px solid ${C.warning}` : `3px solid ${C.border}` }}>
              <div style={{ padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>

                {/* Invoice info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.blue500 }}>{inv.id}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: radius.full, background: s.bg, fontSize: '11px', fontWeight: 700, color: s.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      {s.label}
                    </span>
                    {cleared.has(inv.id) && (
                      <span style={{ fontSize: '11px', color: C.success, fontWeight: 600 }}>✓ Flag cleared</span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: C.text, marginTop: '4px' }}>
                    <strong>{inv.provider}</strong> → {inv.patient}
                  </div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>Submitted {formatDate(inv.submitted)}</div>

                  {isFlagged && inv.flag && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '6px 12px', background: '#FFFBF2', border: `1px solid rgba(245,166,35,0.3)`, borderRadius: radius.sm }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1L15 14H1L8 1Z" stroke={C.warning} strokeWidth="1.4" strokeLinejoin="round"/>
                        <path d="M8 6v4M8 11.5v.5" stroke={C.warning} strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontSize: '12px', color: '#8A4D00', fontWeight: 600 }}>{inv.flag}</span>
                    </div>
                  )}
                </div>

                {/* Amount + actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: C.text }}>{formatCurrency(inv.amount)}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {isFlagged && (
                      <>
                        <GGButton variant="secondary" size="sm" onClick={() => handleClearFlag(inv.id)}>Clear Flag</GGButton>
                        <GGButton variant="success" size="sm" onClick={() => handleApprove(inv.id)}>Approve</GGButton>
                        <GGButton variant="danger" size="sm" onClick={() => handleReject(inv.id)}>Reject</GGButton>
                      </>
                    )}
                    {inv.status === 'clear' && (
                      <GGButton variant="success" size="sm" onClick={() => handleApprove(inv.id)}>Approve</GGButton>
                    )}
                  </div>
                </div>
              </div>
            </GGCard>
          )
        })}
      </div>
    </AdminLayout>
  )
}
