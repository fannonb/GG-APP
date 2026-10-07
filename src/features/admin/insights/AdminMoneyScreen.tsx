import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminMetrics } from '@/hooks/api/useAdminMetrics'
import { useAdminCountry, type AdminCountryFilter } from '@/features/admin/AdminCountryContext'
import { BarList, ChartCard, CountryLabel, ExportButton, InsightsHeader, KpiGrid, MetricsState } from '@/features/admin/metrics/MetricsKit'
import { STATUS_COLORS, chartAxis, countryName, exportCsv, money, prettyCategory, tooltipStyle } from '@/features/admin/metrics/metricsFormat'
import type { MetricsCountry } from '@/types/admin-metrics.types'

const th: React.CSSProperties = { fontWeight: 600, color: C.textSub, padding: '0 8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '11px 8px', textAlign: 'right', borderTop: `1px solid ${C.border}` }

export function AdminMoneyScreen() {
  const { isDesktop } = useResponsive()
  const { setCountry } = useAdminCountry()
  const { data, isLoading, error, refetch } = useAdminMetrics('money')

  if (!data) {
    return (
      <AdminLayout title="Money">
        <MetricsState loading={isLoading} error={error} onRetry={() => void refetch()} />
      </AdminLayout>
    )
  }

  const c: MetricsCountry = data.meta.country
  const fmt = (v: number) => money(c, v)
  const picked = data.meta.requested === 'all'

  return (
    <AdminLayout title="Money">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: font.family }}>
        <InsightsHeader subtitle={`Invoices and spend in ${countryName(c)}’s currency`} />

        {/* Money is never added across currencies, so "All countries" shows one country at a time. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 14px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.md }}>
          <span style={{ fontSize: 13, color: C.textSub, marginRight: 4 }}>
            {picked ? 'Showing the country with the most spend. Switch country:' : 'Spend this period by country:'}
          </span>
          {data.totalsByCountry.map(t => {
            const active = t.country === c
            return (
              <button
                key={t.country}
                type="button"
                onClick={() => setCountry(countryName(t.country) as AdminCountryFilter)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: radius.full, border: `1.5px solid ${active ? '#0B7BC0' : C.border}`, background: active ? C.blue100 : '#fff', cursor: 'pointer', fontFamily: font.family, fontSize: 13, color: C.text }}
              >
                <CountryLabel code={t.country} />
                <strong>{money(t.country, t.value, true)}</strong>
              </button>
            )
          })}
        </div>

        <KpiGrid kpis={data.kpis} country={c} />

        <ChartCard title="Invoice value by outcome" subtitle="By the date each invoice was sent" empty={data.byStatus.every(b => b.approved + b.pending + b.rejected === 0)}>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byStatus.map(b => ({ label: b.label, Approved: b.approved, Waiting: b.pending, 'Rejected or disputed': b.rejected }))} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={chartAxis} tickLine={false} axisLine={false} width={72} tickFormatter={v => money(c, v, true)} />
                <Tooltip {...tooltipStyle} formatter={value => fmt(Number(value))} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12.5, fontFamily: font.family }} />
                <Bar dataKey="Approved" stackId="v" fill={STATUS_COLORS.good} maxBarSize={28} isAnimationActive={false} />
                <Bar dataKey="Waiting" stackId="v" fill={STATUS_COLORS.wait} maxBarSize={28} isAnimationActive={false} />
                <Bar dataKey="Rejected or disputed" stackId="v" fill={STATUS_COLORS.bad} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'minmax(280px, 1fr) minmax(0, 1.6fr)' : '1fr', gap: 16 }}>
          <ChartCard title="Average invoice by provider type" empty={data.byCategory.length === 0}>
            <BarList data={data.byCategory.map(b => ({ name: b.category, value: b.average }))} label={prettyCategory} format={fmt} />
          </ChartCard>

          <ChartCard
            title="Top providers by approved spend"
            empty={data.topProviders.length === 0}
            action={<ExportButton onClick={() => exportCsv(`top-providers-${c}.csv`, data.topProviders.map(p => ({ Provider: p.name, Type: prettyCategory(p.category), Invoices: p.invoices, [`Approved (${c})`]: Math.round(p.approvedValue), 'Approval rate %': p.approvalRate })))} />}
          >
            <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 480 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: 'left' }}>Provider</th>
                    <th style={th}>Invoices</th>
                    <th style={th}>Approved</th>
                    <th style={th}>Approval rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProviders.map(p => (
                    <tr key={p.id}>
                      <td style={{ ...td, textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, color: C.text }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: C.textSub }}>{prettyCategory(p.category)}</div>
                      </td>
                      <td style={td}>{p.invoices}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{fmt(p.approvedValue)}</td>
                      <td style={td}>{p.approvalRate == null ? '—' : `${p.approvalRate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        <ChartCard
          title="Approved but not yet paid out"
          subtitle="What providers are still owed, across all dates"
          empty={data.owedToProviders.length === 0}
          action={data.owedToProviders.length > 0 ? <ExportButton onClick={() => exportCsv(`owed-to-providers-${c}.csv`, data.owedToProviders.map(o => ({ Provider: o.name, Invoices: o.invoices, [`Owed (${c})`]: Math.round(o.value) })))} /> : undefined}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Provider</th>
                <th style={th}>Invoices</th>
                <th style={th}>Owed</th>
              </tr>
            </thead>
            <tbody>
              {data.owedToProviders.map(o => (
                <tr key={o.id}>
                  <td style={{ ...td, textAlign: 'left', fontWeight: 600, color: C.text }}>{o.name}</td>
                  <td style={td}>{o.invoices}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(o.value)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...td, textAlign: 'left', fontWeight: 800 }}>Total</td>
                <td style={{ ...td, fontWeight: 700 }}>{data.owedToProviders.reduce((s, o) => s + o.invoices, 0)}</td>
                <td style={{ ...td, fontWeight: 800 }}>{fmt(data.owedToProviders.reduce((s, o) => s + o.value, 0))}</td>
              </tr>
            </tbody>
          </table>
        </ChartCard>
      </div>
    </AdminLayout>
  )
}
