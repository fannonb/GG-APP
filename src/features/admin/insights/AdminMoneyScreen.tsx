import { Pager, usePaged } from '@/features/admin/paging'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminMetrics } from '@/hooks/api/useAdminMetrics'
import { useAdminCountry, type AdminCountryFilter } from '@/features/admin/AdminCountryContext'
import { ChartCard, CountryLabel, Donut, ExportButton, InsightsHeader, KpiGrid, MetricsState, ReportButton } from '@/features/admin/metrics/MetricsKit'
import { exportReport } from '@/features/admin/metrics/reports'
import { CYAN_DEEP, PALETTE, STATUS_COLORS, chartAxis, countryName, exportCsv, money, prettyCategory, tooltipStyle } from '@/features/admin/metrics/metricsFormat'
import type { MetricsCountry } from '@/types/admin-metrics.types'

const th: React.CSSProperties = { fontWeight: 600, color: C.textSub, padding: '0 8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '11px 8px', textAlign: 'right', borderTop: `1px solid ${C.border}` }

export function AdminMoneyScreen() {
  const { isDesktop } = useResponsive()
  const { setCountry } = useAdminCountry()
  const { data, isLoading, error, refetch } = useAdminMetrics('money')
  const { pageItems: topPage, pager: topPager } = usePaged(data?.topProviders ?? [], `${data?.meta.country}|${data?.meta.range}`)
  const { pageItems: owedPage, pager: owedPager } = usePaged(data?.owedToProviders ?? [], `${data?.meta.country}|${data?.meta.range}`)

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
        <InsightsHeader subtitle={`Invoices and spend in ${countryName(c)}’s currency`} extra={<ReportButton onClick={() => exportReport('money', data)} />} />

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

        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr', gap: 16 }}>
          <ChartCard title="How approved invoices were paid" subtitle="GG’APP credit vs the part patients paid the provider directly" empty={data.walletSplit.credit + data.walletSplit.direct === 0}>
            <Donut
              data={[{ name: 'GG’APP credit', value: Math.round(data.walletSplit.credit) }, { name: 'Paid directly', value: Math.round(data.walletSplit.direct) }]}
              colorMap={{ 'GG’APP credit': CYAN_DEEP, 'Paid directly': PALETTE[3] }}
              centerLabel={c}
              format={v => money(c, v, true)}
            />
          </ChartCard>
          <ChartCard title="Price trend" subtitle="Average invoice vs the same period a year earlier. A rough guide to rising costs, not a medical inflation index.">
            {data.priceTrend.averageYearAgo == null ? (
              <div style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.55 }}>
                No invoices in the same period last year yet, so there’s nothing to compare with. This fills in once GG’APP has a year of history.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: (data.priceTrend.change ?? 0) > 0 ? STATUS_COLORS.bad : STATUS_COLORS.good }}>
                  {(data.priceTrend.change ?? 0) > 0 ? '+' : ''}{data.priceTrend.change ?? 0}%
                </span>
                <span style={{ fontSize: 13.5, color: C.textSub }}>
                  {fmt(data.priceTrend.average ?? 0)} now ({data.priceTrend.invoices} invoices) vs {fmt(data.priceTrend.averageYearAgo)} a year ago ({data.priceTrend.invoicesYearAgo} invoices)
                </span>
              </div>
            )}
          </ChartCard>
        </div>

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
          <ChartCard title="Average invoice by provider type" subtitle="Change is against the same period a year earlier" empty={data.byCategory.length === 0}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.byCategory.map(b => {
                const max = Math.max(...data.byCategory.map(x => x.average), 1)
                return (
                  <li key={b.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: C.text }}>{prettyCategory(b.category)}</span>
                      <span style={{ color: C.text, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {fmt(b.average)}
                        {b.change != null && (
                          <span style={{ marginLeft: 6, fontSize: 12, color: b.change > 0 ? STATUS_COLORS.bad : STATUS_COLORS.good }}>{b.change > 0 ? '+' : ''}{b.change}%</span>
                        )}
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: C.bg, overflow: 'hidden' }}>
                      <div style={{ width: `${(b.average / max) * 100}%`, height: '100%', borderRadius: 4, background: CYAN_DEEP }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </ChartCard>

          <ChartCard
            title="Providers by approved spend"
            subtitle={data.topProviders.length > 10 ? `Top 10 of ${data.topProviders.length}; export for all` : undefined}
            empty={data.topProviders.length === 0}
            action={<ExportButton onClick={() => exportCsv(`providers-spend-${c}.csv`, data.topProviders.map(p => ({ Provider: p.name, Type: prettyCategory(p.category), Invoices: p.invoices, [`Approved (${c})`]: Math.round(p.approvedValue), [`Average invoice (${c})`]: Math.round(p.averageInvoice), [`Median invoice (${c})`]: p.medianInvoice == null ? null : Math.round(p.medianInvoice), 'Approval rate %': p.approvalRate })))} />}
          >
            <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: 'left' }}>Provider</th>
                    <th style={th}>Invoices</th>
                    <th style={th}>Approved</th>
                    <th style={th}>Average</th>
                    <th style={th}>Median</th>
                    <th style={th}>Approval rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topPage.map(p => (
                    <tr key={p.id}>
                      <td style={{ ...td, textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, color: C.text }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: C.textSub }}>{prettyCategory(p.category)}</div>
                      </td>
                      <td style={td}>{p.invoices}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{fmt(p.approvedValue)}</td>
                      <td style={td}>{fmt(p.averageInvoice)}</td>
                      <td style={td}>{p.medianInvoice == null ? '—' : fmt(p.medianInvoice)}</td>
                      <td style={td}>{p.approvalRate == null ? '—' : `${p.approvalRate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
                  <Pager {...topPager} />
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
              {owedPage.map(o => (
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
          <Pager {...owedPager} />
        </ChartCard>
      </div>
    </AdminLayout>
  )
}
