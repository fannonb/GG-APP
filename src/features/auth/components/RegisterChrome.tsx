import type { ReactNode } from 'react'
import { C, font } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

const CYAN_DEEP = '#0B7BC0'

/** "Step 1 of 3 · Account basics" with a thin progress bar; the blurb only shows on wider screens. */
export function RegisterStepProgress({ steps, blurbs, step }: { steps: string[]; blurbs: string[]; step: number }) {
  const { isMobile } = useResponsive()
  return (
    <div style={{ marginBottom: isMobile ? 4 : 8, fontFamily: font.family }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {steps.map((label, i) => (
          <div key={label} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? CYAN_DEEP : C.border, transition: 'background 0.2s ease' }} />
        ))}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
        <span style={{ color: CYAN_DEEP }}>Step {step + 1} of {steps.length}</span>
        <span style={{ color: C.textLight, margin: '0 6px' }}>·</span>
        {steps[step]}
      </div>
      {!isMobile && <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.45, marginTop: 4 }}>{blurbs[step]}</div>}
    </div>
  )
}

/** Keeps the step's main buttons reachable at the bottom of the screen on phones. */
export function StickyActions({ children }: { children: ReactNode }) {
  const { isMobile } = useResponsive()
  if (!isMobile) return <>{children}</>
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 5,
        margin: '4px -20px 0',
        padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(6px)',
        borderTop: `1px solid ${C.border}`,
      }}
    >
      {children}
    </div>
  )
}
