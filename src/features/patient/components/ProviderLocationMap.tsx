import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsViewUrl,
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
  const viewUrl = buildGoogleMapsViewUrl(location)

  return (
    <GGCard padding="0" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '24px 24px 16px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '4px', fontFamily: font.family }}>
          Location
        </div>
        <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, fontFamily: font.family }}>
          {location.address || `${location.lat?.toFixed(5)}, ${location.lng?.toFixed(5)}`}
        </div>
      </div>

      {hasCoordinates && (
        <div style={{ position: 'relative', height: 220, background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
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

      <div style={{ padding: '16px 24px 24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <GGButton
          variant="primary"
          size="md"
          onClick={() => window.open(directionsUrl, '_blank', 'noopener,noreferrer')}
          style={{ flex: '1 1 180px' }}
        >
          Get Directions
        </GGButton>
        <GGButton
          variant="secondary"
          size="md"
          onClick={() => window.open(viewUrl, '_blank', 'noopener,noreferrer')}
          style={{ flex: '1 1 140px' }}
        >
          Open in Maps
        </GGButton>
      </div>

      <div style={{ padding: '0 24px 18px', fontSize: '11px', color: C.textLight, lineHeight: 1.5, fontFamily: font.family }}>
        Directions open in Google Maps using this provider&apos;s saved address
        {hasCoordinates ? ' and map pin.' : '.'}
        {!hasCoordinates && ' Add map coordinates in provider settings for a more precise pin.'}
      </div>
    </GGCard>
  )
}
