import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GGCard, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { authService } from '@/api/services/auth.service'
import { formatRelativeTime } from '@/utils/format'

const CYAN_DEEP = '#0B7BC0'
const KEY = ['auth', 'email-change']

/**
 * Sign-in email changes are requested here and approved by a GG'APP admin,
 * so an account can't be quietly moved to someone else's address.
 */
export function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const queryClient = useQueryClient()
  const { data: latest } = useQuery({ queryKey: KEY, queryFn: () => authService.getEmailChange() })
  const [open, setOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = () => void queryClient.invalidateQueries({ queryKey: KEY })
  const request = useMutation({ mutationFn: authService.requestEmailChange, onSuccess: refresh })
  const cancel = useMutation({ mutationFn: authService.cancelEmailChange, onSuccess: refresh })

  const pending = latest?.status === 'pending'

  const submit = async () => {
    setError(null)
    const email = newEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (email === currentEmail.toLowerCase()) { setError('That’s already your email address.'); return }
    try {
      await request.mutateAsync({ newEmail: email, password: password || undefined, reason: reason.trim() || undefined })
      setOpen(false)
      setNewEmail('')
      setPassword('')
      setReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t send your request.')
    }
  }

  return (
    <GGCard padding="22px">
      <div style={{ fontFamily: font.family }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Sign-in email</div>
            <div style={{ fontSize: 14, color: C.text, marginTop: 4, overflowWrap: 'anywhere' }}>{currentEmail}</div>
            <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>
              For your security, email changes are checked by the GG’APP team before they take effect.
            </div>
          </div>
          {!open && !pending && (
            <button type="button" onClick={() => setOpen(true)} style={{ height: 36, padding: '0 14px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: font.family, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Change email
            </button>
          )}
        </div>

        {pending && latest && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: radius.md, background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, fontSize: 13.5, color: '#92400E', lineHeight: 1.5 }}>
              Waiting for approval to change to <strong>{latest.newEmail}</strong> · sent {formatRelativeTime(latest.createdAt)}. Keep using your current email until then.
            </div>
            <button type="button" disabled={cancel.isPending} onClick={() => void cancel.mutateAsync()} style={{ background: 'none', border: 'none', padding: 0, color: '#B45309', fontWeight: 700, fontSize: 13.5, fontFamily: font.family, cursor: 'pointer' }}>
              Cancel request
            </button>
          </div>
        )}

        {!pending && latest?.status === 'rejected' && (
          <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: radius.md, background: '#FEF2F2', fontSize: 13, color: '#991B1B', lineHeight: 1.5 }}>
            Your request to use {latest.newEmail} wasn’t approved{latest.decisionNote ? `: ${latest.decisionNote}` : '.'}
          </div>
        )}
        {!pending && latest?.status === 'approved' && latest.decidedAt && (
          <div style={{ marginTop: 14, fontSize: 13, color: '#15803D' }}>Email changed {formatRelativeTime(latest.decidedAt)}.</div>
        )}

        {open && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GGInput label="New email address" type="email" inputMode="email" autoComplete="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@example.com" />
            <GGInput label="Your password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} hint="To confirm it’s really you. Not needed if you sign in with Google." />
            <GGInput label="Why are you changing it? (optional)" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. I no longer use my old work email" />
            {error && <div role="alert" style={{ padding: '9px 12px', borderRadius: radius.sm, background: '#FEF2F2', color: '#B91C1C', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { setOpen(false); setError(null) }} style={{ height: 40, padding: '0 16px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 14, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}>Cancel</button>
              <button type="button" disabled={request.isPending} onClick={() => void submit()} style={{ height: 40, padding: '0 16px', borderRadius: radius.sm, border: 'none', background: `linear-gradient(135deg, #1A9BE6, ${CYAN_DEEP})`, color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}>
                {request.isPending ? 'Sending…' : 'Send for approval'}
              </button>
            </div>
          </div>
        )}
      </div>
    </GGCard>
  )
}
