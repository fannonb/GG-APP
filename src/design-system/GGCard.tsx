import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { radius, shadow } from './tokens'

interface GGCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
  padding?: string
  noPad?: boolean
}

export function GGCard({ 
  children, 
  style: sx, 
  onClick, 
  padding = '24px', 
  noPad = false, 
  onMouseEnter,
  onMouseLeave,
  ...rest 
}: GGCardProps) {
  const [hovered, setHovered] = useState(false)
  const clickable = !!onClick

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => {
        if (clickable) setHovered(true)
        if (onMouseEnter) onMouseEnter(e)
      }}
      onMouseLeave={(e) => {
        if (clickable) setHovered(false)
        if (onMouseLeave) onMouseLeave(e)
      }}
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
      {...rest}
    >
      {children}
    </div>
  )
}
