import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminMetrics } from '@/hooks/api/useAdminMetrics'
import { useAdminActivity } from '@/hooks/api/useAdminQueries'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'
import { ROUTES } from '@/router/routes'
import { formatRelativeTime } from '@/utils/format'
import { ChartCard, CountryLabel, Funnel, InsightsHeader, KpiGrid, MetricsState } from '@/features/admin/metrics/MetricsKit'
import { CYAN_DEEP, PALETTE, chartAxis, countryName, money, tooltipStyle } from '@/features/admin/metrics/metricsFormat'
import type { MetricsCountry, OverviewMetrics } from '@/types/admin-metrics.types'

function QueueItem({ label, value, tone, onClick }: { label: string; value: number; tone: 'action' | 'alert' | 'calm'; onClick?: () => void }) {
  const active = value > 0
  const color = !active ? C.textSub : tone === 'alert' ? '#B91C1C' : tone === 'action' ? '#B45309' : CYAN_DEEP
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{ flex: '1 1 160px', textAlign: 'left', padding: '12px 14px', borderRadius: radius.md, border: `1px solid ${active && tone !== 'calm' ? (tone === 'alert' ? '#FECACA' : '#FDE68A') : C.border}`, background: active && tone !== 'calm' ? (tone === 'alert' ? '#FEF2F2' : '#FFFBEB') : '#fff', cursor: onClick ? 'pointer' : 'default', fontFamily: font.family }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12.5, color: C.text, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {onClick && <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
    </button>
  )
}

function TrendChart({ data, spendCountry }: { data: OverviewMetrics['trend']; spendCountry: MetricsCountry | null }) {
  const rows = data.map(d => ({ label: d.label, Appointments: d.appointments, Invoices: d.invoices, Spend: spendCountry ? d.spend[spendCountry] ?? 0 : undefined }))
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: spendCountry ? 8 : 0, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={C.border} vertical={false} />
          <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" minTickGap={16} />
          <YAxis yAxisId="count" tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
          {spendCountry && (
            <YAxis yAxisId="money" orientation="right" tick={chartAxis} tickLine={false} axisLine={false} width={64} tickFormatter={v => money(spendCountry, v, true)} />
          )}
          <Tooltip {...tooltipStyle} formatter={(value, name) => (name === 'Spend' && spendCountry ? money(spendCountry, Number(value)) : value)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12.5, fontFamily: font.family }} />
          <Bar yAxisId="count" dataKey="Appointments" fill={PALETTE[1]} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Bar yAxisId="count" dataKey="Invoices" fill={PALETTE[0]} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          {spendCountry && <Line yAxisId="money" type="monotone" dataKey="Spend" stroke={PALETTE[2]} strokeWidth={2.2} dot={false} isAnimationActive={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AdminOverviewScreen() {
  const navigate = useNavigate()
  const { isDesktop, isMobile } = useResponsive()
  const { country } = useAdminCountry()
  const { data, isLoading, error, refetch } = useAdminMetrics('overview')
  const { data: activity = [] } = useAdminActivity(country, 6)
  // Spend is per currency, so the trend line follows one country at a time.
  const [spendPick, setSpendPick] = useState<MetricsCountry | null>(null)

  if (!data) {
    return (
      <AdminLayout title="Overview">
        <MetricsState loading={isLoading} error={error} onRetry={() => void refetch()} />
      </AdminLayout>
    )
  }

  const withSpend = data.countries.filter(c => c.spend > 0).map(c => c.country)
  const spendCountry = data.meta.country !== 'all' ? data.meta.country : spendPick ?? withSpend[0] ?? null
  const q = data.queue

  return (
    <AdminLayout title="Overview">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: font.family }}>
        <InsightsHeader subtitle="How GG’APP is doing" />

        <section aria-label="Needs attention" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <QueueItem label="Provider applications" value={q.providerApplications} tone="action" onClick={() => navigate(ROUTES.ADMIN_APPLICATIONS)} />
          <QueueItem label="Credit applications" value={q.creditApplications} tone="action" onClick={() => navigate(ROUTES.ADMIN_CREDIT_APPLICATIONS)} />
          <QueueItem label="Disputed invoices" value={q.disputedInvoices} tone="alert" onClick={() => navigate(ROUTES.ADMIN_PAYMENTS)} />
          <QueueItem label="Invoices waiting over 2 days" value={q.staleInvoices} tone="action" onClick={() => navigate(ROUTES.ADMIN_PAYMENTS)} />
          <QueueItem label="Wrong ledger PINs (7 days)" value={q.failedPinAttempts} tone="alert" onClick={() => navigate(ROUTES.ADMIN_LEDGER_ACCESS)} />
        </section>

        <KpiGrid kpis={data.kpis} />

        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'minmax(0, 2fr) minmax(300px, 1fr)' : '1fr', gap: 16 }}>
          <ChartCard
            title="Bookings, invoices and spend"
            subtitle={spendCountry ? `Spend line in ${countryName(spendCountry)}’s currency` : 'The spend line appears once invoices are approved'}
            action={data.meta.country === 'all' && withSpend.length > 1 ? (
              <select aria-label="Spend country" value={spendCountry ?? ''} onChange={e => setSpendPick(e.target.value as MetricsCountry)} style={{ height: 32, borderRadius: radius.sm, border: `1px solid ${C.border}`, padding: '0 8px', fontFamily: font.family, fontSize: 13, background: '#fff' }}>
                {withSpend.map(c => <option key={c} value={c}>{countryName(c)}</option>)}
              </select>
            ) : undefined}
            empty={data.trend.every(t => t.appointments === 0 && t.invoices === 0)}
          >
            <TrendChart data={data.trend} spendCountry={spendCountry} />
          </ChartCard>

          <ChartCard title="Patient journey" subtitle="All time, for patients in this view">
            <Funnel steps={data.funnel} />
          </ChartCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'minmax(0, 1.4fr) minmax(300px, 1fr)' : '1fr', gap: 16 }}>
          <ChartCard title="By country" subtitle="Spend is approved invoices, in each country’s currency">
            <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 460 }}>
                <thead>
                  <tr style={{ color: C.textSub, textAlign: 'left' }}>
                    {['Country', 'Patients', 'Providers', 'Appointments', 'Spend', 'Change'].map(h => (
                      <th key={h} style={{ fontWeight: 600, padding: '0 8px 10px', textAlign: h === 'Country' ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.countries.map(c => {
                    const change = c.spendPrevious > 0 ? Math.round(((c.spend - c.spendPrevious) / c.spendPrevious) * 100) : null
                    return (
                      <tr key={c.country} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '11px 8px', fontWeight: 600, color: C.text }}><CountryLabel code={c.country} /></td>
                        <td style={{ padding: '11px 8px', textAlign: 'right' }}>{c.patients}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right' }}>{c.providers}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right' }}>{c.appointments}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontWeight: 700 }}>{money(c.country, c.spend)}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', color: change == null ? C.textLight : change >= 0 ? '#15803D' : '#B91C1C', fontWeight: 600 }}>
                          {change == null ? '—' : `${change > 0 ? '+' : ''}${change}%`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title="Latest activity" empty={activity.length === 0}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {activity.slice(0, 6).map((item, i) => (
                <li key={item.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                  <span aria-hidden style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: item.actorType === 'provider' ? PALETTE[4] : CYAN_DEEP, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap' }}>
                      <strong>{item.actorName}</strong> · {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub, marginTop: 1 }}>{formatRelativeTime(item.occurredAt)}{item.reference ? ` · ${item.reference}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </div>
    </AdminLayout>
  )
}
