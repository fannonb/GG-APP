import { C, font, radius, shadow } from '@/design-system/tokens'
import { getFinancePartnerSummary } from '../credit.constants'
import { PARTNER_LOGOS, type PartnerLogoId } from '../partner-logos'

interface FinancePartnerLockedCardProps {
  partnerId: string
  subtitle?: string
}

export function FinancePartnerLockedCard({ partnerId, subtitle }: FinancePartnerLockedCardProps) {
  const partner = getFinancePartnerSummary(partnerId)
  if (!partner) return null

  const logoSrc = PARTNER_LOGOS[partnerId as PartnerLogoId]

  return (
    <div style={{
      background: '#fff',
      borderRadius: radius.lg,
      border: `1.5px solid ${partner.accentBorder}`,
      padding: '20px 22px',
      boxShadow: shadow.sm,
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: partner.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px', fontFamily: font.family }}>
        Your Finance Partner
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '14px 16px',
        background: partner.accentBg,
        borderRadius: radius.sm,
        border: `1px solid ${partner.accentBorder}`,
      }}>
        <div style={{
          width: 120,
          height: 56,
          borderRadius: radius.sm,
          background: '#fff',
          border: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: '10px 14px',
          boxSizing: 'border-box',
        }}>
          {logoSrc && (
            <img
              src={logoSrc}
              alt={partner.name}
              draggable={false}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.02em', fontFamily: font.family }}>
            {partner.name}
          </div>
          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', lineHeight: 1.5, fontFamily: font.family }}>
            {subtitle ?? partner.tagline}
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '10px',
            padding: '4px 10px',
            borderRadius: radius.full,
            background: '#fff',
            border: `1px solid ${C.border}`,
            fontSize: '10px',
            fontWeight: 700,
            color: C.textSub,
            fontFamily: font.family,
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="1.5" y="4" width="7" height="5" rx="1" stroke={C.textSub} strokeWidth="1.2" />
              <path d="M3.5 4V3a1.5 1.5 0 013 0v1" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Linked to your active credit line
          </div>
        </div>
      </div>
    </div>
  )
}
