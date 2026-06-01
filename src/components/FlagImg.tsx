import { useState } from 'react'
import { flagUrl } from '@/config/countries'

const FALLBACK_COLORS: Record<string, string> = {
  KE: '#006600',
  ZW: '#006400',
  ZM: '#198A00',
}

interface Props {
  code: string
  size?: number
  style?: React.CSSProperties
}

export function FlagImg({ code, size = 22, style }: Props) {
  const [failed, setFailed] = useState(false)
  const h = Math.round(size * 0.72)

  if (failed) {
    return (
      <div style={{
        width: size, height: h, borderRadius: '2px', flexShrink: 0,
        background: FALLBACK_COLORS[code] ?? '#4a90d9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.38) + 'px', fontWeight: 800,
        color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.5px',
        userSelect: 'none', ...style,
      }}>
        {code}
      </div>
    )
  }

  return (
    <img
      src={flagUrl(code)}
      alt={code}
      width={size}
      height={h}
      style={{ objectFit: 'cover', borderRadius: '2px', flexShrink: 0, display: 'block', ...style }}
      onError={() => setFailed(true)}
    />
  )
}
