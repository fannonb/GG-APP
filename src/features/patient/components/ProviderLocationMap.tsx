import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import {
  buildGoogleMapsDirectionsUrl,
  buildOpenStreetMapEmbedUrl,
  hasMappableLocation,
  type MapLocationInput,
} from '@/utils/maps'

interface ProviderLocationMapProps {
  location: MapLocationInput
}

export function ProviderLocationMap({ location }: ProviderLocationMapProps) {
  if (!hasMappableLocation(location)) return null

  const hasCoordinates = location.lat != null && location.lng != null
  const directionsUrl = buildGoogleMapsDirectionsUrl(location)

  return (
    <GGCard padding="0" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '4px', fontFamily: font.family }}>
            Location
          </div>
          <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, fontFamily: font.family }}>
            {location.address || `${location.lat?.toFixed(5)}, ${location.lng?.toFixed(5)}`}
          </div>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: radius.sm, border: '1px solid rgba(11,123,192,0.35)', color: '#0B7BC0', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: font.family, flexShrink: 0 }}
        >
          Directions
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden><path d="M1.5 9.5L9.5 1.5M9.5 1.5H4M9.5 1.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </div>

      {hasCoordinates && (
        <div style={{ position: 'relative', height: 220, background: C.bg, borderTop: `1px solid ${C.border}` }}>
          <iframe
            title={`Map showing ${location.name}`}
            src={buildOpenStreetMapEmbedUrl(location.lat!, location.lng!)}
            style={{ width: '100%', height: '100%', border: 'none' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div
            style={{
              position: 'absolute',
              left: '16px',
              bottom: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: radius.full,
              background: 'rgba(255,255,255,0.94)',
              border: `1px solid ${C.border}`,
              boxShadow: '0 4px 14px rgba(13,30,66,0.08)',
              fontSize: '11px',
              fontWeight: 700,
              color: C.navy800,
              fontFamily: font.family,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.625 3.5 6.5 3.5 6.5S9.5 7.125 9.5 4.5C9.5 2.57 7.93 1 6 1z" stroke={C.blue500} strokeWidth="1.1"/>
              <circle cx="6" cy="4.5" r="1.2" fill={C.blue500}/>
            </svg>
            {location.name}
          </div>
        </div>
      )}

    </GGCard>
  )
}
