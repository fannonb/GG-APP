import { useState } from 'react'
import { radius, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdsStore } from '@/store/ads.store'

interface AdBannerStripProps {
  countryName?: string
}

/**
 * Patient-facing ad strip.
 *
 * The parent passes a `key` prop tied to the active banner's `updatedAt`
 * timestamp (see DashboardScreen). Every time the admin saves a banner the
 * key changes, this component fully remounts, and `dismissed` resets to
 * false — guaranteeing the new image is immediately visible.
 */
export function AdBannerStrip({ countryName }: AdBannerStripProps) {
  const { isMobile } = useResponsive()
  const banners = useAdsStore(s => s.banners)
  const [dismissed, setDismissed] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // Pick the most-recently-saved eligible active banner.
  const banner = [...banners]
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .find(b => {
      if (b.status !== 'active') return false
      if (b.startDate > today || b.expiresAt < today) return false
      if (b.countries.length > 0 && countryName && !b.countries.includes(countryName)) return false
      return !!(b.desktopImageUrl || b.mobileImageUrl)
    }) ?? null

  if (!banner || dismissed) return null

  const src =
    (isMobile ? banner.mobileImageUrl || banner.desktopImageUrl : banner.desktopImageUrl) ||
    banner.mobileImageUrl

  if (!src) return null

  return (
    <div style={{
      position: 'relative',
      borderRadius: radius.lg,
      overflow: 'hidden',
      boxShadow: shadow.sm,
      lineHeight: 0,
    }}>
      <a
        href={banner.ctaUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${banner.advertiserName} — sponsored`}
        style={{ display: 'block', textDecoration: 'none' }}
      >
        <img
          src={src}
          alt={`${banner.advertiserName} — sponsored`}
          style={{
            width: '100%',
            height: isMobile ? 150 : 90,
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </a>

      {/* Dismiss × */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss ad"
        style={{
          position: 'absolute', top: 5, right: 7,
          width: 22, height: 22,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: radius.xs,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', padding: 0,
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.65)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
