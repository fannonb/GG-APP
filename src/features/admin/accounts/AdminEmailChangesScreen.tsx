import { useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminAccountActions, useEmailChangeRequests } from '@/hooks/api/useAdminAccounts'
import { formatRelativeTime } from '@/utils/format'
import { ReasonDialog } from './AccountManagement'
import type { EmailChangeRequest } from '@/types/admin.types'

const CYAN_DEEP = '#0B7BC0'
const TABS = [
  { id: 'pending', label: 'Waiting' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Declined' },
  { id: 'all', label: 'All' },
] as const

const STATUS_STYLE: Record<EmailChangeRequest['status'], { label: string; fg: string; bg: string }> = {
  pending: { label: 'Waiting', fg: '#B45309', bg: '#FEF3C7' },
  approved: { label: 'Approved', fg: '#15803D', bg: '#DCFCE7' },
  rejected: { label: 'Declined', fg: '#B91C1C', bg: '#FEE2E2' },
  cancelled: { label: 'Cancelled by user', fg: C.textSub, bg: C.bg },
}

function RequestCard({ request }: { request: EmailChangeRequest }) {
  const { isMobile } = useResponsive()
  const { decideEmailChange } = useAdminAccountActions()
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const style = STATUS_STYLE[request.status]

  const approve = async () => {
    setError(null)
    try { await decideEmailChange.mutateAsync({ id: request.id, approve: true }) } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t approve this request.') }
  }

  return (
    <article style={{ background: '#fff', border: `1px solid ${request.status === 'pending' ? '#FDE68A' : C.border}`, borderRadius: radius.lg, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{request.name}</div>
          <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>
            {request.role === 'provider' ? 'Provider' : 'Patient'} · requested {formatRelativeTime(request.createdAt)}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: style.fg, background: style.bg, padding: '3px 10px', borderRadius: radius.full, whiteSpace: 'nowrap' }}>{style.label}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr', alignItems: 'center', gap: isMobile ? 6 : 12, padding: '12px 14px', borderRadius: radius.md, background: C.bg }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.textSub }}>Current</div>
          <div style={{ fontSize: 14, color: C.text, overflowWrap: 'anywhere' }}>{request.currentEmail}</div>
        </div>
        <span aria-hidden style={{ color: C.textLight, fontSize: 18, textAlign: 'center' }}>{isMobile ? '↓' : '→'}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.textSub }}>New</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflowWrap: 'anywhere' }}>{request.newEmail}</div>
        </div>
      </div>

      {request.reason && <div style={{ fontSize: 13.5, color: C.text }}><span style={{ color: C.textSub }}>Their reason: </span>{request.reason}</div>}
      {request.decisionNote && <div style={{ fontSize: 13.5, color: C.text }}><span style={{ color: C.textSub }}>Your note: </span>{request.decisionNote}</div>}

      {request.status === 'pending' && (
        <>
          <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>
            Approving switches their sign-in to the new address, signs them out everywhere, and emails both addresses so a mistake or takeover gets noticed.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => void approve()} disabled={decideEmailChange.isPending} style={{ height: 38, padding: '0 16px', borderRadius: radius.sm, border: 'none', background: `linear-gradient(135deg, #1A9BE6, ${CYAN_DEEP})`, color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}>
              Approve change
            </button>
            <button type="button" onClick={() => setDeclining(true)} style={{ height: 38, padding: '0 16px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: '#B91C1C', fontSize: 14, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}>
              Decline
            </button>
          </div>
        </>
      )}
      {error && <div role="alert" style={{ padding: '9px 12px', borderRadius: radius.sm, background: '#FEF2F2', color: '#B91C1C', fontSize: 13 }}>{error}</div>}

      {declining && (
        <ReasonDialog
          title="Decline this email change?"
          subtitle={`${request.name} keeps signing in with ${request.currentEmail}. They’ll see your reason.`}
          confirmLabel="Decline request"
          danger
          placeholder="e.g. We couldn’t confirm this request came from you — please call support"
          onConfirm={note => decideEmailChange.mutateAsync({ id: request.id, approve: false, note })}
          onClose={() => setDeclining(false)}
        />
      )}
    </article>
  )
}

export function AdminEmailChangesScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('pending')
  const { data = [], isLoading } = useEmailChangeRequests(tab)

  return (
    <AdminLayout title="Email changes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, fontFamily: font.family }}>
        <p style={{ margin: 0, fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
          Patients and providers ask to change their sign-in email from their own Settings, confirming with their password. Check the request makes sense before approving.
        </p>
        <div role="tablist" style={{ display: 'flex', gap: 22, borderBottom: `1px solid ${C.border}` }}>
          {TABS.map(t => {
            const active = t.id === tab
            return (
              <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(t.id)} style={{ background: 'none', border: 'none', borderBottom: `2.5px solid ${active ? CYAN_DEEP : 'transparent'}`, padding: '10px 0', marginBottom: -1, fontSize: 14, fontWeight: 700, color: active ? C.text : C.textSub, cursor: 'pointer', fontFamily: font.family }}>
                {t.label}
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <div style={{ fontSize: 14, color: C.textSub }}>Loading…</div>
        ) : data.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, fontSize: 14, color: C.textSub }}>
            {tab === 'pending' ? 'No email changes waiting for you.' : 'Nothing here yet.'}
          </div>
        ) : (
          data.map(r => <RequestCard key={r.id} request={r} />)
        )}
      </div>
    </AdminLayout>
  )
}
