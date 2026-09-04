import { useState } from 'react'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useAdminDiseaseBurden } from '@/hooks/api/useAdminIntelligenceQueries'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'

export function AdminDiseaseBurdenScreen() {
  const { country } = useAdminCountry()
  const { data, isLoading } = useAdminDiseaseBurden()
  const [selectedCounty, setSelectedCounty] = useState<string>('all')
  const [acuityFilter, setAcuityFilter] = useState<'all' | 'acute' | 'chronic' | 'specialized'>('all')

  if (isLoading || !data) {
    return (
      <AdminLayout title="Disease Burden Intelligence">
        <GGCard padding="28px">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: C.textSub, fontFamily: font.family }}>
            Loading health intelligence data...
          </div>
        </GGCard>
      </AdminLayout>
    )
  }

  const filteredCounties = data.countyBurdenList.filter(c => {
    if (country === 'Kenya' && c.country !== 'Kenya') return false
    if (country === 'Zimbabwe' && c.country !== 'Zimbabwe') return false
    if (selectedCounty !== 'all' && c.county !== selectedCounty) return false
    return true
  })

  const filteredCategories = data.topDiseaseCategories.filter(cat => {
    if (acuityFilter === 'all') return true
    return cat.acuteOrChronic === acuityFilter
  })

  return (
    <AdminLayout title="Disease Burden Intelligence">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Top Summary Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${C.navy800} 0%, #102A6B 100%)`,
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
              Strategic Health Intelligence
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Epidemiological & Disease Burden Intelligence
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.72)', maxWidth: '580px', lineHeight: 1.5 }}>
              Real-time epidemiological analysis tracking clinical diagnoses, patient volumes, day vs. night care-seeking behaviors, and cross-provider treatment tariff benchmarks.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Monthly Patients Treated</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>{data.monthlyPatientsTreated.toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Annualized Run-Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: C.blue400, marginTop: '2px' }}>{data.annualizedPatientsTreated.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Acuity & Burden Split Matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acute Disease Burden</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#EF4444', marginTop: '6px' }}>{data.acuteBurdenPercentage}%</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Malaria, Acute Respiratory, Trauma</div>
            <div style={{ marginTop: '10px', height: '6px', background: C.border, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${data.acuteBurdenPercentage}%`, height: '100%', background: '#EF4444' }} />
            </div>
          </GGCard>

          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chronic Disease Burden</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: C.navy800, marginTop: '6px' }}>{data.chronicBurdenPercentage}%</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Hypertension, Type 2 Diabetes</div>
            <div style={{ marginTop: '10px', height: '6px', background: C.border, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${data.chronicBurdenPercentage}%`, height: '100%', background: C.navy800 }} />
            </div>
          </GGCard>

          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Maternal Health Cases</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>{data.maternalPercentage}%</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Prenatal, Ultrasound, Midwife Reviews</div>
            <div style={{ marginTop: '10px', height: '6px', background: C.border, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${data.maternalPercentage}%`, height: '100%', background: '#10B981' }} />
            </div>
          </GGCard>

          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Child Health Cases</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#F59E0B', marginTop: '6px' }}>{data.pediatricPercentage}%</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Under-5 Vaccinations, Nutrition</div>
            <div style={{ marginTop: '10px', height: '6px', background: C.border, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${data.pediatricPercentage}%`, height: '100%', background: '#F59E0B' }} />
            </div>
          </GGCard>

          <GGCard padding="18px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mental Health Cases</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#8B5CF6', marginTop: '6px' }}>{data.mentalHealthPercentage}%</div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Depression, Anxiety, Consults</div>
            <div style={{ marginTop: '10px', height: '6px', background: C.border, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${data.mentalHealthPercentage}%`, height: '100%', background: '#8B5CF6' }} />
            </div>
          </GGCard>
        </div>

        {/* Day vs. Night Care-Seeking Pattern */}
        <GGCard padding="24px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
                Most Prevalent Treatment Times (Day vs. Night Seeking)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSub }}>
                Analysis of patient arrival and digital booking hours across 24-hour cycles.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.text }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.blue500 }} />
                Daytime (06:00 - 18:00): <strong>{data.daytimeTreatmentSeekingShare}%</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.text }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.navy800 }} />
                Nighttime (18:00 - 06:00): <strong>{data.nighttimeTreatmentSeekingShare}%</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '16px' }}>
            {data.peakTreatmentHours.map((slot, idx) => {
              const maxVol = 4000
              const heightPct = Math.min(100, Math.round((slot.volume / maxVol) * 100))
              return (
                <div key={idx} style={{ background: C.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '28px', height: `${heightPct}%`, background: idx === 1 ? C.blue500 : C.navy800, borderRadius: '6px 6px 0 0', transition: 'height 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: C.text }}>{slot.hour}</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: C.navy800, marginTop: '2px' }}>{slot.volume.toLocaleString()}</div>
                  <div style={{ fontSize: '9.5px', color: C.textLight, marginTop: '2px', lineHeight: 1.2 }}>{slot.label}</div>
                </div>
              )
            })}
          </div>
        </GGCard>

        {/* Top Disease Categories with Clinical Pathways & Avg Cost */}
        <GGCard padding="24px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
                Top Disease Categories & Treatment Pathway Benchmarks
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSub }}>
                Frequent clinical pathways, caseload volume, and average cost per encounter.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'acute', 'chronic', 'specialized'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setAcuityFilter(filter)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: acuityFilter === filter ? 700 : 500,
                    border: '1px solid',
                    borderColor: acuityFilter === filter ? C.navy800 : C.border,
                    background: acuityFilter === filter ? C.navy800 : 'transparent',
                    color: acuityFilter === filter ? '#FFFFFF' : C.text,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}`, color: C.textSub, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>Disease Category</th>
                  <th style={{ padding: '10px 12px' }}>Acuity Type</th>
                  <th style={{ padding: '10px 12px' }}>Monthly Cases</th>
                  <th style={{ padding: '10px 12px' }}>Share %</th>
                  <th style={{ padding: '10px 12px' }}>Average Cost</th>
                  <th style={{ padding: '10px 12px' }}>Standard Clinical Pathway</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: C.text }}>{cat.category}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: cat.acuteOrChronic === 'acute' ? 'rgba(239, 68, 68, 0.1)' : cat.acuteOrChronic === 'chronic' ? 'rgba(9, 28, 68, 0.08)' : 'rgba(16, 185, 129, 0.1)',
                        color: cat.acuteOrChronic === 'acute' ? '#EF4444' : cat.acuteOrChronic === 'chronic' ? C.navy800 : '#10B981',
                      }}>
                        {cat.acuteOrChronic}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{cat.cases.toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{cat.percentage}%</span>
                        <span style={{ fontSize: '10.5px', color: cat.trend.startsWith('+') ? '#EF4444' : '#10B981', fontWeight: 700 }}>{cat.trend}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 800, color: C.navy800 }}>${cat.avgCostUsd}</td>
                    <td style={{ padding: '12px', color: C.textSub, fontSize: '12px' }}>{cat.topPathway}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GGCard>

        {/* Regional Disease Burden by County */}
        <GGCard padding="24px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
                Regional & County Disease Burden Distribution
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSub }}>
                Geographic caseload distribution across counties and key provinces.
              </p>
            </div>
            <select
              value={selectedCounty}
              onChange={e => setSelectedCounty(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                background: '#FFFFFF',
                fontSize: '12.5px',
                fontFamily: font.family,
                color: C.text,
              }}
            >
              <option value="all">All Counties / Regions</option>
              {data.countyBurdenList.map(c => (
                <option key={c.county} value={c.county}>{c.county} ({c.country})</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}`, color: C.textSub, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>County / Region</th>
                  <th style={{ padding: '10px 12px' }}>Country</th>
                  <th style={{ padding: '10px 12px' }}>Patients Treated</th>
                  <th style={{ padding: '10px 12px' }}>Primary Health Condition</th>
                  <th style={{ padding: '10px 12px' }}>Acute / Chronic Ratio</th>
                  <th style={{ padding: '10px 12px' }}>Avg Visit Cost</th>
                  <th style={{ padding: '10px 12px' }}>Prevalent Seek Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredCounties.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: C.text }}>{c.county}</td>
                    <td style={{ padding: '12px' }}>{c.country}</td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{c.totalPatientsTreated.toLocaleString()}</td>
                    <td style={{ padding: '12px', color: C.navy800, fontWeight: 600 }}>{c.topCondition}</td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>
                      {c.acuteCases} acute / {c.chronicCases} chronic
                    </td>
                    <td style={{ padding: '12px', fontWeight: 800, color: C.navy800 }}>${c.avgCostPerVisit}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: C.textSub }}>{c.prevalentSeekTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GGCard>

        {/* Provider Utilization & Tariff Benchmarks */}
        <GGCard padding="24px">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
              Provider Utilization & Tariff Benchmarks
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSub }}>
              Cross-provider average cost of treatment comparisons by service and pathway.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}`, color: C.textSub, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>Provider Name</th>
                  <th style={{ padding: '10px 12px' }}>Facility Category</th>
                  <th style={{ padding: '10px 12px' }}>Location</th>
                  <th style={{ padding: '10px 12px' }}>Consultation Tariff</th>
                  <th style={{ padding: '10px 12px' }}>Malaria Pathway Cost</th>
                  <th style={{ padding: '10px 12px' }}>Diabetes Pathway Cost</th>
                  <th style={{ padding: '10px 12px' }}>Member Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.providerTariffBenchmarks.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: C.text }}>{p.providerName}</td>
                    <td style={{ padding: '12px', color: C.textSub }}>{p.category}</td>
                    <td style={{ padding: '12px' }}>{p.county}</td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>${p.consultationAvgCost}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: C.navy800 }}>${p.malariaPathwayCost}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: C.navy800 }}>${p.diabetesPathwayCost}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#F59E0B' }}>
                        ★ {p.patientSatisfactionScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GGCard>

      </div>
    </AdminLayout>
  )
}
