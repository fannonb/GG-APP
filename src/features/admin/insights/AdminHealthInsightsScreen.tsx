import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminMetrics } from '@/hooks/api/useAdminMetrics'
import { BarList, ChartCard, EmptyChart, InsightsHeader, KpiGrid, MetricsState } from '@/features/admin/metrics/MetricsKit'
import { CYAN_DEEP, PALETTE, STATUS_COLORS, chartAxis, prettyCategory, tooltipStyle } from '@/features/admin/metrics/metricsFormat'

const BP_COLORS: Record<string, string> = {
  Normal: STATUS_COLORS.good,
  Elevated: '#F59E0B',
  'High (stage 1)': '#EA580C',
  'High (stage 2)': STATUS_COLORS.bad,
}

export function AdminHealthInsightsScreen() {
  const { isDesktop } = useResponsive()
  const { data, isLoading, error, refetch } = useAdminMetrics('health')

  if (!data) {
    return (
      <AdminLayout title="Health insights">
        <MetricsState loading={isLoading} error={error} onRetry={() => void refetch()} />
      </AdminLayout>
    )
  }

  const visits = data.kpis.find(k => k.key === 'visits')?.value ?? 0
  const bpTotal = data.bloodPressure.reduce((s, b) => s + b.value, 0)

  return (
    <AdminLayout title="Health insights">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: font.family }}>
        <InsightsHeader subtitle="From visits providers recorded" />

        <div style={{ padding: '12px 14px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.md, fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>
          Based on <strong style={{ color: C.text }}>{visits} recorded visit{visits === 1 ? '' : 's'}</strong>. Diagnoses are written by providers as free text and grouped by keyword, so treat them as a guide, not a clinical count.
          To protect privacy, any group with fewer than {data.meta.minGroup} patients is hidden.
        </div>

        <KpiGrid kpis={data.kpis} />

        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'minmax(0, 1.6fr) minmax(300px, 1fr)' : '1fr', gap: 16 }}>
          <ChartCard title="Visits recorded" empty={data.visitsTrend.every(v => v.value === 0)}>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.visitsTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="visitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CYAN_DEEP} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CYAN_DEEP} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="value" name="Visits" stroke={CYAN_DEEP} strokeWidth={2.2} fill="url(#visitFill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Visits by provider type" empty={data.byCategory.length === 0}>
            <BarList data={data.byCategory} label={prettyCategory} />
          </ChartCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'minmax(0, 1.4fr) minmax(300px, 1fr)' : '1fr', gap: 16 }}>
          <ChartCard title="Most common diagnosis groups" subtitle="Patients per group in this period">
            {data.diagnosisGroups.length === 0 ? (
              <EmptyChart text={data.hiddenPatients > 0
                ? `Not enough patients yet to show any group safely (${data.hiddenPatients} patient${data.hiddenPatients === 1 ? '' : 's'} in smaller groups).`
                : 'No diagnoses recorded in this period yet.'} />
            ) : (
              <>
                <BarList data={data.diagnosisGroups.map(g => ({ name: g.name, value: g.patients }))} color={PALETTE[4]} format={v => `${v} patient${v === 1 ? '' : 's'}`} />
                {data.hiddenPatients > 0 && (
                  <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 12 }}>
                    {data.hiddenPatients} more patient{data.hiddenPatients === 1 ? ' is' : 's are'} in groups too small to show.
                  </div>
                )}
              </>
            )}
          </ChartCard>

          <ChartCard title="Blood pressure readings" subtitle="Visits where providers recorded it" empty={bpTotal === 0}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.bloodPressure.map(b => (
                <li key={b.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: C.text }}>{b.name}</span>
                    <span style={{ color: C.textSub }}><strong style={{ color: C.text }}>{b.value}</strong> · {bpTotal ? Math.round((b.value / bpTotal) * 100) : 0}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: C.bg, overflow: 'hidden' }}>
                    <div style={{ width: `${bpTotal ? (b.value / bpTotal) * 100 : 0}%`, height: '100%', background: BP_COLORS[b.name] }} />
                  </div>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 12 }}>Bands follow the usual adult guide: elevated from 120, stage 1 from 130/80, stage 2 from 140/90.</div>
          </ChartCard>
        </div>
      </div>
    </AdminLayout>
  )
}
