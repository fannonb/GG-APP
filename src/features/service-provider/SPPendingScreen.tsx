import { useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useSPApplicationStatus } from '@/hooks/api'
import { ROUTES } from '@/router/routes'
import { formatDate } from '@/utils/format'

interface PendingState {
  applicationId?: string
  status?: 'pending' | 'info_requested' | 'approved' | 'rejected'
  submittedAt?: string
  message?: string
}

export function SPPendingScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = (location.state as PendingState | null) ?? null
  const applicationId = searchParams.get('applicationId') ?? state?.applicationId

  const { data: liveStatus, isLoading } = useSPApplicationStatus(applicationId)

  const status = liveStatus?.status ?? state?.status ?? 'pending'
  const submittedAt = liveStatus?.submittedAt ?? state?.submittedAt
  const note = liveStatus?.note ?? null

  const hero = useMemo(() => {
    switch (status) {
      case 'approved':
        return {
          title: 'Application Approved',
          message:
            note ??
            'Your provider application has been approved. Your provider login is now active.',
          accent: C.success,
          pill: 'Portal unlocked',
        }
      case 'info_requested':
        return {
          title: 'More Information Needed',
          message:
            note ??
            'Our review team needs a bit more information before approval can continue.',
          accent: C.warning,
          pill: 'Action needed',
        }
      case 'rejected':
        return {
          title: 'Application Not Approved',
          message:
            note ??
            'Your provider application was not approved. Please review the note below before reapplying.',
          accent: C.error,
          pill: 'Review update',
        }
      default:
        return {
          title: 'Application Received',
          message:
            state?.message ??
            'Your GG\'APP provider application has been submitted. Our admin team will review your documents shortly.',
          accent: C.success,
          pill: 'Under review',
        }
    }
  }, [note, state?.message, status])

  const timeline = [
    {
      step: 'Application Submitted',
      done: true,
      active: false,
      date: submittedAt ? formatDate(submittedAt) : 'Completed',
    },
    {
      step: 'Admin Review',
      done: status === 'approved' || status === 'rejected',
      active: status === 'pending' || status === 'info_requested',
      date:
        status === 'pending'
          ? 'In progress'
          : status === 'info_requested'
            ? 'Waiting for your response'
            : 'Completed',
    },
    {
      step: 'Decision',
      done: status === 'approved' || status === 'rejected' || status === 'info_requested',
      active: false,
      date:
        status === 'approved'
          ? 'Approved'
          : status === 'rejected'
            ? 'Rejected'
            : status === 'info_requested'
              ? 'Info requested'
              : undefined,
    },
    {
      step: 'Account Activation',
      done: status === 'approved',
      active: false,
      date: status === 'approved' ? 'Provider login enabled' : undefined,
    },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        fontFamily: font.family,
      }}
    >
      <div style={{ maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <GGCard
          padding="36px"
          style={{ background: `linear-gradient(135deg, ${C.navy900}, ${C.navy800})`, border: 'none', textAlign: 'center' }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: `${hero.accent}1F`,
              border: `2px solid ${hero.accent}40`,
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              {status === 'rejected' ? (
                <path d="M9 9l12 12M21 9L9 21" stroke={hero.accent} strokeWidth="2.5" strokeLinecap="round" />
              ) : status === 'info_requested' ? (
                <>
                  <path d="M15 10v6" stroke={hero.accent} strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="15" cy="21" r="1.7" fill={hero.accent} />
                  <circle cx="15" cy="15" r="12" stroke={hero.accent} strokeWidth="2" />
                </>
              ) : (
                <path d="M6 15l6 6 12-12" stroke={hero.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', marginBottom: '8px' }}>
            {hero.title}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, marginBottom: '16px' }}>
            {hero.message}
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '8px 20px',
              background: `${hero.accent}1F`,
              border: `1px solid ${hero.accent}35`,
              borderRadius: radius.full,
              fontSize: '13px',
              fontWeight: 700,
              color: hero.accent,
            }}
          >
            {applicationId ? `Reference: ${applicationId}` : hero.pill}
          </div>
        </GGCard>

        <GGCard padding="28px">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Application Status</div>
            {isLoading && (
              <div style={{ fontSize: '12px', color: C.textSub }}>Refreshing...</div>
            )}
          </div>
          {timeline.map((item, index) => (
            <div key={item.step} style={{ display: 'flex', gap: '16px', paddingBottom: index < timeline.length - 1 ? '20px' : 0, position: 'relative' }}>
              {index < timeline.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '15px',
                    top: '32px',
                    width: '2px',
                    height: 'calc(100% - 8px)',
                    background: item.done ? hero.accent : C.border,
                  }}
                />
              )}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: item.done ? hero.accent : item.active ? C.warning : C.border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                {item.done ? (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2.5 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                )}
              </div>
              <div style={{ paddingTop: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: item.done || item.active ? 600 : 400, color: item.done ? C.text : item.active ? C.warning : C.textLight }}>
                  {item.step}
                </div>
                {item.date && <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{item.date}</div>}
              </div>
            </div>
          ))}
        </GGCard>

        {note && (
          <GGCard
            padding="20px"
            style={{
              background:
                status === 'approved'
                  ? C.successBg
                  : status === 'info_requested'
                    ? C.warningBg
                    : C.errorBg,
              border: `1px solid ${
                status === 'approved'
                  ? 'rgba(34,201,138,0.2)'
                  : status === 'info_requested'
                    ? 'rgba(245,166,35,0.28)'
                    : 'rgba(229,71,77,0.22)'
              }`,
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Admin Note
            </div>
            <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.7 }}>{note}</div>
          </GGCard>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <GGButton variant="secondary" size="md" onClick={() => navigate(ROUTES.LOGIN)} style={{ flex: 1 }}>
            Back to Login
          </GGButton>
          {status === 'approved' ? (
            <GGButton variant="success" size="md" onClick={() => navigate(ROUTES.LOGIN)} style={{ flex: 2 }}>
              Sign in as Provider
            </GGButton>
          ) : status === 'rejected' ? (
            <GGButton variant="primary" size="md" onClick={() => navigate(ROUTES.REGISTER, { state: { tab: 'sp' } })} style={{ flex: 2 }}>
              Start a New Application
            </GGButton>
          ) : (
            <GGButton variant="success" size="md" onClick={() => window.location.reload()} style={{ flex: 2 }}>
              Refresh Status
            </GGButton>
          )}
        </div>
      </div>
    </div>
  )
}
