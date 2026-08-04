import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'

const DISCLOSURES = [
  { title: 'Third-Party Finance Partner', body: "Credit is processed and held by our authorised finance partner. GG'APP acts as a facilitator and is not the lender." },
  { title: 'Credit Check Consent', body: 'By proceeding, you consent to a credit bureau enquiry. This may temporarily affect your credit score.' },
  { title: 'Healthcare Use Only', body: "Approved credit can only be used to pay GG'APP-verified service providers. Funds cannot be transferred to a personal bank account." },
  { title: 'Platform Admin Fee', body: "A platform administration fee of 2.5% of the approved credit amount is deducted and remitted to GG'APP upon disbursement. This fee covers platform facilitation, provider verification, and transaction processing. The remaining balance is loaded to your wallet for healthcare use." },
  { title: 'Credit Obligation', body: 'You are responsible for settling the full approved amount plus applicable interest as per the credit agreement issued by the finance partner upon approval. The admin fee is included in the amount you repay to the finance partner.' },
  { title: 'Eligibility', body: "Approval is subject to the finance partner's assessment criteria. GG'APP does not guarantee credit approval." },
]

export function CreditDisclaimerScreen() {
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)

  return (
    <AppLayout title="Apply for Balance" subtitle="Healthcare credit facility" back notifCount={1}>
      <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="36px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={C.blue500} strokeWidth="1.5"/><line x1="12" y1="8" x2="12" y2="13" stroke={C.blue500} strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill={C.blue500}/></svg>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>Important Disclosure</div>
              <div style={{ fontSize: '13px', color: C.textSub, marginTop: '2px' }}>Please read carefully before proceeding</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            {DISCLOSURES.map((item, i) => (
              <div key={i} style={{ padding: '14px 16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>{item.body}</div>
              </div>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginBottom: '24px', padding: '14px 16px', background: agreed ? C.successBg : C.bg, borderRadius: radius.sm, border: `1.5px solid ${agreed ? C.success : C.border}`, transition: 'all 0.2s ease' }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ accentColor: C.success, width: 16, height: 16, marginTop: '1px', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: C.text, lineHeight: 1.6, fontFamily: font.family }}>
              I have read and understood the above disclosure, including the platform admin fee. I consent to a credit bureau check and agree to the{' '}
              <span style={{ color: C.blue500, fontWeight: 600 }}>Finance Partner Terms</span>.
            </span>
          </label>

          <div style={{ display: 'flex', gap: '12px' }}>
            <GGButton variant="secondary" size="md" onClick={() => navigate('/app/dashboard')} style={{ flex: 1 }}>Cancel</GGButton>
            <GGButton variant="primary" size="md" disabled={!agreed} onClick={() => navigate('/app/credit/apply')} style={{ flex: 2 }}>
              Proceed to Application →
            </GGButton>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
