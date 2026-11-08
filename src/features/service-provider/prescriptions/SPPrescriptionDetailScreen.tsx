import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGButton, GGCard, GGBadge, GGInput, GGTextarea, GGAvatar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import {
  useFulfillPrescriptionRequestMutation,
  useMarkPrescriptionReadyMutation,
  useQuotePrescriptionRequestMutation,
  useRejectPrescriptionRequestMutation,
  useSendPrescriptionInvoiceMutation,
  useSPNextInvoiceReference,
  useSPPrescriptionRequest,
  useSPProfile,
} from '@/hooks/api'
import { getCountryByCode, getCountryByName } from '@/config/countries'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { route } from '@/router/routes'
import { formatCurrency, formatDate, formatPhone } from '@/utils/format'
import { downloadInvoiceAttachment } from '@/utils/invoice-attachment'
import { useAttachmentPreviewUrl } from '@/hooks/useAttachmentPreviewUrl'
import type { PrescriptionQuotedItem, PrescriptionRequest } from '@/types/prescription.types'

function InfoRow({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '12px', color: C.textSub }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, textAlign: 'right' }}>{val}</span>
    </div>
  )
}

function FulfillmentBanner({ request }: { request: PrescriptionRequest }) {
  const isDelivery = request.fulfillmentMode === 'delivery'
  const isPaid = request.invoiceStatus === 'paid' || request.invoiceStatus === 'authorized'
  const isReady = request.status === 'ready'
  const isFulfilled = request.status === 'fulfilled'

  const distance = request.distanceKm != null ? `${request.distanceKm.toFixed(1)} km from your pharmacy` : null
  const pickupText = request.invoiceId
    ? 'The patient pays with their PIN at your counter.'
    : 'The patient comes to collect. Send the invoice when they arrive.'
  let statusText = request.isNearbyRequest
    ? isDelivery
      ? `Delivery pin is ${distance ?? 'nearby'}. Include your delivery charge in the price. The exact address is shared if the patient chooses you.`
      : `Patient is ${distance ?? 'nearby'} and will collect from the pharmacy they choose.`
    : isDelivery
      ? `Deliver to: ${request.deliveryAddress ?? 'Address not provided'}. The invoice is sent once it has been delivered.`
      : pickupText

  if (isFulfilled) {
    statusText = isDelivery ? 'Order successfully delivered.' : 'Order successfully collected by patient.'
  } else if (isReady) {
    statusText = isDelivery ? 'Order is out for delivery. Mark it delivered to send the invoice.' : pickupText
  }

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: radius.sm,
        border: `1.5px solid ${isPaid ? 'rgba(16, 185, 129, 0.45)' : isDelivery ? 'rgba(245,166,35,0.45)' : 'rgba(74,173,223,0.45)'}`,
        background: isPaid ? 'rgba(16, 185, 129, 0.08)' : isDelivery ? C.warningBg : C.blue100,
        marginBottom: '16px',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 800, color: isPaid ? '#065F46' : isDelivery ? '#8A4D00' : '#1A5D8A', marginBottom: 4 }}>
        {isDelivery ? 'Delivery requested' : 'Pickup requested'} {isPaid && '· Paid'}
      </div>
      <div style={{ fontSize: '12px', color: isPaid ? '#047857' : isDelivery ? '#8A4D00' : '#1A5D8A', lineHeight: 1.55 }}>
        {statusText}
      </div>
      {!request.isNearbyRequest && isDelivery && request.deliveryLat != null && request.deliveryLng != null && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${request.deliveryLat},${request.deliveryLng}`}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-block', marginTop: 8, fontSize: '12px', fontWeight: 700, color: '#0B7BC0' }}
        >
          Open delivery pin in Maps →
        </a>
      )}
    </div>
  )
}

type ConfirmationType = 'accept' | 'reject' | 'ready' | 'fulfill'

function ConfirmationModal({
  type,
  request,
  currencySymbol,
  onClose,
}: {
  type: ConfirmationType
  request: PrescriptionRequest
  currencySymbol: string
  onClose: () => void
}) {
  const content = {
    accept: {
      title: 'Pricing Sent',
      message: request.isNearbyRequest
        ? 'Your price was sent. The patient is comparing nearby pharmacies, and you will be notified if they choose you.'
        : 'Your quote was sent to the patient. They can accept or decline.',
      rows: [
        { label: 'Items total', val: request.quotedAmount != null ? formatCurrency(request.quotedAmount, currencySymbol) : '—' },
        {
          label: 'Delivery fee',
          val: request.deliveryFee != null ? formatCurrency(request.deliveryFee, currencySymbol) : '—',
        },
        { label: 'Status', val: <GGBadge type="info">Awaiting Patient Review</GGBadge> },
      ],
    },
    reject: {
      title: request.isNearbyRequest ? 'Request Declined' : 'Prescription Rejected',
      message: request.isNearbyRequest
        ? 'The request stays open for other nearby pharmacies.'
        : `${request.patient ?? 'The patient'} has been notified with your reason.`,
      rows: [
        { label: 'Reason', val: request.declineReason ?? '—' },
        { label: 'Status', val: <GGBadge type="error">Rejected</GGBadge> },
      ],
    },
    ready: {
      title: 'Marked Ready!',
      message: `${request.patient ?? 'The patient'} has been notified the order is ready for ${request.fulfillmentMode === 'delivery' ? 'delivery' : 'pickup'}.`,
      rows: [
        { label: 'Fulfillment', val: request.fulfillmentMode === 'delivery' ? 'Delivery' : 'Pickup' },
        { label: 'Status', val: <GGBadge type="success">Ready</GGBadge> },
      ],
    },
    fulfill: {
      title: request.fulfillmentMode === 'delivery' ? 'Marked as Delivered!' : 'Marked as Collected!',
      message:
        request.fulfillmentMode === 'delivery'
          ? 'The invoice was sent to the patient. The order completes when they pay with their PIN.'
          : 'This prescription order is complete.',
      rows: [{ label: 'Status', val: <GGBadge type="success">Fulfilled</GGBadge> }],
    },
  }[type]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,30,66,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: '16px', width: '100%', maxWidth: 440, padding: '36px 32px', textAlign: 'center', boxShadow: '0 32px 80px rgba(13,30,66,0.3)', fontFamily: font.family }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: type === 'reject' ? C.errorBg : C.successBg, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            {type === 'reject' ? (
              <path d="M10 10l16 16M26 10L10 26" stroke={C.error} strokeWidth="3" strokeLinecap="round" />
            ) : (
              <path d="M8 18l7 7 13-13" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>
        <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.015em', marginBottom: '8px' }}>{content.title}</div>
        <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '22px' }}>{content.message}</div>
        <div style={{ background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, padding: '16px', marginBottom: '22px', textAlign: 'left' }}>
          {content.rows.map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: '12px', color: C.textSub }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{row.val}</span>
            </div>
          ))}
        </div>
        <GGButton variant="primary" size="md" fullWidth onClick={onClose}>Continue</GGButton>
      </div>
    </div>
  )
}

/** Pickup "Send invoice" card. Mounting it fetches the next invoice number, which the pharmacy can keep or replace with their own. */
function PickupInvoiceCard({ request }: { request: PrescriptionRequest }) {
  const nextReference = useSPNextInvoiceReference()
  const sendInvoice = useSendPrescriptionInvoiceMutation()
  // Stays null until the pharmacy edits the field; until then it follows the suggested number.
  const [typedNumber, setTypedNumber] = useState<string | null>(null)

  const invoiceNumber = typedNumber ?? nextReference.data?.reference ?? ''
  const sendDisabled = sendInvoice.isPending || (!invoiceNumber.trim() && nextReference.isLoading)

  return (
    <GGCard padding="24px">
      <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Patient at the counter?</div>
      <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '16px' }}>
        Send the invoice when they arrive. They pay it with their PIN, and the order completes then.
      </div>
      <div style={{ marginBottom: '16px' }}>
        <GGInput
          label="Invoice number"
          value={invoiceNumber}
          onChange={event => {
            setTypedNumber(event.target.value)
            sendInvoice.reset()
          }}
          placeholder="Auto-generated"
          hint="Use your own number if you have one."
          error={sendInvoice.error?.message}
        />
      </div>
      <GGButton
        variant="primary"
        size="md"
        fullWidth
        loading={sendInvoice.isPending}
        disabled={sendDisabled}
        onClick={() => sendInvoice.mutate({ id: request.id, invoiceNumber })}
      >
        Send invoice to patient
      </GGButton>
    </GGCard>
  )
}

export function SPPrescriptionDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: request, isLoading } = useSPPrescriptionRequest(id)
  const { data: spProfile } = useSPProfile()
  const currencySymbol = getCountryByName(spProfile?.country ?? '')?.currencySymbol ?? ''
  const quoteMutation = useQuotePrescriptionRequestMutation()
  const rejectMutation = useRejectPrescriptionRequestMutation()
  const readyMutation = useMarkPrescriptionReadyMutation()
  const fulfillMutation = useFulfillPrescriptionRequestMutation()

  const [itemName, setItemName] = useState('')
  const [itemQty, setItemQty] = useState('1')
  const [itemPrice, setItemPrice] = useState('')
  const [items, setItems] = useState<PrescriptionQuotedItem[]>([])
  const [deliveryFee, setDeliveryFee] = useState('')
  const [pharmacyNotes, setPharmacyNotes] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationType | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const quotedTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * Number.parseFloat(item.quantity || '1'), 0),
    [items],
  )

  const rawAttachment = request?.attachment as { name?: string; dataUrl?: string; type?: string } | undefined
  const previewUrl = useAttachmentPreviewUrl(rawAttachment?.dataUrl ?? '')

  if (isLoading && !request) {
    return (
      <SPLayout title="Prescription Request" back>
        <GGCard padding="24px"><div style={{ color: C.textSub }}>Loading prescription request…</div></GGCard>
      </SPLayout>
    )
  }

  if (!request) {
    return (
      <SPLayout title="Prescription Request" back>
        <GGCard padding="24px"><div style={{ color: C.textSub }}>This prescription request could not be found.</div></GGCard>
      </SPLayout>
    )
  }

  const attachment = rawAttachment ?? {}
  const canPreview = !!attachment.dataUrl && !!previewUrl
  const canDecide = request.status === 'submitted'
  const awaitingPatientQuote = request.status === 'quoted' && !request.invoiceId
  const awaitingPatientApproval = !!request.invoiceId && request.invoiceStatus === 'pending_auth'
  const canMarkReady = request.status === 'accepted' || request.status === 'preparing'
  const canFulfill = request.status === 'ready'
  const isDelivery = request.fulfillmentMode === 'delivery'
  const canSendPickupInvoice =
    !isDelivery && !request.invoiceId && (request.status === 'accepted' || request.status === 'preparing' || request.status === 'ready')
  const patientCountry = getCountryByCode(request.countryCode ?? '')
  const patientPhone = formatPhone(
    request.patientPhone ?? '',
    patientCountry?.name,
    request.deliveryAddress,
  )
  const deliveryFeeValue = Number.parseFloat(deliveryFee || '0') || 0
  const grandTotal = quotedTotal + (isDelivery ? deliveryFeeValue : 0)

  const handleAddItem = () => {
    if (!itemName.trim() || !itemPrice.trim()) return
    setItems(prev => [
      ...prev,
      {
        name: itemName.trim(),
        quantity: itemQty.trim() || '1',
        unitPrice: Number.parseFloat(itemPrice),
        availability: 'in_stock',
      },
    ])
    setItemName('')
    setItemQty('1')
    setItemPrice('')
  }

  const handleConfirmationClose = () => {
    setConfirmation(null)
  }

  const handleAccept = async () => {
    if (items.length === 0) {
      setActionError('Add at least one medication (name, quantity, and amount) before accepting.')
      return
    }
    if (isDelivery && !(deliveryFeeValue > 0)) {
      setActionError('Enter a delivery fee for delivery orders.')
      return
    }

    setActionError(null)
    try {
      await quoteMutation.mutateAsync({
        id: request.id,
        payload: {
          items,
          amount: quotedTotal,
          deliveryFee: isDelivery ? deliveryFeeValue : undefined,
          pharmacyNotes: pharmacyNotes.trim() || undefined,
        },
      })
      setItems([])
      setDeliveryFee('')
      setPharmacyNotes('')
      setConfirmation('accept')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to accept this prescription.')
    }
  }

  const handleReject = async () => {
    if (rejectReason.trim().length < 3) {
      setActionError('Provide a rejection reason (e.g. out of stock).')
      return
    }
    setActionError(null)
    try {
      await rejectMutation.mutateAsync({
        id: request.id,
        payload: { reason: rejectReason.trim() },
      })
      setShowReject(false)
      setRejectReason('')
      setConfirmation('reject')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to reject this prescription.')
    }
  }

  const handleReady = async () => {
    setActionError(null)
    try {
      await readyMutation.mutateAsync(request.id)
      setConfirmation('ready')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to mark order ready.')
    }
  }

  const handleFulfill = async () => {
    setActionError(null)
    try {
      await fulfillMutation.mutateAsync(request.id)
      setConfirmation('fulfill')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to fulfill order.')
    }
  }

  return (
    <SPLayout title={request.id} back>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 1fr)', gap: '20px', fontFamily: font.family }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GGCard padding="24px">
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <GGAvatar name={request.patient ?? 'Patient'} src={request.patientAvatarUrl} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, marginBottom: '4px' }}>
                  {request.patient ?? 'Patient'}
                </div>
                <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '8px' }}>
                  {request.for} · {isDelivery ? 'Delivery' : 'Pickup'}
                  {request.distanceKm != null ? ` · ${request.distanceKm.toFixed(1)} km away` : ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {request.patientPhone && (
                    <a
                      href={`tel:${patientPhone.tel}`}
                      style={{ fontSize: '13px', fontWeight: 600, color: C.blue500, textDecoration: 'none' }}
                    >
                      {patientPhone.display}
                    </a>
                  )}
                  {request.patientEmail && (
                    <a
                      href={`mailto:${request.patientEmail}`}
                      style={{ fontSize: '13px', fontWeight: 600, color: C.blue500, textDecoration: 'none', wordBreak: 'break-all' }}
                    >
                      {request.patientEmail}
                    </a>
                  )}
                  {!request.patientPhone && !request.patientEmail && (
                    <span style={{ fontSize: '12px', color: C.textSub }}>
                      {request.isNearbyRequest
                        ? 'Contact details are shared if the patient chooses your pharmacy.'
                        : 'Contact details unavailable'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Request Details</div>
              <GGBadge type={request.status === 'rejected' ? 'error' : 'info'}>
                {request.isNearbyRequest && request.status === 'cancelled' ? 'closed' : request.status === 'rejected' && request.isNearbyRequest ? 'declined' : request.status}
              </GGBadge>
            </div>

            <FulfillmentBanner request={request} />
            <InfoRow label="Submitted" val={formatDate(request.submittedAt)} />
            <InfoRow label="For" val={request.for} />
            <InfoRow label="Fulfillment" val={isDelivery ? 'Delivery' : 'Pickup'} />
            {request.deliveryAddress && <InfoRow label="Delivery address" val={request.deliveryAddress} />}
            {request.patientNotes && <InfoRow label="Patient notes" val={request.patientNotes} />}
            {request.pharmacyNotes && <InfoRow label="Pharmacy notes" val={request.pharmacyNotes} />}
            {request.quotedAmount != null && <InfoRow label="Items total" val={formatCurrency(request.quotedAmount, currencySymbol)} />}
            {request.deliveryFee != null && <InfoRow label="Delivery fee" val={formatCurrency(request.deliveryFee, currencySymbol)} />}
            {(request.status === 'cancelled' || request.status === 'rejected') && request.declineReason && (
              <InfoRow label={request.isNearbyRequest && request.status === 'cancelled' ? 'Closed' : 'Reason'} val={request.declineReason} />
            )}
          </GGCard>

          <GGCard padding="24px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Prescription File</div>
              {attachment.dataUrl && (
                <GGButton
                  variant="secondary"
                  size="sm"
                  onClick={() => void downloadInvoiceAttachment(attachment.dataUrl!, attachment.name ?? 'prescription')}
                >
                  Download
                </GGButton>
              )}
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '12px' }}>{attachment.name ?? 'Uploaded prescription'}</div>
            {canPreview && attachment.type === 'image' && (
              <img src={previewUrl} alt={attachment.name ?? 'Prescription'} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: radius.md, border: `1px solid ${C.border}` }} />
            )}
            {canPreview && attachment.type === 'pdf' && (
              <iframe title={attachment.name ?? 'Prescription PDF'} src={previewUrl} style={{ width: '100%', height: 420, border: `1px solid ${C.border}`, borderRadius: radius.md }} />
            )}
            {!canPreview && (
              <div style={{ padding: '32px 20px', textAlign: 'center', borderRadius: radius.md, border: `1px dashed ${C.border}`, background: C.bg }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>
                  {attachment.dataUrl ? 'Loading preview…' : 'Preview unavailable'}
                </div>
              </div>
            )}
          </GGCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {canDecide && !showReject && (
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
                {request.isNearbyRequest ? 'Send a price or decline' : 'Accept or Reject'}
              </div>
              <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '14px' }}>
                {request.isNearbyRequest
                  ? 'This prescription went to every registered pharmacy nearby. The patient compares prices and chooses one. '
                  : ''}
                Review the prescription. If available, add items with quantity and amount
                {isDelivery ? ', include the delivery fee,' : ''} then accept. If not available, {request.isNearbyRequest ? 'decline' : 'reject'} with a reason.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                <GGInput label="Medication" value={itemName} onChange={event => setItemName(event.target.value)} placeholder="Drug name" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <GGInput label="Qty" value={itemQty} onChange={event => setItemQty(event.target.value)} />
                  <GGInput label={`Unit price (${currencySymbol})`} value={itemPrice} onChange={event => setItemPrice(event.target.value)} placeholder="0.00" />
                </div>
                <GGButton variant="secondary" size="sm" onClick={handleAddItem}>Add medication</GGButton>
              </div>

              {items.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {items.map((item, index) => (
                    <div key={`${item.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: '13px' }}>
                      <span>{item.name} × {item.quantity}</span>
                      <span style={{ fontWeight: 700 }}>{formatCurrency(item.unitPrice * Number.parseFloat(item.quantity || '1'), currencySymbol)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', fontWeight: 700 }}>
                    <span>Items</span>
                    <span>{formatCurrency(quotedTotal, currencySymbol)}</span>
                  </div>
                </div>
              )}

              {isDelivery && (
                <div style={{ marginBottom: '12px' }}>
                  <GGInput
                    label={`Delivery fee (${currencySymbol}) *`}
                    value={deliveryFee}
                    onChange={event => setDeliveryFee(event.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: 6 }}>Delivery orders are paid with GG&apos;APP credit after delivery.</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 800, fontSize: 14 }}>
                    <span>Grand total</span>
                    <span>{formatCurrency(grandTotal, currencySymbol)}</span>
                  </div>
                </div>
              )}

              <GGTextarea
                label="Notes for patient"
                value={pharmacyNotes}
                onChange={event => setPharmacyNotes(event.target.value)}
                rows={3}
                placeholder="Availability, substitutions, pickup instructions"
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                <GGButton variant="primary" size="md" fullWidth loading={quoteMutation.isPending} onClick={() => void handleAccept()}>
                  Accept &amp; Send Pricing →
                </GGButton>
                <GGButton variant="danger" size="md" fullWidth onClick={() => { setShowReject(true); setActionError(null) }}>
                  {request.isNearbyRequest ? 'Decline' : 'Reject Prescription'}
                </GGButton>
              </div>
            </GGCard>
          )}

          {canDecide && showReject && (
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.error, marginBottom: '8px' }}>Reject Prescription</div>
              <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '12px' }}>
                Tell the patient why (e.g. out of stock, medication not available).
              </div>
              <GGTextarea
                label="Reason *"
                value={rejectReason}
                onChange={event => setRejectReason(event.target.value)}
                rows={3}
                placeholder="Out of stock / Not available / …"
                required
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <GGButton variant="secondary" size="md" fullWidth onClick={() => { setShowReject(false); setRejectReason('') }}>
                  Back
                </GGButton>
                <GGButton variant="danger" size="md" fullWidth loading={rejectMutation.isPending} onClick={() => void handleReject()}>
                  Confirm Reject
                </GGButton>
              </div>
            </GGCard>
          )}

          {awaitingPatientQuote && (
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Waiting on Patient</div>
              <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>
                {request.isNearbyRequest
                  ? 'Your price was sent. The patient is comparing nearby pharmacies. If they choose you, the invoice is sent to them automatically.'
                  : 'Your quote was sent. The patient can accept or decline.'}
              </div>
            </GGCard>
          )}

          {canSendPickupInvoice && <PickupInvoiceCard request={request} />}

          {awaitingPatientApproval && (
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Invoice sent</div>
              <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>
                {isDelivery
                  ? `Invoice ${request.invoiceId} was sent after delivery. Waiting for payment.`
                  : `Invoice ${request.invoiceId} was sent. They pay it with their PIN at your counter.`}
              </div>
            </GGCard>
          )}

          {(canMarkReady || canFulfill) && (
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '12px' }}>Fulfillment</div>
              {canMarkReady && (
                <>
                  <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '16px' }}>
                    Prepare the medication, then mark it ready.
                  </div>
                  <GGButton variant="primary" size="md" fullWidth loading={readyMutation.isPending} onClick={() => void handleReady()}>
                    Mark ready for {isDelivery ? 'delivery' : 'pickup'}
                  </GGButton>
                </>
              )}
              {canFulfill && isDelivery && (
                <GGButton variant="primary" size="md" fullWidth loading={fulfillMutation.isPending} onClick={() => void handleFulfill()}>
                  Mark delivered and send invoice
                </GGButton>
              )}
              {canFulfill && !isDelivery && !!request.invoiceId && (
                <>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Waiting at your counter</div>
                  <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>The order completes when the patient pays with their PIN.</div>
                </>
              )}
            </GGCard>
          )}

          {request.invoiceId && (
            <GGCard padding="24px">
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Invoice</div>
              <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '12px' }}>
                {request.invoiceId} · {request.invoiceStatus ?? 'pending'}
              </div>
              <GGButton variant="secondary" size="sm" onClick={() => navigate(route.spInvoice(request.invoiceId!))}>
                View Invoice →
              </GGButton>
            </GGCard>
          )}

          {actionError && (
            <div style={{ padding: '12px 14px', borderRadius: radius.sm, background: C.errorBg, color: C.error, fontSize: '12px' }}>
              {actionError}
            </div>
          )}
        </div>
      </div>

      {confirmation && (
        <ConfirmationModal type={confirmation} request={request} currencySymbol={currencySymbol} onClose={handleConfirmationClose} />
      )}
    </SPLayout>
  )
}
