import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/types'
import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { Pager, usePaged } from '@/features/admin/paging'
import { formatDate } from '@/utils/format'
import type { SPApplication } from '@/types/admin.types'

const CYAN_DEEP = '#0B7BC0'
const GREEN = '#15803D'
const AMBER = '#B45309'
const RED = '#B42318'
/** Setup links expire after 24 hours (see AuthService.inviteImportedProvider). */
const LINK_TTL_MS = 86_400_000
/** Ids per request, so a 500-provider send stays well inside the API rate limit. */
const CHUNK = 25

type LinkState = 'failed' | 'waiting' | 'expired' | 'sent'
const ORDER: Record<LinkState, number> = { failed: 0, waiting: 1, expired: 2, sent: 3 }
const LABEL: Record<LinkState, string> = { failed: 'Failed', waiting: 'Not sent', expired: 'Expired', sent: 'Sent' }
const COLOR: Record<LinkState, string> = { failed: RED, waiting: C.text, expired: AMBER, sent: C.textSub }

interface BatchResult { sent: number; failed: number; results: Array<{ id: string; ok: boolean; message: string; invitedAt?: string }> }

/**
 * Approved CSV imports that still have to set up their account. One list, sorted so the
 * ones needing a link come first, with one button that sends every link that is missing or stale.
 */
