import { useState } from 'react'
import { C, font } from './tokens'

interface GGAvatarProps {
  name?: string
  size?: number
  /** Profile photo. Initials show when it is missing or fails to load. */
  src?: string | null
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function GGAvatar({ name = '', size = 40, src }: GGAvatarProps) {
  // Remember which link failed, so a new link (e.g. a refreshed one) is tried again.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const label = name ? initials(name) : '?'
  const showPhoto = !!src && failedSrc !== src

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
      overflow: 'hidden',
    }}>
      {showPhoto ? (
        <img
          src={src}
          alt=""
          onError={() => setFailedSrc(src)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        label
      )}
    </div>
  )
}
