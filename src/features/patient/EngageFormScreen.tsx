import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GGCard, GGButton, GGInput, GGSelect, GGTextarea, GGDivider } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { MOCK_PROVIDERS, MOCK_BENEFICIARIES } from '@/mock/patient.mock'
import type { Provider } from '@/types/provider.types'

const TIMES = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00']

export function EngageFormScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { state } = useLocation() as { state?: { provider?: Provider } }
  const p = state?.provider ?? MOCK_PROVIDERS[0]

  const [form, setForm] = useState({ description: '', date: '', time: '', forSelf: true, beneficiary: null as { id: string; name: string; relation: string; age: number } | null, selectedServices: [] as string[] })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [earliestDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    const e: Record<string, string> = {}
    if (!form.description.trim()) e.description = 'Please describe your request'
    if (!form.date)              e.date = 'Please select a preferred date'
    if (!form.time)              e.time = 'Please select a preferred time'
    if (!form.forSelf && !form.beneficiary) e.beneficiary = 'Please select a beneficiary'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/app/booking/confirm', { state: { provider: p, booking: form } }) }, 1500)
  }

  return (
    <AppLayout title="Engagement Request" subtitle={`Sending request to ${p.name}`} back notifCount={1}>
      <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="36px">
          {/* Provider mini card */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, marginBottom: '28px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{p.name[0]}</span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{p.name}</div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', textTransform: 'capitalize' }}>{p.category} · {p.distance} · <span style={{ color: p.status === 'open' ? C.success : C.error, fontWeight: 600 }}>{p.status}</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Who is this for */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px' }}>Who is this appointment for? <span style={{ color: C.error }}>*</span></div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: form.forSelf ? 0 : '14px' }}>
                {[
                  { val: true,  label: 'Myself',        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
                  { val: false, label: 'A Beneficiary', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 13c0-2.5 2-4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="11" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 14c0-2.8 1.8-5 4-5s4 2.2 4 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
                ].map(opt => (
                  <button key={String(opt.val)} onClick={() => { set('forSelf', opt.val); if (opt.val) set('beneficiary', null) }}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: radius.sm, border: `2px solid ${form.forSelf === opt.val ? C.blue500 : C.border}`, background: form.forSelf === opt.val ? C.blue100 : C.bg, color: form.forSelf === opt.val ? C.blue500 : C.textSub, fontSize: '14px', fontWeight: form.forSelf === opt.val ? 700 : 500, cursor: 'pointer', fontFamily: font.family, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.14s' }}>
                    {opt.icon}{opt.label}
                  </button>
                ))}
              </div>

              {!form.forSelf && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: C.textSub }}>Select a beneficiary from your registered list:</div>
                  {MOCK_BENEFICIARIES.map(ben => {
                    const selected = form.beneficiary?.id === ben.id
                    return (
                      <div key={ben.id} onClick={() => set('beneficiary', ben)}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: radius.sm, border: `2px solid ${selected ? C.blue500 : C.border}`, background: selected ? C.blue100 : '#fff', cursor: 'pointer', transition: 'all 0.14s' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: selected ? C.blue500 : C.bg, border: `2px solid ${selected ? C.blue500 : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.14s' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: selected ? '#fff' : C.textSub, fontFamily: font.family }}>{ben.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{ben.name}</div>
                          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{ben.relation} · Age {ben.age}</div>
                        </div>
                        {selected && <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill={C.blue500}/><path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    )
                  })}
                  {errors.beneficiary && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{errors.beneficiary}</span>}
                  {form.beneficiary && (
                    <div style={{ padding: '10px 14px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.25)`, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6 }}>
                      The invoice will be billed to <strong>Sarah Johnson (you)</strong> but will indicate the service was for <strong>{form.beneficiary.name}</strong> ({form.beneficiary.relation}).
                    </div>
                  )}
                </div>
              )}
            </div>

            <GGDivider />

            {/* Services checklist */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Services Required <span style={{ fontSize: '12px', fontWeight: 400, color: C.textSub }}>(optional)</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {p.services.map(svc => {
                  const checked = form.selectedServices.includes(svc)
                  return (
                    <label key={svc} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: radius.sm, border: `1.5px solid ${checked ? C.blue500 : C.border}`, background: checked ? C.blue100 : C.bg, cursor: 'pointer', transition: 'all 0.13s' }}
                      onClick={() => set('selectedServices', checked ? form.selectedServices.filter(s => s !== svc) : [...form.selectedServices, svc])}>
                      <div style={{ width: 18, height: 18, borderRadius: '5px', border: `2px solid ${checked ? C.blue500 : C.border}`, background: checked ? C.blue500 : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.13s' }}>
                        {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: checked ? 600 : 400, color: checked ? C.blue500 : C.text, fontFamily: font.family }}>{svc}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <GGTextarea label="Request Description" placeholder="Describe the medical need, symptoms, or service required." value={form.description} onChange={e => set('description', e.target.value)} required rows={4} />
            {errors.description && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '-12px' }}>{errors.description}</span>}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <GGInput label="Preferred Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} required error={errors.date} hint={`Earliest: ${earliestDate}`} />
              <GGSelect label="Preferred Time" value={form.time} onChange={e => set('time', e.target.value)} required placeholder="Select time" options={TIMES.map(t => ({ value: t, label: t }))} />
            </div>
            {errors.time && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '-12px' }}>{errors.time}</span>}

            {/* File upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Attachments <span style={{ fontSize: '12px', fontWeight: 400, color: C.textSub }}>(optional)</span></label>
              <div style={{ padding: '20px', border: `2px dashed ${C.border}`, borderRadius: radius.sm, textAlign: 'center', background: C.bg, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue500; e.currentTarget.style.background = C.blue100 }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto 8px', display: 'block' }}><rect x="5" y="7" width="18" height="16" rx="3" stroke={C.textSub} strokeWidth="1.4"/><path d="M14 11v8M10 15l4-4 4 4" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div style={{ fontSize: '13px', color: C.textSub }}>Drop files or <span style={{ color: C.blue500, fontWeight: 600 }}>click to upload</span></div>
                <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Prescriptions, referral letters, lab results (PDF, JPG, PNG)</div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.2)`, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6 }}>
              <strong>What happens next:</strong> Your request will be sent to {p.name}. You'll receive email and in-app confirmation.
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <GGButton variant="secondary" size="md" onClick={() => navigate(-1)} style={{ flex: 1 }}>← Cancel</GGButton>
              <GGButton variant="primary" size="md" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
                {loading ? 'Sending Request…' : 'Submit Request →'}
              </GGButton>
            </div>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
