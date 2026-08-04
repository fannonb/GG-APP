import { useMemo, useState } from 'react'
import { GGButton, GGCard, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import {
  useApproveAdminCreditApplicationMutation,
  useRejectAdminCreditApplicationMutation,
} from '@/hooks/api/useAdminMutations'
import { useAdminCreditApplications } from '@/hooks/api/useAdminQueries'
import { formatCurrency, formatDate } from '@/utils/format'
import { getFinancePartnerSummary } from '@/features/patient/credit/credit.constants'
import type { AdminCreditApplication } from '@/types/credit.types'

function StatusBadge({ status }: { status: AdminCreditApplication['status'] }) {
  const map = {
    submitted: { bg: C.warningBg, color: '#92400E', label: 'Pending Review' },
    approved: { bg: C.successBg, color: C.success, label: 'Approved' },
    rejected: { bg: C.errorBg, color: C.error, label: 'Rejected' },
  } as const
  const config = map[status]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 12px',
      borderRadius: radius.full,
      background: config.bg,
      border: `1px solid ${C.border}`,
      fontSize: '11px',
      fontWeight: 700,
      color: config.color,
      whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, textAlign: 'right', fontFamily: font.family }}>{value}</span>
    </div>
  )
}

export function AdminCreditAppsScreen() {
  const { isMobile } = useResponsive()
  const { data: applications = [], isLoading, isError, error, refetch } = useAdminCreditApplications()
  const approveMutation = useApproveAdminCreditApplicationMutation()
  const rejectMutation = useRejectAdminCreditApplicationMutation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted')
  const [approvedAmount, setApprovedAmount] = useState('')
  const [rejectNote, setRejectNote] = useState('')

  const filtered = useMemo(
    () => applications.filter(app => filter === 'all' || app.status === filter),
    [applications, filter],
  )

  const selected = filtered.find(app => app.id === selectedId)
    ?? applications.find(app => app.id === selectedId)
    ?? null

  const handleSelect = (app: AdminCreditApplication) => {
    setSelectedId(app.id)
    setApprovedAmount(String(app.requestedAmount))
    setRejectNote('')
  }

  const handleApprove = async () => {
    if (!selected) return
    const amount = Number(approvedAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    await approveMutation.mutateAsync({
      id: selected.id,
      payload: { approvedAmount: amount },
    })
  }

  const handleReject = async () => {
    if (!selected) return
    await rejectMutation.mutateAsync({
      id: selected.id,
      payload: { note: rejectNote.trim() || undefined },
    })
  }

  return (
    <AdminLayout title="Credit Applications" subtitle="Review patient healthcare credit requests">
      {isError && (
        <GGCard padding="20px" style={{ marginBottom: '16px', border: `1px solid ${C.error}` }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.error, marginBottom: '6px' }}>
            Unable to load credit applications
          </div>
          <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.55, marginBottom: '12px' }}>
            {error instanceof Error ? error.message : 'The credit applications list could not be loaded from the server.'}
          </div>
          <GGButton variant="primary" size="sm" onClick={() => refetch()}>Retry</GGButton>
        </GGCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '360px 1fr', gap: '20px', fontFamily: font.family }}>
        <GGCard padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '12px' }}>Applications</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['submitted', 'approved', 'rejected', 'all'] as const).map(item => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: radius.full,
                    border: `1px solid ${filter === item ? C.blue500 : C.border}`,
                    background: filter === item ? C.blue100 : '#fff',
                    color: filter === item ? C.navy800 : C.textSub,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: font.family,
                    textTransform: 'capitalize',
                  }}
                >
                  {item === 'submitted' ? 'Pending' : item}
                </button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: isMobile ? undefined : '70vh', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '24px', fontSize: '13px', color: C.textSub }}>Loading applications…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '24px', fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>
                {applications.length === 0
                  ? 'No credit applications have been submitted yet.'
                  : `No ${filter === 'submitted' ? 'pending' : filter} applications in this view.`}
              </div>
            ) : filtered.map(app => (
              <button
                key={app.id}
                onClick={() => handleSelect(app)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '16px 20px',
                  border: 'none',
                  borderBottom: `1px solid ${C.border}`,
                  background: selectedId === app.id ? C.blue100 : '#fff',
                  cursor: 'pointer',
                  fontFamily: font.family,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{app.patientName}</div>
                    <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px' }}>
                      {app.type === 'increase' ? 'Limit increase' : 'New application'} · {app.reference}
                      {app.residesAbroad ? ' · Abroad' : ''}
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '8px' }}>
                  Requested {formatCurrency(app.requestedAmount)} · {formatDate(app.submittedAt)}
                </div>
              </button>
            ))}
          </div>
        </GGCard>

        <GGCard padding="28px">
          {!selected ? (
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6 }}>
              Select an application to review applicant details and approve or decline the requested amount.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{selected.patientName}</div>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px' }}>
                    {selected.reference} · {selected.type === 'increase' ? 'Limit increase' : 'Initial application'}
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div>
                <InfoRow label="Email" value={selected.patientEmail} />
                <InfoRow label="Phone" value={selected.patientPhone || '—'} />
                <InfoRow
                  label="Country of residence"
                  value={selected.residesAbroad
                    ? `${selected.residenceCountry ?? selected.country} (abroad)`
                    : (selected.residenceCountry ?? selected.country ?? '—')}
                />
                {selected.marketCountryCode && (
                  <InfoRow label="Market country" value={selected.marketCountryCode} />
                )}
                <InfoRow label="Finance partner" value={getFinancePartnerSummary(selected.financePartnerId)?.name ?? selected.financePartnerId} />
                <InfoRow label="Employment" value={selected.employment.replace(/-/g, ' ')} />
                <InfoRow label="Monthly income" value={formatCurrency(selected.monthlyIncome)} />
                <InfoRow label="Requested amount" value={formatCurrency(selected.requestedAmount)} />
                {selected.type === 'increase' && (
                  <>
                    <InfoRow label="Current limit" value={formatCurrency(selected.currentCreditLimit)} />
                    <InfoRow label="Current available" value={formatCurrency(selected.currentCreditAvailable)} />
                    {selected.reason && <InfoRow label="Reason" value={selected.reason.replace(/-/g, ' ')} />}
                  </>
                )}
                {selected.notes && <InfoRow label="Notes" value={selected.notes} />}
                <InfoRow label="Submitted" value={formatDate(selected.submittedAt, { day: 'numeric', month: 'long', year: 'numeric' })} />
              </div>

              {selected.status === 'submitted' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <GGInput
                    label="Approved amount"
                    type="number"
                    value={approvedAmount}
                    onChange={event => setApprovedAmount(event.target.value)}
                    hint="Amount loaded to the patient's wallet if approved"
                  />
                  <GGInput
                    label="Decline reason (optional)"
                    value={rejectNote}
                    onChange={event => setRejectNote(event.target.value)}
                    placeholder="Reason shown to the patient if declined"
                  />
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <GGButton
                      variant="primary"
                      size="md"
                      onClick={handleApprove}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      style={{ flex: 1 }}
                    >
                      {approveMutation.isPending ? 'Approving…' : 'Approve & Load Balance'}
                    </GGButton>
                    <GGButton
                      variant="danger"
                      size="md"
                      onClick={handleReject}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      style={{ flex: 1 }}
                    >
                      {rejectMutation.isPending ? 'Declining…' : 'Decline'}
                    </GGButton>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px 18px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>
                  {selected.status === 'approved'
                    ? `Approved for ${formatCurrency(selected.approvedAmount ?? selected.requestedAmount)}${selected.reviewedAt ? ` on ${formatDate(selected.reviewedAt)}` : ''}.`
                    : selected.declineReason ?? 'This application was declined.'}
                </div>
              )}
            </div>
          )}
        </GGCard>
      </div>
    </AdminLayout>
  )
}
