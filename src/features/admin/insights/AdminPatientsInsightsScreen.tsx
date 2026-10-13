import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C, font } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminMetrics } from '@/hooks/api/useAdminMetrics'
import { BarList, ChartCard, CountryLabel, Donut, InsightsHeader, KpiGrid, MetricsState, ReportButton } from '@/features/admin/metrics/MetricsKit'
import { exportReport } from '@/features/admin/metrics/reports'
import { CYAN_DEEP, PALETTE, STATUS_COLORS, chartAxis, countryName, currencySymbol, money, tooltipStyle } from '@/features/admin/metrics/metricsFormat'

const th: React.CSSProperties = { fontWeight: 600, color: C.textSub, padding: '0 8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '11px 8px', textAlign: 'right', borderTop: `1px solid ${C.border}` }

function Grid({ children, cols }: { children: React.ReactNode; cols: string }) {
  const { isDesktop } = useResponsive()
  return <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? cols : '1fr', gap: 16 }}>{children}</div>
}

export function AdminPatientsInsightsScreen() {
  const { isDesktop } = useResponsive()
  const { data, isLoading, error, refetch } = useAdminMetrics('patients')

  if (!data) {
    return (
      <AdminLayout title="Patients & credit">
        <MetricsState loading={isLoading} error={error} onRetry={() => void refetch()} />
      </AdminLayout>
    )
  }

  const totalPatients = data.ageBands.reduce((s, a) => s + a.value, 0)
  const familyTotal = data.familyAgeBands.reduce((s, a) => s + a.value, 0)

  return (
    <AdminLayout title="Patients & credit">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: font.family }}>
        <InsightsHeader subtitle="Who signs up, and how credit is going" extra={<ReportButton onClick={() => exportReport('patients', data)} />} />
        <KpiGrid kpis={data.kpis} />

        <Grid cols="minmax(0, 1.6fr) minmax(300px, 1fr)">
          <ChartCard title="New sign-ups" empty={data.signups.every(s => s.value === 0)}>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.signups} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CYAN_DEEP} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CYAN_DEEP} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="value" name="Sign-ups" stroke={CYAN_DEEP} strokeWidth={2.2} fill="url(#signupFill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="How people sign up">
            <Donut data={data.signupMethod} centerLabel="patients" />
            <div style={{ height: 1, background: C.border, margin: '16px 0' }} />
            <Donut data={data.verification} colorMap={{ Verified: STATUS_COLORS.good, 'Not verified': STATUS_COLORS.wait, Suspended: STATUS_COLORS.bad }} centerLabel="accounts" />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)">
          <ChartCard title="Age" subtitle={`${totalPatients} patients with a date of birth`} empty={totalPatients === 0}>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ageBands} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="name" tick={chartAxis} tickLine={false} axisLine={{ stroke: C.border }} interval={0} />
                  <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" name="Patients" fill={CYAN_DEEP} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Gender" subtitle="Optional at sign-up, so some aren’t recorded">
            <Donut data={data.gender} colorMap={{ Female: PALETTE[4], Male: PALETTE[0], 'Not recorded': PALETTE[6], 'Prefer not to say': PALETTE[1], Other: PALETTE[3] }} />
          </ChartCard>
          <ChartCard title="Country" subtitle={data.abroad > 0 ? `${data.abroad} living abroad` : undefined}>
            <Donut data={data.country.map(c => ({ name: countryName(c.name), value: c.value }))} />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1.6fr) minmax(300px, 1fr)">
          <ChartCard title="Credit applications" subtitle="By the date each was submitted" empty={data.applicationsTrend.every(a => a.approved + a.pending + a.declined === 0)}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.applicationsTrend.map(a => ({ label: a.label, Approved: a.approved, Waiting: a.pending, Declined: a.declined }))} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={{ stroke: C.border }} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12.5, fontFamily: font.family }} />
                  <Bar dataKey="Approved" stackId="a" fill={STATUS_COLORS.good} maxBarSize={28} isAnimationActive={false} />
                  <Bar dataKey="Waiting" stackId="a" fill={STATUS_COLORS.wait} maxBarSize={28} isAnimationActive={false} />
                  <Bar dataKey="Declined" stackId="a" fill={STATUS_COLORS.bad} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Credit status of all patients">
            <Donut data={data.creditStatus} colorMap={{ Approved: STATUS_COLORS.good, Pending: STATUS_COLORS.wait, Declined: STATUS_COLORS.bad, 'Not applied': STATUS_COLORS.muted }} />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)">
          <ChartCard title="Finance partner" subtitle="Approved patients">
            <Donut data={data.financePartner} colorMap={{ Equity: '#9B1C1C', Moneymart: PALETTE[0], Other: PALETTE[6] }} />
          </ChartCard>
          <ChartCard title="Applicants’ employment" empty={data.employment.length === 0}>
            <BarList data={data.employment} />
          </ChartCard>
          <ChartCard title="Family covered" subtitle="Members added by patients" empty={data.familyRelations.length === 0}>
            <BarList data={data.familyRelations} color={PALETTE[4]} />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1.4fr) minmax(0, 1fr)">
          <ChartCard title="Family members’ age" subtitle={`${familyTotal} family members, by today’s age`} empty={familyTotal === 0}>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.familyAgeBands} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="name" tick={chartAxis} tickLine={false} axisLine={{ stroke: C.border }} interval={0} />
                  <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" name="Family members" fill={PALETTE[4]} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Family members’ gender" subtitle="Optional when a family member is added">
            <Donut data={data.familyGender} colorMap={{ Female: PALETTE[4], Male: PALETTE[0], 'Not recorded': PALETTE[6], 'Prefer not to say': PALETTE[1] }} />
          </ChartCard>
        </Grid>

        <Grid cols="minmax(0, 1.4fr) minmax(0, 1fr)">
          <ChartCard title="Credit amounts applied for" subtitle="First applications in this period, in each country’s currency" empty={data.creditBands.every(cb => cb.bands.every(b => b.value === 0))}>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop && data.creditBands.length > 1 ? `repeat(${data.creditBands.length}, minmax(0, 1fr))` : '1fr', gap: 20 }}>
              {data.creditBands.map(cb => (
                <div key={cb.country}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}><CountryLabel code={cb.country} /></div>
                  <BarList data={cb.bands} label={n => `${currencySymbol(cb.country)} ${n}`} />
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard title="Preferred repayment method" subtitle="As stated on the credit application" empty={data.repaymentMethod.length === 0}>
            <BarList data={data.repaymentMethod} color={PALETTE[2]} />
          </ChartCard>
        </Grid>

        <ChartCard
          title="App satisfaction"
          subtitle="How patients rate GG’APP itself, asked after they pay an invoice"
          empty={data.satisfaction.responses === 0}
        >
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'minmax(180px, 0.6fr) minmax(0, 1fr) minmax(0, 1.4fr)' : '1fr', gap: 24, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.text, lineHeight: 1 }}>
                {data.satisfaction.average?.toFixed(1) ?? '—'}<span style={{ fontSize: 16, color: C.textSub, fontWeight: 600 }}> / 5</span>
              </div>
              <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6 }}>
                {data.satisfaction.responses} rating{data.satisfaction.responses === 1 ? '' : 's'} this period
                {data.satisfaction.previous != null && <> · {data.satisfaction.previous.toFixed(1)} before</>}
              </div>
            </div>
            <BarList data={data.satisfaction.distribution} color="#F59E0B" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Recent comments</div>
              {data.satisfaction.comments.length === 0 ? (
                <div style={{ fontSize: 13, color: C.textSub }}>No written comments in this period.</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.satisfaction.comments.map((cm, i) => (
                    <li key={i} style={{ fontSize: 13, lineHeight: 1.5, paddingBottom: 10, borderBottom: i < data.satisfaction.comments.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ color: '#B45309', fontWeight: 700 }}>{'★'.repeat(cm.rating)}<span style={{ color: C.border }}>{'★'.repeat(5 - cm.rating)}</span></div>
                      <div style={{ color: C.text }}>{cm.comment}</div>
                      <div style={{ color: C.textLight, fontSize: 12 }}>{new Date(cm.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{cm.platform ? ` · ${cm.platform === 'mobile' ? 'Mobile app' : 'Web'}` : ''}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Credit by country" subtitle="Each country in its own currency">
          <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>Country</th>
                  <th style={th}>Total limit</th>
                  <th style={th}>Used</th>
                  <th style={{ ...th, textAlign: 'left', paddingLeft: 20 }}>Utilisation</th>
                  <th style={th}>Avg requested</th>
                  <th style={th}>Avg approved</th>
                </tr>
              </thead>
              <tbody>
                {data.creditByCountry.map(r => (
                  <tr key={r.country}>
                    <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}><CountryLabel code={r.country} /></td>
                    <td style={td}>{money(r.country, r.limit)}</td>
                    <td style={td}>{money(r.country, r.used)}</td>
                    <td style={{ ...td, textAlign: 'left', paddingLeft: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 90, height: 8, borderRadius: 4, background: C.bg, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(r.utilisation ?? 0, 100)}%`, height: '100%', background: (r.utilisation ?? 0) > 80 ? STATUS_COLORS.bad : CYAN_DEEP }} />
                        </div>
                        <span style={{ fontWeight: 700 }}>{r.utilisation == null ? '—' : `${r.utilisation.toFixed(1)}%`}</span>
                      </div>
                    </td>
                    <td style={td}>{money(r.country, r.avgRequested)}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{money(r.country, r.avgApproved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </AdminLayout>
  )
}
