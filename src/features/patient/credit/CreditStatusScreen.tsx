import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import type { BadgeType } from '@/design-system/GGBadge'

type AppStatus = 'pending' | 'under-review' | 'approved' | 'declined'

const STATUS_CONFIG: Record<AppStatus, { label: string; type: BadgeType; msg: string }> = {
  'pending':      { label: 'Pending',      type: 'default', msg: 'Your application has been submitted and is queued for review.' },
  'under-review': { label: 'Under Review', type: 'warning', msg: 'Our finance partner is actively assessing your application. You will be notified within 24–48 hours.' },
  'approved':     { label: 'Approved',     type: 'success', msg: 'Congratulations! Your credit application has been approved. Your wallet has been loaded.' },
  'declined':     { label: 'Declined',     type: 'error',   msg: "We're sorry — your application was not approved at this time. You may re-apply after 30 days." },
}

export function CreditStatusScreen() {
  const navigate = useNavigate()
  const status = 'under-review' as AppStatus
  const sc = STATUS_CONFIG[status]
  const refNum = 'GGA-847291'

  const timeline = [
    { step: 'Application Submitted',   done: true,  active: false, date: '19 May 2026, 09:32' },
    { step: 'Admin Verification',      done: true,  active: false, date: '19 May 2026, 09:45' },
    { step: 'Finance Partner Review',  done: status === 'under-review' || status === 'approved', active: status === 'under-review', date: status === 'under-review' ? 'In progress…' : '' },
    { step: 'Credit Decision',         done: status === 'approved' || status === 'declined', active: false, date: '' },
    { step: 'Wallet Loaded',           done: status === 'approved', active: false, date: '' },
  ]

  const bannerBg: Record<BadgeType, string> = {
    success: 'linear-gradient(135deg, #E3F9F0, #D0F5E9)',
    warning: 'linear-gradient(135deg, #FFF8E6, #FFF3D0)',
    error:   'linear-gradient(135deg, #FDECEA, #FBD9D8)',
    default: `linear-gradient(135deg, ${C.blue100}, #C8E8F7)`,
    primary: `linear-gradient(135deg, ${C.blue100}, #C8E8F7)`,
    info:    `linear-gradient(135deg, ${C.blue100}, #C8E8F7)`,
    navy:    `linear-gradient(135deg, ${C.navy900}, ${C.navy800})`,
    outline: 'transparent',
    open:    'linear-gradient(135deg, #E3F9F0, #D0F5E9)',
    closed:  'linear-gradient(135deg, #FDECEA, #FBD9D8)',
    pending: `linear-gradient(135deg, ${C.warningBg}, #FFF3D0)`,
  }

  return (
    <AppLayout title="Application Status" subtitle={`Ref: ${refNum}`} back notifCount={1}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        <GGCard padding="28px" style={{ background: bannerBg[sc.type], border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {sc.type === 'success' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              {sc.type === 'warning' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={C.warning} strokeWidth="1.8"/><line x1="12" y1="7" x2="12" y2="13" stroke={C.warning} strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.2" fill={C.warning}/></svg>}
              {sc.type === 'error'   && <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke={C.error} strokeWidth="2" strokeLinecap="round"/></svg>}
              {(sc.type === 'default' || sc.type === 'pending') && <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={C.blue500} strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke={C.blue500} strokeWidth="1.8" strokeLinecap="round"/></svg>}
            </div>
            <div>
              <GGBadge type={sc.type} size="md">{sc.label}</GGBadge>
              <div style={{ fontSize: '14px', color: C.text, marginTop: '8px', lineHeight: 1.6 }}>{sc.msg}</div>
            </div>
          </div>
        </GGCard>

        <GGCard padding="28px">
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '22px' }}>Application Timeline</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {timeline.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', paddingBottom: i < timeline.length - 1 ? '20px' : 0, position: 'relative' }}>
                {i < timeline.length - 1 && <div style={{ position: 'absolute', left: '15px', top: '32px', width: '2px', height: 'calc(100% - 8px)', background: t.done ? C.success : C.border, transition: 'background 0.3s' }} />}
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: t.done ? C.success : t.active ? C.warning : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  {t.done
                    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div style={{ paddingTop: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: t.done || t.active ? 600 : 400, color: t.done ? C.text : t.active ? C.warning : C.textLight }}>{t.step}</div>
                  {t.date && <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{t.date}</div>}
                </div>
              </div>
            ))}
          </div>
        </GGCard>

        <div style={{ display: 'flex', gap: '12px' }}>
          <GGButton variant="secondary" size="md" onClick={() => navigate('/app/dashboard')} style={{ flex: 1 }}>Back to Dashboard</GGButton>
          {status === 'approved' && <GGButton variant="primary" size="md" onClick={() => navigate('/app/credit')} style={{ flex: 2 }}>View Credit Wallet →</GGButton>}
        </div>
      </div>
    </AppLayout>
  )
}
