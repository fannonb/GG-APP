import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C, font } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminMetrics } from '@/hooks/api/useAdminMetrics'
import { BarList, ChartCard, Donut, Funnel, Heatmap, InsightsHeader, KpiGrid, MetricsState, ReportButton } from '@/features/admin/metrics/MetricsKit'
import { exportReport } from '@/features/admin/metrics/reports'
import { PALETTE, STATUS_COLORS, chartAxis, prettyCategory, tooltipStyle } from '@/features/admin/metrics/metricsFormat'

function Grid({ children, cols }: { children: React.ReactNode; cols: string }) {
  const { isDesktop } = useResponsive()
  return <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? cols : '1fr', gap: 16 }}>{children}</div>
}

export function AdminCareInsightsScreen() {
  const { data, isLoading, error, refetch } = useAdminMetrics('activity')

  if (!data) {
    return (
      <AdminLayout title="Care activity">
        <MetricsState loading={isLoading} error={error} onRetry={() => void refetch()} />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Care activity">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: font.family }}>
        <InsightsHeader subtitle="Appointments and prescriptions" extra={<ReportButton onClick={() => exportReport('activity', data)} />} />
        <KpiGrid kpis={data.kpis} />

        <ChartCard
          title="Appointments by outcome"
          subtitle="By the date each was booked"
          empty={data.appointmentsTrend.every(a => a.completed + a.confirmed + a.requested + a.cancelled === 0)}
        >
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.appointmentsTrend.map(a => ({ label: a.label, Completed: a.completed, Confirmed: a.confirmed, 'Waiting to confirm': a.requested, Cancelled: a.cancelled }))}
                margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12.5, fontFamily: font.family }} />
                <Bar dataKey="Completed" stackId="a" fill={STATUS_COLORS.good} maxBarSize={28} isAnimationActive={false} />
                <Bar dataKey="Confirmed" stackId="a" fill={PALETTE[0]} maxBarSize={28} isAnimationActive={false} />
                <Bar dataKey="Waiting to confirm" stackId="a" fill={STATUS_COLORS.wait} maxBarSize={28} isAnimationActive={false} />
                <Bar dataKey="Cancelled" stackId="a" fill={STATUS_COLORS.bad} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="When appointments happen" subtitle="Booked time slots by day and hour; darker is busier">
          <Heatmap grid={data.heatmap} />
        </ChartCard>

        <ChartCard
          title="Day or night"
          subtitle={`Day is ${String(data.dayNight.dayHours.start).padStart(2, '0')}:00–${String(data.dayNight.dayHours.end).padStart(2, '0')}:00, in the provider’s local time`}
          empty={data.dayNight.slot.day + data.dayNight.slot.night + data.dayNight.booked.day + data.dayNight.booked.night === 0}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { title: 'Appointment time', hint: 'When the booked visit is', v: data.dayNight.slot },
              { title: 'When people book', hint: 'When the patient made the booking', v: data.dayNight.booked },
            ].map(row => {
              const total = row.v.day + row.v.night
              const dayPct = total ? Math.round((row.v.day / total) * 100) : 0
              return (
                <div key={row.title}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{row.title}</div>
                  <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 8 }}>{row.hint}</div>
                  <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', background: C.bg }}>
                    {total > 0 && <div style={{ width: `${dayPct}%`, background: '#F59E0B' }} />}
                    {total > 0 && <div style={{ width: `${100 - dayPct}%`, background: '#312E81' }} />}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6 }}>
                    <span><strong style={{ color: C.text }}>{row.v.day}</strong> <span style={{ color: C.textSub }}>day · {dayPct}%</span></span>
                    <span><strong style={{ color: C.text }}>{row.v.night}</strong> <span style={{ color: C.textSub }}>night · {total ? 100 - dayPct : 0}%</span></span>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>

        <Grid cols="repeat(3, minmax(0, 1fr))">
          <ChartCard title="Type of visit">
            <Donut data={data.mode} colorMap={{ 'In person': PALETTE[0], Telehealth: PALETTE[1], 'Home visit': PALETTE[2] }} />
          </ChartCard>
          <ChartCard title="Booked for">
            <Donut data={data.forWhom} colorMap={{ Self: PALETTE[0], 'Family member': PALETTE[4] }} />
          </ChartCard>
          <ChartCard title="How far ahead people book" empty={data.leadTime.every(l => l.value === 0)}>
            <BarList data={data.leadTime} color={PALETTE[1]} />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1fr) minmax(0, 1fr)">
          <ChartCard title="Appointments by provider type" empty={data.category.length === 0}>
            <BarList data={data.category} label={prettyCategory} />
          </ChartCard>
          <ChartCard title="Why appointments were cancelled" empty={data.cancellationReasons.length === 0}>
            <BarList data={data.cancellationReasons} color={STATUS_COLORS.bad} />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1.5fr) minmax(300px, 1fr)">
          <ChartCard title="Prescriptions: from sent to collected" subtitle="Orders sent in this period">
            <Funnel steps={data.prescriptionFunnel} />
          </ChartCard>
          <ChartCard title="Pickup or delivery">
            <Donut data={data.fulfilment} colorMap={{ Pickup: PALETTE[0], Delivery: PALETTE[2] }} />
            {data.prescriptionLost.length > 0 && (
              <>
                <div style={{ height: 1, background: C.border, margin: '16px 0 12px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Orders that didn’t go through</div>
                <BarList data={data.prescriptionLost} color={STATUS_COLORS.bad} />
              </>
            )}
          </ChartCard>
        </Grid>
      </div>
    </AdminLayout>
  )
}
