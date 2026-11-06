import { useEffect, type ReactNode } from 'react'
import { GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import {
  DAYS_ORDER,
  formatCategoryList,
  formatHourRange,
  type ProfileFormState,
} from '../settings.helpers'

interface PublicProfilePreviewProps {
  name: string
  form: ProfileFormState
  onClose: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ paddingTop: 16, marginTop: 16, borderTop: `1px solid ${C.border}` }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

const bodyText: React.CSSProperties = { fontSize: 14, color: C.text, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }
const muted: React.CSSProperties = { fontSize: 13, color: C.textLight, margin: 0 }

/**
 * How the pharmacy's public profile reads to patients. Built from the details on the settings
 * page, so unsaved edits show here; they reach patients once saved.
 */
export function PublicProfilePreview({ name, form, onClose }: PublicProfilePreviewProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const categories = formatCategoryList(form.categories)
  const addressLine = [form.building, form.road].map(part => part.trim()).filter(Boolean).join(', ')
  const fullAddress = form.address.trim()
  const mapUrl = form.lat != null && form.lng != null
    ? `https://www.google.com/maps?q=${form.lat},${form.lng}`
    : fullAddress
      ? `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}`
      : null
  const openDays = DAYS_ORDER.filter(day => form.openingHours[day]?.open)
  const hasLocation = Boolean(addressLine || fullAddress || mapUrl)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(9,28,68,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: font.family }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Public profile preview"
        onClick={event => event.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: radius.lg, padding: '22px 24px 24px', boxSizing: 'border-box' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Public profile preview</div>
            <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>
              This is how patients see your practice, from the details on this page. Save your changes to publish them.
            </div>
          </div>
          <button
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: radius.sm, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', flexShrink: 0, fontSize: 16, color: C.textSub, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, overflow: 'hidden', background: C.blue100, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {form.logoUrl
              ? <img src={form.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 18, fontWeight: 800, color: C.navy800 }}>{initials || 'SP'}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>{name}</span>
              <GGBadge type={form.status === 'open' ? 'success' : 'default'}>{form.status === 'open' ? 'Open' : 'Closed'}</GGBadge>
            </div>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
              {[categories || 'No category set', form.country, form.establishedYear && `Since ${form.establishedYear}`].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        <Section title="About">
          {form.about.trim() ? <p style={bodyText}>{form.about.trim()}</p> : <p style={muted}>No description yet.</p>}
        </Section>

        <Section title="Location">
          {hasLocation ? (
            <>
              {addressLine && <p style={{ ...bodyText, fontWeight: 600 }}>{addressLine}</p>}
              {fullAddress && <p style={{ ...bodyText, marginTop: addressLine ? 4 : 0 }}>{fullAddress}</p>}
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 700, color: C.blue500, textDecoration: 'none' }}>
                  View on map
                </a>
              )}
            </>
          ) : (
            <p style={muted}>No address yet.</p>
          )}
          {form.directions.trim() && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 4 }}>How to get there</div>
              <p style={bodyText}>{form.directions.trim()}</p>
            </div>
          )}
        </Section>

        <Section title="Opening hours">
          {openDays.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {openDays.map(day => {
                const hours = form.openingHours[day]
                return (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: C.text }}>
                    <span style={{ fontWeight: 600 }}>{day}</span>
                    <span>{formatHourRange(hours.from, hours.to)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={muted}>No opening hours set.</p>
          )}
        </Section>

        <Section title="Contact">
          <p style={bodyText}>{form.phone.trim() || 'No phone number yet.'}</p>
          {form.languages.length > 0 && <p style={{ ...muted, marginTop: 6 }}>Languages: {form.languages.join(', ')}</p>}
        </Section>
      </div>
    </div>
  )
}
