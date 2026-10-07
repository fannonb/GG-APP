import type { ReactNode } from 'react'
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { CountryFlag } from '@/features/admin/AdminShared'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'
import { CYAN_DEEP, PALETTE, countryName, money, tooltipStyle } from './metricsFormat'
import type { Kpi, MetricsCountry, MetricsRange, NameValue } from '@/types/admin-metrics.types'

const RANGE_LABEL: Record<MetricsRange, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '12m': 'Last 12 months' }
/** Metrics where a fall is good news. */
const LOWER_IS_BETTER = new Set(['cancelRate', 'rejectionRate', 'hoursToApprove', 'decisionHours', 'quoteHours', 'inactive', 'reviewDays'])

function formatKpi(kpi: Kpi, country?: MetricsCountry) {
  if (kpi.value == null) return '—'
  switch (kpi.format) {
    case 'percent': return `${kpi.value.toFixed(kpi.value % 1 === 0 ? 0 : 1)}%`
    case 'hours': return kpi.value < 48 ? `${kpi.value.toFixed(1)} h` : `${(kpi.value / 24).toFixed(1)} days`
    case 'money': return money(country ?? 'KE', kpi.value, true)
    default: return new Intl.NumberFormat('en-US').format(kpi.value)
  }
}

function Delta({ kpi }: { kpi: Kpi }) {
  if (kpi.value == null || kpi.previous == null) return null
  const diff = kpi.value - kpi.previous
  if (kpi.previous === 0 && kpi.value === 0) return null
  const better = LOWER_IS_BETTER.has(kpi.key) ? diff < 0 : diff > 0
  const flat = Math.abs(diff) < 1e-9
  const text = kpi.format === 'percent'
    ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pts`
    : kpi.previous === 0
      ? 'new'
      : `${diff > 0 ? '+' : ''}${Math.round((diff / kpi.previous) * 100)}%`
  const color = flat ? C.textSub : better ? '#15803D' : '#B91C1C'
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color, background: flat ? C.bg : better ? '#DCFCE7' : '#FEE2E2', padding: '2px 7px', borderRadius: radius.full, whiteSpace: 'nowrap' }}>
      {flat ? 'No change' : text}
    </span>
  )
}

export function KpiCard({ kpi, country }: { kpi: Kpi; country?: MetricsCountry }) {
  const data = kpi.series?.map((value, i) => ({ i, value }))
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, fontFamily: font.family }}>
      <div style={{ fontSize: 13, color: C.textSub, fontWeight: 600 }}>{kpi.label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{formatKpi(kpi, country)}</span>
        <Delta kpi={kpi} />
      </div>
      <div style={{ fontSize: 12, color: C.textLight }}>
        {kpi.previous != null ? `vs ${formatKpi({ ...kpi, value: kpi.previous }, country)} before` : 'All time'}
      </div>
      {data && data.some(d => d.value > 0) && (
        <div style={{ height: 34, marginTop: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${kpi.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN_DEEP} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CYAN_DEEP} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={CYAN_DEEP} strokeWidth={1.8} fill={`url(#spark-${kpi.key})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function KpiGrid({ kpis, country }: { kpis: Kpi[]; country?: MetricsCountry }) {
  const { isMobile, isTablet } = useResponsive()
  const cols = isMobile ? 2 : isTablet ? 3 : Math.min(kpis.length, 6)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 12 }}>
      {kpis.map(kpi => <KpiCard key={kpi.key} kpi={kpi} country={country} />)}
    </div>
  )
}

