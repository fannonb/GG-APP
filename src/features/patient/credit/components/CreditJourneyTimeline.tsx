import type { RefObject } from 'react'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { CREDIT_JOURNEY_STEPS } from '../credit.constants'

interface CreditJourneyTimelineProps {
  sectionRef?: RefObject<HTMLDivElement | null>
  onStartApplication: () => void
}

export function CreditJourneyTimeline({ sectionRef, onStartApplication }: CreditJourneyTimelineProps) {
  const { isMobile } = useResponsive()

  return (
    <div ref={sectionRef}>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', fontFamily: font.family }}>
          Your application journey
        </div>
        <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
          Three simple steps from application to your first appointment
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '14px',
        position: 'relative',
      }}>
        {!isMobile && (
          <div style={{
            position: 'absolute',
            top: 36,
            left: '16.66%',
            right: '16.66%',
            height: 2,
            background: `linear-gradient(90deg, ${C.blue500} 0%, ${C.border} 50%, ${C.border} 100%)`,
            zIndex: 0,
          }} />
        )}

        {CREDIT_JOURNEY_STEPS.map((step, i) => {
          const isCurrent = i === 0
          return (
            <div
              key={step.step}
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '22px 20px',
                background: C.surface,
                borderRadius: radius.lg,
                border: `1.5px solid ${isCurrent ? C.blue500 : C.border}`,
                boxShadow: isCurrent ? '0 0 0 3px rgba(56,182,255,0.12)' : shadow.sm,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isCurrent ? C.blue500 : i === 1 ? C.navy800 : C.bg,
                  border: isCurrent ? 'none' : `2px solid ${i === 1 ? C.navy800 : C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: isCurrent || i === 1 ? '#fff' : C.textSub,
                  }}>
                    {step.step}
                  </span>
                </div>
                {isCurrent && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: C.blue500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    You are here
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px', fontFamily: font.family }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.65, fontFamily: font.family }}>
                  {step.desc}
                </div>
              </div>

              {isCurrent && (
                <button
                  type="button"
                  onClick={onStartApplication}
                  style={{
                    marginTop: 'auto',
                    padding: '10px 16px',
                    background: C.blue100,
                    border: `1px solid rgba(56,182,255,0.25)`,
                    borderRadius: radius.sm,
                    color: C.navy800,
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: font.family,
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,182,255,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.blue100 }}
                >
                  Begin Step 1 →
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