export function SetupLinksList({ providers, search, highlightId }: { providers: SPApplication[]; search: string; highlightId?: string | null }) {
  const cache = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState<string[] | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [summary, setSummary] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState('')
  // Results from this session, applied until the refetch lands.
  const [sentAt, setSentAt] = useState<Record<string, string>>({})
  const [failures, setFailures] = useState<Record<string, string>>({})
  const [now, setNow] = useState(() => Date.now())

  const stateOf = (p: SPApplication): LinkState => {
    if (failures[p.id]) return 'failed'
    const invited = sentAt[p.id] ?? p.invitedAt
    if (!invited) return 'waiting'
    return now - new Date(invited).getTime() > LINK_TTL_MS ? 'expired' : 'sent'
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return providers
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.country ?? '').toLowerCase().includes(q))
      .map(p => ({ p, state: stateOf(p) }))
      .sort((a, b) => Number(b.p.id === highlightId) - Number(a.p.id === highlightId) || ORDER[a.state] - ORDER[b.state] || a.p.name.localeCompare(b.p.name))
    // stateOf only reads sentAt, failures and now.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, search, sentAt, failures, now, highlightId])

  const { pageItems, pager } = usePaged(rows, search)
  const busy = progress !== null
  // Everything without a working link: never sent, expired, or failed.
  const outstanding = providers.filter(p => stateOf(p) !== 'sent').map(p => p.id)
  const allOnPage = pageItems.length > 0 && pageItems.every(r => selected.has(r.p.id))

  if (providers.length === 0) {
    return <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 14, color: C.textSub }}>No providers waiting for a link.</div>
  }

  function toggle(id: string) {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  async function send(ids: string[]) {
    setConfirming(null); setError(''); setSummary(null)
    setProgress({ done: 0, total: ids.length })
    let sent = 0, failed = 0
    try {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK)
        const { data } = await apiClient.post<BatchResult>('/admin/applications/invitations', { ids: chunk })
        const ok: Record<string, string> = {}
        const bad: Record<string, string> = {}
        for (const r of data.results) { if (r.ok) ok[r.id] = r.invitedAt ?? new Date().toISOString(); else bad[r.id] = r.message }
        setSentAt(prev => ({ ...prev, ...ok }))
        setFailures(prev => { const next = { ...prev, ...bad }; Object.keys(ok).forEach(id => delete next[id]); return next })
        sent += data.sent; failed += data.failed
        setProgress({ done: Math.min(ids.length, i + chunk.length), total: ids.length })
      }
      setSelected(new Set())
    } catch (e) {
      // A 404 here means the API process was started before this endpoint existed.
      setError(e instanceof ApiError && e.status === 404
        ? 'The API server is running an older build. Restart the API, then try again.'
        : `${e instanceof Error ? e.message : 'Sending stopped.'}${sent + failed > 0 ? ` ${sent} sent before it stopped.` : ''}`)
    } finally {
      setProgress(null)
      setNow(Date.now())
      if (sent + failed > 0) setSummary({ sent, failed })
      if (sent > 0) void cache.invalidateQueries()
    }
  }

  const sendTarget = selected.size > 0 ? [...selected] : outstanding
  const th: React.CSSProperties = { padding: '10px 12px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textSub, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}` }
  const td: React.CSSProperties = { padding: '11px 12px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' }

  return (
    <div style={{ fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* One action bar: send everything outstanding, or just the ticked rows */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', fontSize: 14, color: C.text }}>
          {confirming
            ? `Send ${confirming.length} setup link${confirming.length === 1 ? '' : 's'}?`
            : progress
              ? `Sending ${progress.done} of ${progress.total}…`
              : outstanding.length > 0
                ? `${outstanding.length} without a link${selected.size > 0 ? `, ${selected.size} selected` : ''}`
                : 'All links sent.'}
        </div>
        {confirming ? (
          <>
            <GGButton variant="secondary" size="sm" onClick={() => setConfirming(null)}>Cancel</GGButton>
            <GGButton variant="primary" size="sm" onClick={() => void send(confirming)}>Send {confirming.length}</GGButton>
          </>
        ) : !busy && sendTarget.length > 0 && (
          <>
            {selected.size > 0 && <GGButton variant="secondary" size="sm" onClick={() => setSelected(new Set())}>Clear</GGButton>}
            <GGButton variant="primary" size="sm" onClick={() => setConfirming(sendTarget)}>
              {selected.size > 0 ? 'Send to selected' : 'Send links'}
            </GGButton>
          </>
        )}
      </div>

      {summary && !busy && (
        <div role="status" style={{ fontSize: 13.5, color: summary.failed ? RED : GREEN }}>
          {[summary.sent > 0 && `${summary.sent} sent`, summary.failed > 0 && `${summary.failed} failed`].filter(Boolean).join(', ')}
        </div>
      )}
      {error && !busy && <div role="alert" style={{ fontSize: 13.5, color: RED, lineHeight: 1.5 }}>{error}</div>}

      <div className="hide-scrollbar" style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13.5, color: C.textSub }}>No providers match.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#F7F9FC' }}>
                <th style={{ ...th, width: 36 }}>
                  <input type="checkbox" aria-label="Select everyone on this page" checked={allOnPage} disabled={busy}
                    onChange={() => setSelected(prev => { const next = new Set(prev); pageItems.forEach(r => (allOnPage ? next.delete(r.p.id) : next.add(r.p.id))); return next })}
                    style={{ accentColor: CYAN_DEEP, width: 16, height: 16, cursor: 'pointer' }} />
                </th>
                <th style={th}>Provider</th>
                <th style={th}>Country</th>
                <th style={th}>Setup link</th>
                <th style={{ ...th, textAlign: 'right' }}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Action</span></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(({ p, state }) => {
                const invited = sentAt[p.id] ?? p.invitedAt
                return (
                  <tr key={p.id} style={{ background: selected.has(p.id) ? '#F3F9FE' : p.id === highlightId ? '#F7FBFF' : '#fff' }}>
                    <td style={td}>
                      <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} disabled={busy} style={{ accentColor: CYAN_DEEP, width: 16, height: 16, cursor: 'pointer' }} />
                    </td>
                    <td style={{ ...td, maxWidth: 360 }}>
                      <div style={{ fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12.5, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>
                    </td>
                    <td style={{ ...td, color: C.textSub, whiteSpace: 'nowrap' }}>{p.country || '—'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <span style={{ color: COLOR[state] }}>{state === 'sent' && invited ? `Sent ${formatDate(invited)}` : LABEL[state]}</span>
                      {state === 'failed' && <div style={{ fontSize: 12, color: RED, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }} title={failures[p.id]}>{failures[p.id]}</div>}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button type="button" disabled={busy} onClick={() => setConfirming([p.id])}
                        style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, color: busy ? C.textLight : CYAN_DEEP, whiteSpace: 'nowrap' }}>
                        {state === 'waiting' ? 'Send' : 'Resend'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <Pager {...pager} />
    </div>
  )
}
