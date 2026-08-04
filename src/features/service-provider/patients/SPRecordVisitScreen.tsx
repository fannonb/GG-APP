import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GGButton, GGCard, GGInput, GGTextarea } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useCreateSPVisitMutation } from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { route, ROUTES } from '@/router/routes'

interface RecordVisitContext {
  patientId?: string
  patientName: string
  appointmentId?: string
  conditions?: string[]
  allergies?: string[]
  medications?: string[]
}

const COMMON_SERVICES = [
  'Consultation',
  'Blood Pressure Check',
  'Blood Test',
  'Urine Analysis',
  'ECG',
  'X-Ray',
  'Ultrasound',
  'Wound Dressing',
  'Vaccination',
  'Physiotherapy',
  'Glucose Test',
  'Prescription Only',
]

export function SPRecordVisitScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const createVisitMutation = useCreateSPVisitMutation()

  const ctx: RecordVisitContext = (location.state as { ctx?: RecordVisitContext } | null)?.ctx ?? {
    patientName: 'Unknown Patient',
  }

  const [diagnosis, setDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [bp, setBp] = useState('')
  const [temp, setTemp] = useState('')
  const [glucose, setGlucose] = useState('')
  const [sats, setSats] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [customService, setCustomService] = useState('')
  const [error, setError] = useState<string | null>(null)

  const toggleService = (service: string) => {
    setServices(current =>
      current.includes(service)
        ? current.filter(item => item !== service)
        : [...current, service],
    )
  }

  const addCustomService = () => {
    const value = customService.trim()
    if (!value) return
    setServices(current => (current.includes(value) ? current : [...current, value]))
    setCustomService('')
  }

  const vitalsComplete =
    bp.trim().length > 0 &&
    temp.trim().length > 0 &&
    glucose.trim().length > 0 &&
    sats.trim().length > 0

  const isComplete =
    diagnosis.trim() && treatment.trim() && services.length > 0 && vitalsComplete

  const handleSave = async (proceedToInvoice: boolean) => {
    setError(null)

    if (!ctx.patientId) {
      setError('This visit is missing the patient reference. Open the visit from a patient or appointment record and try again.')
      return
    }

    if (!vitalsComplete) {
      setError('Blood pressure, temperature, glucometer, and O₂ sats are required before saving.')
      return
    }

    try {
      const vitals = {
        bp: bp.trim(),
        temp: temp.trim(),
        glucose: glucose.trim(),
        sats: sats.trim(),
      }

      const visit = await createVisitMutation.mutateAsync({
        patientId: ctx.patientId,
        appointmentId: ctx.appointmentId,
        diagnosis: diagnosis.trim(),
        treatment: treatment.trim(),
        followUp: followUp.trim() || undefined,
        services,
        vitals,
      })

      if (proceedToInvoice) {
        navigate(ROUTES.SP_INVOICE_UPLOAD, {
          state: {
            prefill: {
              appointmentId: ctx.appointmentId,
              patientId: ctx.patientId,
              patientName: ctx.patientName,
              diagnosis: visit.diagnosis ?? diagnosis.trim(),
              treatment: visit.treatment ?? treatment.trim(),
              followUp: visit.followUp ?? followUp.trim(),
              services: visit.services,
              visitId: visit.id,
            },
          },
        })
        return
      }

      if (ctx.appointmentId) {
        navigate(route.spAppointment(ctx.appointmentId))
        return
      }

      navigate(route.spPatient(ctx.patientId))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save this visit right now. Please try again.',
      )
    }
  }

  return (
    <SPLayout title="Record Visit" subtitle={ctx.patientName}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '8px 16px',
          borderRadius: radius.sm,
          border: `1.5px solid ${C.border}`,
          background: '#fff',
          cursor: 'pointer',
          color: C.textSub,
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: font.family,
          marginBottom: '22px',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GGCard padding="24px">
            <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, marginBottom: '6px', fontFamily: font.family }}>
              Vitals
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '18px', fontFamily: font.family }}>
              These readings are required before you can save the visit.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <GGInput
                label="Blood Pressure"
                value={bp}
                onChange={event => setBp(event.target.value)}
                placeholder="e.g. 120/80 mmHg"
                required
              />
              <GGInput
                label="Temperature"
                value={temp}
                onChange={event => setTemp(event.target.value)}
                placeholder="e.g. 36.8°C"
                required
              />
              <GGInput
                label="Glucometer"
                value={glucose}
                onChange={event => setGlucose(event.target.value)}
                placeholder="e.g. 5.4 mmol/L"
                required
              />
              <GGInput
                label="O₂ Sats"
                value={sats}
                onChange={event => setSats(event.target.value)}
                placeholder="e.g. 98%"
                required
              />
            </div>
          </GGCard>

          <GGCard padding="24px">
            <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, marginBottom: '6px', fontFamily: font.family }}>
              Clinical Summary
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '18px', fontFamily: font.family }}>
              Save this visit to the backend so it can be reused in billing and provider history.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <GGTextarea
                label="Diagnosis / Clinical Findings"
                value={diagnosis}
                onChange={event => setDiagnosis(event.target.value)}
                rows={5}
                required
              />
              <GGTextarea
                label="Treatment / Prescription"
                value={treatment}
                onChange={event => setTreatment(event.target.value)}
                rows={4}
                required
              />
              <GGTextarea
                label="Follow-up Instructions"
                value={followUp}
                onChange={event => setFollowUp(event.target.value)}
                rows={3}
              />
            </div>
          </GGCard>

          <GGCard padding="24px">
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '12px', fontFamily: font.family }}>
              Services Rendered
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {COMMON_SERVICES.map(service => {
                const active = services.includes(service)
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    aria-pressed={active}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: active ? '7px 10px 7px 14px' : '7px 14px',
                      borderRadius: radius.full,
                      border: `1.5px solid ${active ? C.blue500 : C.border}`,
                      background: active ? C.blue100 : '#fff',
                      color: active ? C.blue500 : C.textSub,
                      fontSize: '12px',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: font.family,
                    }}
                  >
                    {service}
                    {active && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Remove ${service}`}
                        onClick={event => {
                          event.stopPropagation()
                          toggleService(service)
                        }}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            event.stopPropagation()
                            toggleService(service)
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: 'rgba(74,173,223,0.25)',
                          color: '#1A5D8A',
                          fontSize: '12px',
                          lineHeight: 1,
                          fontWeight: 700,
                        }}
                      >
                        ×
                      </span>
                    )}
                  </button>
                )
              })}
              {services
                .filter(service => !COMMON_SERVICES.includes(service))
                .map(service => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 10px 7px 14px',
                      borderRadius: radius.full,
                      border: `1.5px solid ${C.blue500}`,
                      background: C.blue100,
                      color: C.blue500,
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: font.family,
                    }}
                  >
                    {service}
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'rgba(74,173,223,0.25)',
                        color: '#1A5D8A',
                        fontSize: '12px',
                        lineHeight: 1,
                        fontWeight: 700,
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <GGInput
                  placeholder="Add custom service"
                  value={customService}
                  onChange={event => setCustomService(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addCustomService()
                    }
                  }}
                />
              </div>
              <GGButton variant="secondary" size="md" onClick={addCustomService} disabled={!customService.trim()}>
                Add
              </GGButton>
            </div>
            {services.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: C.textSub, fontFamily: font.family }}>
                {services.length} selected · click a service or × to remove
              </div>
            )}
          </GGCard>
        </div>

        <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GGCard padding="20px">
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontFamily: font.family }}>
              Patient Context
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, marginBottom: '6px', fontFamily: font.family }}>
              {ctx.patientName}
            </div>
            {ctx.appointmentId && (
              <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '12px', fontFamily: font.family }}>
                Appointment: {ctx.appointmentId}
              </div>
            )}
            {ctx.conditions && ctx.conditions.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSub, marginBottom: '6px', fontFamily: font.family }}>
                  Known Conditions
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ctx.conditions.map(condition => (
                    <span
                      key={condition}
                      style={{
                        padding: '4px 10px',
                        borderRadius: radius.full,
                        background: C.warningBg,
                        border: '1px solid rgba(245,166,35,0.25)',
                        color: '#8A4D00',
                        fontSize: '11px',
                        fontWeight: 600,
                        fontFamily: font.family,
                      }}
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ctx.allergies && ctx.allergies.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSub, marginBottom: '6px', fontFamily: font.family }}>
                  Allergies
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ctx.allergies.map(allergy => (
                    <span
                      key={allergy}
                      style={{
                        padding: '4px 10px',
                        borderRadius: radius.full,
                        background: C.errorBg,
                        border: '1px solid rgba(229,71,77,0.2)',
                        color: '#A83236',
                        fontSize: '11px',
                        fontWeight: 600,
                        fontFamily: font.family,
                      }}
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ctx.medications && ctx.medications.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSub, marginBottom: '6px', fontFamily: font.family }}>
                  Current Medications
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ctx.medications.map(medication => (
                    <div key={medication} style={{ fontSize: '12px', color: C.text, fontFamily: font.family }}>
                      {medication}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GGCard>

          <GGCard padding="20px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <GGButton
                variant="success"
                size="md"
                fullWidth
                onClick={() => void handleSave(true)}
                disabled={!isComplete || createVisitMutation.isPending}
              >
                {createVisitMutation.isPending ? 'Saving...' : 'Save & Proceed to Invoice'}
              </GGButton>
              <GGButton
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => void handleSave(false)}
                disabled={!isComplete || createVisitMutation.isPending}
              >
                Save Visit Only
              </GGButton>
              {!isComplete && (
                <div style={{ fontSize: '11px', color: C.textSub, textAlign: 'center', lineHeight: 1.5, fontFamily: font.family }}>
                  Vitals, diagnosis, treatment, and at least one service are required.
                </div>
              )}
              {error && (
                <div style={{ fontSize: '12px', color: C.error, lineHeight: 1.5, fontFamily: font.family }}>
                  {error}
                </div>
              )}
              <div style={{ fontSize: '11px', color: C.textLight, lineHeight: 1.5, fontFamily: font.family }}>
                If this visit was not opened from a confirmed or completed appointment, you can still save the record and pick the invoice appointment in the next screen.
              </div>
            </div>
          </GGCard>

          <GGCard padding="20px">
            <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.6, fontFamily: font.family }}>
              Missing patient context blocks backend save. If that happens, reopen the visit from the patient ledger or appointment detail page.
            </div>
          </GGCard>
        </div>
      </div>
    </SPLayout>
  )
}
