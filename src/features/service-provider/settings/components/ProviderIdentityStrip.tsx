import { useNavigate } from 'react-router-dom'
import { GGBadge, GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import type { ProviderSettingsResponse } from '@/api/types'
import { route } from '@/router/routes'
import { getSpProfileCompletion } from '@/utils/sp-profile-completion'
import { formatCategoryList, type ProfileFormState } from '../settings.helpers'

export function ProviderIdentityStrip({
  settings,
  profileForm,
}: {
  settings: ProviderSettingsResponse
  profileForm: ProfileFormState
}) {
  const navigate = useNavigate()
  const completion = getSpProfileCompletion(settings)
  const categories = formatCategoryList(profileForm.categories)
  const initials = settings.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <GGCard padding="18px 20px">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              overflow: 'hidden',
              background: C.blue100,
              border: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {profileForm.logoUrl ? (
              <img src={profileForm.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 15, fontWeight: 800, color: C.navy800, fontFamily: font.family }}>{initials || 'SP'}</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontFamily: font.family, letterSpacing: '-0.02em' }}>
                {settings.profile.name}
              </div>
              {settings.profile.verified !== false && <GGBadge type="info">Verified</GGBadge>}
              <GGBadge type={profileForm.status === 'open' ? 'success' : 'default'}>
                {profileForm.status === 'open' ? 'Open' : 'Closed'}
              </GGBadge>
            </div>
            <div style={{ fontSize: 13, color: C.textSub, fontFamily: font.family }}>
              {[categories || 'No category set', profileForm.country].filter(Boolean).join(' · ')}
            </div>
          </div>

          <GGButton
            variant="secondary"
            size="sm"
            onClick={() => navigate(route.providerProfile(settings.profile.id))}
          >
            View public profile
          </GGButton>
        </div>
      </GGCard>

      {!completion.isComplete && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: radius.sm,
            background: C.warningBg,
            border: '1px solid rgba(245,166,35,0.28)',
            fontSize: 13,
            color: '#8A4D00',
            fontFamily: font.family,
            lineHeight: 1.5,
          }}
        >
          Profile incomplete — finish {completion.pendingLabels.join(', ').toLowerCase()} to appear fully ready for patients.
        </div>
      )}
    </div>
  )
}
