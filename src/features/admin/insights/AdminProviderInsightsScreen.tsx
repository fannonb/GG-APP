import { useMemo, useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminMetrics } from '@/hooks/api/useAdminMetrics'
import { BarList, ChartCard, CountryLabel, Donut, ExportButton, InsightsHeader, KpiGrid, MetricsState } from '@/features/admin/metrics/MetricsKit'
import { PALETTE, STATUS_COLORS, countryName, exportCsv, money, prettyCategory } from '@/features/admin/metrics/metricsFormat'
import type { ProviderMetrics } from '@/types/admin-metrics.types'

type SortKey = 'bookings' | 'approvedValue' | 'approvalRate' | 'rating'

function Grid({ children, cols }: { children: React.ReactNode; cols: string }) {
  const { isDesktop } = useResponsive()
  return <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? cols : '1fr', gap: 16 }}>{children}</div>
}

const th: React.CSSProperties = { fontWeight: 600, color: C.textSub, padding: '0 8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '11px 8px', textAlign: 'right', borderTop: `1px solid ${C.border}` }

function ProviderTable({ rows }: { rows: ProviderMetrics['table'] }) {
  const [sort, setSort] = useState<SortKey>('bookings')
  const [onlyInactive, setOnlyInactive] = useState(false)
  const sorted = useMemo(
    () => [...rows].filter(r => !onlyInactive || r.inactive).sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1)),
    [rows, sort, onlyInactive],
  )
  const header = (key: SortKey, label: string) => (
    <th style={th}>
      <button type="button" onClick={() => setSort(key)} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: sort === key ? C.text : C.textSub, fontWeight: sort === key ? 700 : 600, cursor: 'pointer' }}>
        {label}{sort === key ? ' ↓' : ''}
      </button>
    </th>
  )
  const inactiveCount = rows.filter(r => r.inactive).length

  return (
    <ChartCard
      title="Every provider"
      subtitle="Bookings and approved spend in this period. Spend is in each provider’s own currency."
      empty={rows.length === 0}
      action={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {inactiveCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={onlyInactive} onChange={e => setOnlyInactive(e.target.checked)} />
              Only inactive ({inactiveCount})
            </label>
          )}
          <ExportButton onClick={() => exportCsv('providers.csv', sorted.map(r => ({
            Provider: r.name,
            Type: prettyCategory(r.category),
            Country: countryName(r.country),
            Status: r.status,
            Bookings: r.bookings,
            Completed: r.completed,
            'Approved spend': Math.round(r.approvedValue),
            Currency: r.country ?? '',
            'Approval rate %': r.approvalRate,
            Rating: r.rating,
            Reviews: r.reviews,
            'No bookings in 30 days': r.inactive ? 'Yes' : 'No',
          })))} />
        </div>
      }
    >
      <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 760 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Provider</th>
              <th style={{ ...th, textAlign: 'left' }}>Country</th>
              {header('bookings', 'Bookings')}
              {header('approvedValue', 'Approved spend')}
              {header('approvalRate', 'Approval rate')}
              {header('rating', 'Rating')}
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id}>
                <td style={{ ...td, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: C.text }}>{r.name}</span>
                    {r.status !== 'ACTIVE' && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#B91C1C', background: '#FEE2E2', padding: '2px 8px', borderRadius: radius.full }}>Suspended</span>}
                    {r.inactive && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: radius.full }}>Inactive</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{prettyCategory(r.category)}</div>
                </td>
                <td style={{ ...td, textAlign: 'left' }}>{r.country ? <CountryLabel code={r.country} /> : '—'}</td>
                <td style={td}>{r.bookings}<span style={{ color: C.textSub }}>{r.bookings > 0 ? ` · ${r.completed} done` : ''}</span></td>
                <td style={{ ...td, fontWeight: 700 }}>{r.country ? money(r.country, r.approvedValue) : '—'}</td>
                <td style={td}>{r.approvalRate == null ? '—' : `${r.approvalRate}%`}</td>
                <td style={td}>{r.rating == null ? '—' : <>★ {r.rating.toFixed(1)} <span style={{ color: C.textSub }}>({r.reviews})</span></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}

export function AdminProviderInsightsScreen() {
  const { data, isLoading, error, refetch } = useAdminMetrics('providers')

  if (!data) {
    return (
      <AdminLayout title="Provider performance">
        <MetricsState loading={isLoading} error={error} onRetry={() => void refetch()} />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Provider performance">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: font.family }}>
        <InsightsHeader subtitle="Supply, onboarding and quality" />
        <KpiGrid kpis={data.kpis} />

        <Grid cols="repeat(3, minmax(0, 1fr))">
          <ChartCard title="Providers by type" empty={data.byCategory.length === 0}>
            <BarList data={data.byCategory} label={prettyCategory} />
          </ChartCard>
          <ChartCard title="Applications" subtitle="All time">
            <Donut data={data.pipeline} colorMap={{ Waiting: STATUS_COLORS.wait, 'Info requested': PALETTE[1], Approved: STATUS_COLORS.good, Rejected: STATUS_COLORS.bad }} />
          </ChartCard>
          <ChartCard title="Ratings" subtitle="All reviews" empty={data.ratings.every(r => r.value === 0)}>
            <BarList data={data.ratings} color="#F59E0B" />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1fr) minmax(0, 1fr)">
          <ChartCard title="Providers by country">
            <Donut data={data.byCountry.map(c => ({ name: countryName(c.name), value: c.value }))} />
          </ChartCard>
          <ChartCard title="How providers get paid" subtitle="Default payout method">
            <Donut data={data.payoutMethod} colorMap={{ 'M-Pesa': STATUS_COLORS.good, Bank: PALETTE[0], 'Mobile money': PALETTE[1], 'Not set': STATUS_COLORS.muted }} />
          </ChartCard>
        </Grid>

        <ProviderTable rows={data.table} />
      </div>
    </AdminLayout>
  )
}
