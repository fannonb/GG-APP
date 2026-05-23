import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { radius, shadow } from './tokens'

interface GGCardProps {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
  padding?: string
  noPad?: boolean
}

export function GGCard({ children, style: sx, onClick, padding = '24px', noPad = false }: GGCardProps) {
  const [hovered, setHovered] = useState(false)
  const clickable = !!onClick

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => clickable && setHovered(true)}
      onMouseLeave={() => clickable && setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: radius.lg,
        boxShadow: hovered ? shadow.md : shadow.sm,
        padding: noPad ? 0 : padding,
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        cursor: clickable ? 'pointer' : 'default',
        ...sx,
      }}
    >
      {children}
    </div>
  )
}
