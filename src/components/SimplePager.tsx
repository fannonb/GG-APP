import { GGButton } from '@/design-system'
import { C, font } from '@/design-system/tokens'

interface SimplePagerProps {
  /** 1-based current page, already clamped by the caller. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** Footer padding. The default matches the card footer on the SP Payments page. */
  padding?: string
}

/**
 * "Showing X to Y of Z" with Previous / Next. Callers decide when to show it
 * (for example, only when there is more than one page).
 */
export function SimplePager({ page, pageSize, total, onPageChange, padding = '14px 22px' }: SimplePagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding, gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>
        Showing {total === 0 ? 0 : start + 1} to {Math.min(start + pageSize, total)} of {total}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <GGButton variant="secondary" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </GGButton>
        <GGButton variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </GGButton>
      </div>
    </div>
  )
}
