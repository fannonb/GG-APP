import { C, font, radius, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { FinancePartnerLogo } from './FinancePartnerLogos'

export interface FinancePartnerOption {
  id: string
  name: string
  tagline: string
  processingTime: string
  color: string
  selectedBg: string
  border: string
  activeBorder: string
  activeShadow: string
}

interface FinancePartnerSelectorProps {
  partners: FinancePartnerOption[]
  selectedId: string | null
  onSelect: (id: string) => void
  error?: string
  stepComplete?: boolean
}

export function FinancePartnerSelector({
  partners,
  selectedId,
  onSelect,
  error,
  stepComplete = false,
}: FinancePartnerSelectorProps) {
  const { isMobile } = useResponsive()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: stepComplete ? C.navy800 : C.blue500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}>
          {stepComplete
            ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>1</span>}
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>
            Choose Your Finance Partner
          </div>
          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '1px', fontFamily: font.family }}>
            Select the lender you'd like to apply with
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '16px',
        alignItems: 'stretch',
      }}>
        {partners.map(p => {
          const isSelected = selectedId === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              aria-pressed={isSelected}
              style={{
                all: 'unset',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: radius.lg,
                border: `2px solid ${isSelected ? p.activeBorder : p.border}`,
                background: isSelected ? p.selectedBg : C.surface,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: isSelected ? p.activeShadow : shadow.sm,
                overflow: 'hidden',
                minHeight: isMobile ? undefined : 280,
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = p.color
                  e.currentTarget.style.boxShadow = p.activeShadow
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = p.border
                  e.currentTarget.style.boxShadow = shadow.sm
                }
              }}
            >
              {/* Logo zone — partner canvas matches official logo backgrounds */}
              <div style={{
                height: 132,
                padding: '16px 24px',
                background: '#fff',
                borderBottom: `1px solid ${isSelected ? p.border : C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FinancePartnerLogo partnerId={p.id} />
              </div>

              {/* Content */}
              <div style={{
                padding: '18px 20px 20px',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                gap: '14px',
                fontFamily: font.family,
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', marginBottom: '6px' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.65 }}>
                    {p.tagline}
                  </div>
                </div>

                <div style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '14px',
                  borderTop: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <circle cx="6.5" cy="6.5" r="5.5" stroke={isSelected ? p.color : C.textLight} strokeWidth="1.2" />
                      <path d="M6.5 3.5v3l2 2" stroke={isSelected ? p.color : C.textLight} strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? p.color : C.textSub }}>
                      Approval in {p.processingTime}
                    </span>
                  </div>

                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? p.activeBorder : C.border}`,
                    background: isSelected ? p.activeBorder : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.18s ease',
                    flexShrink: 0,
                  }}>
                    {isSelected && (
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ fontSize: '12px', color: C.error, marginTop: '8px', fontWeight: 500, fontFamily: font.family }}>
          {error}
        </div>
      )}
    </div>
  )
}
