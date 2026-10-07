import { useEffect, useRef, useState, type ReactNode } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useAccountHistory, useAdminAccountActions } from '@/hooks/api/useAdminAccounts'
import { useDeleteAdminProviderMutation, useDeleteAdminUserMutation } from '@/hooks/api/useAdminMutations'
import { formatRelativeTime } from '@/utils/format'
import type { AccountKind } from '@/api/services/admin-accounts.service'
import type { AccountHistoryEntry, AdminProvider, AdminUser } from '@/types/admin.types'

const CYAN_DEEP = '#0B7BC0'

const btn = (tone: 'primary' | 'plain' | 'danger' | 'success' = 'plain'): React.CSSProperties => ({
  height: 36,
  padding: '0 14px',
  borderRadius: radius.sm,
  border: tone === 'plain' ? `1px solid ${C.border}` : 'none',
  background: tone === 'primary' ? `linear-gradient(135deg, #1A9BE6, ${CYAN_DEEP})` : tone === 'danger' ? '#DC2626' : tone === 'success' ? '#15803D' : '#fff',
  color: tone === 'plain' ? C.text : '#fff',
  fontSize: 13.5,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 40,
  padding: '0 12px',
  border: `1px solid ${C.border}`,
  borderRadius: radius.sm,
  fontSize: 14,
  fontFamily: font.family,
  color: C.text,
  background: '#fff',
  outline: 'none',
}

const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

// ── generic dialog ──────────────────────────────────────────────────────────

export function Dialog({ title, subtitle, onClose, children, footer }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(9,28,68,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: radius.lg, padding: 22, fontFamily: font.family, outline: 'none', boxShadow: '0 20px 50px rgba(13,30,66,0.25)' }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>{title}</h2>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13.5, color: C.textSub, lineHeight: 1.5 }}>{subtitle}</p>}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>{footer}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: C.textSub }}>{hint}</span>}
    </label>
  )
}

export function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null
  return <div role="alert" style={{ padding: '10px 12px', borderRadius: radius.sm, background: '#FEF2F2', color: '#B91C1C', fontSize: 13 }}>{text}</div>
}

