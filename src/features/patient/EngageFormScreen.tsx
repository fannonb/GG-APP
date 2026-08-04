import { useRef, useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGSelect, GGTextarea, GGDivider, GGDatePicker } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { ApiError } from '@/api/types'
import { useCreateAppointmentMutation } from '@/hooks/api'
import { useProvider } from '@/hooks/api/usePatientQueries'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { MOCK_PROVIDERS } from '@/mock/patient.mock'
import { providerHasCategory, type Provider } from '@/types/provider.types'
import { useUserStore } from '@/store/user.store'
import { getPatientDisplayName, isBeneficiariesActive } from './patientAccount'
import type { AppointmentAttachmentPayload } from '@/api/types'
import { useLocationStore } from '@/store/location.store'
import { useDrivingDistance } from '@/hooks/useDrivingDistance'
import { toGeoCoord } from '@/services/driving-distance'
import type { AppointmentRebookNavigationState } from '@/utils/rebook'
import { ROUTES } from '@/router/routes'
import { PharmacyPrescriptionUpload } from './components/PharmacyPrescriptionUpload'

function providerIsPharmacyOnly(provider: Provider): boolean {
  if (provider.category !== 'pharmacy') return false
  const extras = provider.categories?.filter(c => c !== 'pharmacy') ?? []
  return extras.length === 0
}

const TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00']

type UploadedAttachment = AppointmentAttachmentPayload & {
  dataUrl: string
}

const ACCEPTED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

function inferAttachmentType(file: File): UploadedAttachment['type'] {
  const lowerName = file.name.toLowerCase()
  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) return 'pdf'
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) return 'image'
  return 'document'
}

function formatAttachmentSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Unable to read selected file'))
    }
    reader.onerror = () => reject(new Error('Unable to read selected file'))
    reader.readAsDataURL(file)
  })
}

