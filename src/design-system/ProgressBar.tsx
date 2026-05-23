import { C, font, radius } from './tokens'

interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  label?: string
  showPct?: boolean
  height?: number
}

export function ProgressBar({ value, max = 100, color = C.blue500, label, showPct = false, height = 8 }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {(label || showPct) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && <span style={{ fontSize: '13px', fontWeight: 500, color: C.textSub, fontFamily: font.family }}>{label}</span>}
          {showPct && <span style={{ fontSize: '12px', fontWeight: 600, color: C.text, fontFamily: font.family }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{
        width: '100%',
        height,
        background: C.border,
        borderRadius: radius.full,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: radius.full,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}
