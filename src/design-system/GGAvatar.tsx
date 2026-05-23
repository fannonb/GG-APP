import { font } from './tokens'

interface GGAvatarProps {
  name?: string
  size?: number
}

function nameToGradient(name: string): string {
  const colors = [
    ['#4AADDF', '#1C3670'],
    ['#22C98A', '#0D1E42'],
    ['#9B59B6', '#1C3670'],
    ['#F5A623', '#0D1E42'],
    ['#E5474D', '#081528'],
    ['#4AADDF', '#9B59B6'],
  ]
  const idx = name.charCodeAt(0) % colors.length
  return `linear-gradient(135deg, ${colors[idx][0]}, ${colors[idx][1]})`
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
      background: nameToGradient(name || 'A'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
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
