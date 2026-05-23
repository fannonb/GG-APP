import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_SP_APPOINTMENTS } from '@/mock/sp.mock'

const SP_SERVICES = [
  'General Consultation', 'Blood Pressure Monitoring', 'ECG', 'Wound Dressing',
  'Prescription', 'Vaccination', 'Pathology Request', 'Specialist Referral',
]

interface FormState {
  patient: string
  services: string[]
  amount: string
  notes: string
  diagnosis: string
  followUp: string
  internalNote: string
  invoiceNumber: string
  uploadedFile: File | null
}

export function SPInvoiceUploadScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [form, setForm] = useState<FormState>({
    patient: '', services: [], amount: '', notes: '', diagnosis: '',
    followUp: '', internalNote: '', invoiceNumber: '', uploadedFile: null,
  })
  const [step, setStep] = useState(1)
  const [fileNameError, setFileNameError] = useState('')
  const [invoiceRef] = useState(() => 'INV-SP-' + Date.now().toString().slice(-6))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))

  const toggleSvc = (s: string) =>
    set('services', form.services.includes(s) ? form.services.filter(x => x !== s) : [...form.services, s])

  const totalAmt = form.services.length * 75

  const handleFileSelect = (file: File | null | undefined) => {
    if (!file) return
    const nameWithoutExt = file.name.replace(/\.pdf$/i, '')
    set('uploadedFile', file)
    if (form.invoiceNumber && nameWithoutExt.toLowerCase() !== form.invoiceNumber.trim().toLowerCase()) {
      setFileNameError(`File name "${nameWithoutExt}" does not match invoice number "${form.invoiceNumber.trim()}". Rename your PDF to match exactly.`)
    } else {
      setFileNameError('')
    }
  }

  const handleInvoiceNumberChange = (val: string) => {
    set('invoiceNumber', val)
    if (form.uploadedFile) {
      const nameWithoutExt = form.uploadedFile.name.replace(/\.pdf$/i, '')
      if (val.trim() && nameWithoutExt.toLowerCase() !== val.trim().toLowerCase()) {
        setFileNameError(`File name "${nameWithoutExt}" does not match invoice number "${val.trim()}". Rename your PDF to match exactly.`)
      } else {
        setFileNameError('')
      }
    }
  }

  const fileNameMatch = !!(
    form.uploadedFile && form.invoiceNumber &&
    form.uploadedFile.name.replace(/\.pdf$/i, '').toLowerCase() === form.invoiceNumber.trim().toLowerCase()
  )

  const confirmedApts = MOCK_SP_APPOINTMENTS.filter(a => a.status === 'confirmed' || a.status === 'completed')

  if (step === 3) return (
    <SPLayout title="Invoice Submitted" subtitle="Awaiting admin review">
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <GGCard padding={isMobile ? '32px 20px' : '48px 40px'} style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.successBg, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid rgba(34,201,138,0.25)` }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18l7 7 13-13" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '8px' }}>Invoice Submitted!</div>
          <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '24px' }}>
            Your invoice has been sent to the GG'APP admin team for review. Once approved, it will be forwarded to the patient for payment authorization. You'll be notified at each stage.
          </div>
          <div style={{ background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            {[
              { label: 'Invoice Ref', val: invoiceRef },
              { label: 'Patient',     val: form.patient || 'Sarah Johnson' },
              { label: 'Amount',      val: formatCurrency(Number(form.amount) || totalAmt) },
              { label: 'Status',      val: <GGBadge type="warning">Pending Admin Review</GGBadge> },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '13px', color: C.textSub }}>{item.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{item.val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <GGButton variant="secondary" size="md" onClick={() => navigate('/sp/invoices')} style={{ flex: 1 }}>View Invoices</GGButton>
            <GGButton variant="success"   size="md" onClick={() => navigate('/sp/dashboard')} style={{ flex: 1 }}>Dashboard</GGButton>
          </div>
        </GGCard>
      </div>
    </SPLayout>
  )

  return (
    <SPLayout title="Upload Invoice" subtitle="Post-appointment workflow">
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Step tabs */}
        <div style={{ display: 'flex', gap: '0', background: C.bg, borderRadius: '12px', padding: '4px', border: `1px solid ${C.border}` }}>
          {['Consultation Notes', 'Invoice Details'].map((s, i) => (
            <button key={s} onClick={() => setStep(i + 1)}
              style={{ flex: 1, padding: isMobile ? '8px 6px' : '9px', borderRadius: '9px', border: 'none', background: step === i + 1 ? '#fff' : 'transparent', color: step === i + 1 ? C.text : C.textSub, fontFamily: font.family, fontSize: isMobile ? '12px' : '13px', fontWeight: step === i + 1 ? 700 : 500, cursor: 'pointer', boxShadow: step === i + 1 ? shadow.sm : 'none', transition: 'all 0.14s', whiteSpace: 'nowrap' }}>
              {s}
            </button>
          ))}
        </div>

        {step === 1 && (
          <GGCard padding={isMobile ? '20px 16px' : '28px'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', fontFamily: font.family }}>Patient</div>
                <select value={form.patient} onChange={e => set('patient', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: form.patient ? C.text : C.textSub, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', appearance: 'none' }}>
                  <option value="">Select patient from confirmed appointment</option>
                  {confirmedApts.map(a => <option key={a.id} value={a.patient}>{a.patient} — {a.service} ({formatDate(a.date)})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', display: 'block', fontFamily: font.family }}>
                  Diagnosis & Clinical Findings <span style={{ color: C.error }}>*</span>
                </label>
                <textarea value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} rows={4}
                  placeholder="Document the diagnosis, clinical findings, and examination results…"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', display: 'block', fontFamily: font.family }}>
                  Prescribed Medications / Treatment Plan <span style={{ color: C.error }}>*</span>
                </label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                  placeholder="List medications prescribed, dosage, and treatment instructions…"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', display: 'block', fontFamily: font.family }}>
                  Follow-up Instructions <span style={{ fontSize: '11px', fontWeight: 400, color: C.textSub }}>(visible to patient)</span>
                </label>
                <textarea value={form.followUp} onChange={e => set('followUp', e.target.value)} rows={2}
                  placeholder="e.g. Return in 2 weeks, monitor blood pressure daily…"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', display: 'block', fontFamily: font.family }}>
                  Internal Quality Note <span style={{ fontSize: '11px', fontWeight: 400, color: C.textSub }}>(not visible to patient)</span>
                </label>
                <textarea value={form.internalNote} onChange={e => set('internalNote', e.target.value)} rows={2}
                  placeholder="Internal observations for platform quality review and compliance monitoring…"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6, fontFamily: font.family }}>
                The consultation summary is shared with the patient in their appointment history. Internal notes are used solely by GG'APP for quality and compliance monitoring.
              </div>
              <GGButton variant="success" size="md" fullWidth onClick={() => setStep(2)}>Continue to Invoice →</GGButton>
            </div>
          </GGCard>
        )}

        {step === 2 && (
          <GGCard padding={isMobile ? '20px 16px' : '28px'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Invoice number */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', fontFamily: font.family }}>
                  Invoice Number <span style={{ color: C.error }}>*</span>
                </div>
                <input type="text" value={form.invoiceNumber} onChange={e => handleInvoiceNumberChange(e.target.value)}
                  placeholder="e.g. INV-2026-0842"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, fontWeight: 600, color: C.text, background: C.bg, border: `1.5px solid ${form.invoiceNumber ? C.blue500 : C.border}`, borderRadius: radius.sm, outline: 'none', boxSizing: 'border-box', letterSpacing: '0.02em' }} />
                <div style={{ fontSize: '11px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
                  Must match exactly the filename of the PDF you upload (without the .pdf extension).
                </div>
              </div>

              <div style={{ height: '1px', background: C.border }} />

              {/* Services */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px', fontFamily: font.family }}>
                  Services Rendered <span style={{ color: C.error }}>*</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {SP_SERVICES.map(s => {
                    const active = form.services.includes(s)
                    return (
                      <button key={s} onClick={() => toggleSvc(s)}
                        style={{ padding: '7px 14px', borderRadius: radius.full, border: `1.5px solid ${active ? C.blue500 : C.border}`, background: active ? C.blue100 : C.bg, color: active ? '#1A5D8A' : C.textSub, fontSize: '13px', fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.13s' }}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', fontFamily: font.family }}>
                  Invoice Amount ({form.services.length} service{form.services.length !== 1 ? 's' : ''}) <span style={{ color: C.error }}>*</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 500, color: C.textSub, fontFamily: font.family }}>$</div>
                  <input type="number" value={form.amount || totalAmt} onChange={e => set('amount', e.target.value)}
                    placeholder={totalAmt.toString()}
                    style={{ flex: 1, padding: '10px 14px', fontSize: isMobile ? '16px' : '20px', fontFamily: font.family, fontWeight: 800, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', minWidth: 0 }} />
                </div>
                <div style={{ fontSize: '11px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>Enter amount in Z$. Admin will review before sending to patient.</div>
              </div>

              {/* File upload */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', fontFamily: font.family }}>
                  Invoice Document (PDF) <span style={{ color: C.error }}>*</span>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
                  onChange={e => handleFileSelect(e.target.files?.[0])} />

                {form.uploadedFile ? (
                  <div style={{ padding: '16px', border: `2px solid ${fileNameMatch ? C.success : C.error}`, borderRadius: radius.sm, background: fileNameMatch ? C.successBg : C.errorBg, display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: fileNameMatch ? 'rgba(34,201,138,0.15)' : 'rgba(229,71,77,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {fileNameMatch
                        ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 15L15 5M5 5l10 10" stroke={C.error} strokeWidth="2" strokeLinecap="round"/></svg>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: fileNameMatch ? '#0D6B47' : C.error, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font.family }}>{form.uploadedFile.name}</div>
                      <div style={{ fontSize: '11px', color: fileNameMatch ? '#13785A' : '#A83236', marginTop: '2px', fontFamily: font.family }}>
                        {fileNameMatch ? 'Filename matches invoice number ✓' : 'Filename mismatch — see warning below'}
                      </div>
                    </div>
                    <button onClick={() => { set('uploadedFile', null); setFileNameError(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, fontSize: '18px', lineHeight: 1, padding: '4px', flexShrink: 0 }}>×</button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]) }}
                    style={{ padding: isMobile ? '20px 16px' : '28px 24px', border: `2px dashed ${C.border}`, borderRadius: radius.sm, textAlign: 'center', background: C.bg, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.success; (e.currentTarget as HTMLDivElement).style.background = C.successBg }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.background = C.bg }}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto 8px' }}><rect x="4" y="2" width="20" height="24" rx="3" stroke={C.textSub} strokeWidth="1.4"/><path d="M8 10h12M8 14h12M8 18h8" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>Drop invoice PDF or <span style={{ color: C.success, fontWeight: 600 }}>click to upload</span></div>
                    <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px', fontFamily: font.family }}>PDF format · Max 10 MB · Filename must match invoice number</div>
                  </div>
                )}

                {fileNameError && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', background: C.errorBg, borderRadius: radius.sm, border: `1px solid rgba(229,71,77,0.25)`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="8" cy="8" r="6.5" stroke={C.error} strokeWidth="1.3"/><line x1="8" y1="5" x2="8" y2="9" stroke={C.error} strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11" r="0.8" fill={C.error}/></svg>
                    <span style={{ fontSize: '12px', color: C.error, fontFamily: font.family, lineHeight: 1.5 }}>{fileNameError}</span>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, border: '1px solid rgba(74,173,223,0.2)', fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6, fontFamily: font.family }}>
                Your invoice will be sent directly to the patient for payment authorization. The GG'APP admin team is only involved in the event of a dispute.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <GGButton variant="secondary" size="md" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</GGButton>
                <GGButton variant="success" size="md"
                  disabled={!form.invoiceNumber.trim() || !form.uploadedFile || !!fileNameError}
                  onClick={() => setStep(3)} style={{ flex: 2 }}>
                  Submit Invoice →
                </GGButton>
              </div>
            </div>
          </GGCard>
        )}
      </div>
    </SPLayout>
  )
}
