import { C, font } from './tokens'

interface GGDividerProps {
  label?: string
  margin?: string
}

export function GGDivider({ label, margin = '4px 0' }: GGDividerProps) {
  if (!label) {
    return <div style={{ height: '1px', background: C.border, margin }} />
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin }}>
      <div style={{ flex: 1, height: '1px', background: C.border }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: C.textLight, fontFamily: font.family, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: C.border }} />
    </div>
  )
}
