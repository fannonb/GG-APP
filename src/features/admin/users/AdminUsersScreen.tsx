import { useEffect, useMemo, useState } from 'react'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate, formatPhone } from '@/utils/format'
import type { AdminUser, CreditStatus, AdminUserStatus, UploadedDocument } from '@/types/admin.types'
import { CountryBadge, countryCode, COUNTRY_CURRENCIES } from '@/features/admin/AdminShared'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'
import { useAdminUsers } from '@/hooks/api/useAdminQueries'
import { adminService } from '@/api/services/admin.service'
import {
  useDeleteAdminUserMutation,
  useReactivateAdminUserMutation,
  useSuspendAdminUserMutation,
} from '@/hooks/api/useAdminMutations'

function CreditBadge({ status }: { status: CreditStatus }) {
  const map: Record<CreditStatus, { bg: string; color: string; label: string }> = {
    approved:    { bg: C.blue100, color: C.navy800, label: 'Credit Approved' },
    pending:     { bg: C.bg, color: C.textSub, label: 'Credit Pending' },
    rejected:    { bg: C.errorBg, color: C.error, label: 'Credit Rejected' },
    not_applied: { bg: C.bg, color: C.textSub, label: 'No Credit' },
  }
  const s = map[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: radius.full, background: s.bg, border: `1px solid ${C.border}`, fontSize: '11px', fontWeight: 700, color: s.color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

function AccountStatusBadge({ status }: { status: AdminUserStatus }) {
  const map: Record<AdminUserStatus, { bg: string; border: string; color: string; label: string; dot: string }> = {
    active: { bg: C.blue100, border: C.blue500 + '44', color: C.navy800, label: 'Active', dot: C.blue500 },
    suspended: { bg: C.errorBg, border: C.error + '44', color: C.error, label: 'Suspended', dot: C.error },
    pending_verification: { bg: C.bg, border: C.border, color: C.textSub, label: 'Pending', dot: C.textSub },
  }
  const s = map[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: radius.full,
      background: s.bg,
      border: `1px solid ${s.border}`,
      fontSize: '11px', fontWeight: 700,
      color: s.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', paddingBottom: '6px', borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.xs, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, wordBreak: 'break-all' }}>{value || '-'}</div>
    </div>
  )
}

function DocRow({ doc }: { doc: UploadedDocument }) {
  const isPdf = doc.type === 'pdf'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
      <div style={{
        width: 34, height: 34, borderRadius: radius.xs, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isPdf ? C.errorBg : C.blue100,
        border: `1px solid ${isPdf ? C.error + '33' : C.blue500 + '33'}`,
      }}>
        {isPdf ? (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="1" width="14" height="16" rx="2" fill={C.error} opacity="0.15" />
            <rect x="2" y="1" width="14" height="16" rx="2" stroke={C.error} strokeWidth="1.2" />
            <path d="M5 6h8M5 9h8M5 12h5" stroke={C.error} strokeWidth="1" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="1" width="14" height="16" rx="2" fill={C.blue500} opacity="0.12" />
            <rect x="2" y="1" width="14" height="16" rx="2" stroke={C.blue500} strokeWidth="1.2" />
            <circle cx="6.5" cy="7" r="1.5" stroke={C.blue500} strokeWidth="1" />
            <path d="M3 13l3-3 3 3 2-2 4 4" stroke={C.blue500} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
        <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px' }}>{doc.size} | Uploaded {formatDate(doc.uploadedAt)}</div>
      </div>
      <button style={{ padding: '5px 12px', borderRadius: radius.full, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: '11px', fontWeight: 600, color: C.textSub, cursor: 'default', fontFamily: font.family }}>
        View
      </button>
    </div>
  )
}

function PatientAvatar({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const init = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: C.blue100,
      color: C.navy800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '14px', fontWeight: 800, flexShrink: 0, fontFamily: font.family,
    }}>
      {init.toUpperCase()}
    </div>
  )
}

type StatusFilter = AdminUserStatus | 'all'

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'pending_verification', label: 'Pending' },
  { id: 'suspended', label: 'Suspended' },
]