/** Asks for a reason before an action that affects the person (suspend, decline…). */
export function ReasonDialog({ title, subtitle, confirmLabel, danger, placeholder, onConfirm, onClose }: {
  title: string
  subtitle?: string
  confirmLabel: string
  danger?: boolean
  placeholder?: string
  onConfirm: (reason: string) => Promise<unknown>
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    if (reason.trim().length < 3) { setError('Add a short reason. The person will see it.'); return }
    setBusy(true)
    setError(null)
    try { await onConfirm(reason.trim()); onClose() } catch (e) { setError(errMsg(e, 'That didn’t work. Try again.')) } finally { setBusy(false) }
  }
  return (
    <Dialog title={title} subtitle={subtitle} onClose={onClose} footer={<>
      <button type="button" style={btn()} onClick={onClose}>Cancel</button>
      <button type="button" style={{ ...btn(danger ? 'danger' : 'primary'), opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => void submit()}>{busy ? 'Working…' : confirmLabel}</button>
    </>}>
      <Field label="Reason">
        <textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder={placeholder} style={{ ...input, height: 'auto', padding: 10, resize: 'vertical' }} />
      </Field>
      <ErrorLine text={error} />
    </Dialog>
  )
}

// ── patient dialogs ─────────────────────────────────────────────────────────

function EditPatientDialog({ user, onSaved, onClose }: { user: AdminUser; onSaved: (u: AdminUser) => void; onClose: () => void }) {
  const { updatePatient } = useAdminAccountActions()
  const [form, setForm] = useState({
    firstName: user.firstName ?? user.name.split(' ')[0] ?? '',
    lastName: user.lastName ?? user.name.split(' ').slice(1).join(' '),
    phone: user.phone ?? '',
    countryCode: user.countryCode ?? 'KE',
    dateOfBirth: user.dob ? user.dob.slice(0, 10) : '',
    gender: user.gender ?? '',
    reason: '',
  })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const save = async () => {
    setError(null)
    try { onSaved(await updatePatient.mutateAsync({ id: user.id, payload: form })); onClose() } catch (e) { setError(errMsg(e, 'Couldn’t save the changes.')) }
  }
  return (
    <Dialog title="Edit patient details" subtitle="The patient is notified when you change their details. Their email is changed from their own Settings." onClose={onClose} footer={<>
      <button type="button" style={btn()} onClick={onClose}>Cancel</button>
      <button type="button" style={btn('primary')} disabled={updatePatient.isPending} onClick={() => void save()}>{updatePatient.isPending ? 'Saving…' : 'Save changes'}</button>
    </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="First name"><input style={input} value={form.firstName} onChange={set('firstName')} /></Field>
        <Field label="Last name"><input style={input} value={form.lastName} onChange={set('lastName')} /></Field>
      </div>
      <Field label="Phone"><input style={input} value={form.phone} onChange={set('phone')} inputMode="tel" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Country">
          <select style={input} value={form.countryCode} onChange={set('countryCode')}>
            <option value="KE">Kenya</option><option value="ZW">Zimbabwe</option><option value="ZM">Zambia</option>
          </select>
        </Field>
        <Field label="Date of birth"><input style={input} type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></Field>
      </div>
      <Field label="Gender">
        <select style={input} value={form.gender} onChange={set('gender')}>
          <option value="">Not recorded</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option>
        </select>
      </Field>
      <Field label="Why are you changing this?" hint="Kept in the account history."><input style={input} value={form.reason} onChange={set('reason')} placeholder="e.g. Patient called to correct their surname" /></Field>
      <ErrorLine text={error} />
    </Dialog>
  )
}

function CreditLimitDialog({ user, currency, onSaved, onClose }: { user: AdminUser; currency: string; onSaved: (u: AdminUser) => void; onClose: () => void }) {
  const { setCreditLimit } = useAdminAccountActions()
  const [limit, setLimit] = useState(String(user.creditLimit))
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const value = Number(limit.replace(/,/g, ''))
  const save = async () => {
    setError(null)
    if (!Number.isFinite(value) || value < 0) { setError('Enter a valid amount.'); return }
    if (value < user.creditUsed) { setError(`It can’t be lower than what’s already used (${currency} ${user.creditUsed.toLocaleString()}).`); return }
    if (reason.trim().length < 3) { setError('Add a reason. It’s kept in the account history.'); return }
    try { onSaved(await setCreditLimit.mutateAsync({ id: user.id, limit: value, reason: reason.trim() })); onClose() } catch (e) { setError(errMsg(e, 'Couldn’t change the limit.')) }
  }
  return (
    <Dialog title="Change credit limit" subtitle={`Currently ${currency} ${user.creditLimit.toLocaleString()}, with ${currency} ${user.creditUsed.toLocaleString()} used. The patient is notified.`} onClose={onClose} footer={<>
      <button type="button" style={btn()} onClick={onClose}>Cancel</button>
      <button type="button" style={btn('primary')} disabled={setCreditLimit.isPending} onClick={() => void save()}>{setCreditLimit.isPending ? 'Saving…' : 'Set limit'}</button>
    </>}>
      <Field label={`New limit (${currency})`} hint={Number.isFinite(value) && value >= user.creditUsed ? `Available after the change: ${currency} ${(value - user.creditUsed).toLocaleString()}` : undefined}>
        <input style={input} value={limit} onChange={e => setLimit(e.target.value)} inputMode="decimal" />
      </Field>
      <Field label="Reason"><input style={input} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Finance partner approved an increase" /></Field>
      <ErrorLine text={error} />
    </Dialog>
  )
}

// ── provider dialog ─────────────────────────────────────────────────────────

const CATEGORIES = ['HOSPITAL', 'CLINIC', 'DOCTOR', 'PHARMACY', 'LABORATORY', 'RADIOLOGY']

function EditProviderDialog({ provider, onSaved, onClose }: { provider: AdminProvider; onSaved: (p: AdminProvider) => void; onClose: () => void }) {
  const { updateProvider } = useAdminAccountActions()
  const [form, setForm] = useState({
    name: provider.name,
    phone: provider.phone ?? '',
    address: provider.address ?? '',
    license: provider.license ?? '',
    country: provider.countryCode ?? 'KE',
    hours: provider.hoursText ?? '',
    about: provider.about ?? '',
    openStatus: provider.openStatus ?? 'open',
    reason: '',
  })
  const [categories, setCategories] = useState<string[]>(provider.categories?.map(c => c.toUpperCase()) ?? [])
  const [payout, setPayout] = useState(provider.payoutAccount ?? { method: 'MPESA' as const, accountName: '', accountNumber: '' })
  const [editPayout, setEditPayout] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggle = (c: string) => setCategories(list => (list.includes(c) ? list.filter(x => x !== c) : [...list, c]))

  const save = async () => {
    setError(null)
    if (categories.length === 0) { setError('Choose at least one provider type.'); return }
    if (editPayout && (payout.accountName.trim().length < 2 || payout.accountNumber.trim().length < 4)) { setError('Fill in the payout account name and number.'); return }
    try {
      const updated = await updateProvider.mutateAsync({
        id: provider.id,
        payload: { ...form, openStatus: form.openStatus as 'open' | 'closed', categories, ...(editPayout ? { payout: { ...payout, accountName: payout.accountName.trim(), accountNumber: payout.accountNumber.trim() } } : {}) },
      })
      onSaved(updated)
      onClose()
    } catch (e) { setError(errMsg(e, 'Couldn’t save the changes.')) }
  }

  return (
    <Dialog title="Edit provider" subtitle="The provider is notified of changes. Their sign-in email is changed from their own Settings." onClose={onClose} footer={<>
      <button type="button" style={btn()} onClick={onClose}>Cancel</button>
      <button type="button" style={btn('primary')} disabled={updateProvider.isPending} onClick={() => void save()}>{updateProvider.isPending ? 'Saving…' : 'Save changes'}</button>
    </>}>
      <Field label="Practice name"><input style={input} value={form.name} onChange={set('name')} /></Field>
      <Field label="Provider types">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map(c => {
            const on = categories.includes(c)
            return (
              <button key={c} type="button" onClick={() => toggle(c)} aria-pressed={on} style={{ padding: '6px 12px', borderRadius: radius.full, border: `1.5px solid ${on ? CYAN_DEEP : C.border}`, background: on ? C.blue100 : '#fff', color: on ? CYAN_DEEP : C.text, fontSize: 13, fontWeight: 600, fontFamily: font.family, cursor: 'pointer' }}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </button>
            )
          })}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Phone"><input style={input} value={form.phone} onChange={set('phone')} inputMode="tel" /></Field>
        <Field label="Licence number"><input style={input} value={form.license} onChange={set('license')} /></Field>
      </div>
      <Field label="Address"><input style={input} value={form.address} onChange={set('address')} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Country">
          <select style={input} value={form.country} onChange={set('country')}>
            <option value="KE">Kenya</option><option value="ZW">Zimbabwe</option><option value="ZM">Zambia</option>
          </select>
        </Field>
        <Field label="Taking patients">
          <select style={input} value={form.openStatus} onChange={set('openStatus')}>
            <option value="open">Open</option><option value="closed">Closed</option>
          </select>
        </Field>
      </div>
      <Field label="Opening hours (short summary)"><input style={input} value={form.hours} onChange={set('hours')} placeholder="e.g. Mon–Fri 8:00–17:00, Sat 8:00–13:00" /></Field>
      <Field label="About"><textarea style={{ ...input, height: 'auto', padding: 10, resize: 'vertical' }} rows={3} value={form.about} onChange={set('about')} /></Field>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={editPayout} onChange={e => setEditPayout(e.target.checked)} />
          Change payout account
        </label>
        {editPayout && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <Field label="Method">
              <select style={input} value={payout.method} onChange={e => setPayout(p => ({ ...p, method: e.target.value as 'MPESA' | 'BANK' | 'MOBILE_MONEY' }))}>
                <option value="MPESA">M-Pesa</option><option value="BANK">Bank</option><option value="MOBILE_MONEY">Mobile money</option>
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Account name"><input style={input} value={payout.accountName} onChange={e => setPayout(p => ({ ...p, accountName: e.target.value }))} /></Field>
              <Field label="Account / paybill number"><input style={input} value={payout.accountNumber} onChange={e => setPayout(p => ({ ...p, accountNumber: e.target.value }))} /></Field>
            </div>
            <div style={{ fontSize: 12, color: '#B45309' }}>The provider is alerted immediately when their payout account changes.</div>
          </div>
        )}
      </div>
      <Field label="Why are you changing this?" hint="Kept in the account history."><input style={input} value={form.reason} onChange={set('reason')} /></Field>
      <ErrorLine text={error} />
    </Dialog>
  )
}

