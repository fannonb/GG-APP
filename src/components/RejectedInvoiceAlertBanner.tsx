import { GGButton } from '@/design-system'
import { font, radius } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/format'

export interface RejectedInvoiceBannerItem {
  id: string
  headline: string
  detail: string
  amount?: number
}

interface RejectedInvoiceAlertBannerProps {
  items: RejectedInvoiceBannerItem[]
  onAction: (item: RejectedInvoiceBannerItem) => void
}

export function RejectedInvoiceAlertBanner({ items, onAction }: RejectedInvoiceAlertBannerProps) {
  if (items.length === 0) return null

  const primary = items[0]
  const count = items.length

  return (
    <div style={{
      padding: '18px 22px',
      background: 'linear-gradient(90deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))',
      borderRadius: radius.lg,
      border: '1.5px solid rgba(245,158,11,0.30)',
      display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
      boxShadow: '0 2px 12px rgba(245,158,11,0.12)',
      fontFamily: font.family,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: '12px',
        background: '#F59E0B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 3px 10px rgba(245,158,11,0.35)',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3" y="2" width="16" height="18" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
          <path d="M3 7h16M7 11h8M7 14h5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M15 15l3 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400E', marginBottom: '3px' }}>
          {count > 1 ? `${count} invoices rejected by patients` : 'Invoice rejected by patient'}
        </div>
        <div style={{ fontSize: '13px', color: '#A16207', lineHeight: 1.5 }}>
          {primary.headline}
          {primary.amount != null && ` · ${formatCurrency(primary.amount)}`}
          {count > 1 && ` and ${count - 1} more`}
          {' — '}
          {primary.detail || 'Edit and resubmit a corrected invoice.'}
        </div>
      </div>
      <GGButton
        variant="primary"
        size="sm"
        onClick={() => onAction(primary)}
        style={{
          background: '#F59E0B',
          border: 'none',
          boxShadow: '0 2px 8px rgba(245,158,11,0.30)',
          flexShrink: 0,
        }}
      >
        Fix & Resubmit →
      </GGButton>
    </div>
  )
}
