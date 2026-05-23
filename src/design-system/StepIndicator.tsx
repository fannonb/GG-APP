import { C, font } from './tokens'

interface StepIndicatorProps {
  steps: string[]
  current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: done ? C.success : active ? C.blue500 : C.bg,
                border: `2px solid ${done ? C.success : active ? C.blue500 : C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: done || active ? '#fff' : C.textLight,
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: font.family,
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: active ? 700 : 500,
                color: active ? C.text : done ? C.textSub : C.textLight,
                fontFamily: font.family,
                whiteSpace: 'nowrap',
              }}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: done ? C.success : C.border,
                margin: '0 8px',
                marginBottom: '22px',
                transition: 'background 0.2s ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
