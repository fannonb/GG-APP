import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { C, font, radius } from './tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'navy' | 'warning'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface GGButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  onClick?: () => void
  disabled?: boolean
  fullWidth?: boolean
  style?: CSSProperties
  type?: 'button' | 'submit' | 'reset'
}

const SIZES: Record<ButtonSize, CSSProperties> = {
  xs: { padding: '5px 12px',  fontSize: '12px', height: '28px' },
  sm: { padding: '7px 16px',  fontSize: '13px', height: '34px' },
  md: { padding: '10px 22px', fontSize: '14px', height: '42px' },
  lg: { padding: '13px 30px', fontSize: '16px', height: '52px' },
}

export function GGButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  fullWidth = false,
  style: sx,
  type = 'button',
}: GGButtonProps) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: font.family,
    fontWeight: 600,
    borderRadius: radius.sm,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.16s ease',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.5 : 1,
    letterSpacing: '-0.01em',
  }

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: hovered ? '#3B9FD4' : C.blue500,
      color: '#fff',
      boxShadow: hovered ? '0 4px 16px rgba(74,173,223,0.45)' : '0 2px 6px rgba(74,173,223,0.22)',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
    navy: {
      background: hovered ? C.navy600 : C.navy800,
      color: '#fff',
      boxShadow: hovered ? '0 4px 14px rgba(13,30,66,0.28)' : 'none',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
    secondary: {
      background: hovered ? C.blue100 : C.bg,
      color: C.navy800,
      border: `1.5px solid ${hovered ? C.blue500 : C.border}`,
    },
    ghost: {
      background: hovered ? C.bg : 'transparent',
      color: C.textSub,
    },
    danger: {
      background: hovered ? '#d43e44' : C.error,
      color: '#fff',
      boxShadow: hovered ? '0 4px 14px rgba(229,71,77,0.3)' : 'none',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
    success: {
      background: hovered ? '#18b07a' : C.success,
      color: '#fff',
      boxShadow: hovered ? '0 4px 14px rgba(34,201,138,0.3)' : 'none',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
    outline: {
      background: hovered ? C.blue100 : 'transparent',
      color: C.blue500,
      border: `1.5px solid ${C.blue500}`,
    },
    warning: {
      background: hovered ? '#e09520' : C.warning,
      color: '#fff',
      boxShadow: hovered ? '0 4px 14px rgba(245,166,35,0.3)' : 'none',
      transform: pressed ? 'scale(0.98)' : 'scale(1)',
    },
  }

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...SIZES[size], ...variants[variant], ...(sx ?? {}) }}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {children}
    </button>
  )
}
