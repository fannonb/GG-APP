import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGSelect, GGTextarea } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { ApiError } from '@/api/types'
import { useCreatePrescriptionRequestMutation } from '@/hooks/api/usePatientMutations'
import { useUserStore } from '@/store/user.store'
import { getPatientDisplayName, isBeneficiariesActive } from '@/features/patient/patientAccount'
import { ROUTES } from '@/router/routes'
import type { AppointmentAttachmentPayload } from '@/api/types'
import type { Provider } from '@/types/provider.types'
import type { PrescriptionFulfillmentMode } from '@/types/prescription.types'

const ACCEPTED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

type UploadedAttachment = AppointmentAttachmentPayload & { dataUrl: string }

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
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Unable to read selected file'))
    }
    reader.onerror = () => reject(new Error('Unable to read selected file'))
    reader.readAsDataURL(file)
  })
}

interface PharmacyPrescriptionUploadProps {
  provider: Provider
}

export function PharmacyPrescriptionUpload({ provider }: PharmacyPrescriptionUploadProps) {
  const navigate = useNavigate()
  const user = useUserStore(s => s.user)
  const beneficiaries = useUserStore(s => s.beneficiaries)
  const beneficiariesActive = isBeneficiariesActive(user.beneficiariesEnabled, beneficiaries.length)
  const canRequestForBeneficiary = beneficiariesActive && beneficiaries.length > 0
  const createPrescriptionMutation = useCreatePrescriptionRequestMutation()
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const [forSelf, setForSelf] = useState(true)
  const [beneficiaryId, setBeneficiaryId] = useState('')
  const [fulfillmentMode, setFulfillmentMode] = useState<PrescriptionFulfillmentMode>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [patientNotes, setPatientNotes] = useState('')
  const [attachment, setAttachment] = useState<UploadedAttachment | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return

    if (!ACCEPTED_ATTACHMENT_TYPES.has(file.type) && !/\.(pdf|png|jpe?g|webp)$/i.test(file.name)) {
      setError('Please upload a PDF or image of your prescription.')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('File must be 8 MB or smaller.')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setAttachment({
        name: file.name,
        type: inferAttachmentType(file),
        size: formatAttachmentSize(file.size),
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        storageKey: `prescription/${Date.now()}-${file.name}`,
        dataUrl,
      })
      setError(null)
    } catch {
      setError('Unable to read the selected file. Please try again.')
    }
  }

  const handleSubmit = async () => {
    if (!attachment) {
      setError('Please upload your prescription before submitting.')
      return
    }

    if (fulfillmentMode === 'delivery' && !deliveryAddress.trim()) {
      setError('Please enter a delivery address.')
      return
    }

    setError(null)

    try {
      const result = await createPrescriptionMutation.mutateAsync({
        providerId: provider.id,
        forSelf,
        beneficiaryId: forSelf ? undefined : beneficiaryId || undefined,
        fulfillmentMode,
        deliveryAddress: fulfillmentMode === 'delivery' ? deliveryAddress.trim() : undefined,
        patientNotes: patientNotes.trim() || undefined,
        attachment,
      })

      navigate(ROUTES.PRESCRIPTION_CONFIRM, { state: { provider, result } })
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : submitError instanceof Error
            ? submitError.message
            : 'Unable to submit prescription. Please try again.',
      )
    }
  }

  const beneficiaryOptions = [
    { value: 'self', label: getPatientDisplayName(user) },
    ...(canRequestForBeneficiary
      ? beneficiaries.map(beneficiary => ({
          value: beneficiary.id,
          label: `${beneficiary.name} (${beneficiary.relation})`,
        }))
      : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: font.family, fontSize: '13px' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Upload Prescription</div>
      <div style={{ color: C.textSub, lineHeight: 1.6, fontWeight: 400 }}>
        Upload your prescription from a recent consultation. {provider.name} will review it, confirm stock and pricing, then prepare your order. You pay after pickup or delivery.
      </div>

      <GGSelect
        label="For"
        value={forSelf ? 'self' : beneficiaryId || beneficiaries[0]?.id || 'self'}
        onChange={event => {
          const value = event.target.value
          if (value === 'self') {
            setForSelf(true)
            setBeneficiaryId('')
          } else {
            setForSelf(false)
            setBeneficiaryId(value)
          }
        }}
        options={beneficiaryOptions}
      />

      {!canRequestForBeneficiary && (
        <div style={{ padding: '10px 14px', background: C.bg, borderRadius: radius.sm, border: `1px dashed ${C.border}`, fontSize: '12px', color: C.textSub, lineHeight: 1.6 }}>
          {!beneficiariesActive
            ? 'Prescriptions for beneficiaries are locked until you enable Beneficiaries in Profile.'
            : 'Add a beneficiary in Profile to submit a prescription on their behalf.'}
        </div>
      )}

      <GGSelect
        label="Fulfillment"
        value={fulfillmentMode}
        onChange={event => setFulfillmentMode(event.target.value as PrescriptionFulfillmentMode)}
        options={[
          { value: 'pickup', label: 'Pickup at pharmacy' },
          { value: 'delivery', label: 'Home delivery' },
        ]}
      />

      {fulfillmentMode === 'delivery' && (
        <GGTextarea
          label="Delivery address"
          value={deliveryAddress}
          onChange={event => setDeliveryAddress(event.target.value)}
          placeholder="Street, suburb, city"
          rows={3}
        />
      )}

      <GGTextarea
        label="Notes for pharmacy (optional)"
        value={patientNotes}
        onChange={event => setPatientNotes(event.target.value)}
        placeholder="e.g. generic substitute acceptable"
        rows={3}
      />

      <div>
        <div style={{ fontWeight: 600, color: C.text, marginBottom: '8px' }}>
          Prescription file
        </div>
        <input
          ref={attachmentInputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          onChange={event => void handleFileSelect(event.target.files)}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => attachmentInputRef.current?.click()}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: radius.md,
            border: `1.5px dashed ${attachment ? 'rgba(34,201,138,0.45)' : C.border}`,
            background: attachment ? 'rgba(34,201,138,0.06)' : C.bg,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: font.family,
            fontSize: '13px',
          }}
        >
          {attachment ? (
            <div>
              <div style={{ fontWeight: 700, color: '#0D6B47' }}>{attachment.name}</div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', fontWeight: 400 }}>{attachment.size} · Tap to replace</div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1v10M5 5l4-4 4 4M2 13v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke={C.blue500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ color: C.blue500, fontWeight: 600 }}>
                Upload prescription (PDF or photo)
              </span>
            </div>
          )}
        </button>
      </div>

      <div style={{ padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.5, fontWeight: 400 }}>
        Payment is only requested after your medication has been picked up or delivered.
      </div>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: radius.sm, background: C.errorBg, color: C.error, fontSize: '12px', fontWeight: 400 }}>
          {error}
        </div>
      )}

      <GGButton
        variant="primary"
        size="md"
        fullWidth
        loading={createPrescriptionMutation.isPending}
        onClick={() => void handleSubmit()}
      >
        Submit Prescription →
      </GGButton>
    </div>
  )
}
