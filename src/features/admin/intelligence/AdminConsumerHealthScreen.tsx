import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useAdminConsumerHealth } from '@/hooks/api/useAdminIntelligenceQueries'

export function AdminConsumerHealthScreen() {
  const { data, isLoading } = useAdminConsumerHealth()

  if (isLoading || !data) {
    return (
      <AdminLayout title="Consumer Health & Satisfaction">
        <GGCard padding="28px">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: C.textSub, fontFamily: font.family }}>
            Loading consumer health and satisfaction metrics...
          </div>
        </GGCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Consumer Health & Satisfaction">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Top Banner */}
        <div style={{
          background: `linear-gradient(135deg, #091C44 0%, #153272 100%)`,
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
              Customer Behavioral Insights
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Consumer Health & Experience Analytics
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.72)', maxWidth: '580px', lineHeight: 1.5 }}>
              Tracking member satisfaction, preferred healthcare providers from patient ratings, out-of-pocket health spending patterns, and repayment preferences.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Customer Satisfaction</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{data.csatPercentage}%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Net Promoter Score</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>+{data.npsScore}</div>
            </div>
          </div>
        </div>

        {/* Member Satisfaction Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Verified Reviews Analyzed</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: C.navy800, marginTop: '6px' }}>{data.totalReviews.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Post-appointment & prescription feedback</div>
          </GGCard>

          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>NPS Cohort Grade</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>World-Class</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Benchmark for regional digital health apps</div>
          </GGCard>

          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Repeat Provider Rate</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: C.blue500, marginTop: '6px' }}>78.4%</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Members rebooking same family clinic</div>
          </GGCard>
        </div>

        {/* Most Preferred Providers by Customer Reviews */}
        <GGCard padding="24px">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
              Most Preferred Healthcare Providers (Ranked by Customer Reviews)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSub }}>
              Top facilities selected by members based on clinical outcome sentiment and promptness.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}`, color: C.textSub, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>Provider Name</th>
                  <th style={{ padding: '10px 12px' }}>Facility Category</th>
                  <th style={{ padding: '10px 12px' }}>Average Rating</th>
                  <th style={{ padding: '10px 12px' }}>Review Count</th>
                  <th style={{ padding: '10px 12px' }}>Customer Preference Driver</th>
                </tr>
              </thead>
              <tbody>
                {data.topProvidersByRating.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: C.navy800 }}>{p.name}</td>
                    <td style={{ padding: '12px', color: C.textSub }}>{p.category}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#F59E0B' }}>
                        ★ {p.rating}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{p.reviews.toLocaleString()} reviews</td>
                    <td style={{ padding: '12px', color: C.text, fontSize: '12.5px' }}>{p.preferredFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GGCard>

        {/* Health Spending Habits & Out-of-Pocket Patterns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          <GGCard padding="22px">
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.text }}>
              Financial Spending Habits & Patterns on Health
            </h3>
            <p style={{ margin: '4px 0 16px', fontSize: '12px', color: C.textSub }}>
              Where members spend their healthcare wallet and out-of-pocket budget.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {data.spendingPatterns.map((cat, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: C.text }}>{cat.channel}</span>
                    <span style={{ color: C.textSub }}><strong>{cat.percentage}%</strong> (Avg ${cat.avgTicketUsd})</span>
                  </div>
                  <div style={{ height: '7px', background: C.bg, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${cat.percentage}%`, height: '100%', background: C.navy800, borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </GGCard>

          <GGCard padding="22px">
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.text }}>
              Repayment & Settlement Channel Preferences
            </h3>
            <p style={{ margin: '4px 0 16px', fontSize: '12px', color: C.textSub }}>
              Financing settlement channels preferred by members across Kenya and Zimbabwe.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {data.repaymentPreferences.map((rep, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: C.text }}>{rep.method}</span>
                    <span style={{ color: C.textSub }}><strong>{rep.share}%</strong> ({rep.growth})</span>
                  </div>
                  <div style={{ height: '7px', background: C.bg, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${rep.share}%`, height: '100%', background: idx === 0 ? '#10B981' : C.blue500, borderRadius: '4px' }} />
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
