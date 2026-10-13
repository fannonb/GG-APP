import { useEffect, useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'

/** Every admin list and table shows this many rows per page. */
export const ADMIN_PAGE_SIZE = 10

/**
 * Client-side paging for lists that are already loaded. Pass a `resetKey` that changes
 * with the filters or tab, so the list returns to page 1 when they change.
 */
export function usePaged<T>(items: T[], resetKey: unknown = null, pageSize = ADMIN_PAGE_SIZE) {
  const [requested, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [resetKey])
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  // The page can be past the end after a filter or range change; clamp it instead of showing an empty page.
  const page = Math.min(requested, pageCount - 1)
  const pageItems = items.slice(page * pageSize, (page + 1) * pageSize)
  return { pageItems, pager: { page, pageSize, total: items.length, onPage: setPage } }
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  const btn = (disabled: boolean): React.CSSProperties => ({ height: 34, padding: '0 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: disabled ? C.textLight : C.text, fontSize: 13, fontWeight: 600, fontFamily: font.family, cursor: disabled ? 'default' : 'pointer' })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '12px 4px 0', fontFamily: font.family }}>
      <span style={{ fontSize: 13, color: C.textSub }}>{from}–{to} of {total} · page {page + 1} of {pages}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} style={btn(page === 0)}>Previous</button>
        <button type="button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} style={btn(page >= pages - 1)}>Next</button>
      </div>
    </div>
  )
}
