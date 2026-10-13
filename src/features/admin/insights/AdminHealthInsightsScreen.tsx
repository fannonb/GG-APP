import { Pager, usePaged } from '@/features/admin/paging'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminMetrics } from '@/hooks/api/useAdminMetrics'
import { BarList, ChartCard, CountryLabel, EmptyChart, InsightsHeader, KpiGrid, MetricsState, ReportButton } from '@/features/admin/metrics/MetricsKit'
import { exportReport } from '@/features/admin/metrics/reports'
import { CYAN_DEEP, PALETTE, STATUS_COLORS, chartAxis, money, prettyCategory, tooltipStyle } from '@/features/admin/metrics/metricsFormat'

const BP_COLORS: Record<string, string> = {
  Normal: STATUS_COLORS.good,
  Elevated: '#F59E0B',
  'High (stage 1)': '#EA580C',
  'High (stage 2)': STATUS_COLORS.bad,
}

const th: React.CSSProperties = { fontWeight: 600, color: C.textSub, padding: '0 8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 8px', textAlign: 'right', borderTop: `1px solid ${C.border}` }

function Grid({ children, cols }: { children: React.ReactNode; cols: string }) {
  const { isDesktop } = useResponsive()
  return <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? cols : '1fr', gap: 16 }}>{children}</div>
}

