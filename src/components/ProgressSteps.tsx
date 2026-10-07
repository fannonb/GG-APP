import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

export type StepState = 'done' | 'current' | 'todo' | 'stopped'

export interface ProgressStep {
  label: string
  detail?: string
  state: StepState
}

const CYAN_DEEP = '#0B7BC0'

export function ProgressSteps({ steps, label }: { steps: ProgressStep[]; label: string }) {
  const { isMobile } = useResponsive()
  return (
    <ol
      aria-label={label}
      style={{
        listStyle: 'none',
        margin: 0,
        padding: isMobile ? '14px 12px' : '16px 22px',
        background: '#fff',
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        display: 'grid',
        gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
        fontFamily: font.family,
      }}
    >
      {steps.map((step, i) => {
        // Opaque fills so the connector line never shows through the marker.
        const marker: React.CSSProperties = step.state === 'done'
          ? { background: '#16A34A', color: '#fff' }
          : step.state === 'stopped'
            ? { background: '#DC2626', color: '#fff' }
            : step.state === 'current'
              ? { background: '#fff', color: CYAN_DEEP, border: `2px solid ${CYAN_DEEP}` }
              : { background: '#fff', color: C.textLight, border: `2px solid ${C.border}` }
        const prevDone = i > 0 && steps[i - 1].state === 'done'
        return (
          <li key={step.label} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, minWidth: 0 }}>
            {i > 0 && (
              <span aria-hidden style={{ position: 'absolute', top: 13, right: '50%', width: '100%', height: 2, background: prevDone ? '#86EFAC' : C.border, zIndex: 0 }} />
            )}
            <span style={{ position: 'relative', zIndex: 1, width: 28, height: 28, borderRadius: '50%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px #fff', ...marker }}>
              {step.state === 'done' ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M3 7.25l2.5 2.5L11 4.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : step.state === 'stopped' ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              ) : (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
              )}
            </span>
            <span style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: step.state === 'todo' ? C.textSub : C.text, lineHeight: 1.25 }}>{step.label}</span>
            {step.detail && !isMobile && <span style={{ fontSize: 12, color: C.textSub, marginTop: -3 }}>{step.detail}</span>}
          </li>
        )
      })}
    </ol>
  )
}
