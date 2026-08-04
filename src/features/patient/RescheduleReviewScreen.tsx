import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { GGCard } from '@/design-system'
import {
  usePatientAppointments,
  useCancelPatientAppointmentMutation,
  useConfirmRescheduledAppointmentMutation,
} from '@/hooks/api'
import { formatTime12h } from '@/utils/format'
import { getAppointmentDisplayStatus } from '@/utils/appointments'

const CANCEL_REASONS = [
  'Schedule conflict',
  'Feeling better',
  'Found another provider',
  'Provider unavailable',
  'Other',
] as const

export function RescheduleReviewScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = usePatientAppointments()

  const confirmMutation = useConfirmRescheduledAppointmentMutation()
  const cancelMutation = useCancelPatientAppointmentMutation()

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const all = [...(data?.upcoming ?? []), ...(data?.past ?? [])]
  const apt = all.find(a => a.id === id)
  const displayStatus = apt ? getAppointmentDisplayStatus(apt) : null

  const closeCancelModal = () => {
    if (cancelMutation.isPending) return
    setShowCancelModal(false)
    setCancelReason('')
    setCancelNote('')
  }

  const handleCancel = () => {
    if (!apt || !cancelReason) return
    cancelMutation.mutate(
      { id: apt.id, payload: { reason: cancelReason, note: cancelReason === 'Other' ? cancelNote.trim() || undefined : undefined } },
      {
        onSuccess: () => {
          setShowCancelModal(false)
          navigate('/app/appointments', { state: { cancelledProvider: apt.provider } })
        },
      },
    )
  }

  const handleConfirm = () => {
    if (!apt) return
    confirmMutation.mutate(apt.id, {
      onSuccess: () => setConfirmed(true),
    })
  }

  if (isLoading) {
    return (
      <AppLayout title="Reschedule" subtitle="Loading...">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <GGCard padding="48px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: C.textSub }}>Loading appointment…</div>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  if (!apt) {
    return (
      <AppLayout title="Reschedule" subtitle="Not found">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <GGCard padding="48px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
              Appointment not found
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '20px' }}>
              This reschedule link is no longer valid.
            </div>
            <button
              onClick={() => navigate('/app/appointments')}
              style={{ padding: '10px 24px', borderRadius: radius.sm, border: 'none', background: C.navy800, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}
            >
              View Appointments
            </button>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  if (confirmed || displayStatus === 'confirmed') {
    const d = new Date(apt.date)
    return (
      <AppLayout title="Reschedule" subtitle="Confirmed">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <GGCard padding="40px" style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,201,138,0.12)', border: '2px solid rgba(34,201,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-9" stroke="#22C98A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', marginBottom: '8px' }}>
              Appointment Confirmed
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '24px' }}>
              Your appointment with <strong style={{ color: C.text }}>{apt.provider}</strong> is confirmed for{' '}
              <strong style={{ color: C.text }}>
                {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {formatTime12h(apt.time)}
              </strong>.
            </div>
            <button
              onClick={() => navigate('/app/appointments')}
              style={{ padding: '11px 28px', borderRadius: radius.sm, border: 'none', background: C.navy800, color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}
            >
              View Appointments
            </button>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  if (!apt.rescheduledAt || displayStatus !== 'pending') {
    return (
      <AppLayout title="Reschedule" subtitle="">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <GGCard padding="40px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
              No pending reschedule
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '20px' }}>
              This appointment does not have a reschedule waiting for your response.
            </div>
            <button
              onClick={() => navigate('/app/appointments')}
              style={{ padding: '10px 24px', borderRadius: radius.sm, border: 'none', background: C.navy800, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}
            >
              View Appointments
            </button>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  const d = new Date(apt.date)
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const year = d.getFullYear()

  return (
    <AppLayout title="Reschedule Proposed" subtitle={`From ${apt.provider}`}>
      <div style={{ maxWidth: 560, margin: '0 auto', fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Info banner */}
        <div style={{ padding: '14px 18px', borderRadius: radius.lg, background: 'rgba(74,173,223,0.08)', border: '1.5px solid rgba(74,173,223,0.22)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ width: 32, height: 32, borderRadius: '10px', background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.blue500 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1 6h13" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7.5" cy="10" r="1.4" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '3px' }}>
              {apt.provider} proposed a new time
            </div>
            <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.5 }}>
              Please confirm the new date below or cancel this appointment. The provider has
              already agreed to this new time on their end.
            </div>
          </div>
        </div>

        {/* Appointment card */}
        <GGCard padding="0px" style={{ overflow: 'hidden' }}>
          {/* Date hero */}
          <div style={{ background: `linear-gradient(135deg, ${C.navy800} 0%, #1a3a7a 100%)`, padding: '28px 28px 24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ width: 72, height: 80, borderRadius: '14px', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.18)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div style={{ fontSize: '34px', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
                {d.getDate()}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {d.toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                Proposed New Time
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                {dayName}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                {monthDay}, {year} · {formatTime12h(apt.time)}
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.textSub }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1 13c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Provider</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{apt.provider}</div>
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: C.border }} />

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.textSub }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 5h6M4 8h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{apt.service}</div>
              </div>
            </div>

            {apt.for !== 'Self' && (
              <>
                <div style={{ width: '100%', height: '1px', background: C.border }} />
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.textSub }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
                      <circle cx="11" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M1 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>For</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{apt.for}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </GGCard>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            style={{ width: '100%', padding: '14px', borderRadius: radius.sm, border: 'none', background: C.navy800, color: '#fff', fontSize: '14px', fontWeight: 700, cursor: confirmMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: font.family, opacity: confirmMutation.isPending ? 0.7 : 1, transition: 'opacity 0.14s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: shadow.sm }}
            onMouseEnter={e => { if (!confirmMutation.isPending) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { if (!confirmMutation.isPending) e.currentTarget.style.opacity = '1' }}
          >
            {confirmMutation.isPending ? (
              'Confirming…'
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2.5 7.5l3.5 3.5 6.5-6.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Confirm New Time
              </>
            )}
          </button>

          <button
            onClick={() => setShowCancelModal(true)}
            disabled={confirmMutation.isPending}
            style={{ width: '100%', padding: '12px', borderRadius: radius.sm, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.textSub, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.14s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.error; e.currentTarget.style.color = C.error; e.currentTarget.style.background = C.errorBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; e.currentTarget.style.background = 'transparent' }}
          >
            Cancel Appointment Instead
          </button>
        </div>

        {confirmMutation.isError && (
          <div style={{ padding: '12px 16px', borderRadius: radius.sm, background: C.errorBg, border: `1px solid rgba(229,71,77,0.25)`, fontSize: '13px', color: C.error, fontWeight: 600 }}>
            Something went wrong. Please try again.
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {showCancelModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(9,28,68,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget) closeCancelModal() }}
        >
          <div style={{ background: '#fff', borderRadius: radius.xl, padding: '28px', width: '100%', maxWidth: '420px', boxShadow: shadow.xl, fontFamily: font.family }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>Cancel Appointment</div>
                <div style={{ fontSize: '13px', color: C.textSub, marginTop: '3px' }}>Please tell us why you're cancelling</div>
              </div>
              <button
                onClick={closeCancelModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, fontSize: '20px', lineHeight: 1, padding: '0 2px' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {CANCEL_REASONS.map(reason => (
                <label
                  key={reason}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: radius.sm, border: `1.5px solid ${cancelReason === reason ? C.blue500 : C.border}`, background: cancelReason === reason ? C.blue100 : '#fff', cursor: 'pointer', transition: 'all 0.12s' }}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={() => setCancelReason(reason)}
                    style={{ accentColor: C.blue500 }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: cancelReason === reason ? 700 : 500, color: cancelReason === reason ? C.blue500 : C.text }}>
                    {reason}
                  </span>
                </label>
              ))}
            </div>

            {cancelReason === 'Other' && (
              <textarea
                placeholder="Please describe your reason…"
                value={cancelNote}
                onChange={e => setCancelNote(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: radius.sm, border: `1.5px solid ${C.border}`, fontSize: '13px', fontFamily: font.family, color: C.text, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
              />
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: cancelReason === 'Other' ? '0' : '4px' }}>
              <button
                onClick={closeCancelModal}
                disabled={cancelMutation.isPending}
                style={{ flex: 1, padding: '11px', borderRadius: radius.sm, border: `1.5px solid ${C.border}`, background: 'transparent', fontSize: '13px', fontWeight: 600, color: C.textSub, cursor: 'pointer', fontFamily: font.family }}
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason || cancelMutation.isPending}
                style={{ flex: 1, padding: '11px', borderRadius: radius.sm, border: 'none', background: !cancelReason || cancelMutation.isPending ? C.border : C.error, fontSize: '13px', fontWeight: 700, color: !cancelReason || cancelMutation.isPending ? C.textLight : '#fff', cursor: !cancelReason ? 'not-allowed' : 'pointer', fontFamily: font.family, transition: 'all 0.14s' }}
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
