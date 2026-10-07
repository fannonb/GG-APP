import type { ReactNode } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

const CYAN_DEEP = '#0B7BC0'

export interface UnderlineTab<T extends string> {
  id: T
  label: string
  count?: number
}

/** App-wide tab style: cyan underline on the active tab, optional count chip, optional trailing action. */
export function UnderlineTabs<T extends string>({
  tabs,
  active,
  onChange,
  trailing,
}: {
  tabs: UnderlineTab<T>[]
  active: T
  onChange: (id: T) => void
  trailing?: ReactNode
}) {
  const { isMobile } = useResponsive()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, borderBottom: `1px solid ${C.border}` }}>
      {/* Sits 1px over the divider so the active underline covers it; vertical overflow stays hidden. */}
      <div role="tablist" className="hide-scrollbar" style={{ display: 'flex', gap: isMobile ? 18 : 26, overflowX: 'auto', overflowY: 'hidden', minWidth: 0, marginBottom: -1 }}>
        {tabs.map(t => {
          const selected = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(t.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: `2.5px solid ${selected ? CYAN_DEEP : 'transparent'}`,
                padding: '10px 2px',
                fontSize: 14,
                fontWeight: selected ? 800 : 600,
                color: selected ? C.text : C.textSub,
                cursor: 'pointer',
                fontFamily: font.family,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
              {t.count != null && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: radius.full, background: selected ? C.blue100 : C.bg, color: selected ? CYAN_DEEP : C.textSub }}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {trailing && <div style={{ marginBottom: 8, flexShrink: 0 }}>{trailing}</div>}
    </div>
  )
}