// ── history ─────────────────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, string> = {
  'admin.patient.suspended': 'Suspended',
  'admin.patient.reactivated': 'Reactivated',
  'admin.patient.updated': 'Details edited',
  'admin.patient.credit_limit_changed': 'Credit limit changed',
  'admin.patient.deleted': 'Deleted',
  'admin.provider.suspended': 'Suspended',
  'admin.provider.reactivated': 'Reactivated',
  'admin.provider.updated': 'Details edited',
  'admin.provider.payout_updated': 'Payout account changed',
  'admin.account.signed_out_all': 'Signed out of all devices',
  'admin.account.password_reset_sent': 'Password reset sent',
  'admin.account.verification_resent': 'Verification email resent',
  'admin.account.email_change_approved': 'Email change approved',
  'admin.account.email_change_rejected': 'Email change declined',
  'admin.provider_application.approved': 'Application approved',
  'admin.provider_application.rejected': 'Application rejected',
  'admin.provider_application.info_requested': 'More information requested',
}

function describe(entry: AccountHistoryEntry) {
  const m = (entry.metadata ?? {}) as Record<string, unknown>
  if (typeof m.reason === 'string' && m.reason) return m.reason
  if (m.from !== undefined && m.to !== undefined) return `${String(m.from)} → ${String(m.to)}`
  if (m.changes && typeof m.changes === 'object') return `Changed: ${Object.keys(m.changes as object).join(', ')}`
  if (typeof m.note === 'string' && m.note) return m.note
  return null
}

