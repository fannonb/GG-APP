import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge, GGAvatar, GGTextarea } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_INVOICE, MOCK_USER } from '@/mock/patient.mock'
import { getCountryByCode } from '@/config/countries'
import { FlagImg } from '@/components/FlagImg'

export function InvoiceReviewScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const inv = MOCK_INVOICE
  const country = getCountryByCode(MOCK_USER.countryCode)
  const currency = country?.currencySymbol ?? 'Z$'
  const [showDispute, setShowDispute] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')

  return (
    <AppLayout title="Invoice Review" subtitle={inv.id} back notifCount={0}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>

        {/* Security notice */}
        <div style={{ padding: '14px 22px', background: `linear-gradient(90deg, ${C.navy900}, ${C.navy800})`, borderRadius: radius.sm, display: 'flex', gap: '14px', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}><path d="M9 2L3 5v5c0 3.9 2.6 7.5 6 8.3 3.4-.8 6-4.4 6-8.3V5L9 2z" stroke={C.blue500} strokeWidth="1.3" fill="none"/><path d="M6 9l2 2 4-4" stroke={C.success} strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', fontFamily: font.family }}>
            <strong style={{ color: C.blue500 }}>Security-critical flow.</strong> Triple-PIN authorization constitutes your legally binding payment consent.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '28px', alignItems: 'start' }}>
          {/* Invoice details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GGCard padding="32px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '24px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Invoice From</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{inv.provider.name}</div>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '5px' }}>{inv.provider.address}</div>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '2px' }}>Licence: {inv.provider.license}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <GGBadge type="warning">Pending Auth</GGBadge>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '10px' }}>Invoice Date: {formatDate(inv.date)}</div>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '3px' }}>Due: {formatDate(inv.dueDate)}</div>
                </div>
              </div>

              {/* Billed to / Service recipient */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '24px', paddingBottom: '24px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ padding: '16px 18px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Billed To (Account Holder)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <GGAvatar name={inv.billedTo.name} size={32} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{inv.billedTo.name}</div>
                      <div style={{ fontSize: '11px', color: C.textSub }}>Balance Account Holder</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '16px 18px', borderRadius: radius.sm, border: `2px solid ${inv.serviceFor.type === 'beneficiary' ? 'rgba(74,173,223,0.35)' : C.border}`, background: inv.serviceFor.type === 'beneficiary' ? C.blue100 : C.bg }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: inv.serviceFor.type === 'beneficiary' ? C.blue500 : C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Service Recipient</div>
                  {inv.serviceFor.type === 'beneficiary' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', fontFamily: font.family }}>{inv.serviceFor.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800 }}>{inv.serviceFor.name}</div>
                        <div style={{ fontSize: '11px', color: C.blue500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <GGBadge type="info">Beneficiary</GGBadge>
                          <span>{inv.serviceFor.relation} · Age {inv.serviceFor.age}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <GGAvatar name={inv.billedTo.name} size={32} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{inv.billedTo.name}</div>
                        <div style={{ fontSize: '11px', color: C.textSub }}>Self (Account Holder)</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Line items */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Services Rendered</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {inv.services.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: '14px', color: C.text }}>{s.name}</span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>{formatCurrency(s.amount, currency)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 0', marginTop: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>Total Amount</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{formatCurrency(inv.amount, currency)}</span>
              </div>
            </GGCard>

            {/* PDF download */}
            <GGCard padding="22px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: C.errorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke={C.error} strokeWidth="1.4"/><path d="M7 7h6M7 10h6M7 13h4" stroke={C.error} strokeWidth="1.2" strokeLinecap="round"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Invoice Document (PDF)</div>
                  <div style={{ fontSize: '12px', color: C.textSub }}>Original invoice uploaded by service provider</div>
                </div>
                <GGButton variant="secondary" size="sm">Download</GGButton>
              </div>
            </GGCard>

            {/* Dispute */}
            {showDispute ? (
              <GGCard padding="22px" style={{ border: `1.5px solid ${C.error}`, background: C.errorBg }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.error, marginBottom: '12px' }}>Flag a Dispute</div>
                <GGTextarea label="Reason for Dispute" placeholder="Describe the issue with this invoice…" value={disputeReason} onChange={e => setDisputeReason(e.target.value)} required rows={4} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <GGButton variant="secondary" size="sm" onClick={() => setShowDispute(false)}>Cancel</GGButton>
                  <GGButton variant="danger" size="sm" disabled={!disputeReason.trim()}>Submit Dispute</GGButton>
                </div>
              </GGCard>
            ) : (
              <button onClick={() => setShowDispute(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: C.error, fontWeight: 600, fontFamily: font.family, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2l5 9H2z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/><line x1="7" y1="6" x2="7" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="7" cy="10" r="0.7" fill="currentColor"/></svg>
                Flag a dispute with this invoice
              </button>
            )}
          </div>

          {/* Authorize sidebar */}
          <div style={{ position: isMobile ? 'static' : 'sticky', top: '20px' }}>
            <GGCard padding="28px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>Payment Summary</div>
                {country && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '20px', background: C.bg, border: `1px solid ${C.border}` }}>
                    <FlagImg code={country.code} size={14} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, fontFamily: font.family }}>{country.currencyCode}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '22px' }}>
                {[
                  { label: 'Invoice Amount',   val: formatCurrency(inv.amount, currency), bold: true },
                  { label: 'Available Balance', val: formatCurrency(MOCK_USER.creditAvailable, currency) },
                  { label: 'After Payment',    val: formatCurrency(MOCK_USER.creditAvailable - inv.amount, currency), color: C.warning },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: '13px', color: C.textSub }}>{item.label}</span>
                    <span style={{ fontSize: '15px', fontWeight: item.bold ? 800 : 600, color: item.color ?? C.text }}>{item.val}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 16px', background: C.blue100, borderRadius: radius.sm, marginBottom: '20px', fontSize: '13px', color: '#1A5D8A', lineHeight: 1.65 }}>
                <strong>Triple-PIN Required.</strong> You will need to enter your 4–6 digit PIN three times to authorize this payment.
              </div>
              <GGButton variant="success" size="md" fullWidth onClick={() => navigate(`/app/invoices/${inv.id}/pay`)}>
                Proceed to Authorization →
              </GGButton>
            </GGCard>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