export function AdminUsersScreen() {
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const { country } = useAdminCountry()
  const { data: fetchedUsers = [], isLoading, isError, error } = useAdminUsers()
  const suspendMutation = useSuspendAdminUserMutation()
  const reactivateMutation = useReactivateAdminUserMutation()
  const deleteMutation = useDeleteAdminUserMutation()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatus] = useState<StatusFilter>('all')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [revealedIds, setRevealedIds] = useState<Record<string, string>>({})
  const [revealingId, setRevealingId] = useState<string | null>(null)

  useEffect(() => {
    setUsers(fetchedUsers)
    setSelected(current => {
      if (!fetchedUsers.length) return null
      if (!current) return fetchedUsers[0]
      return fetchedUsers.find(user => user.id === current.id) ?? fetchedUsers[0]
    })
  }, [fetchedUsers])

  const filtered = useMemo(() => users.filter(user => {
    if (search) {
      const q = search.toLowerCase()
      if (!user.name.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) return false
    }
    if (country !== 'all' && user.country !== country) return false
    if (statusFilter !== 'all' && user.status !== statusFilter) return false
    return true
  }), [users, search, country, statusFilter])

  const handleToggleSuspend = async (user: AdminUser) => {
    try {
      const updated =
        user.status === 'suspended'
          ? await reactivateMutation.mutateAsync(user.id)
          : await suspendMutation.mutateAsync(user.id)

      setUsers(prev => prev.map(entry => (entry.id === user.id ? updated : entry)))
      setSelected(updated)
      setPendingDelete(null)
      setActionMsg(`Account ${updated.status === 'suspended' ? 'suspended' : 'reactivated'} successfully.`)
      setTimeout(() => setActionMsg(null), 3500)
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : 'We could not update this patient right now.'
      setActionMsg(message)
    }
  }

  const handleDelete = async (user: AdminUser) => {
    try {
      await deleteMutation.mutateAsync(user.id)
      const remaining = users.filter(entry => entry.id !== user.id)
      setUsers(remaining)
      setSelected(remaining[0] ?? null)
      setPendingDelete(null)
      setActionMsg('Account permanently deleted.')
      setTimeout(() => setActionMsg(null), 4000)
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : 'This patient cannot be deleted while linked activity still exists.'
      setActionMsg(message)
    }
  }

  const creditPct = (user: AdminUser) => user.creditLimit > 0 ? Math.min(100, Math.round((user.creditUsed / user.creditLimit) * 100)) : 0
  const currSymbol = (user: AdminUser) => COUNTRY_CURRENCIES[user.country] ?? 'Z$'

  return (
    <AdminLayout title="Users">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, padding: '0 12px', transition: 'border-color 0.15s' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = C.blue500)}
              onBlurCapture={e => (e.currentTarget.style.borderColor = C.border)}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5.5" stroke={C.textSub} strokeWidth="1.4" />
                <path d="M11 11l3 3" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by patient name or email..."
                style={{ flex: 1, padding: '9px 0', fontSize: '13px', fontFamily: font.family, color: C.text, background: 'transparent', border: 'none', outline: 'none' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.full, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  aria-label="Clear search"
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2L2 8" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.12em', flexShrink: 0 }}>Status</div>
            <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
              {STATUS_TABS.map(tab => {
                const active = statusFilter === tab.id
                return (
                  <button key={tab.id} onClick={() => setStatus(tab.id)}
                    style={{ padding: '5px 13px', borderRadius: radius.full, border: `1.5px solid ${active ? C.blue500 : C.border}`, background: active ? C.blue100 : C.bg, color: active ? C.navy800 : C.textSub, fontSize: '12px', fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <span style={{ fontSize: '12px', color: C.textSub, flexShrink: 0 }}>
              {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '300px 1fr', gap: '20px', alignItems: 'flex-start' }}>
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: '11px', color: C.textSub, fontWeight: 600 }}>
              Patients {country !== 'all' ? `| ${country}` : '| All Countries'}
            </div>
            {isLoading && (
              <div style={{ padding: '32px', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>Loading patients...</div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>No patients match</div>
            )}
            {filtered.map((user, index) => (
              <div key={user.id}
                onClick={() => { setSelected(user); setActionMsg(null) }}
                style={{
                  padding: '13px 16px',
                  borderBottom: index < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                  cursor: 'pointer',
                  background: selected?.id === user.id ? C.blue100 : '#fff',
                  borderLeft: selected?.id === user.id ? `3px solid ${C.blue500}` : '3px solid transparent',
                  transition: 'all 0.12s',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                <PatientAvatar name={user.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <CountryBadge code={countryCode(user.country)} showName name={user.country} size={14} />
                  </div>
                  <div style={{ fontSize: '10px', color: C.textLight, marginTop: '2px' }}>Since {formatDate(user.memberSince)}</div>
                </div>
                <AccountStatusBadge status={user.status} />
              </div>
            ))}
          </GGCard>

          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {actionMsg && (
                <div style={{ padding: '11px 16px', background: C.blue100, borderRadius: radius.sm, fontSize: '13px', fontWeight: 600, color: C.navy800, border: `1px solid ${C.blue500}33` }}>
                  {actionMsg}
                </div>
              )}

              {isError && (
                <div style={{ padding: '11px 16px', background: C.errorBg, borderRadius: radius.sm, fontSize: '13px', fontWeight: 600, color: C.error, border: `1px solid ${C.error}33` }}>
                  {error instanceof Error ? error.message : 'We could not load patient data.'}
                </div>
              )}

              <GGCard padding="22px">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.blue100, color: C.navy800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, flexShrink: 0 }}>
                    {selected.name.trim().split(' ').map(chunk => chunk[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{selected.name}</div>
                    <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>{selected.id} | Patient Account</div>
                  </div>
                  <AccountStatusBadge status={selected.status} />
                </div>

                <SectionLabel>Registration Details</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                  <InfoCell label="Email" value={selected.email} />
                  <InfoCell label="Phone" value={selected.phone ? formatPhone(selected.phone, selected.country).display : 'Not provided'} />
                  <InfoCell label="Country" value={selected.country} />
                  <InfoCell label="Date of Birth" value={formatDate(selected.dob)} />
                  <InfoCell label="Member Since" value={formatDate(selected.memberSince)} />
                  <InfoCell label="Patient ID" value={selected.id} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ padding: '12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: C.blue500 }}>{selected.beneficiariesCount}</div>
                    <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>Beneficiaries</div>
                  </div>
                  <div style={{ padding: '12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: C.navy800 }}>{selected.transactionCount}</div>
                    <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>Transactions</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <GGButton
                      variant={selected.status === 'suspended' ? 'success' : 'danger'}
                      size="sm"
                      onClick={() => handleToggleSuspend(selected)}
                    >
                      {selected.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
                    </GGButton>
                    {selected.status === 'suspended' && pendingDelete !== selected.id && (
                      <GGButton variant="danger" size="sm" onClick={() => setPendingDelete(selected.id)}>
                        Delete Account
                      </GGButton>
                    )}
                  </div>

                  {pendingDelete === selected.id && (
                    <div style={{ padding: '14px 16px', background: C.errorBg, borderRadius: radius.sm, border: `1.5px solid ${C.error}44` }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.error, marginBottom: '4px' }}>Permanently delete this account?</div>
                      <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '12px' }}>Patients with linked appointments, invoices, transactions, or beneficiaries cannot be deleted.</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <GGButton variant="danger" size="sm" onClick={() => handleDelete(selected)}>Confirm Delete</GGButton>
                        <GGButton variant="secondary" size="sm" onClick={() => setPendingDelete(null)}>Cancel</GGButton>
                      </div>
                    </div>
                  )}
                </div>
              </GGCard>

              <GGCard padding="22px">
                <SectionLabel>Identity Verification</SectionLabel>
                {(() => {
                  const revealedValue = revealedIds[selected.id]
                  const isRevealed = !!revealedValue
                  const isLoading = revealingId === selected.id
                  const displayValue = isRevealed ? revealedValue : (selected.nationalId ?? 'Not available')

                  const handleReveal = async () => {
                    if (isRevealed) {
                      setRevealedIds(prev => { const next = { ...prev }; delete next[selected.id]; return next })
                      return
                    }
                    setRevealingId(selected.id)
                    try {
                      const { nationalId } = await adminService.revealNationalId(selected.id)
                      setRevealedIds(prev => ({ ...prev, [selected.id]: nationalId }))
                    } finally {
                      setRevealingId(null)
                    }
                  }

                  return (
                    <div style={{ padding: '14px 16px', background: C.blue100, borderRadius: radius.sm, border: `1.5px solid ${C.blue500}44`, marginBottom: '16px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: C.navy800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>National ID / NRC</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, letterSpacing: '0.04em', fontFamily: "'Courier New', monospace", flex: 1 }}>
                          {displayValue}
                        </div>
                        <button
                          onClick={handleReveal}
                          disabled={isLoading}
                          title={isRevealed ? 'Hide ID' : 'Reveal full ID'}
                          style={{ background: 'none', border: `1.5px solid ${C.blue500}66`, borderRadius: radius.sm, padding: '5px 10px', cursor: isLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: C.blue500, fontSize: '11px', fontWeight: 700, fontFamily: font.family, transition: 'background 0.15s', flexShrink: 0, opacity: isLoading ? 0.6 : 1 }}
                          onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = `${C.blue100}` }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                        >
                          {isLoading ? (
                            <>
                              <span style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${C.blue500}44`, borderTopColor: C.blue500, animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                              Loading…
                            </>
                          ) : isRevealed ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M1 1l12 12M5.5 5.64A2 2 0 009.36 9.5M3.2 3.32A6.3 6.3 0 001 7c1.1 2.4 3.6 4 6 4a6.2 6.2 0 003.6-1.14M6 3.06C6.33 3.02 6.66 3 7 3c2.4 0 4.9 1.6 6 4a6.6 6.6 0 01-1.5 2.08" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Hide
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M1 7c1.1-2.4 3.6-4 6-4s4.9 1.6 6 4c-1.1 2.4-3.6 4-6 4S2.1 9.4 1 7z" stroke={C.blue500} strokeWidth="1.3" strokeLinejoin="round"/>
                                <circle cx="7" cy="7" r="2" stroke={C.blue500} strokeWidth="1.3"/>
                              </svg>
                              Reveal
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })()}

                <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '10px' }}>
                  ID Documents ({selected.idDocuments.length})
                </div>
                {selected.idDocuments.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: C.bg, borderRadius: radius.sm }}>
                    No uploaded identity documents are available from the backend yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selected.idDocuments.map((doc, index) => <DocRow key={index} doc={doc} />)}
                  </div>
                )}
              </GGCard>

              <GGCard padding="22px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <SectionLabel>Healthcare Credit</SectionLabel>
                  <CreditBadge status={selected.creditStatus} />
                </div>

                {selected.creditStatus === 'approved' && selected.creditLimit > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                      {[
                        { label: 'Limit', val: formatCurrency(selected.creditLimit, currSymbol(selected)), color: C.navy800 },
                        { label: 'Used', val: formatCurrency(selected.creditUsed, currSymbol(selected)), color: C.blue500 },
                        { label: 'Available', val: formatCurrency(selected.creditLimit - selected.creditUsed, currSymbol(selected)), color: C.navy800 },
                      ].map(item => (
                        <div key={item.label} style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{item.label}</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: item.color }}>{item.val}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '11px', color: C.textSub }}>Credit utilisation</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: creditPct(selected) > 80 ? C.error : C.navy800 }}>{creditPct(selected)}%</span>
                      </div>
                      <div style={{ height: 6, background: C.border, borderRadius: radius.full, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${creditPct(selected)}%`, background: creditPct(selected) > 80 ? C.error : C.blue500, borderRadius: radius.full }} />
                      </div>
                    </div>

                    {selected.financePartner && (
                      <div style={{ fontSize: '12px', color: C.textSub }}>
                        Finance partner: <strong style={{ color: C.text }}>{selected.financePartner === 'moneymart' ? 'MoneyMart' : 'Equity Bank'}</strong>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '16px', background: C.bg, borderRadius: radius.sm, fontSize: '13px', color: C.textSub, textAlign: 'center', border: `1px solid ${C.border}` }}>
                    {selected.creditStatus === 'pending' && 'Credit application is under review.'}
                    {selected.creditStatus === 'rejected' && 'Credit application was not approved.'}
                    {selected.creditStatus === 'not_applied' && 'Patient has not yet applied for healthcare credit.'}
                  </div>
                )}
              </GGCard>
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
              {isLoading ? 'Loading patient details...' : 'Select a patient to view their details'}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
