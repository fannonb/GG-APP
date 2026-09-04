import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminAnalytics, useAdminProviders, useAdminUsers } from '@/hooks/api/useAdminQueries'
import { ROUTES } from '@/router/routes'
import { CountryBadge, countryCode, COUNTRY_CURRENCIES } from '@/features/admin/AdminShared'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'

const COUNTRY_GRADIENTS: Record<string, string> = {
  Zimbabwe: '#091C44',
  Kenya: '#12244F',
  Zambia: '#1A2F5E',
}

function formatVol(value: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

const COUNTRIES = ['Zimbabwe', 'Kenya', 'Zambia'] as const

export function AdminAnalyticsScreen() {
  const { isMobile } = useResponsive()
  const navigate = useNavigate()
  const { country } = useAdminCountry()
  const analyticsQuery = useAdminAnalytics()
  const usersQuery = useAdminUsers()
  const providersQuery = useAdminProviders()

  const analytics = analyticsQuery.data
  const users = usersQuery.data ?? []
  const providers = providersQuery.data ?? []
  const isLoading = analyticsQuery.isLoading || usersQuery.isLoading || providersQuery.isLoading
  const isError = analyticsQuery.isError || usersQuery.isError || providersQuery.isError
  const errorMessage =
    (analyticsQuery.error instanceof Error && analyticsQuery.error.message) ||
    (usersQuery.error instanceof Error && usersQuery.error.message) ||
    (providersQuery.error instanceof Error && providersQuery.error.message) ||
    'Unable to load analytics data.'

  const countryStats = useMemo(() => {
    return COUNTRIES.map(countryName => {
      const patients = users.filter(user => user.country === countryName).length
      const countryProviders = providers.filter(provider => provider.country === countryName)
      const volume = countryProviders.reduce((sum, provider) => sum + provider.totalEarnings, 0)
      const currency = countryName === 'Kenya' ? 'KES' : countryName === 'Zambia' ? 'ZMW' : 'ZWG'
      const currencySymbol = COUNTRY_CURRENCIES[countryName] ?? 'Z$'

      return {
        country: countryName,
        code: countryName === 'Kenya' ? 'KE' : countryName === 'Zambia' ? 'ZM' : 'ZW',
        currency,
        currencySymbol,
        patients,
        providers: countryProviders.length,
        volume,
      }
    })
  }, [providers, users])

  const scopedStats = country === 'all'
    ? countryStats
    : countryStats.filter(stat => stat.country === country)

  const scopedProviders = country === 'all'
    ? providers
    : providers.filter(provider => provider.country === country)

  const totalPatients = scopedStats.reduce((sum, stat) => sum + stat.patients, 0)
  const totalProviders = scopedStats.reduce((sum, stat) => sum + stat.providers, 0)
  const totalVolume = scopedStats.reduce((sum, stat) => sum + stat.volume, 0)
  const countryStat = scopedStats[0]
  const volumeLabel = country === 'all'
    ? 'Multi-currency'
    : `${countryStat?.currencySymbol ?? ''}${formatVol(totalVolume)}`
  const volumeSubLabel = country === 'all' ? 'see country breakdown below' : 'all-time provider earnings'

  const topProviders = [...scopedProviders]
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, 5)

  if (isLoading && !analytics) {
    return (
      <AdminLayout title="Analytics">
        <GGCard padding="28px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center', color: C.textSub }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.blue500, animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Loading analytics...</div>
          </div>
        </GGCard>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    )
  }

  if (isError && !analytics) {
    return (
      <AdminLayout title="Analytics">
        <GGCard padding="28px" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>Analytics unavailable</div>
            <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>{errorMessage}</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <GGButton variant="primary" size="sm" onClick={() => { void analyticsQuery.refetch(); void usersQuery.refetch(); void providersQuery.refetch() }}>
                Retry
              </GGButton>
              <GGButton variant="secondary" size="sm" onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}>
                Back to dashboard
              </GGButton>
            </div>
          </div>
        </GGCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Analytics">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '14px' }}>
          {[
            { label: 'Total Patients', val: totalPatients.toLocaleString(), color: C.blue500, sub: country === 'all' ? 'registered platform-wide' : `registered in ${country}` },
            { label: 'Total Providers', val: totalProviders.toString(), color: C.text, sub: country === 'all' ? 'across 3 countries' : `active in ${country}` },
            { label: country === 'all' ? 'Platform Volume' : `${country} Volume`, val: volumeLabel, color: C.blue500, sub: volumeSubLabel },
            { label: 'Countries Active', val: country === 'all' ? countryStats.filter(stat => stat.providers > 0 || stat.patients > 0).length.toString() : '1', color: C.navy800, sub: country === 'all' ? 'Zimbabwe | Kenya | Zambia' : country },
          ].map(item => (
            <GGCard key={item.label} padding="18px" style={{ background: '#fff' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', lineHeight: 1.4 }}>{item.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: item.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{item.val}</div>
              <div style={{ fontSize: '11px', color: C.textLight, marginTop: '5px' }}>{item.sub}</div>
            </GGCard>
          ))}
        </div>

        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '14px' }}>
            {country === 'all' ? 'Country Breakdown' : `${country} Breakdown`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${scopedStats.length},1fr)`, gap: '14px' }}>
            {scopedStats.map(stat => (
              <GGCard key={stat.country} padding="0" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', background: COUNTRY_GRADIENTS[stat.country] ?? C.navy800, color: '#fff' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <CountryBadge code={countryCode(stat.country)} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em' }}>{stat.country}</div>
                  <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>{stat.currency} | {stat.currencySymbol}</div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {[
                      { label: 'Patients', val: stat.patients.toLocaleString(), color: C.blue500 },
                      { label: 'Providers', val: stat.providers.toString(), color: C.text },
                      { label: 'Volume', val: stat.currencySymbol + formatVol(stat.volume), color: C.blue500 },
                    ].map(item => (
                      <div key={item.label} style={{ padding: '10px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: item.color }}>{item.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </GGCard>
            ))}
          </div>
        </div>

        <GGCard padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Top Providers by Earnings</div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>
                {country === 'all' ? 'All-time rankings' : `All-time rankings in ${country}`}
              </div>
            </div>
            <span onClick={() => navigate(ROUTES.ADMIN_PROVIDERS)} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>View all {'->'}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {['#', 'Provider', 'Type', 'Country', 'Patients', 'Earnings'].map(header => (
                    <th key={header} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProviders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>
                      No provider earnings data available yet.
                    </td>
                  </tr>
                ) : topProviders.map((provider, index) => {
                  const currSym = provider.country === 'Kenya' ? 'Ksh.' : provider.country === 'Zambia' ? 'ZK' : 'Z$'
                  return (
                    <tr key={provider.id} style={{ borderBottom: index < topProviders.length - 1 ? `1px solid ${C.border}` : 'none' }}
                      onMouseEnter={event => (event.currentTarget.style.background = C.bg)}
                      onMouseLeave={event => (event.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : C.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 800, color: index < 3 ? '#fff' : C.textSub,
                        }}>
                          {index + 1}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{provider.name}</div>
                        <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px' }}>{provider.license}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: C.textSub, whiteSpace: 'nowrap' }}>{provider.type}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <CountryBadge code={countryCode(provider.country)} showName name={provider.country} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: C.text }}>{provider.totalPatients}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 800, color: C.blue500, whiteSpace: 'nowrap' }}>
                        {currSym}{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(provider.totalEarnings)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GGCard>
      </div>
    </AdminLayout>
  )
}
