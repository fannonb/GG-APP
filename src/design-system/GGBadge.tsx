import type { ReactNode } from 'react'
import { C, font, radius } from './tokens'

export type BadgeType = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'navy' | 'outline' | 'open' | 'closed' | 'pending'
type BadgeSize = 'sm' | 'md'

interface GGBadgeProps {
  children: ReactNode
  type?: BadgeType
  size?: BadgeSize
}

const STYLES: Record<BadgeType, { background: string; color: string; border?: string }> = {
  default:  { background: C.bg,        color: C.textSub },
  primary:  { background: C.blue100,   color: C.blue500 },
  success:  { background: C.successBg, color: C.success },
  warning:  { background: C.warningBg, color: C.warning },
  error:    { background: C.errorBg,   color: C.error },
  info:     { background: C.blue100,   color: C.navy700 },
  navy:     { background: C.navy800,   color: '#fff' },
  outline:  { background: 'transparent', color: C.textSub, border: `1px solid ${C.border}` },
  open:     { background: C.successBg,   color: C.success },
  closed:   { background: C.errorBg,     color: C.error },
  pending:  { background: C.warningBg,   color: C.warning },
}

const SIZE_STYLES: Record<BadgeSize, { fontSize: string; padding: string }> = {
  sm: { fontSize: '11px', padding: '3px 9px' },
  md: { fontSize: '13px', padding: '5px 12px' },
}

export function GGBadge({ children, type = 'default', size = 'sm' }: GGBadgeProps) {
  const s = STYLES[type]
  const sz = SIZE_STYLES[size]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: font.family,
      fontWeight: 600,
      borderRadius: radius.full,
      border: s.border ?? 'none',
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      ...s,
      ...sz,
    }}>
      {children}
    </span>
  )
}
