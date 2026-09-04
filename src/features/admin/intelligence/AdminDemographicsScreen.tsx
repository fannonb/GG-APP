import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useAdminDemographics } from '@/hooks/api/useAdminIntelligenceQueries'

export function AdminDemographicsScreen() {
  const { data, isLoading } = useAdminDemographics()

  if (isLoading || !data) {
    return (
      <AdminLayout title="Membership Demographics">
        <GGCard padding="28px">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: C.textSub, fontFamily: font.family }}>
            Loading demographics and actuarial profiling...
          </div>
        </GGCard>
      </AdminLayout>
    )
  }

  const totalPopulation = data.totalRegisteredMembers + data.totalBeneficiaries

  return (
    <AdminLayout title="Membership Demographics">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Top Banner */}
        <div style={{
          background: `linear-gradient(135deg, #091C44 0%, #16367A 100%)`,
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
              Actuarial & Membership Profiling
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Demographic Structure & Beneficiary Analysis
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.72)', maxWidth: '580px', lineHeight: 1.5 }}>
              Five-band age stratification across principal applicants and dependents, gender profiles, and disease prevalence correlation for insurance risk analysis.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Total Covered Lives</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{totalPopulation.toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Applicant : Beneficiary</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: C.blue400, marginTop: '2px' }}>{data.applicantToBeneficiaryRatio}</div>
            </div>
          </div>
        </div>

        {/* High-Level Demographic Split Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <GGCard padding="20px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Principal Applicants</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: C.navy800, marginTop: '6px' }}>{data.totalRegisteredMembers.toLocaleString()}</div>
            <div style={{ fontSize: '11.5px', color: C.textLight, marginTop: '4px' }}>Account holders & primary plan members</div>
          </GGCard>

          <GGCard padding="20px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Registered Beneficiaries</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: C.blue500, marginTop: '6px' }}>{data.totalBeneficiaries.toLocaleString()}</div>
            <div style={{ fontSize: '11.5px', color: C.textLight, marginTop: '4px' }}>Children, spouses, and extended dependents</div>
          </GGCard>

          <GGCard padding="20px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gender Profile</div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '8px' }}>
              <div>
                <span style={{ fontSize: '20px', fontWeight: 800, color: C.navy800 }}>{data.overallGenderSplit.female}%</span>
                <div style={{ fontSize: '11px', color: C.textSub }}>Female</div>
              </div>
              <div style={{ width: '1px', height: '24px', background: C.border }} />
              <div>
                <span style={{ fontSize: '20px', fontWeight: 800, color: C.blue500 }}>{data.overallGenderSplit.male}%</span>
                <div style={{ fontSize: '11px', color: C.textSub }}>Male</div>
              </div>
              <div style={{ width: '1px', height: '24px', background: C.border }} />
              <div>
                <span style={{ fontSize: '20px', fontWeight: 800, color: C.textLight }}>{data.overallGenderSplit.other}%</span>
                <div style={{ fontSize: '11px', color: C.textSub }}>Other</div>
              </div>
            </div>
            <div style={{ marginTop: '12px', height: '6px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${data.overallGenderSplit.female}%`, background: C.navy800 }} />
              <div style={{ width: `${data.overallGenderSplit.male}%`, background: C.blue500 }} />
              <div style={{ width: `${data.overallGenderSplit.other}%`, background: C.border }} />
            </div>
          </GGCard>
        </div>

        {/* 5-Age Band Stratification Table */}
        <GGCard padding="24px">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
              Five-Band Age Profiling & Disease Prevalence
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSub }}>
              Comparative breakdown across pediatric (&lt;18), young adult (19–24), prime family (25–34), workforce (35–50), and senior (51+) cohorts.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}`, color: C.textSub, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>Age Band Bracket</th>
                  <th style={{ padding: '10px 12px' }}>Cohort Classification</th>
                  <th style={{ padding: '10px 12px' }}>Principal Applicants</th>
                  <th style={{ padding: '10px 12px' }}>Beneficiaries (Dependents)</th>
                  <th style={{ padding: '10px 12px' }}>Gender Split (M / F)</th>
                  <th style={{ padding: '10px 12px' }}>Prevalent Health Conditions</th>
                  <th style={{ padding: '10px 12px' }}>Actuarial Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {data.ageBands.map((band, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: C.navy800 }}>{band.band}</td>
                    <td style={{ padding: '12px', color: C.textSub }}>{band.rangeLabel}</td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{band.applicantsCount.toLocaleString()}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: C.blue500 }}>{band.beneficiariesCount.toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '12px' }}>{band.malePercentage}% M / {band.femalePercentage}% F</span>
                    </td>
                    <td style={{ padding: '12px', color: C.text, fontWeight: 600 }}>{band.topCondition}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: band.riskLevel === 'Very High' ? 'rgba(239, 68, 68, 0.1)' : band.riskLevel === 'High' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: band.riskLevel === 'Very High' ? '#EF4444' : band.riskLevel === 'High' ? '#F59E0B' : '#10B981',
                      }}>
                        {band.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GGCard>

        {/* Visual Age Band Distribution Bar */}
        <GGCard padding="24px">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
              Total Covered Population by Age Bracket
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSub }}>
              Combined applicant and dependent enrollment density across each demographic band.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.ageBands.map((band, idx) => {
              const totalInBand = band.applicantsCount + band.beneficiariesCount
              const pct = Math.round((totalInBand / totalPopulation) * 100)
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: C.text }}>{band.band} ({band.rangeLabel})</span>
                    <span style={{ color: C.textSub }}><strong>{totalInBand.toLocaleString()}</strong> lives ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', background: C.bg, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: idx % 2 === 0 ? C.navy800 : C.blue500, borderRadius: '4px' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </GGCard>

      </div>
    </AdminLayout>
  )
}
