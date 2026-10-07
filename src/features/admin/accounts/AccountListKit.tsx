import { useEffect, useRef, type ReactNode } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

const CYAN_DEEP = '#0B7BC0'

/** Status filter as underline tabs with counts. */
export function StatusTabs<T extends string>({ tabs, value, onChange }: { tabs: Array<{ id: T; label: string; count: number }>; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="hide-scrollbar" style={{ display: 'flex', gap: 22, borderBottom: `1px solid ${C.border}`, overflowX: 'auto', overflowY: 'hidden' }}>
      {tabs.map(t => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', borderBottom: `2.5px solid ${active ? CYAN_DEEP : 'transparent'}`, padding: '10px 0', marginBottom: -1, fontSize: 14, fontWeight: 700, color: active ? C.text : C.textSub, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' }}
          >
            {t.label}
            <span style={{ fontSize: 12, fontWeight: 700, color: active ? CYAN_DEEP : C.textLight, background: active ? C.blue100 : C.bg, padding: '1px 7px', borderRadius: radius.full }}>{t.count}</span>
          </button>
        )
      })}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2.2" strokeLinecap="round" aria-hidden style={{ position: 'absolute', left: 12, top: 12 }}>
        <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', height: 40, paddingLeft: 36, paddingRight: 12, border: `1px solid ${C.border}`, borderRadius: radius.sm, fontSize: 14, fontFamily: font.family, color: C.text, background: '#fff', outline: 'none' }}
      />
    </div>
  )
}

export type SortDir = 'asc' | 'desc'

export function SortHeader<K extends string>({ label, sortKey, sort, onSort, align = 'left' }: { label: string; sortKey: K; sort: { key: K; dir: SortDir }; onSort: (key: K) => void; align?: 'left' | 'right' }) {
  const active = sort.key === sortKey
  return (
    <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} style={{ padding: '0 12px 10px', textAlign: align, whiteSpace: 'nowrap' }}>
      <button type="button" onClick={() => onSort(sortKey)} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontSize: 12.5, fontWeight: active ? 700 : 600, color: active ? C.text : C.textSub, cursor: 'pointer' }}>
        {label}{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  )
}

export function PlainHeader({ label, align = 'left' }: { label: string; align?: 'left' | 'right' }) {
  return <th style={{ padding: '0 12px 10px', textAlign: align, fontSize: 12.5, fontWeight: 600, color: C.textSub, whiteSpace: 'nowrap' }}>{label}</th>
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  const btn = (disabled: boolean): React.CSSProperties => ({ height: 34, padding: '0 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: disabled ? C.textLight : C.text, fontSize: 13, fontWeight: 600, fontFamily: font.family, cursor: disabled ? 'default' : 'pointer' })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 4px 0', fontFamily: font.family }}>
      <span style={{ fontSize: 13, color: C.textSub }}>{from}–{to} of {total}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} style={btn(page === 0)}>Previous</button>
        <button type="button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} style={btn(page >= pages - 1)}>Next</button>
      </div>
    </div>
  )
}

/** Right-hand details panel; full screen on phones. */
export function SidePanel({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const { isMobile } = useResponsive()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      // Let open dialogs handle Escape first.
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]:not([data-panel])')) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(9,28,68,0.3)' }} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-panel
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1101,
          width: isMobile ? '100%' : 'min(620px, 92vw)',
          background: '#F7FAFD',
          boxShadow: '-12px 0 40px rgba(9,28,68,0.18)',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          fontFamily: font.family,
          animation: 'acctPanelIn 0.2s ease',
        }}
      >
        <style>{'@keyframes acctPanelIn { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }'}</style>
        <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, zIndex: 2, width: 36, height: 36, borderRadius: radius.full, border: 'none', background: '#fff', boxShadow: '0 1px 4px rgba(13,30,66,0.12)', color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </>
  )
}

export function PanelTabs<T extends string>({ tabs, value, onChange }: { tabs: Array<{ id: T; label: string }>; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 20, padding: '0 22px', borderBottom: `1px solid ${C.border}`, background: '#fff' }}>
      {tabs.map(t => {
        const active = t.id === value
        return (
          <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => onChange(t.id)} style={{ background: 'none', border: 'none', borderBottom: `2.5px solid ${active ? CYAN_DEEP : 'transparent'}`, padding: '12px 0', marginBottom: -1, fontSize: 14, fontWeight: 700, color: active ? C.text : C.textSub, cursor: 'pointer', fontFamily: font.family }}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export function PanelSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <h3 style={{ flex: 1, margin: 0, fontSize: 14.5, fontWeight: 800, color: C.text }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Compact label/value pairs, two columns on wide screens. */
export function DefList({ items }: { items: Array<{ label: string; value: ReactNode; wide?: boolean }> }) {
  const { isMobile } = useResponsive()
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px 20px', margin: 0 }}>
      {items.map(item => (
        <div key={item.label} style={{ gridColumn: item.wide ? '1 / -1' : undefined, minWidth: 0 }}>
          <dt style={{ fontSize: 12, color: C.textSub, marginBottom: 2 }}>{item.label}</dt>
          <dd style={{ margin: 0, fontSize: 14, color: C.text, overflowWrap: 'anywhere' }}>{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function StatusPill({ status }: { status: 'active' | 'suspended' | 'pending' | string }) {
  const map: Record<string, { label: string; fg: string; bg: string }> = {
    active: { label: 'Active', fg: '#15803D', bg: '#DCFCE7' },
    suspended: { label: 'Suspended', fg: '#B91C1C', bg: '#FEE2E2' },
    pending: { label: 'Not verified', fg: '#B45309', bg: '#FEF3C7' },
    pending_verification: { label: 'Not verified', fg: '#B45309', bg: '#FEF3C7' },
  }
  const s = map[status] ?? { label: status, fg: C.textSub, bg: C.bg }
  return <span style={{ fontSize: 12, fontWeight: 700, color: s.fg, background: s.bg, padding: '3px 9px', borderRadius: radius.full, whiteSpace: 'nowrap' }}>{s.label}</span>
}

export function Initials({ name, size = 36 }: { name: string; size?: number }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: radius.full, background: C.blue100, color: CYAN_DEEP, fontSize: size * 0.36, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {letters}
    </span>
  )
}