export function ChartCard({ title, subtitle, action, children, empty }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; empty?: boolean }) {
  return (
    <section style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: '18px 20px', minWidth: 0, fontFamily: font.family, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>{title}</h2>
          {subtitle && <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {empty ? <EmptyChart /> : children}
    </section>
  )
}

export function EmptyChart({ text = 'No data in this period yet.' }: { text?: string }) {
  return (
    <div style={{ flex: 1, minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, background: C.bg, color: C.textSub, fontSize: 13, textAlign: 'center', padding: 16 }}>
      {text}
    </div>
  )
}

/** Pie for 2–4 part splits; anything beyond four slices is folded into "Other". */
export function Donut({ data, colors = PALETTE, colorMap, centerLabel }: { data: NameValue[]; colors?: string[]; /** Fixed colour per name, e.g. status colours. */ colorMap?: Record<string, string>; centerLabel?: string }) {
  const sorted = [...data].filter(d => d.value > 0).sort((a, b) => b.value - a.value)
  const slices = sorted.length > 4 ? [...sorted.slice(0, 3), { name: 'Other', value: sorted.slice(3).reduce((s, d) => s + d.value, 0) }] : sorted
  const total = slices.reduce((s, d) => s + d.value, 0)
  const colorOf = (name: string, i: number) => colorMap?.[name] ?? colors[i % colors.length]
  if (total === 0) return <EmptyChart />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={slices.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
              {slices.map((s, i) => <Cell key={s.name} fill={colorOf(s.name, i)} />)}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{new Intl.NumberFormat('en-US', { notation: 'compact' }).format(total)}</span>
          {centerLabel && <span style={{ fontSize: 11, color: C.textSub }}>{centerLabel}</span>}
        </div>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((s, i) => (
          <li key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colorOf(s.name, i), flexShrink: 0 }} />
            <span style={{ flex: 1, color: C.text }}>{s.name}</span>
            <span style={{ color: C.textSub, fontWeight: 600 }}>{Math.round((s.value / total) * 100)}%</span>
            <span style={{ color: C.text, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Ranked horizontal bars; readable labels beat a crowded axis for category counts. */
export function BarList({ data, color = CYAN_DEEP, format = (v: number) => new Intl.NumberFormat('en-US').format(v), label = (n: string) => n }: { data: NameValue[]; color?: string; format?: (v: number) => string; label?: (n: string) => string }) {
  const max = Math.max(...data.map(d => d.value), 0)
  if (max === 0) return <EmptyChart />
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(d => (
        <li key={d.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: C.text }}>{label(d.name)}</span>
            <span style={{ color: C.text, fontWeight: 700 }}>{format(d.value)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: C.bg, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', borderRadius: 4, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Stage-by-stage drop-off with the share kept from the first stage. */
export function Funnel({ steps }: { steps: Array<{ stage: string; value: number }> }) {
  const first = steps[0]?.value ?? 0
  if (first === 0) return <EmptyChart />
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((s, i) => {
        const share = Math.round((s.value / first) * 100)
        const fromPrev = i > 0 && steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : null
        return (
          <li key={s.stage}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: C.text, fontWeight: 600 }}>{s.stage}</span>
              <span style={{ color: C.textSub }}>
                <strong style={{ color: C.text }}>{new Intl.NumberFormat('en-US').format(s.value)}</strong>
                {fromPrev != null && <> · {fromPrev}% of previous</>}
              </span>
            </div>
            <div style={{ height: 22, borderRadius: 6, background: C.bg, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(share, 2)}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${PALETTE[1]}, ${CYAN_DEEP})`, color: '#fff', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', paddingLeft: 8, boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
                {share >= 12 ? `${share}%` : ''}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Day × hour grid; darker cells are busier. Hours outside 6:00–22:00 are folded away when empty. */
export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(...grid.flat(), 0)
  if (max === 0) return <EmptyChart text="No booked time slots in this period yet." />
  const used = grid[0].map((_, h) => grid.some(row => row[h] > 0))
  const first = Math.min(6, used.indexOf(true))
  const last = Math.max(21, used.lastIndexOf(true))
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  return (
    <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `36px repeat(${hours.length}, minmax(18px, 1fr))`, gap: 3, minWidth: 36 + hours.length * 21 }}>
        <span />
        {hours.map(h => <span key={h} style={{ fontSize: 10.5, color: C.textSub, textAlign: 'center' }}>{h % 3 === 0 ? `${h}:00` : ''}</span>)}
        {grid.map((row, d) => (
          <div key={DAYS[d]} style={{ display: 'contents' }}>
            <span style={{ fontSize: 12, color: C.textSub, alignSelf: 'center' }}>{DAYS[d]}</span>
            {hours.map(h => {
              const v = row[h]
              const alpha = v === 0 ? 0 : 0.15 + (v / max) * 0.85
              return (
                <span
                  key={h}
                  title={`${DAYS[d]} ${h}:00 — ${v} booking${v === 1 ? '' : 's'}`}
                  style={{ height: 22, borderRadius: 4, background: v === 0 ? C.bg : `rgba(11,123,192,${alpha.toFixed(2)})` }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ height: 32, padding: '0 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 13, fontWeight: 600, fontFamily: font.family, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      Export CSV
    </button>
  )
}

/** Page heading with the range switcher; the country filter already lives in the top bar. */
export function InsightsHeader({ subtitle, extra }: { subtitle: string; extra?: ReactNode }) {
  const { country, range, setRange } = useAdminCountry()
  const { isMobile } = useResponsive()
  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 12, fontFamily: font.family }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.textSub }}>
        {subtitle}
        <span style={{ color: C.textLight }}> · {country === 'all' ? 'All countries' : country} · {RANGE_LABEL[range]}</span>
      </div>
      {extra}
      <div role="tablist" aria-label="Date range" style={{ display: 'inline-flex', padding: 3, gap: 2, background: '#E3ECF6', borderRadius: radius.sm, alignSelf: isMobile ? 'flex-start' : 'auto' }}>
        {(['7d', '30d', '90d', '12m'] as MetricsRange[]).map(r => {
          const active = r === range
          return (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setRange(r)}
              style={{ height: 32, padding: '0 12px', border: 'none', borderRadius: 7, background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 3px rgba(13,30,66,0.12)' : 'none', color: active ? C.text : C.textSub, fontSize: 13, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}
            >
              {r === '12m' ? '12 months' : r.replace('d', ' days')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CountryLabel({ code }: { code: MetricsCountry }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <CountryFlag code={code} size={16} />
      {countryName(code)}
    </span>
  )
}

export function MetricsState({ loading, error, onRetry }: { loading: boolean; error: unknown; onRetry: () => void }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: 28, textAlign: 'center', fontFamily: font.family }}>
      {loading ? (
        <div style={{ color: C.textSub, fontSize: 14 }}>Loading figures…</div>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>These figures couldn’t load</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>{error instanceof Error ? error.message : 'Please try again.'}</div>
          <button type="button" onClick={onRetry} style={{ marginTop: 14, height: 36, padding: '0 16px', borderRadius: radius.sm, border: 'none', background: CYAN_DEEP, color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}>
            Try again
          </button>
        </>
      )}
    </div>
  )
}
