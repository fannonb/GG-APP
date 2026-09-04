import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useAdminFinancialHighlights } from '@/hooks/api/useAdminIntelligenceQueries'

export function AdminFinancialsInflationScreen() {
  const { data, isLoading } = useAdminFinancialHighlights()

  if (isLoading || !data) {
    return (
      <AdminLayout title="Financial Highlights & Medical Inflation">
        <GGCard padding="28px">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: C.textSub, fontFamily: font.family }}>
            Loading financial metrics and medical inflation index...
          </div>
        </GGCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Financial Highlights & Medical Inflation">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Top Banner */}
        <div style={{
          background: `linear-gradient(135deg, #091C44 0%, #0F2D6B 100%)`,
          borderRadius: radius.lg,
          padding: '24px 28px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.blue400, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
              Commercial & Actuarial Index
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Financial Highlights & Medical Inflation Observatory
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.72)', maxWidth: '580px', lineHeight: 1.5 }}>
              Platform GMV, advertising and commercial lines, credit threshold demand, and medical inflation benchmarking against headline CPI.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Gross Healthcare Volume</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>${(data.totalGrossMerchandiseValueUsd / 1000000).toFixed(2)}M</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>App Advertising & Comms</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: C.blue400, marginTop: '2px' }}>${data.appAdvertisingRevenueUsd.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Financial Flow KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Provider Claims Settled</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: C.navy800, marginTop: '6px' }}>${(data.providerPayoutsUsd / 1000000).toFixed(2)}M</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Direct clinical & pharmacy payouts</div>
          </GGCard>

          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform Net Commission</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>${data.netPlatformCommissionUsd.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Take-rate across financing & bookings</div>
          </GGCard>

          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Predictive Run-Rate</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: C.blue500, marginTop: '6px' }}>${(data.aiPredictiveAnnualizedRunrateUsd / 1000000).toFixed(2)}M</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Projected 12-month platform throughput</div>
          </GGCard>
        </div>

        {/* MEDICAL INFLATION COMPARATOR (Key requirement from datapoints.md) */}
        <div style={{
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          borderRadius: radius.lg,
          border: '1px solid #FDE68A',
          padding: '24px 28px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-block', background: '#F59E0B', color: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Actuarial Watchdog
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#78350F' }}>
                Medical Inflation vs. National Headline CPI
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#92400E', maxWidth: '640px', lineHeight: 1.5 }}>
                General inflation across Kenya and the region averaged 4–5% through 2025/2026. However, medical cost inflation in our ecosystem is currently tracking at <strong>{data.medicalInflationHeadlineRate}%</strong>, exceeding headline inflation by <strong>+{data.inflationSpreadDifference} percentage points</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '12px', border: '1px solid #FCD34D', textAlign: 'center' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>Medical Inflation</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#B45309' }}>{data.medicalInflationHeadlineRate}%</div>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#92400E' }}>vs</div>
              <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '12px', border: '1px solid #FCD34D', textAlign: 'center' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase' }}>Headline CPI</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: C.text }}>{data.nationalCpiInflationRate}%</div>
              </div>
            </div>
          </div>

          {/* 5 Inflation Drivers Table */}
          <div style={{ marginTop: '20px', background: '#FFFFFF', borderRadius: '12px', padding: '16px', overflowX: 'auto', border: '1px solid #FDE68A' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #FEF3C7', color: '#92400E', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '8px 10px' }}>Medical Cost Driver</th>
                  <th style={{ padding: '8px 10px' }}>Current Inflation</th>
                  <th style={{ padding: '8px 10px' }}>CPI Benchmark</th>
                  <th style={{ padding: '8px 10px' }}>Spread Variance</th>
                  <th style={{ padding: '8px 10px' }}>Key Culprit / Driver</th>
                  <th style={{ padding: '8px 10px' }}>Actuarial Impact Summary</th>
                </tr>
              </thead>
              <tbody>
                {data.inflationDrivers.map((driver, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #FEF3C7' }}>
                    <td style={{ padding: '10px', fontWeight: 700, color: C.text }}>{driver.factor}</td>
                    <td style={{ padding: '10px', fontWeight: 800, color: '#B45309' }}>{driver.inflationRate}%</td>
                    <td style={{ padding: '10px', color: C.textSub }}>{driver.benchmarkRate}%</td>
                    <td style={{ padding: '10px', fontWeight: 800, color: '#EF4444' }}>+{driver.variance}%</td>
                    <td style={{ padding: '10px', fontWeight: 600, color: C.navy800 }}>{driver.primaryDriver}</td>
                    <td style={{ padding: '10px', color: C.textSub, fontSize: '11.5px' }}>{driver.impactSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Credit Thresholds & Repayment Channel Preferences */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Credit Threshold Ranges */}
          <GGCard padding="22px">
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.text }}>
              Annual Credit Threshold Ranges Applied For
            </h3>
            <p style={{ margin: '4px 0 16px', fontSize: '12px', color: C.textSub }}>
              Distribution of requested medical financing credit limits.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.creditThresholdsApplied.map((tier, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: C.text }}>{tier.range}</span>
                    <span style={{ color: C.textSub }}>{tier.volume} ({tier.share}%)</span>
                  </div>
                  <div style={{ height: '7px', background: C.bg, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${tier.share}%`, height: '100%', background: C.navy800, borderRadius: '4px' }} />
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#10B981', marginTop: '2px', fontWeight: 600 }}>Default Risk: {tier.defaultRisk}</div>
                </div>
              ))}
            </div>
          </GGCard>

          {/* Repayment Channel Preferences */}
          <GGCard padding="22px">
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.text }}>
              Preferred Loan Repayment Channels
            </h3>
            <p style={{ margin: '4px 0 16px', fontSize: '12px', color: C.textSub }}>
              Customer-preferred settlement and installment debit methods.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.repaymentChannelPreferences.map((channel, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: C.text }}>{channel.method}</span>
                    <span style={{ color: C.textSub }}><strong>{channel.share}%</strong> ({channel.growth})</span>
                  </div>
                  <div style={{ height: '7px', background: C.bg, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${channel.share}%`, height: '100%', background: idx === 0 ? '#10B981' : C.blue500, borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </GGCard>
        </div>

      </div>
    </AdminLayout>
  )
}
