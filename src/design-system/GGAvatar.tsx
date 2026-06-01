import { C, font } from './tokens'

interface GGAvatarProps {
  name?: string
  size?: number
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function GGAvatar({ name = '', size = 40 }: GGAvatarProps) {
  const label = name ? initials(name) : '?'
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: C.blue500, // Solid Electric Sky Blue brand color
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: Math.round(size * 0.38) + 'px',
      fontWeight: 700,
      fontFamily: font.family,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {label}
    </div>
  )
}
