import type { CSSProperties } from 'react'
import { PARTNER_LOGOS, type PartnerLogoId } from '../partner-logos'

const LOGO_SPECS: Record<PartnerLogoId, { src: string; alt: string; maxHeight: number; maxWidth: number }> = {
  moneymart: {
    src: PARTNER_LOGOS.moneymart,
    alt: 'Moneymart Finance',
    maxHeight: 72,
    maxWidth: 280,
  },
  equity: {
    src: PARTNER_LOGOS.equity,
    alt: 'Equity Bank',
    maxHeight: 80,
    maxWidth: 160,
  },
}

function PartnerLogoImage({ partnerId, compact = false, style }: { partnerId: PartnerLogoId; compact?: boolean; style?: CSSProperties }) {
  const spec = LOGO_SPECS[partnerId]
  const maxHeight = compact ? spec.maxHeight * 0.65 : spec.maxHeight
  const maxWidth = compact ? spec.maxWidth * 0.65 : spec.maxWidth
  return (
    <img
      src={spec.src}
      alt={spec.alt}
      draggable={false}
      style={{
        display: 'block',
        maxHeight,
        maxWidth,
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        ...style,
      }}
    />
  )
}

export function MoneymartLogo({ compact }: { compact?: boolean } = {}) {
  return <PartnerLogoImage partnerId="moneymart" compact={compact} />
}

export function EquityBankLogo({ compact }: { compact?: boolean } = {}) {
  return <PartnerLogoImage partnerId="equity" compact={compact} />
}

export function FinancePartnerLogo({ partnerId, compact }: { partnerId: string; compact?: boolean }) {
  if (partnerId === 'moneymart') return <MoneymartLogo compact={compact} />
  if (partnerId === 'equity') return <EquityBankLogo compact={compact} />
  return null
}
