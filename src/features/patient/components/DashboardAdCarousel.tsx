import { useEffect, useRef, useState, type CSSProperties, type TouchEvent as ReactTouchEvent } from 'react'
import { Link } from 'react-router-dom'
import { adsService } from '@/api/services/ads.service'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdSessionStore } from '@/store/ad-session.store'
import { SAMPLE_AD, useDashboardAds } from './useEligibleAds'

const ROTATE_MS = 6000
const SWIPE_MIN_PX = 40

// Ad ids whose impression is already counted. Module scope: remounting the carousel does not count an ad
// again, and a full page load (a new browser session) starts the set empty.
const countedImpressions = new Set<string>()

const arrowBase: CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 32,
  height: 32,
  padding: 0,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
}

const slideLinkStyle: CSSProperties = { display: 'block', width: '100%', height: '100%' }

export function DashboardAdCarousel() {
  const { isMobile } = useResponsive()
  const closeAds = useAdSessionStore(s => s.closeAds)
  // Never empty: falls back to the GG'APP sample ad when no real banner is eligible.
  const ads = useDashboardAds()
  const count = ads.length
  // Only paid placements get the "Ad" label; the GG'APP house ad is not an ad.
  const showAdLabel = ads.some(ad => ad.id !== SAMPLE_AD.id)
  const [activeIndex, setActiveIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focusInside, setFocusInside] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // One timer while there are 2+ ads and the carousel is neither hovered nor focused.
  // State is only written from the timer callback, never synchronously in the effect body.
  useEffect(() => {
    if (count < 2 || hovered || focusInside) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setActiveIndex(i => (i + 1) % count)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [count, hovered, focusInside])

  // The stored index can outlive a change in the number of ads, so it is wrapped at render time.
  const current = activeIndex % count
  // A real ad counts as shown the first time its slide is on screen. The house ad is never counted.
  // The carousel is not mounted while the patient has closed the ads, so nothing is counted then.
  const shownAd = ads[current]
  useEffect(() => {
    if (shownAd.id === SAMPLE_AD.id || countedImpressions.has(shownAd.id)) return
    countedImpressions.add(shownAd.id)
    // Best effort: a failed report must never affect the ad.
    void adsService.recordImpression(shownAd.id).catch(() => undefined)
  }, [shownAd])

  const step = (dir: 1 | -1) => setActiveIndex(i => (i + dir + count) % count)

  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0]
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null
  }

  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    const t = e.changedTouches[0]
    if (!start || !t) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    // Only a mostly horizontal swipe counts, so a vertical page scroll never flips the ad.
    if (Math.abs(dx) <= SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return
    step(dx < 0 ? 1 : -1)
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={showAdLabel ? 'Sponsored' : 'Featured'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusInside(true)}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusInside(false)
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: isMobile ? undefined : 240,
        aspectRatio: isMobile ? '4 / 3' : undefined,
        borderRadius: radius.lg,
        overflow: 'hidden',
        boxShadow: shadow.sm,
        background: C.bg,
      }}
    >
      {ads.map((ad, i) => {
        const active = i === current
        const isSample = ad.id === SAMPLE_AD.id
        const src = isMobile
          ? ad.mobileImageUrl || ad.desktopImageUrl
          : ad.desktopImageUrl || ad.mobileImageUrl
        const image = (
          <img
            src={src}
            alt={isSample ? "GG'APP: Care now. Pay over time." : 'Sponsored advertisement'}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        )
        return (
          <div
            key={ad.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: active ? 1 : 0,
              opacity: active ? 1 : 0,
              visibility: active ? 'visible' : 'hidden',
              transition: 'opacity 0.4s ease, visibility 0.4s ease',
            }}
          >
            {isSample ? (
              // House ad links to an app route, so it navigates in the same tab.
              <Link
                to={ad.ctaUrl}
                tabIndex={active ? undefined : -1}
                style={slideLinkStyle}
              >
                {image}
              </Link>
            ) : (
              <a
                href={ad.ctaUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={active ? undefined : -1}
                style={slideLinkStyle}
                onClick={() => {
                  // Best effort: the click still opens the advertiser, whatever the report does.
                  void adsService.recordClick(ad.id).catch(() => undefined)
                }}
              >
                {image}
              </a>
            )}
          </div>
        )
      })}

      {showAdLabel && (
        <span
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 2,
            pointerEvents: 'none',
            padding: '2px 8px',
            borderRadius: radius.full,
            background: 'rgba(0,0,0,0.45)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: '16px',
            fontFamily: font.family,
          }}
        >
          Ad
        </span>
      )}

      <button
        type="button"
        aria-label="Close ad"
        onClick={e => {
          // The button sits outside the ad link, but keep clicks away from any ancestor handlers.
          e.stopPropagation()
          closeAds()
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          width: 28,
          height: 28,
          padding: 0,
          borderRadius: radius.full,
          border: 'none',
          background: 'rgba(255,255,255,0.9)',
          boxShadow: shadow.sm,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke={C.text} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous ad"
            onClick={() => step(-1)}
            style={{ ...arrowBase, left: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10 3L5 8l5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next ad"
            onClick={() => step(1)}
            style={{ ...arrowBase, right: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M6 3l5 5-5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div
            role="group"
            aria-label="Choose ad"
            style={{
              position: 'absolute',
              bottom: 4,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              zIndex: 2,
            }}
          >
            {ads.map((ad, i) => (
              <button
                key={ad.id}
                type="button"
                aria-label={`Show ad ${i + 1} of ${count}`}
                aria-current={i === current}
                onClick={() => setActiveIndex(i)}
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#fff',
                    opacity: i === current ? 1 : 0.5,
                    boxShadow: '0 0 2px rgba(0,0,0,0.35)',
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
