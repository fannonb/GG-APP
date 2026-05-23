import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GGInput, GGButton, GGTextarea } from '@/design-system'
import { GGCard } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'

interface RecordVisitContext {
  patientName: string
  patientId?: string
  appointmentId?: string
  conditions?: string[]
  allergies?: string[]
  medications?: string[]
}

const COMMON_SERVICES = [
  'Consultation', 'Blood Pressure Check', 'Blood Test', 'Urine Analysis',
  'ECG', 'X-Ray', 'Ultrasound', 'Wound Dressing', 'Vaccination',
  'Physiotherapy', 'Glucose Test', 'Prescription Only',
]

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
      <div style={{ width: 36, height: 36, borderRadius: '10px', background: C.blue100, border: `1px solid rgba(74,173,223,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{title}</div>
        {sub && <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  )
}

export function SPRecordVisitScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile } = useResponsive()

  const ctx: RecordVisitContext = (location.state as { ctx: RecordVisitContext } | null)?.ctx ?? {
    patientName: 'Unknown Patient',
  }

  const [vitals, setVitals] = useState({ bp: '', temp: '', weight: '', sats: '' })
  const [diagnosis, setDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [customService, setCustomService] = useState('')
  const [saved, setSaved] = useState(false)

  const setV = (k: keyof typeof vitals, v: string) => setVitals(prev => ({ ...prev, [k]: v }))

  const toggleService = (s: string) =>
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const addCustomService = () => {
    const val = customService.trim()
    if (val && !services.includes(val)) setServices(prev => [...prev, val])
    setCustomService('')
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => navigate('/sp/invoices/upload'), 1800)
  }

  const isComplete = diagnosis.trim() && treatment.trim() && services.length > 0

  return (
    <SPLayout title="Record Visit" subtitle={ctx.patientName} notifCount={2}>

      {/* Success banner */}
      {saved && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999, padding: '14px 24px', background: C.successBg, border: `1.5px solid rgba(34,201,138,0.35)`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: shadow.lg, fontFamily: font.family }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" fill={C.success}/><path d="M5.5 9l3 3 4-4.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0D6B47' }}>Visit recorded. Redirecting to invoice upload…</span>
        </div>
      )}

      {/* Back */}
      <button onClick={() => navigate(-1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: radius.sm, border: `1.5px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: C.textSub, fontSize: '13px', fontWeight: 600, fontFamily: font.family, marginBottom: '22px', transition: 'all 0.13s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue500; e.currentTarget.style.color = C.blue500 }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: '20px', alignItems: 'flex-start' }}>

        {/* ── Main form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 1. Vitals */}
          <GGCard padding="24px">
            <SectionHeader
              title="Patient Vitals"
              sub="Record measurements taken during this visit"
              icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M2 9h14" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round"/></svg>}
            />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: '12px' }}>
              <GGInput label="Blood Pressure" placeholder="e.g. 120/80" value={vitals.bp}     onChange={e => setV('bp',     e.target.value)} hint="mmHg" />
              <GGInput label="Temperature"    placeholder="e.g. 36.8"   value={vitals.temp}   onChange={e => setV('temp',   e.target.value)} hint="°C" />
              <GGInput label="Weight"         placeholder="e.g. 72"     value={vitals.weight} onChange={e => setV('weight', e.target.value)} hint="kg" />
              <GGInput label="O₂ Saturation"  placeholder="e.g. 98"     value={vitals.sats}   onChange={e => setV('sats',   e.target.value)} hint="%" />
            </div>
          </GGCard>

          {/* 2. Diagnosis */}
          <GGCard padding="24px">
            <SectionHeader
              title="Diagnosis & Clinical Findings"
              sub="Document your clinical assessment and findings"
              icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="2" stroke={C.blue500} strokeWidth="1.4"/><path d="M6 6h6M6 9h6M6 12h4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/></svg>}
            />
            <GGTextarea
              label="Diagnosis / Clinical Findings"
              placeholder="e.g. Patient presents with hypertension (Stage 1). BP elevated at 145/92. No signs of end-organ damage. Recommend lifestyle modification and pharmacological management."
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              required
              rows={4}
            />
          </GGCard>

          {/* 3. Treatment */}
          <GGCard padding="24px">
            <SectionHeader
              title="Treatment & Prescription"
              sub="Record medications prescribed and procedures performed"
              icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6 9h6M9 6v6" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round"/><rect x="2" y="2" width="14" height="14" rx="3" stroke={C.blue500} strokeWidth="1.4"/></svg>}
            />
            <GGTextarea
              label="Treatment / Prescription"
              placeholder="e.g. Prescribed Amlodipine 5mg once daily. Advised low-sodium diet and 30 min moderate exercise daily. Follow-up in 4 weeks."
              value={treatment}
              onChange={e => setTreatment(e.target.value)}
              required
              rows={4}
            />
          </GGCard>

          {/* 4. Services Rendered */}
          <GGCard padding="24px">
            <SectionHeader
              title="Services Rendered"
              sub="Select all services performed during this consultation"
              icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-8" stroke={C.blue500} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {COMMON_SERVICES.map(s => {
                const active = services.includes(s)
                return (
                  <button key={s} onClick={() => toggleService(s)} style={{ padding: '7px 14px', borderRadius: radius.full, border: `1.5px solid ${active ? C.blue500 : C.border}`, background: active ? C.blue100 : '#fff', color: active ? '#1A5D8A' : C.textSub, fontSize: '12px', fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.13s' }}>
                    {active && <span style={{ marginRight: '4px' }}>✓</span>}{s}
                  </button>
                )
              })}
            </div>
            {/* Custom service entry */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <GGInput
                  placeholder="Add custom service…"
                  value={customService}
                  onChange={e => setCustomService(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && addCustomService()}
                />
              </div>
              <GGButton variant="secondary" size="md" onClick={addCustomService} disabled={!customService.trim()}>Add</GGButton>
            </div>
            {services.length > 0 && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px', fontFamily: font.family }}>{services.length} service{services.length !== 1 ? 's' : ''} selected</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {services.map(s => (
                    <span key={s} onClick={() => toggleService(s)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: radius.full, background: C.blue100, border: `1px solid rgba(74,173,223,0.3)`, fontSize: '12px', fontWeight: 600, color: '#1A5D8A', cursor: 'pointer', fontFamily: font.family }}>
                      {s}
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </GGCard>

          {/* 5. Follow-up */}
          <GGCard padding="24px">
            <SectionHeader
              title="Follow-up Instructions"
              sub="Instructions shared with the patient after this visit"
              icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke={C.blue500} strokeWidth="1.4"/><path d="M6 7h6M6 10h4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/><path d="M6 1v3M12 1v3" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/></svg>}
            />
            <GGTextarea
              label="Follow-up Instructions"
              placeholder="e.g. Return in 4 weeks for blood pressure review. Avoid salt, alcohol and smoking. Take medication at the same time each day. Visit A&E if BP exceeds 160/100 or you experience chest pain."
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              rows={3}
            />
          </GGCard>

          {/* 6. Internal Note */}
          <GGCard padding="24px">
            <SectionHeader
              title="Internal Note"
              sub="Private clinical note — not visible to the patient"
              icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3a6 6 0 100 12A6 6 0 009 3z" stroke={C.textSub} strokeWidth="1.4"/><path d="M9 7v4M9 12v.5" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg>}
            />
            <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid rgba(245,166,35,0.3)', borderRadius: radius.sm, marginBottom: '14px', fontSize: '12px', color: '#8A4D00', fontFamily: font.family }}>
              This note is only visible to your practice. It will not appear in patient-facing summaries.
            </div>
            <GGTextarea
              label="Internal Note"
              placeholder="e.g. Patient was non-compliant with previous prescription. Emphasised importance of daily medication. Consider escalating to specialist if no improvement in 8 weeks."
              value={internalNote}
              onChange={e => setInternalNote(e.target.value)}
              rows={3}
            />
          </GGCard>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ position: isMobile ? 'static' : 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Patient context */}
          <GGCard padding="20px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: font.family }}>Patient Context</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', marginBottom: '4px', fontFamily: font.family }}>{ctx.patientName}</div>
            {ctx.appointmentId && (
              <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '14px', fontFamily: font.family }}>Ref: {ctx.appointmentId}</div>
            )}
            {ctx.conditions && ctx.conditions.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: C.textSub, marginBottom: '6px', fontFamily: font.family }}>Known Conditions</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {ctx.conditions.map(c => (
                    <span key={c} style={{ fontSize: '11px', color: '#8A4D00', background: C.warningBg, border: '1px solid rgba(245,166,35,0.25)', padding: '3px 9px', borderRadius: radius.full, fontWeight: 600, fontFamily: font.family }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
            {ctx.allergies && ctx.allergies.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: C.textSub, marginBottom: '6px', fontFamily: font.family }}>Allergies</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {ctx.allergies.map(a => (
                    <span key={a} style={{ fontSize: '11px', color: '#A83236', background: C.errorBg, border: '1px solid rgba(229,71,77,0.2)', padding: '3px 9px', borderRadius: radius.full, fontWeight: 600, fontFamily: font.family }}>⚠ {a}</span>
                  ))}
                </div>
              </div>
            )}
            {ctx.medications && ctx.medications.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: C.textSub, marginBottom: '6px', fontFamily: font.family }}>Current Medications</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {ctx.medications.map(m => (
                    <div key={m} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', fontSize: '12px', color: C.text, fontFamily: font.family }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue500, marginTop: '6px', flexShrink: 0 }} />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GGCard>

          {/* Checklist */}
          <GGCard padding="20px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: font.family }}>Completion Checklist</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {[
                { label: 'Vitals recorded',        done: Object.values(vitals).some(v => v.trim()) },
                { label: 'Diagnosis documented',   done: !!diagnosis.trim() },
                { label: 'Treatment documented',   done: !!treatment.trim() },
                { label: 'Services selected',      done: services.length > 0 },
                { label: 'Follow-up instructions', done: !!followUp.trim() },
              ].map(({ label, done }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '5px', background: done ? C.success : C.bg, border: `1.5px solid ${done ? C.success : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: '12px', color: done ? C.text : C.textSub, fontWeight: done ? 600 : 400, fontFamily: font.family }}>{label}</span>
                </div>
              ))}
            </div>
          </GGCard>

          {/* Save */}
          <GGCard padding="20px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <GGButton variant="success" size="md" fullWidth onClick={handleSave} disabled={!isComplete || saved}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {saved ? 'Saved!' : 'Save & Proceed to Invoice'}
              </GGButton>
              <GGButton variant="secondary" size="md" fullWidth onClick={handleSave} disabled={!isComplete || saved}>
                Save Without Invoice
              </GGButton>
              {!isComplete && (
                <div style={{ fontSize: '11px', color: C.textSub, textAlign: 'center', fontFamily: font.family, lineHeight: 1.5 }}>
                  Diagnosis, treatment and at least one service are required.
                </div>
              )}
            </div>
          </GGCard>
        </div>
      </div>
    </SPLayout>
  )
}
