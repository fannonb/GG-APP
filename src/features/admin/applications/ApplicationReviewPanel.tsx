import { useRef, useState } from 'react'
import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { DefList, PanelSection } from '@/features/admin/accounts/AccountListKit'
import {
  useApproveAdminApplicationMutation,
  useRejectAdminApplicationMutation,
  useRequestAdminApplicationInfoMutation,
} from '@/hooks/api/useAdminMutations'
import { formatDate, formatPhone } from '@/utils/format'
import type { ApplicationMessage, SPApplication } from '@/types/admin.types'
import { ApplicationLicences } from './ApplicationLicences'
import { applicationStatus, daysWaiting } from './applicationStatus'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** "Mon–Fri 08:00–17:00, Sat 09:00–13:00": neighbouring days with the same hours are grouped. */
function hoursSummary(hours: SPApplication['hours']) {
  const parts: string[] = []
  let run: { start: string; end: string; key: string } | null = null
  const flush = () => {
    if (!run) return
    const [from, to] = run.key.split('|')
    parts.push(`${run.start === run.end ? run.start : `${run.start}–${run.end}`} ${from}–${to}`)
    run = null
  }
  for (const day of DAYS) {
    const h = hours[day]
    const key = h?.open ? `${h.from}|${h.to}` : null
    if (key && run && run.key === key) run.end = day
    else { flush(); if (key) run = { start: day, end: day, key } }
  }
  flush()
  return parts.join(', ')
}

function payoutSummary(app: SPApplication) {
  if (app.paymentMethod === 'mpesa') return app.mpesaPaybill ? `M-Pesa Paybill ${app.mpesaPaybill}` : ''
  if (app.paymentMethod === 'bank') return app.bankName && app.bankAccount ? `${app.bankName}, ${app.bankAccount}${app.bankBranch ? `, ${app.bankBranch}` : ''}` : ''
  return 'Mobile money'
}

function Thread({ messages }: { messages: ApplicationMessage[] }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {messages.map(m => (
        <li key={m.id} style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5 }}>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 2 }}>
            {m.author === 'admin' ? 'You' : 'Applicant'} · {formatDate(m.at)}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</div>
          {m.attachments && m.attachments.length > 0 && (
            <div style={{ marginTop: 2, fontSize: 12, color: C.textSub }}>{m.attachments.map(a => a.name).join(', ')}</div>
          )}
        </li>
      ))}
    </ol>
  )
}

