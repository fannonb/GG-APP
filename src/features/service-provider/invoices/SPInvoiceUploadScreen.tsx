import { useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GGBadge, GGButton, GGCard } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import {
  useCreateSPInvoiceMutation,
  useSPAppointments,
  useSPProfile,
  useUpdateSPInvoiceMutation,
} from '@/hooks/api'
import { getCountryByName } from '@/config/countries'
import { isMockApi } from '@/api/config'
import { spService } from '@/api/services/sp.service'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { route, ROUTES } from '@/router/routes'
import type { Appointment } from '@/types/appointment.types'
import type { SPInvoice } from '@/types/invoice.types'
import type { PrescriptionRequest } from '@/types/prescription.types'
import { formatCurrency, formatDate } from '@/utils/format'
import { getAppointmentDisplayStatus } from '@/utils/appointments'
import { generateRef } from '@/utils/refgen'
import { validateInvoicePdfFile, invoiceHasStoredAttachment } from '@/utils/invoice-attachment'

const SP_SERVICES = [
  'General Consultation',
  'Blood Pressure Monitoring',
  'ECG',
  'Wound Dressing',
  'Prescription',
  'Vaccination',
  'Pathology Request',
  'Specialist Referral',
]

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Unable to read the selected file'))
    }
    reader.onerror = () => reject(new Error('Unable to read the selected file'))
    reader.readAsDataURL(file)
  })
}

function servicesTotalString(services: string[], amounts: Record<string, string>) {
  const total = Number(
    services.reduce((sum, name) => sum + (Number(amounts[name]) || 0), 0).toFixed(2),
  )
  return total > 0 ? String(total) : ''
}

interface InvoiceUploadPrefill {
  appointmentId?: string
  patientId?: string
  patientName?: string
  services?: string[]
  diagnosis?: string
  treatment?: string
  followUp?: string
  internalNote?: string
  visitId?: string
}

interface FormState {
  appointmentId: string
  patient: string
  services: string[]
  serviceAmounts: Record<string, string>
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
  const location = useLocation()
  const { isMobile } = useResponsive()
  const { data: appointments = [], isLoading: appointmentsLoading } = useSPAppointments()
  const createInvoiceMutation = useCreateSPInvoiceMutation()
  const updateInvoiceMutation = useUpdateSPInvoiceMutation()
  const { data: spProfile } = useSPProfile()
  const spCountry = getCountryByName(spProfile?.country ?? '')
  const currencySymbol = spCountry?.currencySymbol ?? '$'
  const currencyCode = spCountry?.currencyCode ?? ''

  const locationState = (location.state as {
    editInvoice?: SPInvoice
    prefill?: InvoiceUploadPrefill
    prescriptionRequest?: PrescriptionRequest
  } | null) ?? { editInvoice: undefined, prefill: undefined, prescriptionRequest: undefined }

  const editInvoice = locationState.editInvoice
  const prefill = locationState.prefill
  const rx = locationState.prescriptionRequest
  const isFromPrescription = !!rx && !editInvoice
  const hasPrefillVisit = !!prefill?.visitId
  const hasStoredPdf = !!editInvoice && invoiceHasStoredAttachment(
    editInvoice.attachmentBlobUrl,
    editInvoice.attachmentMetadata,
  )
  const needsPdfReupload = !!editInvoice && !hasStoredPdf

  const [form, setForm] = useState<FormState>(() => ({
    appointmentId: editInvoice ? '' : prefill?.appointmentId ?? '',
    patient: editInvoice?.patient || prefill?.patientName || rx?.patient || rx?.for || '',
    services: editInvoice?.services.map(item => item.name) || prefill?.services || rx?.quotedItems?.map(item => item.name) || [],
    serviceAmounts: editInvoice
      ? Object.fromEntries(
          editInvoice.services.map(item => [item.name, item.amount ? String(item.amount) : '']),
        )
      : {},
    amount: editInvoice?.amount?.toString()
      || (rx
        ? String((rx.quotedAmount ?? 0) + (rx.deliveryFee ?? 0))
        : '')
      || '',
    notes: editInvoice?.treatment || prefill?.treatment || '',
    diagnosis: editInvoice?.diagnosis || prefill?.diagnosis || '',
    followUp: editInvoice?.followUp || prefill?.followUp || '',
    internalNote: editInvoice?.internalNote || prefill?.internalNote || '',
    invoiceNumber: editInvoice?.id || generateRef('INV'),
    uploadedFile: hasStoredPdf && editInvoice ? new File([], editInvoice.attachment) : null,
  }))
  const [step, setStep] = useState(hasPrefillVisit || isFromPrescription ? 2 : 1)
  const [fileNameError, setFileNameError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submittedInvoice, setSubmittedInvoice] = useState<SPInvoice | null>(null)
  const [invoiceNumberEdited, setInvoiceNumberEdited] = useState(false)
  const [referenceLoading, setReferenceLoading] = useState(!editInvoice && !isMockApi)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const invoiceNumberEditedRef = useRef(false)

