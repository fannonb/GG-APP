import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGBadge, GGAvatar, StarRating } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { MOCK_PROVIDERS } from '@/mock/patient.mock'
import type { Provider } from '@/types/provider.types'

const reviews = [
  { name: 'Michael T.', date: '12 May 2026', rating: 5, text: "Excellent service. Dr. Ndlovu was very thorough and the waiting time was minimal." },
  { name: 'Grace M.', date: '8 May 2026',   rating: 4, text: "Clean facility, friendly staff. GG'APP payment made it very easy." },
  { name: 'David K.', date: '2 May 2026',   rating: 5, text: "Very professional. Highly recommend for anyone needing a good GP." },
]

export function ProviderProfileScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { id } = useParams<{ id: string }>()
  const { state } = useLocation() as { state?: { provider?: Provider } }
  const p = state?.provider ?? MOCK_PROVIDERS.find(x => x.id === Number(id)) ?? MOCK_PROVIDERS[0]

  return (
    <AppLayout title={p.name} subtitle={p.address} back notifCount={1}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', alignItems: 'start', fontFamily: font.family }}>

        {/* Main info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <GGCard padding="28px">
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ width: 72, height: 72, borderRadius: '18px', background: `linear-gradient(135deg, ${C.blue100}, ${C.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, flexShrink: 0 }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{p.name[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{p.name}</div>
                    <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px', textTransform: 'capitalize' }}>{p.category} · {p.address}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <GGBadge type={p.status === 'open' ? 'open' : 'closed'}>{p.status}</GGBadge>
                    <GGBadge type="info">Verified</GGBadge>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <StarRating rating={p.rating} count={p.reviews} />
                  <span style={{ fontSize: '13px', color: C.textSub }}>{p.phone}</span>
                  <span style={{ fontSize: '13px', color: C.textSub }}>{p.hours}</span>
                </div>
              </div>
            </div>
          </GGCard>

          <GGCard padding="24px">
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '12px' }}>About Us</div>
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.7, marginBottom: '16px', fontFamily: font.family }}>
              City Medical Centre is a multi-disciplinary outpatient facility serving Harare since 2009. Our team of experienced GPs, nurses and allied health professionals provides evidence-based primary care for individuals and families in a clean, professional environment.
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { label: 'Established 2009', icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="10" rx="1.5" stroke={C.blue500} strokeWidth="1.2"/><path d="M1 6h12" stroke={C.blue500} strokeWidth="1.1"/><line x1="4" y1="2" x2="4" y2="4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/><line x1="10" y1="2" x2="10" y2="4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/></svg> },
                { label: 'English · Shona',   icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={C.blue500} strokeWidth="1.2"/><path d="M7 1.5c-2 1.5-3 3.2-3 5.5s1 4 3 5.5" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/><path d="M7 1.5c2 1.5 3 3.2 3 5.5s-1 4-3 5.5" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/><path d="M1.5 7h11" stroke={C.blue500} strokeWidth="1.1"/></svg> },
                { label: `Lic: ${p.license ?? 'MCZ-2019-04821'}`, icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3.5v4c0 3 2.2 5.3 5 5.8 2.8-.5 5-2.8 5-5.8v-4L7 1z" stroke={C.blue500} strokeWidth="1.2" fill="none"/><path d="M4.5 7l2 2 3-3" stroke={C.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
              ].map(item => (
                <div key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: radius.full, background: C.blue100, border: `1px solid rgba(74,173,223,0.2)`, fontSize: '12px', color: C.blue500, fontFamily: font.family, fontWeight: 600 }}>
                  {item.icon}{item.label}
                </div>
              ))}
            </div>
          </GGCard>

          <GGCard padding="24px">
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Services Offered</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {p.services.map(s => (
                <div key={s} style={{ padding: '8px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.full, fontSize: '13px', color: C.text, fontWeight: 500, fontFamily: font.family }}>{s}</div>
              ))}
            </div>
          </GGCard>

          <GGCard padding="24px">
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Patient Reviews</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {reviews.map((r, i) => (
                <div key={i} style={{ padding: '16px 0', borderBottom: i < reviews.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <GGAvatar name={r.name} size={32} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{r.name}</div>
                        <div style={{ fontSize: '11px', color: C.textSub }}>{r.date}</div>
                      </div>
                    </div>
                    <StarRating rating={r.rating} />
                  </div>
                  <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>{r.text}</div>
                </div>
              ))}
            </div>
          </GGCard>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GGCard padding="24px" style={{ position: isMobile ? 'static' : 'sticky', top: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Request Appointment</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Status',   val: <GGBadge type={p.status === 'open' ? 'open' : 'closed'}>{p.status}</GGBadge> },
                { label: 'Distance', val: p.distance },
                { label: 'Hours',    val: p.hours },
                { label: 'Phone',    val: <span style={{ color: C.blue500 }}>{p.phone}</span> },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '13px', color: C.textSub }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, textAlign: 'right', maxWidth: '140px' }}>{item.val}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, marginBottom: '16px', fontSize: '12px', color: '#1A5D8A', lineHeight: 1.5 }}>
              GG'APP credit accepted. No upfront payment required at this provider.
            </div>
            <GGButton variant="primary" size="md" fullWidth onClick={() => navigate('/app/booking', { state: { provider: p } })}>
              Engage Provider →
            </GGButton>
          </GGCard>
        </div>
      </div>
    </AppLayout>
  )
}
