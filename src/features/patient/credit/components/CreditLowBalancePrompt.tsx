import { useNavigate } from 'react-router-dom'
import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { ROUTES } from '@/router/routes'
import { formatCurrency } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { getLowCreditThreshold } from '@/utils/credit-threshold'

interface CreditLowBalancePromptProps {
  available: number
  countryCode: string
  variant?: 'banner' | 'inline'
  /** When set, explains that a specific payment would leave the balance low */
  paymentAmount?: number
}

export function CreditLowBalancePrompt({
  available,
  countryCode,
  variant = 'banner',
  paymentAmount,
}: CreditLowBalancePromptProps) {
  const navigate = useNavigate()
  const country = getCountryByCode(countryCode)
  const currency = country?.currencySymbol ?? 'Ksh.'
  const threshold = getLowCreditThreshold(countryCode)
  const remaining = paymentAmount != null ? available - paymentAmount : available

  const title = paymentAmount != null
    ? 'Your balance will run low after this payment'
    : 'Your healthcare balance is running low'

  const message = paymentAmount != null
    ? `After paying ${formatCurrency(paymentAmount, currency)}, you'll have ${formatCurrency(remaining, currency)} left — below the recommended ${formatCurrency(threshold, currency)} buffer. Request a limit increase so you don't get stuck paying providers.`
    : `You have ${formatCurrency(available, currency)} available — below the recommended ${formatCurrency(threshold, currency)} buffer. Request a limit increase now so you can keep paying service providers without interruption.`

  if (variant === 'inline') {
    return (
      <div style={{
        padding: '12px 14px',
        background: C.warningBg,
        borderRadius: radius.sm,
        border: '1px solid rgba(245,166,35,0.25)',
        fontSize: '12px',
        color: '#8A4D00',
        lineHeight: 1.6,
        fontFamily: font.family,
      }}>
        <strong>{title}.</strong> {message}{' '}
        <button
          type="button"
          onClick={() => navigate(ROUTES.CREDIT_INCREASE)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: C.blue500,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: font.family,
            fontSize: '12px',
            textDecoration: 'underline',
          }}
        >
          Request limit increase →
        </button>
      </div>
    )
  }

  return (
    <div style={{
      padding: '18px 22px',
      background: `linear-gradient(90deg, ${C.warningBg}, #FFFAE8)`,
      borderRadius: radius.lg,
      border: '1.5px solid rgba(245,166,35,0.35)',
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      flexWrap: 'wrap',
      boxShadow: '0 2px 10px rgba(245,166,35,0.12)',
      fontFamily: font.family,
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: C.warning,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(245,166,35,0.35)',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 3l7 12H3L10 3z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="10" y1="8" x2="10" y2="12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="10" cy="14.5" r="1" fill="#fff" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#8A4D00' }}>{title}</div>
        <div style={{ fontSize: '13px', color: '#8A4D00', marginTop: '4px', lineHeight: 1.55 }}>
          {message}
        </div>
      </div>
      <GGButton
        variant="warning"
        size="sm"
        onClick={() => navigate(ROUTES.CREDIT_INCREASE)}
        style={{ background: C.warning, color: '#fff', flexShrink: 0 }}
      >
        Request Increase
      </GGButton>
    </div>
  )
}
