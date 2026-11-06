import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGInput, GGTextarea } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { ApiError } from '@/api/types'
import { useCreatePrescriptionRequestMutation } from '@/hooks/api/usePatientMutations'
import { useNearbyPharmacies } from '@/hooks/api/usePatientQueries'
import { useLocationStore } from '@/store/location.store'
import { useUserStore } from '@/store/user.store'
import { getPatientDisplayName, isBeneficiariesActive } from '@/features/patient/patientAccount'
import { ROUTES } from '@/router/routes'
import type { AppointmentAttachmentPayload } from '@/api/types'
import type { PrescriptionFulfillmentMode } from '@/types/prescription.types'
import { MapPinPicker, type PinnedLocation } from './MapPinPicker'

const CURRENT_LOCATION_LABEL = 'Your current location'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'

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

/**
 * Upload a prescription once; it goes to every registered pharmacy within 2 km of the pin
 * (6 km if there are none that close). The patient then compares the prices that come back.
 */
export function PharmacyPrescriptionUpload() {
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
  const [deliveryDetails, setDeliveryDetails] = useState('')
  const [pin, setPin] = useState<PinnedLocation | null>(null)
  const [pinTouched, setPinTouched] = useState(false)
  const position = useLocationStore(s => s.position)
  const requestLocation = useLocationStore(s => s.requestLocation)
  const [patientNotes, setPatientNotes] = useState('')
  const [attachment, setAttachment] = useState<UploadedAttachment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  // Start from the device location until the patient moves the pin themselves.
  const autoPin = !pinTouched && position ? { lat: position.lat, lng: position.lng, label: CURRENT_LOCATION_LABEL } : null
  const activePin = pinTouched ? pin : autoPin
  const nearby = useNearbyPharmacies(activePin)
  const noPharmacies = !!nearby.data && nearby.data.radiusKm == null

  const handlePinChange = (value: PinnedLocation) => {
    setPinTouched(true)
    setPin(value)
  }

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

    if (!activePin) {
      setError(fulfillmentMode === 'delivery'
        ? 'Drop a pin on the map where the order should be delivered.'
        : 'Share your location or drop a pin so we can find pharmacies near you.')
      return
    }

    if (fulfillmentMode === 'delivery' && deliveryDetails.trim().length < 3) {
      setError('Add the house or building number, and a landmark, so the rider can find you.')
      return
    }

    if (noPharmacies) {
      setError('No available pharmacies near this location.')
      return
    }

    setError(null)

    try {
      const result = await createPrescriptionMutation.mutateAsync({
        searchLat: activePin.lat,
        searchLng: activePin.lng,
        forSelf,
        beneficiaryId: forSelf ? undefined : beneficiaryId || undefined,
        fulfillmentMode,
        deliveryAddress: fulfillmentMode === 'delivery'
          ? [deliveryDetails.trim(), activePin.label !== CURRENT_LOCATION_LABEL ? activePin.label : ''].filter(Boolean).join(' — ')
          : undefined,
        patientNotes: patientNotes.trim() || undefined,
        attachment,
      })

      navigate(ROUTES.PRESCRIPTION_CONFIRM, { state: { result } })
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
    { value: 'self', label: `${getPatientDisplayName(user)} (you)` },
    ...beneficiaries.map(beneficiary => ({
      value: beneficiary.id,
      label: `${beneficiary.name} (${beneficiary.relation})`,
    })),
  ]

  const sectionLabel: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }
  const choiceStyle = (selected: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 160,
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    textAlign: 'left',
    padding: '12px 14px',
    borderRadius: radius.sm,
    border: `1.5px solid ${selected ? CYAN_DEEP : C.border}`,
    background: selected ? C.blue100 : '#fff',
    cursor: 'pointer',
    fontFamily: font.family,
  })
  const radioDot = (selected: boolean) => (
    <span aria-hidden style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selected ? CYAN_DEEP : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxSizing: 'border-box' }}>
      {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: CYAN_DEEP }} />}
    </span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, fontFamily: font.family, fontSize: 13 }}>
      <div>
        <div style={sectionLabel}>Your prescription</div>
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
          onDragOver={event => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => {
            event.preventDefault()
            setDragging(false)
            void handleFileSelect(event.dataTransfer.files)
          }}
          style={{
            width: '100%',
            padding: attachment ? '16px 18px' : '28px 18px',
            borderRadius: radius.md,
            border: `1.5px dashed ${attachment ? 'rgba(34,197,94,0.5)' : dragging ? CYAN_DEEP : 'rgba(11,123,192,0.35)'}`,
            background: attachment ? 'rgba(34,197,94,0.06)' : dragging ? C.blue100 : '#F7FBFE',
            cursor: 'pointer',
            textAlign: attachment ? 'left' : 'center',
            fontFamily: font.family,
          }}
        >
          {attachment ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                <rect x="4" y="2" width="14" height="18" rx="2.5" stroke="#15803D" strokeWidth="1.5" />
                <path d="M7.5 11.5l2.5 2.5 4.5-5" stroke="#15803D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#15803D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{attachment.size} · Click to replace</div>
              </div>
            </div>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 18 18" fill="none" aria-hidden style={{ color: CYAN_DEEP }}>
                <path d="M9 1v10M5 5l4-4 4 4M2 13v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: 14, fontWeight: 700, color: CYAN_DEEP, marginTop: 8 }}>Upload a photo or PDF</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>or drag it here · up to 8 MB</div>
            </>
          )}
        </button>
      </div>

      <div>
        <div style={sectionLabel}>Who is it for?</div>
        {canRequestForBeneficiary ? (
          <select
            aria-label="Who is it for?"
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
            style={{ width: '100%', padding: '10px 14px', fontSize: 14, fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none' }}
          >
            {beneficiaryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : (
          <div style={{ fontSize: 14, color: C.text }}>
            {getPatientDisplayName(user)} (you)
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
              {!beneficiariesActive
                ? 'To send one for a family member, turn on Family in Settings.'
                : 'To send one for a family member, add them in Settings first.'}
            </div>
          </div>
        )}
      </div>

      <div>
        <div style={sectionLabel}>How do you want to get it?</div>
        <div role="radiogroup" aria-label="Pickup or delivery" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {([
            { value: 'pickup', label: 'Pick up', hint: 'Collect it from the pharmacy you choose' },
            { value: 'delivery', label: 'Delivery', hint: "Delivered to you. Pay after it arrives, with GG'APP credit." },
          ] as const).map(option => {
            const selected = fulfillmentMode === option.value
            return (
              <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => setFulfillmentMode(option.value)} style={choiceStyle(selected)}>
                {radioDot(selected)}
                <span>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.text }}>{option.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: C.textSub, marginTop: 2 }}>{option.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div style={sectionLabel}>{fulfillmentMode === 'delivery' ? 'Where should it be delivered?' : 'Find pharmacies near'}</div>
        <div style={{ fontSize: 12, color: C.textSub, marginTop: -4, marginBottom: 10, lineHeight: 1.5 }}>
          {fulfillmentMode === 'delivery'
            ? 'Drag the pin to your exact door. Pharmacies use it to price the delivery.'
            : 'We send your prescription to pharmacies close to this pin.'}
        </div>
        <MapPinPicker
          value={activePin}
          onChange={handlePinChange}
          fallbackCenter={position}
          hint={fulfillmentMode === 'delivery' ? 'Tap the map or search to drop the delivery pin.' : 'Turn on location, search, or tap the map.'}
        />
        {fulfillmentMode === 'delivery' && (
          <div style={{ marginTop: 12 }}>
            <GGInput
              label="House, flat or building, and a landmark"
              value={deliveryDetails}
              onChange={event => setDeliveryDetails(event.target.value)}
              placeholder="e.g. 14 Baines Ave, Flat 3B, opposite the Total garage"
              required
            />
          </div>
        )}
        {activePin && (
          <div
            role="status"
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: radius.sm,
              fontSize: 13,
              lineHeight: 1.5,
              background: noPharmacies ? 'rgba(239,68,68,0.08)' : C.blue100,
              color: noPharmacies ? '#B91C1C' : '#1A5D8A',
            }}
          >
            {nearby.isLoading
              ? 'Checking for pharmacies nearby…'
              : nearby.isError
                ? 'We could not check nearby pharmacies. You can still try to send it.'
                : noPharmacies
                  ? `No available pharmacies within ${nearby.data!.maxRadiusKm} km of this location.`
                  : nearby.data
                    ? <>Goes to <strong>{nearby.data.count} registered {nearby.data.count === 1 ? 'pharmacy' : 'pharmacies'}</strong> within {nearby.data.radiusKm} km{nearby.data.radiusKm !== 2 ? ' (none closer than 2 km)' : ''}.</>
                    : null}
          </div>
        )}
      </div>

      <GGTextarea
        label="Notes for the pharmacy (optional)"
        value={patientNotes}
        onChange={event => setPatientNotes(event.target.value)}
        placeholder="e.g. a generic substitute is fine"
        rows={2}
      />

      {error && (
        <div role="alert" style={{ padding: '10px 12px', borderRadius: radius.sm, background: 'rgba(239,68,68,0.10)', color: '#B91C1C', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div>
        <button
          type="button"
          disabled={createPrescriptionMutation.isPending || noPharmacies}
          onClick={() => void handleSubmit()}
          style={{
            width: '100%',
            height: 48,
            borderRadius: radius.sm,
            border: 'none',
            background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
            boxShadow: '0 6px 16px rgba(11,123,192,0.28)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: font.family,
            cursor: createPrescriptionMutation.isPending || noPharmacies ? 'default' : 'pointer',
            opacity: createPrescriptionMutation.isPending || noPharmacies ? 0.6 : 1,
          }}
        >
          {createPrescriptionMutation.isPending ? 'Sending…' : noPharmacies ? 'No available pharmacies' : 'Send to nearby pharmacies'}
        </button>
        <div style={{ fontSize: 12, color: C.textSub, textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
          Each pharmacy checks stock and sends a price. You choose one, and pay only after you approve its invoice.
        </div>
      </div>
    </div>
  )
}
