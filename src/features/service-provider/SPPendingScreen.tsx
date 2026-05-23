import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'

const refNum = 'SP-APP-847291'
const timeline = [
  { step: 'Application Submitted',          done: true,  active: false, date: '20 May 2026, 10:15' },
  { step: 'Automated Acknowledgement Sent', done: true,  active: false, date: '20 May 2026, 10:16' },
  { step: 'Document Verification',          done: false, active: true,  date: 'In progress (1–2 business days)' },
  { step: 'Licence Verification',           done: false, active: false, date: undefined },
  { step: 'Admin Decision',                 done: false, active: false, date: undefined },
  { step: 'Account Activation',             done: false, active: false, date: undefined },
]

export function SPPendingScreen() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', fontFamily: font.family }}>
      <div style={{ maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Status hero */}
        <GGCard padding="36px" style={{ background: `linear-gradient(135deg, ${C.navy900}, ${C.navy800})`, border: 'none', textAlign: 'center' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(34,201,138,0.12)', border: '2px solid rgba(34,201,138,0.25)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="M6 15l6 6 12-12" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', marginBottom: '8px' }}>Application Received!</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: '16px' }}>
            Your GG'APP provider application has been submitted. Our admin team will review your documents within{' '}
            <strong style={{ color: C.success }}>2–3 business days</strong>.
          </div>
          <div style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(34,201,138,0.12)', border: '1px solid rgba(34,201,138,0.2)', borderRadius: radius.full, fontSize: '13px', fontWeight: 700, color: C.success }}>
            Reference: {refNum}
          </div>
        </GGCard>

        {/* Timeline */}
        <GGCard padding="28px">
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '22px' }}>Review Timeline</div>
          {timeline.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', paddingBottom: i < timeline.length - 1 ? '20px' : 0, position: 'relative' }}>
              {i < timeline.length - 1 && (
                <div style={{ position: 'absolute', left: '15px', top: '32px', width: '2px', height: 'calc(100% - 8px)', background: t.done ? C.success : C.border }} />
              )}
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: t.done ? C.success : t.active ? C.warning : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, boxShadow: t.active ? `0 0 0 4px ${C.warningBg}` : 'none' }}>
                {t.done
                  ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                }
              </div>
              <div style={{ paddingTop: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: t.done || t.active ? 600 : 400, color: t.done ? C.text : t.active ? C.warning : C.textLight }}>
                  {t.step}
                </div>
                {t.date && <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{t.date}</div>}
              </div>
            </div>
          ))}
        </GGCard>

        {/* Info */}
        <GGCard padding="20px" style={{ background: C.successBg, border: '1px solid rgba(34,201,138,0.2)' }}>
          <div style={{ fontSize: '13px', color: '#0D6B47', lineHeight: 1.7 }}>
            <strong>What happens next?</strong> You'll receive an email at each stage of the review. Upon approval, click the activation link in your welcome email to access the provider portal. If we need additional information, our team will contact you directly.
          </div>
        </GGCard>

        <div style={{ display: 'flex', gap: '12px' }}>
          <GGButton variant="secondary" size="md" onClick={() => navigate('/login')} style={{ flex: 1 }}>Back to Login</GGButton>
          <GGButton variant="success" size="md" onClick={() => navigate('/sp/dashboard')} style={{ flex: 2 }}>Preview Portal →</GGButton>
        </div>
      </div>
    </div>
  )
}
