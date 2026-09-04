import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { usePatientPrescriptionRequests } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { route, ROUTES } from '@/router/routes'
import { formatCurrency, formatDate } from '@/utils/format'
import type { PrescriptionRequest } from '@/types/prescription.types'
import type { BadgeType } from '@/design-system/GGBadge'

function getStatusMeta(status: PrescriptionRequest['status']): { type: BadgeType; label: string } {
  switch (status) {
    case 'submitted':
      return { type: 'warning', label: 'Submitted' }
    case 'quoted':
      return { type: 'info', label: 'Review Quote' }
    case 'accepted':
      return { type: 'info', label: 'Accepted' }
    case 'preparing':
      return { type: 'pending', label: 'Preparing' }
    case 'ready':
      return { type: 'success', label: 'Ready' }
    case 'fulfilled':
      return { type: 'success', label: 'Fulfilled' }
    case 'cancelled':
      return { type: 'error', label: 'Cancelled' }
    case 'rejected':
      return { type: 'error', label: 'Rejected' }
    default:
      return { type: 'default', label: status }
  }
}

function PrescriptionRow({ request }: { request: PrescriptionRequest }) {
  const navigate = useNavigate()
  const statusMeta = getStatusMeta(request.status)

  return (
    <button
      type="button"
      onClick={() => navigate(route.patientPrescription(request.id))}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '16px 18px',
        borderRadius: radius.lg,
        border: `1px solid ${C.border}`,
        background: C.surface,
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px',
        alignItems: 'center',
        fontFamily: font.family,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{request.provider ?? 'Pharmacy'}</span>
          <GGBadge type={statusMeta.type}>{statusMeta.label}</GGBadge>
        </div>
        <div style={{ fontSize: '12px', color: C.textSub, display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span>{request.id} · {formatDate(request.submittedAt)}</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: request.fulfillmentMode === 'delivery' ? '#8A5A00' : '#1A5D8A',
              background: request.fulfillmentMode === 'delivery' ? 'rgba(245, 166, 35, 0.16)' : C.blue100,
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            {request.fulfillmentMode === 'delivery' ? 'Delivery' : 'Pickup'}
          </span>
        </div>
        {request.quotedAmount != null && (
          <div style={{ fontSize: '13px', fontWeight: 700, color: C.blue500, marginTop: '6px' }}>
            {formatCurrency(request.quotedAmount + (request.deliveryFee ?? 0))}
            {request.status === 'quoted' ? ' · Review quote' : request.invoiceId ? ' · Invoice ready' : request.status === 'accepted' ? ' · Awaiting invoice' : ''}
          </div>
        )}
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: C.textLight }}>
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

export function PrescriptionRequestsScreen() {
  const navigate = useNavigate()
  const { data = [], isLoading } = usePatientPrescriptionRequests()
  const requests = data as PrescriptionRequest[]

  const grouped = useMemo(() => {
    const active = requests.filter(request =>
      request.status === 'submitted' ||
      request.status === 'quoted' ||
      request.status === 'accepted' ||
      request.status === 'preparing' ||
      request.status === 'ready',
    )
    const completed = requests.filter(
      request =>
        request.status === 'fulfilled' ||
        request.status === 'cancelled' ||
        request.status === 'rejected',
    )
    return { active, completed }
  }, [requests])

  return (
    <AppLayout
      title="Prescription Requests"
      status={grouped.active.length > 0 ? `${grouped.active.length} active` : undefined}
      notifCount={0}
    >
      {isLoading && requests.length === 0 ? (
        <GGCard padding="28px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>Loading prescription requests…</div>
        </GGCard>
      ) : requests.length === 0 ? (
        <GGCard padding="28px">
          <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, marginBottom: '8px', fontFamily: font.family }}>
            No prescription requests yet
          </div>
          <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '18px', fontFamily: font.family }}>
            Upload a prescription from any pharmacy-enabled provider to start a medication order.
          </div>
          <GGButton variant="primary" size="md" onClick={() => navigate(ROUTES.FIND_SERVICE)}>
            Find a Pharmacy
          </GGButton>
        </GGCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>
          {grouped.active.length > 0 && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Active ({grouped.active.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {grouped.active.map(request => (
                  <PrescriptionRow key={request.id} request={request} />
                ))}
              </div>
            </div>
          )}

          {grouped.completed.length > 0 && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Completed
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {grouped.completed.map(request => (
                  <PrescriptionRow key={request.id} request={request} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
