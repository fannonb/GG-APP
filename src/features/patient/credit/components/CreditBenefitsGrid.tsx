import type { ReactNode } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { CREDIT_BENEFITS } from '../credit.constants'

const ICONS: Record<(typeof CREDIT_BENEFITS)[number]['icon'], ReactNode> = {
  instant: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2v5l3 3" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="9" r="7" stroke={C.blue500} strokeWidth="1.5" />
    </svg>
  ),
  providers: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 15V7l6-4 6 4v8" stroke={C.blue500} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="7" y="10" width="4" height="5" stroke={C.blue500} strokeWidth="1.5" />
    </svg>
  ),
  zero: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke={C.blue500} strokeWidth="1.5" />
      <path d="M6 9h6" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  secure: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="4" y="8" width="10" height="7" rx="1.5" stroke={C.blue500} strokeWidth="1.5" />
      <path d="M6 8V6a3 3 0 016 0v2" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

export function CreditBenefitsGrid() {
  const { isMobile } = useResponsive()

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '12px',
    }}>
      {CREDIT_BENEFITS.map(benefit => (
        <div
          key={benefit.title}
          style={{
            display: 'flex',
            gap: '14px',
            padding: '16px 18px',
            background: C.surface,
            borderRadius: radius.lg,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: radius.sm,
            background: C.blue100,
            border: '1px solid rgba(56,182,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {ICONS[benefit.icon]}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>
              {benefit.title}
            </div>
            <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.6, marginTop: '3px', fontFamily: font.family }}>
              {benefit.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