export function EngageFormScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const position = useLocationStore(s => s.position)
  const { state } = useLocation() as {
    state?: {
      provider?: Provider
      providerId?: number
      rebook?: AppointmentRebookNavigationState['rebook']
    }
  }
  const providerId = state?.providerId ?? state?.provider?.id
  const { data: fetchedProvider, isLoading: providerLoading } = useProvider(providerId)
  const p = state?.provider ?? fetchedProvider ?? MOCK_PROVIDERS[0]
  const user = useUserStore(s => s.user)
  const beneficiaries = useUserStore(s => s.beneficiaries)
  const beneficiariesEnabled = Boolean(useUserStore(s => s.user.beneficiariesEnabled))
  const beneficiariesActive = isBeneficiariesActive(beneficiariesEnabled, beneficiaries.length)
  const canBookForBeneficiary = beneficiariesActive && beneficiaries.length > 0
  const createAppointmentMutation = useCreateAppointmentMutation()
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const rebook = state?.rebook

  // Service mode: null = not yet chosen (picker shown), 'appointment' = standard form, 'prescription' = pharmacy flow
  const hasPharmacy = providerHasCategory(p, 'pharmacy')
  const isPharmacyOnly = providerIsPharmacyOnly(p)
  const [serviceMode, setServiceMode] = useState<'appointment' | 'prescription' | null>(
    isPharmacyOnly ? 'prescription' : (hasPharmacy ? null : 'appointment'),
  )

  const [form, setForm] = useState({
    description: rebook?.description ?? '',
    date: '',
    time: '',
    forSelf: rebook?.forSelf ?? true,
    beneficiary: null as { id: string; name: string; relation: string; age: number } | null,
    selectedServices: rebook?.service ? [rebook.service] : [] as string[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [isDraggingAttachments, setIsDraggingAttachments] = useState(false)
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])
  const [earliestDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(current => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!canBookForBeneficiary || !rebook?.beneficiaryId || beneficiaries.length === 0) return
    const beneficiary = beneficiaries.find(item => item.id === rebook.beneficiaryId)
    if (!beneficiary) return
    setForm(current => ({
      ...current,
      forSelf: false,
      beneficiary,
    }))
  }, [rebook?.beneficiaryId, beneficiaries, canBookForBeneficiary])

  const bookableServices = useMemo(() => {
    const services = [...p.services]
    const rebookService = rebook?.service
    if (rebookService && !services.includes(rebookService)) {
      services.unshift(rebookService)
    }
    return services
  }, [p.services, rebook?.service])

  const providerCoord = useMemo(() => toGeoCoord(p.lat, p.lng), [p.lat, p.lng])
  const { label: drivingDistanceLabel } = useDrivingDistance(position, providerCoord, p)

  if (providerId && providerLoading && !state?.provider) {
    return (
      <AppLayout title="Engagement Request" subtitle="Loading provider details..." back notifCount={1}>
        <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: font.family }}>
          <GGCard padding="36px">
            <div style={{ fontSize: '14px', color: C.textSub }}>Preparing your booking form...</div>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  if (providerId && !providerLoading && !fetchedProvider && !state?.provider) {
    return (
      <AppLayout title="Engagement Request" subtitle="Provider unavailable" back notifCount={1}>
        <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: font.family }}>
          <GGCard padding="36px">
            <div style={{ fontSize: '14px', color: C.textSub, marginBottom: '16px' }}>
              We could not load the provider for this rebooking request.
            </div>
            <GGButton variant="secondary" size="sm" onClick={() => navigate(ROUTES.FIND_SERVICE)}>
              Find a Service
            </GGButton>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  const addAttachments = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files)
    if (selectedFiles.length === 0) return

    const invalidFile = selectedFiles.find(
      file => !ACCEPTED_ATTACHMENT_TYPES.has(file.type) && !/\.(pdf|png|jpe?g|webp)$/i.test(file.name),
    )
    if (invalidFile) {
      setAttachmentError(`${invalidFile.name} is not a supported file type.`)
      return
    }

    setAttachmentError(null)

    const prepared = await Promise.all(
      selectedFiles.map(async file => {
        const dataUrl = await readFileAsDataUrl(file)
        return {
          name: file.name,
          type: inferAttachmentType(file),
          size: formatAttachmentSize(file.size),
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          storageKey: `appointments/${(user.email || 'patient').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${Date.now()}-${crypto.randomUUID()}-${file.name}`,
          dataUrl,
        } satisfies UploadedAttachment
      }),
    )

    setAttachments(current => [...current, ...prepared])
  }

  const handleAttachmentSelect = async (files: FileList | null | undefined) => {
    if (!files || files.length === 0) return
    try {
      await addAttachments(files)
    } catch {
      setAttachmentError('Unable to read the selected file. Please try again.')
    } finally {
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = ''
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(current => current.filter((_, currentIndex) => currentIndex !== index))
    setAttachmentError(null)
  }

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {}
    if (!form.description.trim()) nextErrors.description = 'Please describe your request'
    if (!form.date) nextErrors.date = 'Please select a preferred date'
    if (!form.time) nextErrors.time = 'Please select a preferred time'
    if (!form.forSelf && !form.beneficiary) nextErrors.beneficiary = 'Please select a beneficiary'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      const bookingResult = await createAppointmentMutation.mutateAsync({
        providerId: p.id,
        description: form.description.trim(),
        date: form.date,
        time: form.time,
        forSelf: form.forSelf,
        beneficiaryId: form.forSelf ? undefined : form.beneficiary?.id,
        selectedServices: form.selectedServices,
        address: p.address,
        attachments,
      })

      navigate('/app/booking/confirm', {
        state: {
          provider: p,
          booking: { ...form, attachments },
          bookingResult,
        },
      })
    } catch (error) {
      setErrors(current => ({
        ...current,
        submit:
          error instanceof ApiError
            ? error.message
            : 'Unable to submit your request right now. Please try again.',
      }))
    }
  }

  // Provider header — shared across all form modes
  const ProviderHeader = (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, marginBottom: '28px' }}>
      <div style={{ width: 44, height: 44, borderRadius: '12px', background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '18px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{p.name[0]}</span>
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{p.name}</div>
        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', textTransform: 'capitalize' }}>
          {p.category} · {drivingDistanceLabel} · <span style={{ color: p.status === 'open' ? C.success : C.error, fontWeight: 600 }}>{p.status}</span>
        </div>
      </div>
    </div>
  )

  // ── Prescription-only mode (pure pharmacy or user chose prescription) ────────
  if (serviceMode === 'prescription') {
    return (
      <AppLayout title="Upload Prescription" subtitle={`Sending to ${p.name}`} back notifCount={1}>
        <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: font.family }}>
          <GGCard padding="36px">
            {ProviderHeader}
            {hasPharmacy && !isPharmacyOnly && (
              <button
                type="button"
                onClick={() => setServiceMode(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', color: C.blue500, fontSize: '13px', fontWeight: 600, padding: 0, fontFamily: font.family }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back to service selection
              </button>
            )}
            <PharmacyPrescriptionUpload provider={p} />
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  // ── Service mode picker (multi-category provider with pharmacy) ──────────────
  if (serviceMode === null && hasPharmacy) {
    const appointmentCategories = [p.category, ...(p.categories ?? [])].filter(c => c !== 'pharmacy')
    const appointmentLabel = appointmentCategories.length > 0
      ? appointmentCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' / ')
      : 'Consultation'

    return (
      <AppLayout title="Engagement Request" subtitle={`Choose service type at ${p.name}`} back notifCount={1}>
        <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: font.family }}>
          <GGCard padding="36px">
            {ProviderHeader}
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>
              What do you need from this provider?
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '20px', lineHeight: 1.6 }}>
              {p.name} offers multiple services. Select which type of engagement you need.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appointmentCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setServiceMode('appointment')}
                  style={{
                    textAlign: 'left',
                    padding: '18px 20px',
                    borderRadius: radius.lg,
                    border: `1.5px solid ${C.border}`,
                    background: C.surface,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontFamily: font.family,
                    transition: 'border-color 0.14s, box-shadow 0.14s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,182,255,0.45)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(56,182,255,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ width: 46, height: 46, borderRadius: '12px', background: C.blue100, border: '1px solid rgba(56,182,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <rect x="2" y="3.5" width="18" height="16" rx="2.5" stroke={C.blue500} strokeWidth="1.4"/>
                      <path d="M2 8.5h18M7 2v3M15 2v3" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
                      <circle cx="11" cy="13.5" r="1.8" fill={C.blue500}/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Book an Appointment</div>
                    <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px' }}>
                      Request a consultation, visit, or procedure · {appointmentLabel}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto', flexShrink: 0, color: C.textLight }}>
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}

              <button
                type="button"
                onClick={() => setServiceMode('prescription')}
                style={{
                  textAlign: 'left',
                  padding: '18px 20px',
                  borderRadius: radius.lg,
                  border: `1.5px solid ${C.border}`,
                  background: C.surface,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontFamily: font.family,
                  transition: 'border-color 0.14s, box-shadow 0.14s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,182,255,0.45)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(56,182,255,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 46, height: 46, borderRadius: '12px', background: 'rgba(34,201,138,0.08)', border: '1px solid rgba(34,201,138,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="4" y="2" width="14" height="18" rx="2.5" stroke={C.success} strokeWidth="1.4"/>
                    <path d="M8 8h6M8 12h6M8 16h4" stroke={C.success} strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="16" cy="16" r="4" fill={C.successBg} stroke={C.success} strokeWidth="1.3"/>
                    <path d="M14.5 16h3M16 14.5v3" stroke={C.success} strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Upload a Prescription</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px' }}>
                    Submit a prescription for medication · Pharmacy · Pay after pickup or delivery
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto', flexShrink: 0, color: C.textLight }}>
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  // ── Standard appointment form ────────────────────────────────────────────────
  return (
    <AppLayout title="Engagement Request" subtitle={`Sending request to ${p.name}`} back notifCount={1}>
      <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="36px">
          {ProviderHeader}

          {hasPharmacy && !isPharmacyOnly && (
            <button
              type="button"
              onClick={() => setServiceMode(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', color: C.blue500, fontSize: '13px', fontWeight: 600, padding: 0, fontFamily: font.family }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Back to service selection
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px' }}>
                Who is this appointment for? <span style={{ color: C.error }}>*</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: form.forSelf ? 0 : '14px' }}>
                {[
                  { val: true, label: 'Myself', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
                  { val: false, label: 'A Beneficiary', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M1 13c0-2.5 2-4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="11" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M7 14c0-2.8 1.8-5 4-5s4 2.2 4 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
                ].map(option => {
                  const blocked = !option.val && !canBookForBeneficiary
                  return (
                  <button
                    key={String(option.val)}
                    disabled={blocked}
                    onClick={() => {
                      if (blocked) return
                      set('forSelf', option.val)
                      if (option.val) set('beneficiary', null)
                    }}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: radius.sm, border: `2px solid ${form.forSelf === option.val ? C.blue500 : C.border}`, background: form.forSelf === option.val ? C.blue100 : C.bg, color: form.forSelf === option.val ? C.blue500 : C.textSub, fontSize: '14px', fontWeight: form.forSelf === option.val ? 700 : 500, cursor: blocked ? 'not-allowed' : 'pointer', fontFamily: font.family, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.14s', opacity: blocked ? 0.55 : 1 }}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                  )
                })}
              </div>

              {!canBookForBeneficiary && (
                <div style={{ marginTop: '10px', padding: '10px 14px', background: C.bg, borderRadius: radius.sm, border: `1px dashed ${C.border}`, fontSize: '12px', color: C.textSub, lineHeight: 1.6 }}>
                  {!beneficiariesActive
                    ? 'Booking for a beneficiary is locked. Enable Beneficiaries in your Profile first.'
                    : 'Add at least one beneficiary in Profile before booking on their behalf.'}
                  {' '}
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.PROFILE, { state: { tab: 'beneficiaries' } })}
                    style={{ background: 'none', border: 'none', padding: 0, color: C.blue500, fontWeight: 600, cursor: 'pointer', fontFamily: font.family, fontSize: '12px' }}
                  >
                    Go to Profile
                  </button>
                </div>
              )}

              {!form.forSelf && canBookForBeneficiary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: C.textSub }}>Select a beneficiary from your registered list:</div>
                  {beneficiaries.map(beneficiary => {
                    const selected = form.beneficiary?.id === beneficiary.id
                    return (
                      <div
                        key={beneficiary.id}
                        onClick={() => set('beneficiary', beneficiary)}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: radius.sm, border: `2px solid ${selected ? C.blue500 : C.border}`, background: selected ? C.blue100 : '#fff', cursor: 'pointer', transition: 'all 0.14s' }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: selected ? C.blue500 : C.bg, border: `2px solid ${selected ? C.blue500 : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.14s' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: selected ? '#fff' : C.textSub, fontFamily: font.family }}>
                            {beneficiary.name.split(' ').map(name => name[0]).join('')}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{beneficiary.name}</div>
                          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{beneficiary.relation} · Age {beneficiary.age}</div>
                        </div>
                        {selected && <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill={C.blue500} /><path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                    )
                  })}
                  {errors.beneficiary && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{errors.beneficiary}</span>}
                  {form.beneficiary && (
                    <div style={{ padding: '10px 14px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.25)`, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6 }}>
                      The invoice will be billed to <strong>{getPatientDisplayName(user)} (you)</strong> but will indicate the service was for <strong>{form.beneficiary.name}</strong> ({form.beneficiary.relation}).
                    </div>
                  )}
                </div>
              )}
            </div>

            <GGDivider />

            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>
                Services Required <span style={{ fontSize: '12px', fontWeight: 400, color: C.textSub }}>(optional)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {bookableServices.map(service => {
                  const checked = form.selectedServices.includes(service)
                  return (
                    <label
                      key={service}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: radius.sm, border: `1.5px solid ${checked ? C.blue500 : C.border}`, background: checked ? C.blue100 : C.bg, cursor: 'pointer', transition: 'all 0.13s' }}
                      onClick={() => set('selectedServices', checked ? form.selectedServices.filter(item => item !== service) : [...form.selectedServices, service])}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: '5px', border: `2px solid ${checked ? C.blue500 : C.border}`, background: checked ? C.blue500 : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.13s' }}>
                        {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: checked ? 600 : 400, color: checked ? C.blue500 : C.text, fontFamily: font.family }}>{service}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <GGTextarea label="Request Description" placeholder="Describe the medical need, symptoms, or service required." value={form.description} onChange={event => set('description', event.target.value)} required rows={4} />
            {errors.description && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '-12px' }}>{errors.description}</span>}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <GGDatePicker label="Preferred Date" value={form.date} onChange={value => set('date', value)} min={earliestDate} required error={errors.date} hint={`Earliest: ${earliestDate}`} />
              <GGSelect label="Preferred Time" value={form.time} onChange={event => set('time', event.target.value)} required placeholder="Select time" options={TIMES.map(time => ({ value: time, label: time }))} />
            </div>
            {errors.time && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '-12px' }}>{errors.time}</span>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                Attachments <span style={{ fontSize: '12px', fontWeight: 400, color: C.textSub }}>(optional)</span>
              </label>
              <div
                role="button"
                tabIndex={0}
                style={{
                  padding: '20px',
                  border: `2px dashed ${isDraggingAttachments ? C.blue500 : C.border}`,
                  borderRadius: radius.sm,
                  textAlign: 'center',
                  background: isDraggingAttachments ? C.blue100 : C.bg,
                  cursor: 'pointer',
                  transition: 'all 0.14s',
                }}
                onClick={() => attachmentInputRef.current?.click()}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    attachmentInputRef.current?.click()
                  }
                }}
                onDragEnter={event => {
                  event.preventDefault()
                  event.stopPropagation()
                  setIsDraggingAttachments(true)
                }}
                onDragOver={event => {
                  event.preventDefault()
                  event.stopPropagation()
                  setIsDraggingAttachments(true)
                }}
                onDragLeave={event => {
                  event.preventDefault()
                  event.stopPropagation()
                  setIsDraggingAttachments(false)
                }}
                onDrop={async event => {
                  event.preventDefault()
                  event.stopPropagation()
                  setIsDraggingAttachments(false)
                  await handleAttachmentSelect(event.dataTransfer.files)
                }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto 8px', display: 'block' }}>
                  <rect x="5" y="7" width="18" height="16" rx="3" stroke={isDraggingAttachments ? C.blue500 : C.textSub} strokeWidth="1.4" />
                  <path d="M14 11v8M10 15l4-4 4 4" stroke={isDraggingAttachments ? C.blue500 : C.textSub} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div style={{ fontSize: '13px', color: C.textSub }}>
                  Drop files here or <span style={{ color: C.blue500, fontWeight: 600 }}>click to upload</span>
                </div>
                <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>PDF, JPG, JPEG, PNG, or WebP files are saved with your request.</div>
              </div>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                style={{ display: 'none' }}
                onChange={event => void handleAttachmentSelect(event.target.files)}
              />
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {attachments.map((attachment, index) => (
                    <div
                      key={attachment.storageKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: radius.sm,
                        border: `1px solid ${C.border}`,
                        background: '#fff',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</div>
                        <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>{attachment.size} · {attachment.type.toUpperCase()}</div>
                      </div>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation()
                          removeAttachment(index)
                        }}
                        style={{
                          flexShrink: 0,
                          padding: '6px 10px',
                          borderRadius: radius.full,
                          border: `1px solid ${C.border}`,
                          background: C.bg,
                          color: C.textSub,
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {attachmentError && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{attachmentError}</span>}
              <div style={{ fontSize: '11px', color: C.textLight, lineHeight: 1.5 }}>
                Uploaded files will be attached to this appointment request and shared with the provider.
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.2)`, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6 }}>
              <strong>What happens next:</strong> Your request will be sent to {p.name}. You&apos;ll receive email and in-app confirmation.
            </div>

            {errors.submit && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{errors.submit}</span>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <GGButton variant="secondary" size="md" onClick={() => navigate(-1)} style={{ flex: 1 }}>
                Cancel
              </GGButton>
              <GGButton variant="primary" size="md" onClick={handleSubmit} disabled={createAppointmentMutation.isPending} style={{ flex: 2 }}>
                {createAppointmentMutation.isPending ? 'Sending Request...' : 'Submit Request'}
              </GGButton>
            </div>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
