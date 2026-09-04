import { C, font } from '@/design-system/tokens'

export function LockedField({
  label,
  value,
  hint = 'Managed by GG\'APP',
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.textSub, fontFamily: font.family }}>{label}</div>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke={C.textLight} strokeWidth="1.2" />
          <path d="M4 5.5V4a2 2 0 014 0v1.5" stroke={C.textLight} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.45, wordBreak: 'break-word', fontFamily: font.family }}>
        {value || '—'}
      </div>
      <div style={{ fontSize: 11, color: C.textLight, marginTop: 4, fontFamily: font.family }}>{hint}</div>
    </div>
  )
}
