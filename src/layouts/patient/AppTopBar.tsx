import { useNavigate } from 'react-router-dom'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useNotificationsStore } from '@/store/notifications.store'
import { NotificationPanel } from '@/components/NotificationPanel'
import { FlagImg } from '@/components/FlagImg'
import { usePatientProfile } from '@/hooks/api'
import { useUserStore } from '@/store/user.store'
import { EMPTY_PATIENT, getPatientDisplayName, getPatientInitials } from '@/features/patient/patientAccount'
import { getCountryByCode } from '@/config/countries'
import { ROUTES } from '@/router/routes'

interface AppTopBarProps {
  title: string
  subtitle?: string
  notifCount?: number
  back?: boolean
  backLabel?: string
}

export function AppTopBar({ title, subtitle, back = false, backLabel = 'Back' }: AppTopBarProps) {
  const navigate = useNavigate()
  const { patientNotifs, openPanel } = useNotificationsStore()
  const unreadCount = patientNotifs.filter(n => !n.read).length
  const storedUser = useUserStore(s => s.user)
  const { data: profile } = usePatientProfile()
  const user = profile?.user ?? storedUser ?? EMPTY_PATIENT
  const displayName = getPatientDisplayName(user)
  const countryName =
    getCountryByCode(user.countryCode)?.name ??
    user.country ??
    user.residenceCountry ??
    '—'

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
          onClick={() => navigate(ROUTES.PROFILE)}
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
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: font.family }}>
              {getPatientInitials(user)}
            </span>
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
              {displayName}
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
              <FlagImg code={user.countryCode} size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{countryName}</span>
            </div>
          </div>
        </button>
      </div>

      <NotificationPanel role="patient" />
    </>
  )
}
