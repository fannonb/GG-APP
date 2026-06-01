import { useNavigate } from 'react-router-dom'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { ROUTES } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'
import { CREDIT_JOURNEY_STEPS } from '../credit.constants'
import { CreditApplyHero } from './CreditApplyHero'

export function CreditEmptyState() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const startApplication = () => navigate(ROUTES.CREDIT_DISCLAIMER)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family, width: '100%' }}>

      <CreditApplyHero onStartApplication={startApplication} />

      {/* How it works — 3 cards in a row */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: C.textLight, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px', paddingLeft: '2px' }}>
          How it works
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '16px',
        }}>
          {CREDIT_JOURNEY_STEPS.map((step, i) => (
            <div
              key={step.step}
              style={{
                background: C.surface,
                borderRadius: radius.lg,
                border: `1px solid ${C.border}`,
                padding: '24px',
                boxShadow: shadow.sm,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: i === 0 ? C.navy800 : C.bg,
                  border: i === 0 ? 'none' : `1.5px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '13px',
                  fontWeight: 800,
                  color: i === 0 ? '#fff' : C.textLight,
                }}>
                  {step.step}
                </div>
                {i === 0 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: C.blue500,
                    background: C.blue100,
                    padding: '3px 8px',
                    borderRadius: radius.full,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}>
                    You are here
                  </span>
                )}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Finance partners — country-specific, no sample branding */}
      <div style={{
        background: C.surface,
        borderRadius: radius.lg,
        border: `1px solid ${C.border}`,
        padding: isMobile ? '20px 20px' : '22px 28px',
        boxShadow: shadow.sm,
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px' }}>
          Choose your finance partner
        </div>
        <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.6, maxWidth: 640 }}>
          Available partners depend on your country. When you apply, you'll pick from licensed finance partners
          in your region — the options shown are tailored to where you receive care.
        </div>
      </div>

      <p style={{ fontSize: '11px', color: C.textLight, lineHeight: 1.65, textAlign: 'center', padding: '0 4px' }}>
        Credit is issued by your chosen finance partner, not GG'APP. Approved funds are for GG'APP-verified providers only. Repayments are handled directly with your lender.
      </p>
    </div>
  )
}
