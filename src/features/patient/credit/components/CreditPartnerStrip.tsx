import { C, font, radius, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { FINANCE_PARTNER_SUMMARIES } from '../credit.constants'
import { FinancePartnerLogo } from './FinancePartnerLogos'

export function CreditPartnerStrip() {
  const { isMobile } = useResponsive()

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', fontFamily: font.family }}>
          Choose your finance partner
        </div>
        <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
          GG'APP works with licensed partners — you'll pick one during your application
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '14px',
      }}>
        {FINANCE_PARTNER_SUMMARIES.map(partner => (
          <div
            key={partner.id}
            style={{
              padding: '0',
              background: C.surface,
              borderRadius: radius.lg,
              border: `1px solid ${partner.accentBorder}`,
              boxShadow: shadow.sm,
              overflow: 'hidden',
            }}
          >
            <div style={{
              height: 88,
              padding: '14px 20px',
              background: '#fff',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FinancePartnerLogo partnerId={partner.id} />
            </div>
            <div style={{ padding: '16px 20px 18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>
                {partner.name}
              </div>
              <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.6, marginTop: '4px', fontFamily: font.family }}>
                {partner.tagline}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '12px',
                padding: '4px 10px',
                borderRadius: radius.full,
                background: partner.accentBg,
                border: `1px solid ${partner.accentBorder}`,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke={partner.accent} strokeWidth="1.2" />
                  <path d="M6 3.5v2.5l1.5 1.5" stroke={partner.accent} strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: '11px', fontWeight: 700, color: partner.accent }}>
                  Approval in {partner.processingTime}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