export function AdminHealthInsightsScreen() {
  const { data, isLoading, error, refetch } = useAdminMetrics('health')
  const { pageItems: agePage, pager: agePager } = usePaged(data?.conditionsByAge ?? [], `${data?.meta.country}|${data?.meta.range}`)
  const { pageItems: costPage, pager: costPager } = usePaged(data?.costByCondition ?? [], `${data?.meta.country}|${data?.meta.range}`)
  const { pageItems: prefPage, pager: prefPager } = usePaged(data?.preferredProviders ?? [], `${data?.meta.country}|${data?.meta.range}`)

  if (!data) {
    return (
      <AdminLayout title="Health insights">
        <MetricsState loading={isLoading} error={error} onRetry={() => void refetch()} />
      </AdminLayout>
    )
  }

  const visits = data.kpis.find(k => k.key === 'visits')?.value ?? 0
  const bpTotal = data.bloodPressure.reduce((s, b) => s + b.value, 0)
  const ageMax = Math.max(1, ...data.conditionsByAge.flatMap(r => r.bands.map(b => b.value)))
  const minGroup = data.meta.minGroup

  return (
    <AdminLayout title="Health insights">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: font.family }}>
        <InsightsHeader subtitle="From visits providers recorded" extra={<ReportButton onClick={() => exportReport('health', data)} />} />

        <div style={{ padding: '12px 14px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.md, fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>
          Based on <strong style={{ color: C.text }}>{visits} recorded visit{visits === 1 ? '' : 's'}</strong>. Conditions come from the standard list
          providers pick when they record a visit. “People treated” counts each person once, with family members counted as their own person.
          To protect privacy, any condition or group with fewer than {minGroup} patients is hidden.
        </div>

        <KpiGrid kpis={data.kpis} />

        <Grid cols="minmax(0, 1.6fr) minmax(300px, 1fr)">
          <ChartCard title="People treated" subtitle="Completed appointments, recorded visits and collected prescriptions" empty={data.treatedTrend.every(t => t.people === 0)}>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.treatedTrend.map(t => ({ label: t.label, 'Account holders': t.people - t.family, 'Family members': t.family }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12.5, fontFamily: font.family }} />
                  <Area type="monotone" dataKey="Account holders" stackId="t" stroke={CYAN_DEEP} fill={CYAN_DEEP} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
                  <Area type="monotone" dataKey="Family members" stackId="t" stroke={PALETTE[4]} fill={PALETTE[4]} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Condition groups" subtitle="Patients per group in this period" empty={data.conditionGroups.length === 0}>
            <BarList data={data.conditionGroups} color={PALETTE[4]} format={v => `${v} patient${v === 1 ? '' : 's'}`} />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1.4fr) minmax(300px, 1fr)">
          <ChartCard title="Top conditions" subtitle="Patients per condition in this period">
            {data.conditions.length === 0 ? (
              <EmptyChart text={data.hiddenConditionPatients > 0
                ? `Not enough patients yet to show any condition safely (${data.hiddenConditionPatients} in smaller groups).`
                : 'No conditions recorded in this period yet. Providers pick one when they record a visit.'} />
            ) : (
              <>
                <BarList data={data.conditions.map(c => ({ name: c.name, value: c.patients }))} color={PALETTE[4]} format={v => `${v} patient${v === 1 ? '' : 's'}`} />
                {data.hiddenConditionPatients > 0 && (
                  <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 12 }}>
                    {data.hiddenConditionPatients} more patient{data.hiddenConditionPatients === 1 ? ' is' : 's are'} in conditions too small to show.
                  </div>
                )}
              </>
            )}
          </ChartCard>
          <ChartCard title="Visits by county / province" subtitle="Where the provider is" empty={data.byRegion.length === 0}>
            <BarList data={data.byRegion.slice(0, 10)} color={PALETTE[2]} />
          </ChartCard>
        </Grid>

        <ChartCard title="Conditions by age" subtitle="Visits per condition, by the person’s age at the visit; darker is more" empty={data.conditionsByAge.length === 0}>
          <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>Condition</th>
                  {data.conditionsByAge[0]?.bands.map(b => <th key={b.name} style={{ ...th, textAlign: 'center' }}>{b.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {agePage.map(row => (
                  <tr key={row.condition}>
                    <td style={{ color: C.text, padding: '6px 8px 6px 0' }}>{row.condition}</td>
                    {row.bands.map(b => (
                      <td
                        key={b.name}
                        title={`${row.condition}, ${b.name}: ${b.value} visit${b.value === 1 ? '' : 's'}`}
                        style={{ textAlign: 'center', borderRadius: 6, padding: '8px 4px', fontWeight: 700, color: b.value / ageMax > 0.55 ? '#fff' : C.text, background: b.value === 0 ? C.bg : `rgba(124,58,237,${(0.12 + (b.value / ageMax) * 0.78).toFixed(2)})` }}
                      >
                        {b.value || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager {...agePager} />
          </div>
        </ChartCard>

        <Grid cols="minmax(0, 1fr) minmax(0, 1fr)">
          <ChartCard title="Preferred providers by condition" subtitle="Providers that recorded the most visits for each condition" empty={data.preferredProviders.length === 0}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {prefPage.map(row => (
                <div key={row.condition}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{row.condition}</div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
                    {row.providers.map(p => (
                      <li key={p.name}><span style={{ color: C.text }}>{p.name}</span> · {p.value} visit{p.value === 1 ? '' : 's'}</li>
                    ))}
                  </ol>
                </div>
              ))}
              <Pager {...prefPager} />
            </div>
          </ChartCard>
          <ChartCard title="Average cost by condition" subtitle="Approved invoices for visits with a condition, in each country’s currency" empty={data.costByCondition.length === 0}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>Condition</th>
                  <th style={{ ...th, textAlign: 'left' }}>Country</th>
                  <th style={th}>Invoices</th>
                  <th style={th}>Average</th>
                </tr>
              </thead>
              <tbody>
                {costPage.map(r => (
                  <tr key={`${r.condition}-${r.country}`}>
                    <td style={{ ...td, textAlign: 'left', color: C.text }}>{r.condition}</td>
                    <td style={{ ...td, textAlign: 'left' }}><CountryLabel code={r.country} /></td>
                    <td style={td}>{r.invoices}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{money(r.country, r.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager {...costPager} />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)">
          <ChartCard title="Visits by provider type" empty={data.byCategory.length === 0}>
            <BarList data={data.byCategory} label={prettyCategory} />
          </ChartCard>

          <ChartCard title="From free-text diagnoses" subtitle="Grouped by keyword; covers visits recorded before conditions were picked from a list">
            {data.diagnosisGroups.length === 0 ? (
              <EmptyChart text={data.hiddenPatients > 0
                ? `Not enough patients yet to show any group safely (${data.hiddenPatients} patient${data.hiddenPatients === 1 ? '' : 's'} in smaller groups).`
                : 'No diagnoses recorded in this period yet.'} />
            ) : (
              <>
                <BarList data={data.diagnosisGroups.map(g => ({ name: g.name, value: g.patients }))} color={PALETTE[6]} format={v => `${v} patient${v === 1 ? '' : 's'}`} />
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
        </Grid>
      </div>
    </AdminLayout>
  )
}
