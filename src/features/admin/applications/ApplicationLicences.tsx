import { useState } from 'react'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { adminService } from '@/api/services/admin.service'
import { ApiError } from '@/api/types'
import type { ApplicationCredential, SPApplication } from '@/types/admin.types'

const STATUS_STYLE: Record<ApplicationCredential['status'], { label: string; fg: string; bg: string }> = {
  submitted: { label: 'To check', fg: '#92400E', bg: '#FEF3C7' },
  verified: { label: 'Verified', fg: '#166534', bg: '#DCFCE7' },
  rejected: { label: 'Rejected', fg: '#B91C1C', bg: '#FEE2E2' },
  expired: { label: 'Expired', fg: '#B91C1C', bg: '#FEE2E2' },
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/**
 * Per-licence review: open the certificate, check the regulator's register, then
 * verify or reject. Approval is blocked until every required licence is verified.
 */
export function ApplicationLicences({ application, onUpdated }: { application: SPApplication; onUpdated: (app: SPApplication) => void }) {
  const credentials = application.credentials ?? []
  const required = credentials.filter(c => c.required)
  const verifiedRequired = required.filter(c => c.status === 'verified' && !c.expired).length
  const outstanding = application.credentialsOutstanding ?? []

  return (
    <GGCard padding="22px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12, fontFamily: font.family }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Licences</div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: outstanding.length ? '#92400E' : '#166534' }}>
          {verifiedRequired} of {required.length} required verified
        </div>
      </div>

      {outstanding.length > 0 && (
        <div style={{ padding: '10px 12px', marginBottom: 12, borderRadius: radius.sm, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12.5, color: '#92400E', lineHeight: 1.5, fontFamily: font.family }}>
          Verify before approving: {outstanding.join('; ')}.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {credentials.map(c => (
          <LicenceRow key={c.id} applicationId={application.id} credential={c} onUpdated={onUpdated} />
        ))}
      </div>

      {(application.businessRegNumber || application.taxPin) && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontFamily: font.family }}>
          <Field label="Business registration" value={application.businessRegNumber ?? 'Not given (individual doctor)'} />
          <Field label="Tax PIN" value={application.taxPin ?? '—'} />
        </div>
      )}
    </GGCard>
  )
}

function LicenceRow({ applicationId, credential: c, onUpdated }: { applicationId: string; credential: ApplicationCredential; onUpdated: (app: SPApplication) => void }) {
  const [busy, setBusy] = useState<'verify' | 'reject' | 'doc' | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const status = c.expired && c.status !== 'rejected' ? STATUS_STYLE.expired : STATUS_STYLE[c.status]

  const run = async (kind: 'verify' | 'reject') => {
    if (kind === 'reject' && !reason.trim()) {
      setError('Say why, so the provider can fix it.')
      return
    }
    setBusy(kind)
    setError(null)
    try {
      const updated = kind === 'verify'
        ? await adminService.verifyCredential(applicationId, c.id)
        : await adminService.rejectCredential(applicationId, c.id, reason.trim())
      setRejecting(false)
      setReason('')
      onUpdated(updated)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That did not save. Try again.')
    } finally {
      setBusy(null)
    }
  }

  const openDocument = async () => {
    // Open the tab now, while the click still counts as a user action, so pop-up blockers allow it.
    const win = window.open('', '_blank')
    setBusy('doc')
    setError(null)
    try {
      const doc = await adminService.getCredentialDocument(applicationId, c.id)
      let href = doc.url
      if (href.startsWith('data:')) href = URL.createObjectURL(await (await fetch(href)).blob())
      if (win) win.location.href = href
      else window.location.assign(href)
    } catch (e) {
      win?.close()
      setError(e instanceof ApiError ? e.message : 'The certificate could not be opened.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, padding: '12px 14px', background: '#fff', fontFamily: font.family }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>
            {c.label}
            {!c.required && <span style={{ fontWeight: 500, color: C.textSub }}> (optional)</span>}
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{c.regulator}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: status.fg, background: status.bg, padding: '3px 9px', borderRadius: radius.full, whiteSpace: 'nowrap' }}>{status.label}</span>
      </div>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginTop: 10 }}>
        <Field label={c.numberLabel} value={c.number} mono />
        {c.holderName && <Field label="Name" value={c.holderName} />}
        {c.expiresAt && <Field label="Expires" value={fmtDate(c.expiresAt)} danger={c.expired} />}
      </div>

      {c.note && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: C.textSub }}>
          <strong style={{ color: C.text }}>Note:</strong> {c.note}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
        {c.hasDocument && (
          <GGButton variant="secondary" size="sm" onClick={() => void openDocument()} disabled={busy !== null}>
            {busy === 'doc' ? 'Opening…' : 'View certificate'}
          </GGButton>
        )}
        {c.verifyUrl && (
          <a href={c.verifyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: '#0B7BC0' }}>
            Check the {c.regulator} register ↗
          </a>
        )}
        <span style={{ flex: 1 }} />
        {c.status !== 'verified' && (
          <GGButton variant="success" size="sm" onClick={() => void run('verify')} disabled={busy !== null || c.expired}>
            {busy === 'verify' ? 'Saving…' : 'Verify'}
          </GGButton>
        )}
        {c.status !== 'rejected' && !rejecting && (
          <GGButton variant="danger" size="sm" onClick={() => setRejecting(true)} disabled={busy !== null}>
            Reject
          </GGButton>
        )}
      </div>
      {c.verifyHint && <div style={{ fontSize: 11.5, color: C.textLight, marginTop: 6 }}>{c.verifyHint}</div>}

      {rejecting && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why? e.g. number not on the register, certificate unreadable"
            style={{ flex: 1, minWidth: 220, height: 34, padding: '0 10px', borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: font.family }}
          />
          <GGButton variant="danger" size="sm" onClick={() => void run('reject')} disabled={busy !== null}>
            {busy === 'reject' ? 'Saving…' : 'Reject licence'}
          </GGButton>
          <GGButton variant="secondary" size="sm" onClick={() => { setRejecting(false); setReason(''); setError(null) }}>
            Cancel
          </GGButton>
        </div>
      )}
      {error && <div role="alert" style={{ fontSize: 12, color: C.error, marginTop: 8 }}>{error}</div>}
    </div>
  )
}

function Field({ label, value, mono, danger }: { label: string; value: string; mono?: boolean; danger?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textSub }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: danger ? C.error : C.text, fontFamily: mono ? "'Courier New', monospace" : font.family, letterSpacing: mono ? '0.03em' : undefined }}>
        {value}
      </div>
    </div>
  )
}