/** One application: the facts, then one note box and the three decisions. */
export function ApplicationReviewPanel({ app, onUpdated, onApproved }: {
  app: SPApplication
  onUpdated: (updated: SPApplication) => void
  onApproved: (app: SPApplication) => void
}) {
  const approve = useApproveAdminApplicationMutation()
  const requestInfo = useRequestAdminApplicationInfoMutation()
  const reject = useRejectAdminApplicationMutation()
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState(false)
  const [error, setError] = useState('')

  const busy = approve.isPending || requestInfo.isPending || reject.isPending
  const status = applicationStatus(app)
  // The API refuses approval until every required licence is verified.
  const licencesOutstanding = (app.credentialsOutstanding ?? []).length > 0
  const decided = app.status === 'approved' || app.status === 'rejected'
  const days = daysWaiting(app.submitted)

  async function decide(action: 'approved' | 'info_requested' | 'rejected') {
    if (busy) return
    setError(''); setNoteError(false)
    // The applicant reads the note, so it is required to reject or request info.
    if (action !== 'approved' && !note.trim()) { setNoteError(true); noteRef.current?.focus(); return }
    try {
      if (action === 'approved') {
        await approve.mutateAsync({ id: app.id, payload: { note: note.trim() || undefined } })
        onApproved(app)
      } else {
        const fn = action === 'rejected' ? reject : requestInfo
        const updated = await fn.mutateAsync({ id: app.id, payload: { note: note.trim() } })
        onUpdated({ ...updated, status: action })
      }
      setNote('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.')
    }
  }

  const payout = payoutSummary(app)
  const hours = hoursSummary(app.hours)
  const details = [
    { label: 'Email', value: app.email },
    { label: 'Phone', value: formatPhone(app.phone, app.country).display },
    ...(app.emailSecondary ? [{ label: 'Second email', value: app.emailSecondary }] : []),
    { label: 'Services', value: app.serviceTypes.join(', ') },
    ...(!app.credentials?.length ? [{ label: 'Licence number', value: app.licenseNumber }] : []),
    ...(app.businessRegNumber ? [{ label: 'Business registration', value: app.businessRegNumber }] : []),
    ...(app.taxPin ? [{ label: 'Tax number', value: app.taxPin }] : []),
    { label: 'Payout', value: payout || 'Not given', wide: true },
    ...(hours ? [{ label: 'Hours', value: hours, wide: true }] : []),
    ...(app.address || app.lat != null ? [{
      label: 'Location',
      wide: true,
      value: (
        <>
          {app.address}
          {app.lat != null && (
            <a href={`https://www.google.com/maps?q=${app.lat},${app.lng}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: app.address ? 8 : 0, color: '#0B7BC0' }}>Map</a>
          )}
        </>
      ),
    }] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', fontFamily: font.family }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px 20px' }}>
        <header style={{ paddingRight: 44 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{app.name}</h2>
          <div style={{ marginTop: 4, fontSize: 13, color: C.textSub }}>
            <span style={{ color: status.color, fontWeight: 600 }}>{status.label}</span>
            {' · '}{app.country}
            {' · '}{decided ? formatDate(app.submitted) : `${days} day${days === 1 ? '' : 's'}`}
            {app.importedAt ? ' · Imported' : ''}
          </div>
        </header>

        {app.credentials && app.credentials.length > 0 && <ApplicationLicences application={app} onUpdated={onUpdated} />}

        <PanelSection title="Details">
          <DefList items={details} />
        </PanelSection>

        {app.documents.length > 0 && (
          <PanelSection title="Files">
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {app.documents.map((doc, i) => (
                <li key={`${doc.name}-${i}`} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: C.text }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                  <span style={{ color: C.textSub, whiteSpace: 'nowrap' }}>{doc.size}</span>
                </li>
              ))}
            </ul>
          </PanelSection>
        )}

        {(app.messages?.length ?? 0) > 0 && (
          <PanelSection title="Messages">
            <Thread messages={app.messages ?? []} />
          </PanelSection>
        )}
      </div>

      {!decided && (
        <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: `1px solid ${C.border}`, padding: '14px 20px 16px' }}>
          <textarea
            ref={noteRef}
            value={note}
            rows={2}
            aria-label="Note to applicant"
            aria-invalid={noteError}
            placeholder="Note to applicant"
            onChange={e => { setNote(e.target.value); setError(''); if (e.target.value.trim()) setNoteError(false) }}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 13.5, fontFamily: font.family, color: C.text, border: `1px solid ${noteError ? C.error : C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
          />
          {(noteError || error || licencesOutstanding) && (
            <div role={noteError || error ? 'alert' : undefined} style={{ marginTop: 6, fontSize: 12.5, color: noteError || error ? C.error : C.textSub }}>
              {noteError ? 'Add a note to reject or request info.' : error || 'Verify the licences to approve.'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <GGButton variant="success" size="sm" onClick={() => void decide('approved')} disabled={busy || licencesOutstanding} style={{ flex: 1 }}>
              {approve.isPending ? 'Approving…' : 'Approve'}
            </GGButton>
            <GGButton variant="secondary" size="sm" onClick={() => void decide('info_requested')} disabled={busy || app.status === 'info_requested'} style={{ flex: 1 }}>
              Request info
            </GGButton>
            <GGButton variant="danger" size="sm" onClick={() => void decide('rejected')} disabled={busy} style={{ flex: 1 }}>
              Reject
            </GGButton>
          </div>
        </div>
      )}
    </div>
  )
}