  useEffect(() => {
    if (editInvoice || isMockApi) {
      setReferenceLoading(false)
      return
    }

    let cancelled = false
    setReferenceLoading(true)
    void spService.getNextInvoiceReference().then(({ reference }) => {
      if (cancelled || invoiceNumberEditedRef.current) return
      setForm(current => ({ ...current, invoiceNumber: reference }))
    }).catch(() => {
      // Keep the local fallback reference if preview fails.
    }).finally(() => {
      if (!cancelled) setReferenceLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [editInvoice])

  const confirmedAppointments = appointments.filter(
    appointment => {
      const status = getAppointmentDisplayStatus(appointment)
      return (status === 'confirmed' || status === 'completed') && !appointment.hasInvoice
    },
  )

  const selectedAppointment = confirmedAppointments.find(
    appointment => appointment.id === form.appointmentId,
  )
  const isSelectedAppointmentUnavailable = !!form.appointmentId && !selectedAppointment && !editInvoice

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(current => ({ ...current, [key]: value }))

  const handleInvoiceNumberChange = (value: string) => {
    invoiceNumberEditedRef.current = true
    setInvoiceNumberEdited(true)
    setForm(current => ({ ...current, invoiceNumber: value }))
  }

  const toggleService = (service: string) =>
    setForm(current => {
      const services = current.services.includes(service)
        ? current.services.filter(item => item !== service)
        : [...current.services, service]
      return {
        ...current,
        services,
        // Keep the invoice total in sync with the per-service charges
        // (prescription invoices stay locked to the quoted total).
        amount: isFromPrescription ? current.amount : servicesTotalString(services, current.serviceAmounts),
      }
    })

  const setServiceAmount = (service: string, value: string) =>
    setForm(current => {
      const serviceAmounts = { ...current.serviceAmounts, [service]: value }
      return {
        ...current,
        serviceAmounts,
        amount: servicesTotalString(current.services, serviceAmounts),
      }
    })

  const handleFileSelect = (file: File | null | undefined) => {
    if (!file) return

    const fileError = validateInvoicePdfFile(file)
    if (fileError) {
      setFileNameError(fileError)
      set('uploadedFile', null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    set('uploadedFile', file)
    setFileNameError('')
  }

  const handleAppointmentChange = (value: string) => {
    const appointment = confirmedAppointments.find(item => item.id === value)
    set('appointmentId', value)
    set('patient', appointment?.patient ?? '')
  }

  const hasUploadedPdf = !!form.uploadedFile
  const isSubmitting = createInvoiceMutation.isPending || updateInvoiceMutation.isPending
  const hasServiceAmountsFlow = !isFromPrescription && form.services.length > 0
  const missingServiceAmounts =
    hasServiceAmountsFlow &&
    form.services.some(service => !(Number(form.serviceAmounts[service]) > 0))

  const submitInvoice = async () => {
    setSubmitError('')

    if (missingServiceAmounts) {
      setSubmitError('Enter the amount charged for each selected service before submitting.')
      return
    }

    const uploadedFile = form.uploadedFile
    const hasNewFile = !!uploadedFile && uploadedFile.size > 0

    if (needsPdfReupload && !hasNewFile) {
      setSubmitError('The PDF for this invoice was not stored. Please upload the invoice PDF before submitting.')
      return
    }

    try {
      const existingAttachmentDataUrl =
        editInvoice?.attachmentBlobUrl ?? editInvoice?.attachmentMetadata?.dataUrl
      const attachmentDataUrl = hasNewFile
        ? await readFileAsDataUrl(uploadedFile)
        : existingAttachmentDataUrl
      const attachmentFile = hasNewFile ? uploadedFile : undefined
      const payload = {
        appointmentId: editInvoice || isFromPrescription ? undefined : form.appointmentId,
        prescriptionRequestId: isFromPrescription ? rx?.id : undefined,
        invoiceNumber: form.invoiceNumber.trim(),
        services: form.services,
        lineItems: hasServiceAmountsFlow
          ? form.services.map(name => ({
              name,
              amount: Number(Number(form.serviceAmounts[name] || 0).toFixed(2)),
            }))
          : undefined,
        amount: Number(form.amount),
        attachment: hasNewFile || existingAttachmentDataUrl
          ? {
              originalName: attachmentFile
                ? attachmentFile.name
                : editInvoice?.attachment ?? editInvoice?.attachmentMetadata?.originalName ?? `${form.invoiceNumber.trim()}.pdf`,
              mimeType: attachmentFile
                ? attachmentFile.type || 'application/pdf'
                : editInvoice?.attachmentMetadata?.mimeType ?? 'application/pdf',
              sizeBytes: attachmentFile
                ? attachmentFile.size
                : editInvoice?.attachmentMetadata?.sizeBytes ?? 0,
              displaySize: attachmentFile
                ? `${Math.max(1, Math.round(attachmentFile.size / 1024))} KB`
                : editInvoice?.attachmentMetadata?.displaySize ?? '0 KB',
              storageKey: attachmentFile
                ? `local://${attachmentFile.name}`
                : editInvoice?.attachmentMetadata?.storageKey ?? `local://${form.invoiceNumber.trim()}`,
              dataUrl: attachmentDataUrl,
            }
          : undefined,
        attachmentBlobUrl: attachmentDataUrl,
        diagnosis: form.diagnosis.trim(),
        treatment: form.notes.trim(),
        followUp: form.followUp.trim(),
        internalNote: form.internalNote.trim(),
      }

      const invoice = editInvoice
        ? await updateInvoiceMutation.mutateAsync({ id: editInvoice.id, payload })
        : await createInvoiceMutation.mutateAsync(payload)

      setSubmittedInvoice(invoice)
      setStep(3)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to submit invoice right now. Please try again.',
      )
    }
  }

  if (step === 3) {
    const completedInvoice = submittedInvoice ?? editInvoice

    return (
      <SPLayout
        title={editInvoice ? 'Invoice Resubmitted' : 'Invoice Submitted'}
        subtitle="Awaiting patient payment authorization"
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <GGCard padding={isMobile ? '24px 16px' : '32px'}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.warningBg, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(245,166,35,0.25)' }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect x="7" y="15" width="18" height="14" rx="3" stroke={C.warning} strokeWidth="1.8" />
                <path d="M10 15v-4a6 6 0 0112 0v4" stroke={C.warning} strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '8px', textAlign: 'center' }}>
              {editInvoice ? 'Invoice Resubmitted!' : 'Invoice Submitted!'}
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '24px', textAlign: 'center' }}>
              The invoice has been sent to the patient. The patient will authorize the payment once they view the invoice.
            </div>
            <div style={{ background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, padding: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Invoice Ref', val: completedInvoice?.id ?? form.invoiceNumber },
                {
                  label: 'Patient',
                  val:
                    completedInvoice?.patient ??
                    form.patient ??
                    selectedAppointment?.patient ??
                    'Patient',
                },
                {
                  label: 'Amount',
                  val: formatCurrency(Number(completedInvoice?.amount ?? form.amount) || 0, currencySymbol),
                },
                { label: 'Status', val: <GGBadge type="warning">Awaiting Auth</GGBadge> },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '13px', color: C.textSub }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{item.val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <GGButton variant="secondary" size="md" onClick={() => navigate(ROUTES.SP_INVOICES)} style={{ flex: 1 }}>
                View Invoices
              </GGButton>
              <GGButton variant="success" size="md" onClick={() => navigate(ROUTES.SP_DASHBOARD)} style={{ flex: 1 }}>
                Dashboard
              </GGButton>
            </div>
          </GGCard>
        </div>
      </SPLayout>
    )
  }

  if (!editInvoice && !isFromPrescription && !appointmentsLoading && confirmedAppointments.length === 0) {
    return (
      <SPLayout title="Upload Invoice" subtitle="Post-appointment workflow">
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <GGCard padding="32px">
            <div style={{
              width: 64, height: 64, borderRadius: '16px', margin: '0 auto 18px',
              background: 'linear-gradient(145deg, rgba(56,182,255,0.12), rgba(56,182,255,0.04))',
              border: '1px solid rgba(56,182,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="18" rx="3" stroke={C.blue500} strokeWidth="1.5"/>
                <path d="M2 9h20M8 2v4M16 2v4" stroke={C.blue500} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, textAlign: 'center', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              No billable appointments yet
            </div>
            <div style={{ fontSize: '14px', color: C.textSub, textAlign: 'center', lineHeight: 1.6, marginBottom: '24px' }}>
              Invoices must be linked to a confirmed or completed appointment. Once a patient books and you confirm the visit, you can upload an invoice here.
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <GGButton variant="primary" size="md" onClick={() => navigate(ROUTES.SP_APPOINTMENTS)} style={{ flex: 1 }}>
                View Appointments
              </GGButton>
              <GGButton variant="secondary" size="md" onClick={() => navigate(ROUTES.SP_DASHBOARD)} style={{ flex: 1 }}>
                Back to Dashboard
              </GGButton>
            </div>
          </GGCard>
        </div>
      </SPLayout>
    )
  }

  return (
    <SPLayout
      title={editInvoice ? 'Edit & Resubmit Invoice' : isFromPrescription ? 'Upload Prescription Invoice' : 'Upload Invoice'}
      subtitle={editInvoice ? 'Modify and resubmit invoice to patient' : isFromPrescription ? 'Post-collection workflow' : 'Post-appointment workflow'}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {hasPrefillVisit ? (
          <GGCard padding="16px 20px">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(34,201,138,0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family }}>
                  Visit recorded — {prefill?.patientName ?? 'Patient'}
                </div>
                {form.diagnosis && (
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px', fontFamily: font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form.diagnosis}
                  </div>
                )}
                {form.services.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                    {form.services.map(service => (
                      <span key={service} style={{ padding: '3px 10px', borderRadius: radius.full, background: C.blue100, border: `1px solid rgba(74,173,223,0.3)`, color: '#1A5D8A', fontSize: '11px', fontWeight: 600, fontFamily: font.family }}>
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GGCard>
        ) : isFromPrescription ? (
          <GGCard padding="16px 20px">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(34,201,138,0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family }}>
                  Order collected — {rx?.patient ?? rx?.for ?? 'Patient'}
                </div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px', fontFamily: font.family }}>
                  {rx?.id} · Invoice amount is locked to the quoted total below.
                </div>
              </div>
            </div>
          </GGCard>
        ) : (
          <div style={{ display: 'flex', gap: '0', background: C.bg, borderRadius: '12px', padding: '4px', border: `1px solid ${C.border}` }}>
            {['Consultation Notes', 'Invoice Details'].map((label, index) => (
              <button
                key={label}
                onClick={() => setStep(index + 1)}
                style={{ flex: 1, padding: isMobile ? '8px 6px' : '9px', borderRadius: '9px', border: 'none', background: step === index + 1 ? '#fff' : 'transparent', color: step === index + 1 ? C.text : C.textSub, fontFamily: font.family, fontSize: isMobile ? '12px' : '13px', fontWeight: step === index + 1 ? 700 : 500, cursor: 'pointer', boxShadow: step === index + 1 ? shadow.sm : 'none', whiteSpace: 'nowrap' }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <GGCard padding={isMobile ? '20px 16px' : '28px'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', fontFamily: font.family }}>
                  Patient
                </div>
                <select
                  value={editInvoice ? form.patient : form.appointmentId}
                  onChange={event => (editInvoice ? set('patient', event.target.value) : handleAppointmentChange(event.target.value))}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: editInvoice ? C.text : form.appointmentId ? C.text : C.textSub, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', appearance: 'none' }}
                >
                  {editInvoice ? (
                    <option value={form.patient}>{form.patient}</option>
                  ) : (
                    <>
                      <option value="">
                        {appointmentsLoading
                          ? 'Loading confirmed appointments...'
                          : 'Select patient from confirmed appointment'}
                      </option>
                      {confirmedAppointments.map((appointment: Appointment) => (
                        <option key={appointment.id} value={appointment.id}>
                          {appointment.patient} - {appointment.service} ({formatDate(appointment.date)})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {isSelectedAppointmentUnavailable && (
                  <div style={{ fontSize: '11px', color: C.error, marginTop: '6px', fontFamily: font.family, lineHeight: 1.5 }}>
                    This appointment already has an invoice or is no longer eligible for billing.
                  </div>
                )}
                {prefill?.visitId && (
                  <div style={{ fontSize: '11px', color: C.blue500, marginTop: '6px', fontFamily: font.family }}>
                    Visit {prefill.visitId} has already been saved and prefilled into this invoice.
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', display: 'block', fontFamily: font.family }}>
                  Diagnosis & Clinical Findings <span style={{ color: C.error }}>*</span>
                </label>
                <textarea value={form.diagnosis} onChange={event => set('diagnosis', event.target.value)} rows={4} placeholder="Document the diagnosis, clinical findings, and examination results..." style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', display: 'block', fontFamily: font.family }}>
                  Prescribed Medications / Treatment Plan <span style={{ color: C.error }}>*</span>
                </label>
                <textarea value={form.notes} onChange={event => set('notes', event.target.value)} rows={3} placeholder="List medications prescribed, dosage, and treatment instructions..." style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', display: 'block', fontFamily: font.family }}>
                  Follow-up Instructions <span style={{ fontSize: '11px', fontWeight: 400, color: C.textSub }}>(visible to patient)</span>
                </label>
                <textarea value={form.followUp} onChange={event => set('followUp', event.target.value)} rows={2} placeholder="e.g. Return in 2 weeks, monitor blood pressure daily..." style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '6px', display: 'block', fontFamily: font.family }}>
                  Internal Quality Note <span style={{ fontSize: '11px', fontWeight: 400, color: C.textSub }}>(not visible to patient)</span>
                </label>
                <textarea value={form.internalNote} onChange={event => set('internalNote', event.target.value)} rows={2} placeholder="Internal observations for platform quality review and compliance monitoring..." style={{ width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6, fontFamily: font.family }}>
                The consultation summary is shared with the patient in their appointment history. Internal notes are used solely by GG&apos;APP for quality and compliance monitoring.
              </div>
              <GGButton variant="success" size="md" fullWidth onClick={() => setStep(2)}>
                Continue to Invoice
              </GGButton>
            </div>
          </GGCard>
        )}

        {step === 2 && (
          <GGCard padding={isMobile ? '20px 16px' : '28px'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', fontFamily: font.family }}>
                  Invoice Number <span style={{ color: C.error }}>*</span>
                </div>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={event => handleInvoiceNumberChange(event.target.value)}
                  placeholder="e.g. INV-2026-0842"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontFamily: font.family,
                    fontWeight: 600,
                    color: C.text,
                    background: C.bg,
                    border: `1.5px solid ${form.invoiceNumber ? C.blue500 : C.border}`,
                    borderRadius: radius.sm,
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.02em',
                  }}
                />
                <div style={{ fontSize: '11px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
                  {referenceLoading
                    ? 'Generating invoice number…'
                    : invoiceNumberEdited
                      ? 'Using your custom invoice number.'
                      : 'Auto-generated for you — edit if you prefer your own number.'}
                </div>
              </div>

              <div style={{ height: '1px', background: C.border }} />

              {isFromPrescription && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px', fontFamily: font.family }}>
                    Quoted Items
                  </div>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
                    {(rx?.quotedItems ?? []).map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: '13px', fontFamily: font.family, background: C.bg }}
                      >
                        <span style={{ color: C.text }}>
                          {item.name}
                          {item.quantity ? ` × ${item.quantity}` : ''}
                        </span>
                        <span style={{ fontWeight: 700, color: C.text }}>{formatCurrency(item.unitPrice, currencySymbol)}</span>
                      </div>
                    ))}
                    {(rx?.deliveryFee ?? 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: '13px', fontFamily: font.family, background: C.bg }}>
                        <span style={{ color: C.text }}>Delivery fee</span>
                        <span style={{ fontWeight: 700, color: C.text }}>{formatCurrency(rx?.deliveryFee ?? 0, currencySymbol)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px', fontWeight: 800, fontFamily: font.family }}>
                      <span>Total</span>
                      <span>{formatCurrency((rx?.quotedAmount ?? 0) + (rx?.deliveryFee ?? 0), currencySymbol)}</span>
                    </div>
                  </div>
                </div>
              )}

              {!hasPrefillVisit && !isFromPrescription && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px', fontFamily: font.family }}>
                    Services Rendered <span style={{ color: C.error }}>*</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {SP_SERVICES.map(service => {
                      const active = form.services.includes(service)
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => toggleService(service)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: active ? '7px 10px 7px 14px' : '7px 14px',
                            borderRadius: radius.full,
                            border: `1.5px solid ${active ? C.blue500 : C.border}`,
                            background: active ? C.blue100 : C.bg,
                            color: active ? '#1A5D8A' : C.textSub,
                            fontSize: '13px',
                            fontWeight: active ? 700 : 500,
                            cursor: 'pointer',
                            fontFamily: font.family,
                          }}
                        >
                          {service}
                          {active && (
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
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {hasServiceAmountsFlow && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px', fontFamily: font.family }}>
                    Service Charges <span style={{ color: C.error }}>*</span>
                  </div>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
                    {form.services.map(service => (
                      <div
                        key={service}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: '13px', fontFamily: font.family, background: C.bg }}
                      >
                        <span style={{ color: C.text, fontWeight: 600 }}>{service}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: C.textSub }}>{currencySymbol}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.serviceAmounts[service] ?? ''}
                            onChange={event => setServiceAmount(service, event.target.value)}
                            placeholder="0.00"
                            style={{ width: isMobile ? 90 : 120, padding: '7px 10px', fontSize: '13px', fontFamily: font.family, fontWeight: 700, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', textAlign: 'right' }}
                          />
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px', fontWeight: 800, fontFamily: font.family }}>
                      <span>Total</span>
                      <span>{formatCurrency(Number(form.amount) || 0, currencySymbol)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
                    Enter the amount charged for each service{currencyCode ? ` in ${currencyCode}` : ''}. The total becomes the invoice amount.
                  </div>
                </div>
              )}

              {!hasServiceAmountsFlow && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', fontFamily: font.family }}>
                  Invoice Amount <span style={{ color: C.error }}>*</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: C.textSub, fontFamily: font.family, whiteSpace: 'nowrap' }}>{currencySymbol}</div>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={event => set('amount', event.target.value)}
                    placeholder="0.00"
                    disabled={isFromPrescription}
                    style={{ flex: 1, padding: '10px 14px', fontSize: isMobile ? '16px' : '20px', fontFamily: font.family, fontWeight: 800, color: C.text, background: isFromPrescription ? C.border : C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', minWidth: 0 }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
                  {isFromPrescription
                    ? 'Locked to the quoted total captured when the pharmacy sent this quote.'
                    : currencyCode ? `Enter amount in ${currencyCode}.` : 'Enter invoice amount.'} Payment will be authorized now and settled later by the finance partner.
                </div>
              </div>
              )}

              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', fontFamily: font.family }}>
                  Invoice Document (PDF) <span style={{ color: C.error }}>*</span>
                </div>
                {needsPdfReupload && (
                  <div style={{ marginBottom: '10px', padding: '10px 14px', background: C.errorBg, borderRadius: radius.sm, border: '1px solid rgba(229,71,77,0.25)', fontSize: '12px', color: C.error, lineHeight: 1.6, fontFamily: font.family }}>
                    The PDF for this invoice was not saved when it was first submitted. Upload the PDF below to restore preview and download for the patient.
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={event => handleFileSelect(event.target.files?.[0])} />

                {form.uploadedFile ? (
                  <div style={{ padding: '16px', border: `2px solid ${C.success}`, borderRadius: radius.sm, background: C.successBg, display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(34,201,138,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0D6B47', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font.family }}>{form.uploadedFile.name}</div>
                      <div style={{ fontSize: '11px', color: '#13785A', marginTop: '2px', fontFamily: font.family }}>
                        PDF ready to submit
                      </div>
                    </div>
                    <button onClick={() => { set('uploadedFile', null); setFileNameError(''); if (fileInputRef.current) fileInputRef.current.value = '' }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, fontSize: '18px', lineHeight: 1, padding: '4px', flexShrink: 0 }}>x</button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); handleFileSelect(event.dataTransfer.files[0]) }} style={{ padding: isMobile ? '20px 16px' : '28px 24px', border: `2px dashed ${C.border}`, borderRadius: radius.sm, textAlign: 'center', background: C.bg, cursor: 'pointer' }}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto 8px' }}><rect x="4" y="2" width="20" height="24" rx="3" stroke={C.textSub} strokeWidth="1.4" /><path d="M8 10h12M8 14h12M8 18h8" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round" /></svg>
                    <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>Drop invoice PDF or <span style={{ color: C.success, fontWeight: 600 }}>click to upload</span></div>
                    <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px', fontFamily: font.family }}>PDF format · Max 10 MB</div>
                  </div>
                )}

                {fileNameError && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', background: C.errorBg, borderRadius: radius.sm, border: `1px solid rgba(229,71,77,0.25)`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="8" cy="8" r="6.5" stroke={C.error} strokeWidth="1.3" /><line x1="8" y1="5" x2="8" y2="9" stroke={C.error} strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="11" r="0.8" fill={C.error} /></svg>
                    <span style={{ fontSize: '12px', color: C.error, fontFamily: font.family, lineHeight: 1.5 }}>{fileNameError}</span>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, border: '1px solid rgba(74,173,223,0.2)', fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6, fontFamily: font.family }}>
                Your invoice will be sent directly to the patient for authorization. Settlement will be completed later by the finance partner.
              </div>

              {submitError && (
                <div style={{ padding: '10px 14px', background: C.errorBg, borderRadius: radius.sm, border: `1px solid rgba(229,71,77,0.25)`, fontSize: '12px', color: C.error, lineHeight: 1.5, fontFamily: font.family }}>
                  {submitError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                {!isFromPrescription && (
                  <GGButton variant="secondary" size="md" onClick={() => setStep(1)} style={{ flex: 1 }}>
                    Back
                  </GGButton>
                )}
                <GGButton
                  variant="success"
                  size="md"
                  disabled={
                    (!editInvoice && !isFromPrescription && (!form.appointmentId || !selectedAppointment)) ||
                    !form.invoiceNumber.trim() ||
                    !hasUploadedPdf ||
                    (needsPdfReupload && !hasUploadedPdf) ||
                    !!fileNameError ||
                    !form.amount.trim() ||
                    missingServiceAmounts ||
                    (!hasPrefillVisit && !isFromPrescription && form.services.length === 0) ||
                    isSubmitting
                  }
                  onClick={() => void submitInvoice()}
                  style={{ flex: isFromPrescription ? 1 : 2 }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Invoice'}
                </GGButton>
              </div>

              {!editInvoice && !isFromPrescription && !form.appointmentId && (
                <div style={{ fontSize: '11px', color: C.textSub, lineHeight: 1.5, fontFamily: font.family }}>
                  Select a confirmed or completed appointment before submitting the invoice.
                </div>
              )}

              {!editInvoice && form.appointmentId && selectedAppointment && (
                <div style={{ fontSize: '11px', color: C.textSub, lineHeight: 1.5, fontFamily: font.family }}>
                  Billing against appointment {selectedAppointment.id}. You can open it from{' '}
                  <button
                    onClick={() => navigate(route.spAppointment(selectedAppointment.id))}
                    style={{ border: 'none', background: 'transparent', color: C.blue500, cursor: 'pointer', padding: 0, fontFamily: font.family, fontSize: '11px' }}
                  >
                    the appointment detail page
                  </button>
                  .
                </div>
              )}
            </div>
          </GGCard>
        )}
      </div>
    </SPLayout>
  )
}
