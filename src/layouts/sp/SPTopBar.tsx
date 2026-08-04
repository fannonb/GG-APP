import { useNavigate } from 'react-router-dom'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useNotificationsStore } from '@/store/notifications.store'
import { NotificationPanel } from '@/components/NotificationPanel'
import { FlagImg } from '@/components/FlagImg'
import { useSPProfile } from '@/hooks/api'
import { getCountryByName } from '@/config/countries'
import { ROUTES } from '@/router/routes'

interface SPTopBarProps {
  title: string
  subtitle?: string
  back?: boolean
  backLabel?: string
}

function getProviderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'SP'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export function SPTopBar({ title, subtitle, back = false, backLabel = 'Back' }: SPTopBarProps) {
  const navigate = useNavigate()
  const { spNotifs, openPanel } = useNotificationsStore()
  const unreadCount = spNotifs.filter(n => !n.read).length
  const { data: profile } = useSPProfile()

  const providerName = profile?.name ?? 'Provider'
  const countryConfig = getCountryByName(profile?.country ?? '')
  const countryName = countryConfig?.name ?? profile?.country ?? '—'
  const countryCode = countryConfig?.code
  const providerLogoUrl = profile?.logoUrl
  const providerInitials = getProviderInitials(providerName)

  return (
    <>
      <div style={{
        background: '#fff',
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: shadow.sm,
      }}>
        {back && (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textSub,
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: font.family,
              padding: '6px 12px 6px 8px',
              borderRadius: '8px',
              transition: 'background 0.13s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {backLabel}
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, fontFamily: font.family, letterSpacing: '-0.03em' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family, marginTop: '2px' }}>
              {subtitle}
            </div>
          )}
        </div>

        <button
          onClick={openPanel}
          style={{
            position: 'relative',
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: C.textSub,
            transition: 'all 0.13s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.blue100; e.currentTarget.style.color = C.blue500 }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.textSub }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 4-1.5 5h14c-.7-1-1.5-2.5-1.5-5A5.5 5.5 0 009 2z" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -4, right: -4,
              background: C.error,
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: font.family,
              width: 18, height: 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate(ROUTES.SP_SETTINGS)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            borderRadius: radius.md,
            border: `1px solid ${C.border}`,
            background: C.bg,
            cursor: 'pointer',
            flexShrink: 0,
            maxWidth: '280px',
            transition: 'background 0.13s, border-color 0.13s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.blue100
            e.currentTarget.style.borderColor = `${C.blue500}44`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = C.bg
            e.currentTarget.style.borderColor = C.border
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.blue500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {providerLogoUrl ? (
              <img src={providerLogoUrl} alt={providerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: font.family }}>
                {providerInitials}
              </span>
            )}
          </div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: C.text,
              fontFamily: font.family,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {providerName}
            </div>
            <div style={{
              fontSize: '11px',
              color: C.textSub,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: font.family,
              marginTop: '2px',
            }}>
              {countryCode && <FlagImg code={countryCode} size={14} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{countryName}</span>
            </div>
          </div>
        </button>
      </div>

      <NotificationPanel role="sp" />
    </>
  )
}
