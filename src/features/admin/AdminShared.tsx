import type { ReactElement } from 'react'
import { font } from '@/design-system/tokens'

// ─── SVG Flag Components ───────────────────────────────────────────────────

function ZimbabweFlag({ width, height }: { width: number; height: number }) {
  const stripes = ['#006400', '#FFD200', '#DE2010', '#000000', '#DE2010', '#FFD200', '#006400']
  const sh = height / 7
  const tx = height * 0.87 // triangle tip x
  // 5-pointed star centred in triangle
  const cx = tx * 0.42, cy = height / 2, r = height * 0.13
  const star = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const b = a + (2 * Math.PI) / 5
    const ri = r * 0.4
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} ${cx + ri * Math.cos(b)},${cy + ri * Math.sin(b)}`
  }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', flexShrink: 0, borderRadius: 2, border: '0.5px solid rgba(0,0,0,0.12)' }}>
      {stripes.map((c, i) => (
        <rect key={i} x={0} y={i * sh} width={width} height={sh + 0.5} fill={c} />
      ))}
      <polygon points={`0,0 ${tx},${height / 2} 0,${height}`} fill="white" />
      <polygon points={star} fill="#DE2010" />
    </svg>
  )
}

function KenyaFlag({ width, height }: { width: number; height: number }) {
  const fw = 1.5 // fimbriation width
  const band = (height - fw * 2) / 3
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', flexShrink: 0, borderRadius: 2, border: '0.5px solid rgba(0,0,0,0.12)' }}>
      <rect x={0} y={0}             width={width} height={band}      fill="#000000" />
      <rect x={0} y={band}          width={width} height={fw}         fill="white" />
      <rect x={0} y={band + fw}     width={width} height={band}      fill="#BB0000" />
      <rect x={0} y={band * 2 + fw} width={width} height={fw}         fill="white" />
      <rect x={0} y={band * 2 + fw * 2} width={width} height={band}  fill="#006600" />
      {/* Maasai shield — oval in black/red/white */}
      <ellipse cx={width / 2} cy={height / 2} rx={width * 0.06} ry={height * 0.32} fill="#BB0000" />
      <ellipse cx={width / 2} cy={height / 2} rx={width * 0.025} ry={height * 0.32} fill="white" />
      {/* Two crossed spears */}
      <line x1={width / 2 - width * 0.07} y1={height * 0.08} x2={width / 2 + width * 0.07} y2={height * 0.92} stroke="white" strokeWidth={height * 0.04} />
      <line x1={width / 2 + width * 0.07} y1={height * 0.08} x2={width / 2 - width * 0.07} y2={height * 0.92} stroke="white" strokeWidth={height * 0.04} />
    </svg>
  )
}

function ZambiaFlag({ width, height }: { width: number; height: number }) {
  const sw = width / 12 // stripe width
  const ex = width - sw * 3 // eagle start x
  // Eagle (simplified): body + wings
  const ex2 = ex + sw * 1.5 // eagle centre x
  const ey = height * 0.18  // eagle top y
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', flexShrink: 0, borderRadius: 2, border: '0.5px solid rgba(0,0,0,0.12)' }}>
      <rect x={0}      y={0} width={width}  height={height} fill="#198A00" />
      <rect x={ex}     y={0} width={sw}     height={height} fill="#EF3340" />
      <rect x={ex + sw}   y={0} width={sw} height={height} fill="#000000" />
      <rect x={ex + sw * 2} y={0} width={sw} height={height} fill="#EF7D00" />
      {/* Eagle body */}
      <ellipse cx={ex2} cy={ey + height * 0.08} rx={sw * 0.45} ry={sw * 0.6} fill="#EF7D00" />
      {/* Wings */}
      <polygon
        points={`${ex2},${ey + height * 0.04} ${ex2 - sw * 1.3},${ey + height * 0.02} ${ex2 - sw * 0.9},${ey + height * 0.09}`}
        fill="#EF7D00"
      />
      <polygon
        points={`${ex2},${ey + height * 0.04} ${ex2 + sw * 1.3},${ey + height * 0.02} ${ex2 + sw * 0.9},${ey + height * 0.09}`}
        fill="#EF7D00"
      />
      {/* Head */}
      <circle cx={ex2} cy={ey} r={sw * 0.28} fill="#EF7D00" />
    </svg>
  )
}

// ─── Public API ───────────────────────────────────────────────────────────

type CountryCode = 'ZW' | 'KE' | 'ZM'

const FLAG_COMPONENTS: Record<CountryCode, (p: { width: number; height: number }) => ReactElement> = {
  ZW: ZimbabweFlag,
  KE: KenyaFlag,
  ZM: ZambiaFlag,
}

export function CountryFlag({ code, size = 24 }: { code: CountryCode; size?: number }) {
  const width  = Math.round(size * 1.5)
  const height = size
  const Flag = FLAG_COMPONENTS[code]
  return <Flag width={width} height={height} />
}

export function CountryBadge({
  code, name, showName = false, size = 20,
}: {
  code: CountryCode; name?: string; showName?: boolean; size?: number
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: font.family }}>
      <CountryFlag code={code} size={size} />
      {showName && name && (
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#091C44' }}>{name}</span>
      )}
    </span>
  )
}

export function countryCode(country: string): CountryCode {
  if (country === 'Kenya')  return 'KE'
  if (country === 'Zambia') return 'ZM'
  return 'ZW'
}

export const COUNTRY_CURRENCIES: Record<string, string> = {
  Zimbabwe: 'Z$',
  Kenya:    'Ksh.',
  Zambia:   'ZK',
}