export function AccountHistory({ kind, id }: { kind: AccountKind; id: string }) {
  const { data = [], isLoading } = useAccountHistory(kind, id)
  if (isLoading) return <div style={{ fontSize: 13, color: C.textSub }}>Loading history…</div>
  if (data.length === 0) return <div style={{ fontSize: 13, color: C.textSub }}>No admin actions on this account yet.</div>
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {data.map((entry, i) => {
        const detail = describe(entry)
        return (
          <li key={entry.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
            <span aria-hidden style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: entry.action.includes('suspend') || entry.action.includes('rejected') ? '#DC2626' : CYAN_DEEP, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{ACTION_LABEL[entry.action] ?? entry.action.replace(/^admin\./, '').replace(/[._]/g, ' ')}</div>
              {detail && <div style={{ fontSize: 13, color: C.text, marginTop: 1, overflowWrap: 'anywhere' }}>{detail}</div>}
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 1 }}>{entry.by} · {formatRelativeTime(entry.at)}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ── action panels ───────────────────────────────────────────────────────────

function Notice({ text, tone }: { text: string; tone: 'ok' | 'err' }) {
  return <div role="status" style={{ padding: '9px 12px', borderRadius: radius.sm, background: tone === 'ok' ? '#F0FDF4' : '#FEF2F2', color: tone === 'ok' ? '#15803D' : '#B91C1C', fontSize: 13 }}>{text}</div>
}

function SuspendedBanner({ reason }: { reason?: string | null }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: radius.sm, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#991B1B', lineHeight: 1.5 }}>
      <strong>Suspended.</strong> {reason ? `Reason: ${reason}` : 'No reason was recorded.'}
    </div>
  )
}

function useNotice() {
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null)
  const show = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setNotice({ text, tone })
    if (tone === 'ok') setTimeout(() => setNotice(null), 4000)
  }
  return { notice, show }
}

type DialogKind = 'edit' | 'credit' | 'suspend' | 'delete' | null

export function PatientAccountActions({ user, currency, onUpdated, onDeleted }: { user: AdminUser; currency: string; onUpdated: (u: AdminUser) => void; onDeleted: () => void }) {
  const actions = useAdminAccountActions()
  const deleteUser = useDeleteAdminUserMutation()
  const [dialog, setDialog] = useState<DialogKind>(null)
  const { notice, show } = useNotice()
  const run = async (fn: () => Promise<{ message?: string } | unknown>, ok: string) => {
    try { await fn(); show(ok) } catch (e) { show(errMsg(e, 'That didn’t work.'), 'err') }
  }
  const suspended = user.status === 'suspended'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {suspended && <SuspendedBanner reason={user.suspendedReason} />}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" style={btn('primary')} onClick={() => setDialog('edit')}>Edit details</button>
        <button type="button" style={btn()} onClick={() => setDialog('credit')}>Change credit limit</button>
        {suspended
          ? <button type="button" style={btn('success')} onClick={() => void run(async () => onUpdated(await actions.reactivate.mutateAsync({ kind: 'users', id: user.id }) as AdminUser), 'Account reactivated. The patient has been told.')}>Reactivate</button>
          : <button type="button" style={{ ...btn(), color: '#B91C1C', borderColor: '#FECACA' }} onClick={() => setDialog('suspend')}>Suspend</button>}
        <MoreMenu items={[
          { label: 'Sign out everywhere', onClick: () => void run(() => actions.signOutAll.mutateAsync({ kind: 'users', id: user.id }), 'Signed out of every device.') },
          { label: 'Send password reset', onClick: () => void run(() => actions.sendPasswordReset.mutateAsync({ kind: 'users', id: user.id }), `Password reset link sent to ${user.email}.`) },
          ...(user.emailVerified === false ? [{ label: 'Resend verification email', onClick: () => void run(() => actions.resendVerification.mutateAsync(user.id), `Verification email sent to ${user.email}.`) }] : []),
          { label: 'Delete account', danger: true, onClick: () => setDialog('delete') },
        ]} />
      </div>
      {notice && <Notice {...notice} />}

      {dialog === 'edit' && <EditPatientDialog user={user} onSaved={u => { onUpdated(u); show('Details saved. The patient has been told.') }} onClose={() => setDialog(null)} />}
      {dialog === 'credit' && <CreditLimitDialog user={user} currency={currency} onSaved={u => { onUpdated(u); show('Credit limit changed. The patient has been told.') }} onClose={() => setDialog(null)} />}
      {dialog === 'suspend' && (
        <ReasonDialog
          title={`Suspend ${user.name}?`}
          subtitle="They’re signed out of every device straight away and can’t sign in until you reactivate them. They get an email with your reason."
          confirmLabel="Suspend account"
          danger
          placeholder="e.g. Suspected fraudulent invoices — under review"
          onConfirm={async reason => { onUpdated(await actions.suspend.mutateAsync({ kind: 'users', id: user.id, reason }) as AdminUser); show('Account suspended and signed out.') }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDelete
          name={user.name}
          detail="Only accounts with no appointments, invoices, payments or family members can be deleted. Otherwise, suspend the account instead."
          onConfirm={async () => { await deleteUser.mutateAsync(user.id); onDeleted() }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

export function ProviderAccountActions({ provider, onUpdated, onDeleted }: { provider: AdminProvider; onUpdated: (p: AdminProvider) => void; onDeleted: () => void }) {
  const actions = useAdminAccountActions()
  const deleteProvider = useDeleteAdminProviderMutation()
  const [dialog, setDialog] = useState<DialogKind>(null)
  const { notice, show } = useNotice()
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); show(ok) } catch (e) { show(errMsg(e, 'That didn’t work.'), 'err') }
  }
  const suspended = provider.status === 'suspended'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {suspended && <SuspendedBanner reason={provider.suspendedReason} />}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" style={btn('primary')} onClick={() => setDialog('edit')}>Edit details</button>
        {suspended
          ? <button type="button" style={btn('success')} onClick={() => void run(async () => onUpdated(await actions.reactivate.mutateAsync({ kind: 'providers', id: provider.id }) as AdminProvider), 'Provider reactivated and visible to patients again.')}>Reactivate</button>
          : <button type="button" style={{ ...btn(), color: '#B91C1C', borderColor: '#FECACA' }} onClick={() => setDialog('suspend')}>Suspend</button>}
        <MoreMenu items={[
          ...(provider.hasLogin !== false ? [
            { label: 'Sign out everywhere', onClick: () => void run(() => actions.signOutAll.mutateAsync({ kind: 'providers', id: provider.id }), 'Signed out of every device.') },
            { label: 'Send password reset', onClick: () => void run(() => actions.sendPasswordReset.mutateAsync({ kind: 'providers', id: provider.id }), `Password reset link sent to ${provider.email}.`) },
          ] : []),
          { label: 'Delete provider', danger: true, onClick: () => setDialog('delete') },
        ]} />
      </div>
      {notice && <Notice {...notice} />}

      {dialog === 'edit' && <EditProviderDialog provider={provider} onSaved={p => { onUpdated(p); show('Details saved. The provider has been told.') }} onClose={() => setDialog(null)} />}
      {dialog === 'suspend' && (
        <ReasonDialog
          title={`Suspend ${provider.name}?`}
          subtitle="They’re hidden from patients, signed out everywhere and can’t sign in until you reactivate them. They get an email with your reason."
          confirmLabel="Suspend provider"
          danger
          placeholder="e.g. Licence expired — awaiting renewal"
          onConfirm={async reason => { onUpdated(await actions.suspend.mutateAsync({ kind: 'providers', id: provider.id, reason }) as AdminProvider); show('Provider suspended and hidden from patients.') }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDelete
          name={provider.name}
          detail="Only providers with no appointments, invoices or payments can be deleted. Otherwise, suspend them instead."
          onConfirm={async () => { await deleteProvider.mutateAsync(provider.id); onDeleted() }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

export function MoreMenu({ items }: { items: Array<{ label: string; onClick: () => void; danger?: boolean }> }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)} style={{ ...btn(), padding: '0 12px' }}>
        More <span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 42, zIndex: 20, minWidth: 220, background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.sm, boxShadow: '0 10px 28px rgba(13,30,66,0.16)', padding: '4px 0' }}>
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); item.onClick() }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', fontSize: 14, color: item.danger ? '#B91C1C' : C.text, fontFamily: font.family, cursor: 'pointer' }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfirmDelete({ name, detail, onConfirm, onClose }: { name: string; detail: string; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const go = async () => {
    setBusy(true)
    setError(null)
    try { await onConfirm(); onClose() } catch (e) { setError(errMsg(e, 'This account can’t be deleted.')) } finally { setBusy(false) }
  }
  return (
    <Dialog title={`Permanently delete ${name}?`} subtitle={detail} onClose={onClose} footer={<>
      <button type="button" style={btn()} onClick={onClose}>Keep account</button>
      <button type="button" style={btn('danger')} disabled={busy} onClick={() => void go()}>{busy ? 'Deleting…' : 'Delete permanently'}</button>
    </>}>
      <div style={{ fontSize: 13.5, color: C.text }}>This can’t be undone.</div>
      <ErrorLine text={error} />
    </Dialog>
  )
}
