import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useSPPrescriptionRequests } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { route } from '@/router/routes'
import { formatCurrency, formatDate, formatPhone } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import type { PrescriptionRequest, PrescriptionRequestStatus, PrescriptionFulfillmentMode } from '@/types/prescription.types'

const STATUS_LABELS: Record<PrescriptionRequestStatus, string> = {
  submitted: 'New Request',
  quoted: 'Quote Sent',
  accepted: 'Patient Approved',
  preparing: 'Preparing Order',
  ready: 'Ready for Fulfillment',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

const STATUS_BADGE: Record<PrescriptionRequestStatus, 'warning' | 'info' | 'open' | 'success' | 'closed' | 'error'> = {
  submitted: 'warning',
  quoted: 'info',
  accepted: 'info',
  preparing: 'info',
  ready: 'open',
  fulfilled: 'success',
  cancelled: 'closed',
  rejected: 'error',
}

function DeliveryLineIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function PickupLineIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

type StatusFilterTab = 'all' | 'action_needed' | 'in_progress' | 'ready' | 'completed' | 'closed'

function PrescriptionCard({ request }: { request: PrescriptionRequest }) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [hovered, setHovered] = useState(false)

  const isDelivery = request.fulfillmentMode === 'delivery'
  const totalAmount = (request.quotedAmount ?? 0) + (request.deliveryFee ?? 0)
  const isActionNeeded = request.status === 'submitted'
  const patientCountry = getCountryByCode(request.countryCode ?? '')
  const patientPhone = formatPhone(
    request.patientPhone ?? '',
    patientCountry?.name,
    request.deliveryAddress,
  )

  const isPaid = request.invoiceStatus === 'paid' || request.invoiceStatus === 'authorized'
  const isReadyForPickup =
    request.fulfillmentMode === 'pickup' &&
    isPaid &&
    (request.status === 'accepted' || request.status === 'preparing')
  const isReadyForDelivery =
    request.fulfillmentMode === 'delivery' &&
    isPaid &&
    (request.status === 'accepted' || request.status === 'preparing')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(route.spPrescription(request.id))}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(route.spPrescription(request.id))
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: isMobile ? '14px 14px' : '18px 20px',
        borderRadius: radius.lg,
        border: `1.5px solid ${
          hovered
            ? C.blue500
            : isReadyForPickup || isReadyForDelivery
              ? '#10B981'
              : isActionNeeded
                ? 'rgba(56, 182, 255, 0.4)'
                : C.border
        }`,
        background: hovered ? 'linear-gradient(180deg, #FFFFFF 0%, #F5FAFF 100%)' : C.surface,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: isMobile ? '12px' : '16px',
        alignItems: isMobile ? 'stretch' : 'center',
        fontFamily: font.family,
        transition: 'all 0.15s ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        position: 'relative',
      }}
    >
      {/* Main Content Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', minWidth: 0, flex: 1 }}>
        {/* Prescription Icon Avatar */}
        <div
          style={{
            width: isMobile ? '38px' : '44px',
            height: isMobile ? '38px' : '44px',
            borderRadius: radius.md,
            background: isActionNeeded ? C.navy800 : C.blue100,
            color: isActionNeeded ? C.blue500 : C.navy800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={isMobile ? '18' : '22'} height={isMobile ? '18' : '22'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
            <path d="M9 7h6" />
            <path d="M9 11h6" />
            <path d="M9 15h4" />
          </svg>
        </div>

        {/* Prescription Info */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.01em', fontFamily: font.family }}>
              {request.patient || 'Patient'}
            </span>
            
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: C.navy600,
                background: C.bg,
                border: `1px solid ${C.border}`,
                padding: '2px 6px',
                borderRadius: radius.xs,
                fontFamily: font.family,
              }}
            >
              {request.id}
            </span>

            <GGBadge type={STATUS_BADGE[request.status]}>
              {STATUS_LABELS[request.status]}
            </GGBadge>

            {isReadyForPickup && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#047857',
                  background: '#D1FAE5',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: radius.full,
                  letterSpacing: '0.02em',
                }}
              >
                Paid · Mark Ready for Pickup
              </span>
            )}

            {isReadyForDelivery && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#047857',
                  background: '#D1FAE5',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: radius.full,
                  letterSpacing: '0.02em',
                }}
              >
                Paid · Mark Ready for Delivery
              </span>
            )}
          </div>

          <div style={{ fontSize: '12px', color: C.textSub, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontFamily: font.family }}>
            {request.patientPhone && (
              <span>{patientPhone.display}</span>
            )}
            {request.patientEmail && (
              <span>{request.patientEmail}</span>
            )}
            {(request.patientPhone || request.patientEmail) && <span>·</span>}
            {/* Fulfillment Mode Pill */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                color: isDelivery ? '#091C44' : '#1A5D8A',
                background: isDelivery ? 'rgba(56, 182, 255, 0.16)' : C.blue100,
                border: `1px solid ${isDelivery ? 'rgba(56, 182, 255, 0.3)' : 'rgba(26, 93, 138, 0.15)'}`,
                padding: '2px 8px',
                borderRadius: radius.full,
                fontFamily: font.family,
              }}
            >
              {isDelivery ? (
                <>
                  <DeliveryLineIcon size={11} />
                  Delivery
                </>
              ) : (
                <>
                  <PickupLineIcon size={11} />
                  Pickup
                </>
              )}
            </span>

            {/* Date */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: C.textSub, fontFamily: font.family }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatDate(request.submittedAt)}
            </span>

            {request.quotedItems && request.quotedItems.length > 0 && (
              <span style={{ color: C.textLight, fontFamily: font.family }}>
                · {request.quotedItems.length} {request.quotedItems.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
        </div>

        {/* Chevron Icon for desktop */}
        {!isMobile && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: hovered ? C.navy800 : C.bg,
              color: hovered ? '#FFFFFF' : C.textSub,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Bottom Row on Mobile / Right Section on Desktop */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'space-between' : 'flex-end',
          gap: '12px',
          paddingTop: isMobile ? '8px' : 0,
          borderTop: isMobile ? `1px solid ${C.border}` : 'none',
        }}
      >
        {isReadyForPickup || isReadyForDelivery ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
                Paid in Full
              </div>
              <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 800, color: '#065F46', fontFamily: font.family }}>
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                navigate(route.spPrescription(request.id))
              }}
              style={{
                border: 'none',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: radius.sm,
                fontSize: '11px',
                fontWeight: 800,
                fontFamily: font.family,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              {isReadyForPickup ? 'Mark Ready for Pickup →' : 'Mark Ready for Delivery →'}
            </button>
          </div>
        ) : request.quotedAmount != null ? (
          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
              Quoted Total
            </div>
            <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 800, color: C.navy800, fontFamily: font.family }}>
              {formatCurrency(totalAmount)}
            </div>
          </div>
        ) : (
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: C.blue500,
                background: C.blue100,
                padding: '4px 10px',
                borderRadius: radius.sm,
                fontFamily: font.family,
              }}
            >
              Needs Quote
            </span>
          </div>
        )}

        {/* Chevron / View Arrow for mobile */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>
            View Details
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

export function SPPrescriptionsScreen() {
  const { data = [], isLoading } = useSPPrescriptionRequests()
  const { isMobile } = useResponsive()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusTab, setStatusTab] = useState<StatusFilterTab>('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | PrescriptionFulfillmentMode>('all')

  // Calculate Metrics Summary
  const metrics = useMemo(() => {
    const actionNeeded = data.filter(r => r.status === 'submitted').length
    const inProgress = data.filter(r => r.status === 'quoted' || r.status === 'accepted' || r.status === 'preparing').length
    const ready = data.filter(r => r.status === 'ready').length
    const fulfilled = data.filter(r => r.status === 'fulfilled')
    const completedRevenue = fulfilled.reduce((acc, r) => acc + (r.quotedAmount ?? 0) + (r.deliveryFee ?? 0), 0)

    return {
      actionNeeded,
      inProgress,
      ready,
      fulfilledCount: fulfilled.length,
      completedRevenue,
      total: data.length,
    }
  }, [data])

  const paidWaitingForPickup = useMemo(() => {
    return data.filter(
      r =>
        r.fulfillmentMode === 'pickup' &&
        (r.invoiceStatus === 'paid' || r.invoiceStatus === 'authorized') &&
        (r.status === 'accepted' || r.status === 'preparing'),
    )
  }, [data])

  // Filtered List
  const filteredRequests = useMemo(() => {
    return data.filter(request => {
      // Search match
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        (request.patient?.toLowerCase().includes(query) ?? false) ||
        request.id.toLowerCase().includes(query)

      // Fulfillment mode match
      const matchesFulfillment =
        fulfillmentFilter === 'all' || request.fulfillmentMode === fulfillmentFilter

      // Status tab match
      let matchesStatus = true
      if (statusTab === 'action_needed') {
        matchesStatus = request.status === 'submitted'
      } else if (statusTab === 'in_progress') {
        matchesStatus = ['quoted', 'accepted', 'preparing'].includes(request.status)
      } else if (statusTab === 'ready') {
        matchesStatus = request.status === 'ready'
      } else if (statusTab === 'completed') {
        matchesStatus = request.status === 'fulfilled'
      } else if (statusTab === 'closed') {
        matchesStatus = ['cancelled', 'rejected'].includes(request.status)
      }

      return matchesSearch && matchesFulfillment && matchesStatus
    })
  }, [data, searchQuery, statusTab, fulfillmentFilter])

  return (
    <SPLayout
      title="Prescription Requests"
      status={metrics.actionNeeded > 0 ? `${metrics.actionNeeded} to quote` : undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px', fontFamily: font.family }}>

        {/* Paid Ready for Pickup Alert Banner */}
        {paidWaitingForPickup.length > 0 && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: radius.lg,
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(56, 182, 255, 0.10) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              boxShadow: '0 3px 12px rgba(16, 185, 129, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 220 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#065F46', marginBottom: 2 }}>
                  {paidWaitingForPickup.length === 1
                    ? '1 Prescription Paid · Ready to Mark for Pickup'
                    : `${paidWaitingForPickup.length} Prescriptions Paid · Ready to Mark for Pickup`}
                </div>
                <div style={{ fontSize: '12px', color: '#047857', lineHeight: 1.5 }}>
                  {paidWaitingForPickup.length === 1
                    ? `${paidWaitingForPickup[0].patient || 'Patient'} has paid for order ${paidWaitingForPickup[0].id}. Prepare the medication and mark it ready for pickup.`
                    : `${paidWaitingForPickup.length} prescription orders have been paid. Prepare medications and mark them ready for patient pickup.`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setStatusTab('in_progress')
                  setFulfillmentFilter('pickup')
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: radius.sm,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                  fontFamily: font.family,
                }}
              >
                View Paid Orders →
              </button>
            </div>
          </div>
        )}

        {/* KPI Metrics Dashboard Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: isMobile ? '10px' : '14px',
          }}
        >
          {/* Action Needed Card */}
          <div
            onClick={() => setStatusTab('action_needed')}
            style={{
              padding: isMobile ? '14px 14px' : '18px 20px',
              borderRadius: radius.lg,
              background: metrics.actionNeeded > 0 ? C.navy800 : C.surface,
              color: metrics.actionNeeded > 0 ? '#FFFFFF' : C.text,
              border: `1.5px solid ${metrics.actionNeeded > 0 ? C.navy800 : C.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: font.family,
            }}
          >
            <div style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 700, color: metrics.actionNeeded > 0 ? C.blue400 : C.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
              Action Needed
            </div>
            <div style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 800, marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '6px', fontFamily: font.family }}>
              {metrics.actionNeeded}
              {metrics.actionNeeded > 0 && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: radius.full, background: C.blue500, color: C.navy800, fontFamily: font.family }}>
                  New Quote
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: metrics.actionNeeded > 0 ? 'rgba(255,255,255,0.7)' : C.textLight, marginTop: '2px', fontFamily: font.family }}>
              Awaiting price quote
            </div>
          </div>

          {/* In Progress Card */}
          <div
            onClick={() => setStatusTab('in_progress')}
            style={{
              padding: isMobile ? '14px 14px' : '18px 20px',
              borderRadius: radius.lg,
              background: C.surface,
              border: `1.5px solid ${C.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: font.family,
            }}
          >
            <div style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
              In Preparation
            </div>
            <div style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 800, color: C.navy800, marginTop: '4px', fontFamily: font.family }}>
              {metrics.inProgress}
            </div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '2px', fontFamily: font.family }}>
              Quoted & compounding
            </div>
          </div>

          {/* Ready Card */}
          <div
            onClick={() => setStatusTab('ready')}
            style={{
              padding: isMobile ? '14px 14px' : '18px 20px',
              borderRadius: radius.lg,
              background: C.surface,
              border: `1.5px solid ${C.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: font.family,
            }}
          >
            <div style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
              Ready for Hand-off
            </div>
            <div style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 800, color: C.navy800, marginTop: '4px', fontFamily: font.family }}>
              {metrics.ready}
            </div>
            <div style={{ fontSize: '11px', color: C.textLight, marginTop: '2px', fontFamily: font.family }}>
              Ready for pickup/delivery
            </div>
          </div>

          {/* Revenue & Completed Card */}
          <div
            onClick={() => setStatusTab('completed')}
            style={{
              padding: isMobile ? '14px 14px' : '18px 20px',
              borderRadius: radius.lg,
              background: 'linear-gradient(135deg, #091C44 0%, #12244F 100%)',
              color: '#FFFFFF',
              border: '1.5px solid #091C44',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: font.family,
            }}
          >
            <div style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 700, color: C.blue400, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: font.family }}>
              Completed Revenue
            </div>
            <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 800, marginTop: '4px', fontFamily: font.family }}>
              {formatCurrency(metrics.completedRevenue)}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px', fontFamily: font.family }}>
              {metrics.fulfilledCount} orders fulfilled
            </div>
          </div>
        </div>

        {/* Filter & Toolbar Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: font.family }}>
          
          {/* Search bar + Mode Toggle */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', alignItems: 'stretch', justifyContent: 'space-between' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : '260px' }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.textLight }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by patient name or RX ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 42px',
                  borderRadius: radius.md,
                  border: `1px solid ${C.border}`,
                  background: C.surface,
                  fontSize: '14px',
                  fontFamily: font.family,
                  color: C.text,
                  outline: 'none',
                  transition: 'border 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = C.blue500)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: C.textLight,
                    padding: '4px',
                    fontFamily: font.family,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Fulfillment Mode Segmented Toggle */}
            <div
              style={{
                display: 'flex',
                background: C.surface,
                padding: '4px',
                borderRadius: radius.md,
                border: `1px solid ${C.border}`,
                gap: '3px',
                width: isMobile ? '100%' : 'auto',
                boxSizing: 'border-box',
              }}
            >
              {[
                { key: 'all', label: 'All Modes' },
                { key: 'delivery', label: 'Delivery', icon: <DeliveryLineIcon size={14} /> },
                { key: 'pickup', label: 'Pickup', icon: <PickupLineIcon size={14} /> },
              ].map(item => {
                const active = fulfillmentFilter === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFulfillmentFilter(item.key as typeof fulfillmentFilter)}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      padding: '7px 13px',
                      borderRadius: radius.sm,
                      border: 'none',
                      background: active ? C.navy800 : 'transparent',
                      color: active ? '#FFFFFF' : C.textSub,
                      fontSize: '12.5px',
                      fontWeight: 700,
                      fontFamily: font.family,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {[
              { tab: 'all', label: 'All Requests', count: metrics.total },
              { tab: 'action_needed', label: 'Action Needed', count: metrics.actionNeeded },
              { tab: 'in_progress', label: 'In Progress', count: metrics.inProgress },
              { tab: 'ready', label: 'Ready', count: metrics.ready },
              { tab: 'completed', label: 'Completed', count: metrics.fulfilledCount },
              { tab: 'closed', label: 'Closed / Rejected', count: data.length - (metrics.actionNeeded + metrics.inProgress + metrics.ready + metrics.fulfilledCount) },
            ].map(t => {
              const active = statusTab === t.tab
              return (
                <button
                  key={t.tab}
                  type="button"
                  onClick={() => setStatusTab(t.tab as StatusFilterTab)}
                  style={{
                    padding: isMobile ? '6px 12px' : '8px 16px',
                    borderRadius: radius.full,
                    border: `1.5px solid ${active ? C.navy800 : C.border}`,
                    background: active ? C.navy800 : C.surface,
                    color: active ? '#FFFFFF' : C.textSub,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    fontFamily: font.family,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: active ? '0 2px 8px rgba(9, 28, 68, 0.22)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <span>{t.label}</span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: radius.full,
                      background: active ? 'rgba(56, 182, 255, 0.28)' : '#F1F5F9',
                      color: active ? C.blue400 : C.textSub,
                      fontFamily: font.family,
                    }}
                  >
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Prescription List Body */}
      {isLoading ? (
          <GGCard padding="32px">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: C.textSub, fontFamily: font.family }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading prescription requests…</span>
            </div>
        </GGCard>
      ) : data.length === 0 ? (
        <GGCard padding="32px" style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.blue100, color: C.navy800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                <path d="M9 7h6" />
                <path d="M9 11h6" />
              </svg>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, marginBottom: '6px', fontFamily: font.family }}>
              No prescription requests yet
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, maxWidth: '380px', margin: '0 auto', lineHeight: 1.5, fontFamily: font.family }}>
              When patients select your pharmacy profile and submit prescription requests for quotes or fulfillment, they will appear here.
          </div>
        </GGCard>
        ) : filteredRequests.length === 0 ? (
          <GGCard padding="28px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px', fontFamily: font.family }}>
              No matching prescriptions found
              </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '14px', fontFamily: font.family }}>
              Try adjusting your search query or filter selection.
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setStatusTab('all')
                setFulfillmentFilter('all')
              }}
              style={{
                padding: '8px 18px',
                borderRadius: radius.md,
                background: C.navy800,
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: font.family,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </GGCard>
        ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredRequests.map(request => (
              <PrescriptionCard key={request.id} request={request} />
                ))}
            </div>
          )}
        </div>
    </SPLayout>
  )
}
