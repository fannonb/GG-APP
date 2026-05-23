import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGBadge, StarRating } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { MOCK_PROVIDERS } from '@/mock/patient.mock'

export function ProviderListScreen() {
  const navigate = useNavigate()
  const { category = 'doctor' } = useParams<{ category: string }>()
  const [filter, setFilter] = useState('all')

  const catName = category.charAt(0).toUpperCase() + category.slice(1)
  const filtered = MOCK_PROVIDERS.filter(p => filter === 'open' ? p.status === 'open' : true).slice(0, 6)

  return (
    <AppLayout title={`${catName}s Near You`} subtitle={`${MOCK_PROVIDERS.filter(p => p.category === category).length} verified providers found`} back notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'open', 'top-rated', 'nearest'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '7px 16px', borderRadius: radius.full, border: `1.5px solid ${filter === f ? C.blue500 : C.border}`, background: filter === f ? C.blue100 : '#fff', color: filter === f ? C.blue500 : C.textSub, fontSize: '13px', fontWeight: filter === f ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.15s' }}>
              {f === 'all' ? 'All Providers' : f === 'open' ? 'Open Now' : f === 'top-rated' ? 'Top Rated' : 'Nearest First'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <GGCard padding="48px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: C.textSub }}>No {catName.toLowerCase()} providers found in your area.</div>
            <GGButton variant="secondary" size="sm" onClick={() => navigate('/app/services')} style={{ marginTop: '16px' }}>Browse Other Categories</GGButton>
          </GGCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filtered.map(p => (
              <GGCard key={p.id} padding="20px" onClick={() => navigate(`/app/services/provider/${p.id}`, { state: { provider: p } })}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '14px', background: `linear-gradient(135deg, ${C.blue100}, ${C.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{p.name[0]}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{p.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5C4.07 1.5 2.5 3.07 2.5 5c0 2.5 3.5 6 3.5 6s3.5-3.5 3.5-6c0-1.93-1.57-3.5-3.5-3.5z" stroke={C.textSub} strokeWidth="1.1"/><circle cx="6" cy="5" r="1.5" stroke={C.textSub} strokeWidth="1.1"/></svg>
                          <span style={{ fontSize: '12px', color: C.textSub }}>{p.address}</span>
                        </div>
                      </div>
                      <GGBadge type={p.status === 'open' ? 'open' : 'closed'}>{p.status}</GGBadge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <StarRating rating={p.rating} count={p.reviews} />
                      <span style={{ fontSize: '12px', color: C.textSub, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke={C.textSub} strokeWidth="1.1"/><path d="M6 3.5v2.5l1.5 1.5" stroke={C.textSub} strokeWidth="1.1" strokeLinecap="round"/></svg>
                        {p.hours}
                      </span>
                      <span style={{ fontSize: '12px', color: C.textSub }}>{p.distance}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {p.services.slice(0, 3).map(s => <span key={s} style={{ fontSize: '11px', color: C.textSub, background: C.bg, border: `1px solid ${C.border}`, padding: '3px 10px', borderRadius: radius.full, fontFamily: font.family }}>{s}</span>)}
                    </div>
                  </div>
                </div>
              </GGCard>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
