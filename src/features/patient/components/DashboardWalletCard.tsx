import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { formatAmount } from '@/utils/format'
import type { Patient } from '@/types/user.types'
import { PARTNER_MARKS } from '@/features/patient/credit/partnerMarks'

interface DashboardWalletCardProps {
  user: Pick<Patient, 'creditLimit' | 'creditUsed' | 'creditAvailable' | 'creditStatus'>
  currency: string
  partnerId: string
  partnerName: string
}

/** Deep end of the logo cyan — keeps white text legible without falling back to navy. */
const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'

const primaryBtn: React.CSSProperties = {
  height: 42,
  padding: '0 22px',
  borderRadius: radius.sm,
  border: 'none',
  background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
  boxShadow: '0 6px 16px rgba(11,123,192,0.28)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const secondaryBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#fff',
  boxShadow: 'none',
  border: '1px solid rgba(11,123,192,0.35)',
  color: CYAN_DEEP,
}

/**
 * Credit at a glance: what's available, how much of the limit is used,
 * and who issued it. Falls back to application state when there's no line yet.
 */
export function DashboardWalletCard({ user, currency, partnerId, partnerName }: DashboardWalletCardProps) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const hasLine = user.creditLimit > 0
  const usedPct = hasLine ? Math.min(100, Math.max(0, (user.creditUsed / user.creditLimit) * 100)) : 0
  const mark = PARTNER_MARKS[partnerId]

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'relative' }}>
      <div
        style={{
          height: 48,
          padding: '0 14px',
          borderRadius: 12,
          background: '#fff',
          boxShadow: '0 2px 10px rgba(11,123,192,0.10)',
          display: 'flex',
          alignItems: 'center',
          maxWidth: '62%',
          boxSizing: 'border-box',
        }}
      >
        {mark ? (
          <img
            src={mark.src}
            alt={partnerName}
            draggable={false}
            style={{ height: mark.height, width: 'auto', maxWidth: '100%', display: 'block', objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{partnerName}</span>
        )}
      </div>
      {hasLine && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.CREDIT_WALLET)}
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: radius.full,
            border: 'none',
            background: 'rgba(255,255,255,0.75)',
            color: CYAN_DEEP,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: font.family,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          View wallet →
        </button>
      )}
    </div>
  )

  let body: React.ReactNode
  if (hasLine) {
    body = (
      <>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: CYAN_DEEP, marginBottom: 6 }}>Available to spend</div>
          <div style={{ fontSize: isMobile ? 34 : 40, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
            {formatAmount(user.creditAvailable, currency)}
          </div>
        </div>

        <div>
          <div
            role="progressbar"
            aria-label="Credit used"
            aria-valuenow={Math.round(usedPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ height: 10, borderRadius: radius.full, background: 'rgba(255,255,255,0.85)', overflow: 'hidden' }}
          >
            <div
              style={{
                width: `${usedPct}%`,
                height: '100%',
                borderRadius: radius.full,
                background: `linear-gradient(90deg, ${C.blue400} 0%, ${CYAN_MID} 100%)`,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, fontSize: 13, color: C.textSub }}>
            <span>
              <strong style={{ color: C.text, fontWeight: 700 }}>{formatAmount(user.creditUsed, currency)}</strong> used
            </span>
            <span>
              of <strong style={{ color: C.text, fontWeight: 700 }}>{formatAmount(user.creditLimit, currency)}</strong> limit
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(ROUTES.FIND_SERVICE)}
          style={{ ...primaryBtn, marginTop: 'auto', alignSelf: isMobile ? 'stretch' : 'flex-start' }}
        >
          Find care
        </button>
      </>
    )
  } else if (user.creditStatus === 'pending') {
    body = (
      <>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>Application under review</div>
          <div style={{ fontSize: 14, color: C.textSub, marginTop: 6, lineHeight: 1.5 }}>
            {partnerName} is reviewing your request. Your credit will appear here once approved.
          </div>
        </div>
        <button type="button" onClick={() => navigate(ROUTES.CREDIT_STATUS)} style={{ ...secondaryBtn, marginTop: 'auto', alignSelf: 'flex-start' }}>
          View status
        </button>
      </>
    )
  } else {
    const declined = user.creditStatus === 'rejected'
    body = (
      <>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>
            {declined ? 'No active credit line' : 'Get care now, pay over time'}
          </div>
          <div style={{ fontSize: 14, color: C.textSub, marginTop: 6, lineHeight: 1.5 }}>
            {declined
              ? 'Your last application was declined. You can re-apply 30 days after the decision.'
              : 'Apply for healthcare credit to pay verified providers without paying at the counter.'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(declined ? ROUTES.CREDIT_STATUS : ROUTES.CREDIT_DISCLAIMER)}
          style={{ ...(declined ? secondaryBtn : primaryBtn), marginTop: 'auto', alignSelf: 'flex-start' }}
        >
          {declined ? 'View decision' : 'Apply for credit'}
        </button>
      </>
    )
  }

  return (
    <section
      aria-label="Healthcare credit"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #F2FAFF 0%, #DDF1FF 55%, #C9E9FF 100%)',
        border: '1px solid rgba(56,182,255,0.28)',
        borderRadius: radius.lg,
        padding: isMobile ? '18px' : '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        fontFamily: font.family,
        color: C.text,
        minHeight: isMobile ? 'auto' : 196,
        boxSizing: 'border-box',
      }}
    >
      {/* Soft concentric rings, like the face of a payment card — decoration only */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 340,
          height: 340,
          right: -120,
          bottom: -170,
          borderRadius: '50%',
          border: '44px solid rgba(255,255,255,0.45)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          right: -40,
          bottom: -90,
          borderRadius: '50%',
          background: 'rgba(56,182,255,0.12)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
        {header}
        {body}
      </div>
    </section>
  )
}
