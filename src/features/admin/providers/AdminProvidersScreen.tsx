import { useEffect, useMemo, useState } from 'react'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminProviders } from '@/hooks/api/useAdminQueries'
import {
  useDeleteAdminProviderMutation,
  useReactivateAdminProviderMutation,
  useSuspendAdminProviderMutation,
} from '@/hooks/api/useAdminMutations'
import { formatDate, formatCurrency, formatPhone } from '@/utils/format'
import type { AdminProvider, DayHours, ProviderStatus } from '@/types/admin.types'
import { CountryBadge, countryCode, COUNTRY_CURRENCIES } from '@/features/admin/AdminShared'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDayHours(day: DayHours): string {
  if (!day.open) return 'Closed'
  if (day.from === '00:00' && (day.to === '23:59' || day.to === '00:00')) return '24 hours'
  return `${day.from} – ${day.to}`
}

const PROVIDER_TYPES = ['All Types', 'General Practitioner', 'Pharmacy', 'Laboratory', 'Hospital', 'Clinic', 'Specialist', 'Radiology']

function StatusBadge({ status }: { status: ProviderStatus }) {
  const active = status === 'active'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: radius.full,
      background: active ? C.blue100 : C.errorBg,
      border: `1px solid ${active ? C.blue500 + '44' : C.error + '44'}`,
      fontSize: '11px', fontWeight: 700,
      color: active ? C.navy800 : C.error,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? C.blue500 : C.error, display: 'inline-block' }} />
      {active ? 'Active' : 'Suspended'}
    </span>
  )
}

function ProviderTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    'General Practitioner': '🩺',
    'Pharmacy': '💊',
    'Laboratory': '🔬',
    'Hospital': '🏥',
    'Clinic': '🏨',
    'Specialist': '👨‍⚕️',
    'Radiology': '🩻',
  }
  return (
    <div style={{
      width: 40, height: 40, borderRadius: radius.sm,
      background: C.blue100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px', flexShrink: 0,
    }}>
      {icons[type] ?? '🏥'}
    </div>
  )
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null
  const full = Math.floor(rating)
  const stars = Array.from({ length: 5 }, (_, i) => i < full)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      {stars.map((filled, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill={filled ? C.navy800 : C.border}>
          <path d="M6 1l1.4 3.1L11 4.6l-2.5 2.5.6 3.4L6 8.8l-3.1 1.7.6-3.4L1 4.6l3.6-.5L6 1z"/>
        </svg>
      ))}
      <span style={{ fontSize: '11px', fontWeight: 700, color: C.text, marginLeft: '4px' }}>{rating.toFixed(1)}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', paddingBottom: '6px', borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  )
}

type StatusFilter = ProviderStatus | 'all'

export function AdminProvidersScreen() {
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const { country } = useAdminCountry()
  const { data: fetchedProviders = [] } = useAdminProviders()
  const suspendMutation = useSuspendAdminProviderMutation()
  const reactivateMutation = useReactivateAdminProviderMutation()
  const deleteMutation = useDeleteAdminProviderMutation()

  const [providers, setProviders] = useState<AdminProvider[]>([])
  const [selected, setSelected]   = useState<AdminProvider | null>(null)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState<StatusFilter>('all')
  const [typeFilter, setType]     = useState('All Types')
  const [actionMsg, setActionMsg]         = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  useEffect(() => {
    setProviders(fetchedProviders)
    setSelected(current => {
      if (!fetchedProviders.length) return null
      if (!current) return fetchedProviders[0]
      return fetchedProviders.find(provider => provider.id === current.id) ?? fetchedProviders[0]
    })
  }, [fetchedProviders])

  const filtered = useMemo(() => {
    return providers.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.license.toLowerCase().includes(search.toLowerCase())) return false
      if (country !== 'all' && p.country !== country) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (typeFilter !== 'All Types' && p.type !== typeFilter) return false
      return true
    })
  }, [providers, search, country, statusFilter, typeFilter])

  const handleToggleSuspend = async (provider: AdminProvider) => {
    const next: ProviderStatus = provider.status === 'active' ? 'suspended' : 'active'
    try {
      const updated =
        next === 'suspended'
          ? await suspendMutation.mutateAsync(provider.id)
          : await reactivateMutation.mutateAsync(provider.id)
      setProviders(prev => prev.map(p => (p.id === provider.id ? updated : p)))
      setSelected(updated)
      setPendingDelete(null)
      setActionMsg(`Provider ${next === 'suspended' ? 'suspended' : 'reactivated'} successfully.`)
      setTimeout(() => setActionMsg(null), 3000)
    } catch {
      setActionMsg('We could not update this provider right now.')
    }
  }

  const handleDelete = async (provider: AdminProvider) => {
    try {
      await deleteMutation.mutateAsync(provider.id)
      const remaining = providers.filter(p => p.id !== provider.id)
      setProviders(remaining)
      setSelected(remaining[0] ?? null)
      setPendingDelete(null)
      setActionMsg('Provider permanently deleted.')
      setTimeout(() => setActionMsg(null), 4000)
    } catch {
      setActionMsg('This provider cannot be deleted while linked activity still exists.')
    }
  }

  const currSymbol = (p: AdminProvider) => COUNTRY_CURRENCIES[p.country] ?? 'Z$'

  return (
    <AdminLayout title="Providers">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Filters + Search — country handled by global top bar selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}`, overflow: 'hidden' }}>

          {/* Search row */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, padding: '0 12px', transition: 'border-color 0.15s' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = C.blue500)}
              onBlurCapture={e  => (e.currentTarget.style.borderColor = C.border)}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5.5" stroke={C.textSub} strokeWidth="1.4"/>
                <path d="M11 11l3 3" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by provider name or licence number…"
                style={{ flex: 1, padding: '9px 0', fontSize: '13px', fontFamily: font.family, color: C.text, background: 'transparent', border: 'none', outline: 'none' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.full, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  aria-label="Clear search"
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2L2 8" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Status + Type side by side */}
          <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Status</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['all', 'active', 'suspended'] as StatusFilter[]).map(s => {
                  const active = statusFilter === s
                  return (
                    <button key={s} onClick={() => setStatus(s)}
                      style={{ padding: '5px 13px', borderRadius: radius.full, border: `1.5px solid ${active ? C.blue500 : C.border}`, background: active ? C.blue100 : C.bg, color: active ? C.navy800 : C.textSub, fontSize: '12px', fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.12s', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                      {s === 'all' ? 'All' : s}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Provider type row */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Provider Type</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PROVIDER_TYPES.map(t => {
                const active = typeFilter === t
                return (
                  <button key={t} onClick={() => setType(t)}
                    style={{ padding: '5px 12px', borderRadius: radius.full, border: `1.5px solid ${active ? C.navy800 : C.border}`, background: active ? C.navy800 : C.bg, color: active ? '#fff' : C.textSub, fontSize: '11px', fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.12s' }}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* List + detail */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1.6fr', gap: '20px', alignItems: 'flex-start' }}>

          {/* Provider list */}
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: '11px', color: C.textSub, fontWeight: 600 }}>
              Providers {country !== 'all' ? `· ${country}` : '· All Countries'}
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>No providers match</div>
            )}
            {filtered.map((p, i) => (
              <div key={p.id}
                onClick={() => { setSelected(p); setActionMsg(null) }}
                style={{
                  padding: '14px 16px',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                  cursor: 'pointer',
                  background: selected?.id === p.id ? C.blue100 : '#fff',
                  borderLeft: selected?.id === p.id ? `3px solid ${C.blue500}` : '3px solid transparent',
                  transition: 'all 0.12s',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                <ProviderTypeIcon type={p.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: C.textSub }}>{p.type} ·</span>
                    <CountryBadge code={countryCode(p.country)} showName name={p.country} />
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </GGCard>

          {/* Detail panel */}
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: isNarrow ? 'static' : 'sticky', top: '20px' }}>

              {actionMsg && (
                <div style={{ padding: '11px 16px', background: C.blue100, borderRadius: radius.sm, fontSize: '13px', fontWeight: 600, color: C.navy800, border: `1px solid ${C.blue500}33` }}>
                  {actionMsg}
                </div>
              )}

              {/* Provider header card */}
              <GGCard padding="22px">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                  <ProviderTypeIcon type={selected.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{selected.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                      {(selected.serviceTypes ?? [selected.type]).map(t => (
                        <span key={t} style={{ fontSize: '10px', fontWeight: 700, color: C.navy800, background: C.blue100, border: `1px solid ${C.blue500}33`, borderRadius: radius.full, padding: '2px 8px' }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ marginTop: '6px' }}><StarRating rating={selected.rating} /></div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                {selected.description && (
                  <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.6, padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, marginBottom: '16px' }}>
                    {selected.description}
                  </div>
                )}

                <SectionLabel>Contact & Practice Details</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                  {[
                    { label: 'Licence No.',    val: selected.license },
                    { label: 'Provider ID',    val: selected.id },
                    { label: 'Country',        val: selected.country },
                    { label: 'Joined',         val: formatDate(selected.joinedDate) },
                    { label: 'Primary Email',  val: selected.email },
                    ...(selected.emailSecondary ? [{ label: 'Secondary Email', val: selected.emailSecondary }] : []),
                    { label: 'Phone',          val: formatPhone(selected.phone, selected.country).display },
                    ...(selected.address ? [{ label: 'Address', val: selected.address }] : []),
                  ].map(item => (
                    <div key={item.label} style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{item.label}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, wordBreak: 'break-all' }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                <SectionLabel>Financial Summary</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '18px' }}>
                  {[
                    { label: 'Total Patients', val: selected.totalPatients.toString(), color: C.blue500 },
                    { label: 'Total Earnings',  val: formatCurrency(selected.totalEarnings, currSymbol(selected)), color: C.text },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: '10px', color: C.textSub, marginTop: '3px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <GGButton
                      variant={selected.status === 'active' ? 'danger' : 'success'}
                      size="sm"
                      onClick={() => handleToggleSuspend(selected)}
                    >
                      {selected.status === 'active' ? 'Suspend Provider' : 'Reactivate Provider'}
                    </GGButton>
                    {selected.status === 'suspended' && pendingDelete !== selected.id && (
                      <GGButton variant="danger" size="sm" onClick={() => setPendingDelete(selected.id)}>
                        Delete Provider
                      </GGButton>
                    )}
                  </div>
                  {pendingDelete === selected.id && (
                    <div style={{ padding: '14px 16px', background: C.errorBg, borderRadius: radius.sm, border: `1.5px solid ${C.error}44` }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.error, marginBottom: '4px' }}>Permanently delete this provider?</div>
                      <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '12px' }}>This cannot be undone. All provider data will be removed.</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <GGButton variant="danger" size="sm" onClick={() => handleDelete(selected)}>Confirm Delete</GGButton>
                        <GGButton variant="secondary" size="sm" onClick={() => setPendingDelete(null)}>Cancel</GGButton>
                      </div>
                    </div>
                  )}
                </div>
              </GGCard>

              {/* Opening Hours */}
              <GGCard padding="22px">
                <SectionLabel>Opening Hours</SectionLabel>
                {selected.hours && Object.keys(selected.hours).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {DAYS.map(day => {
                      const h = selected.hours![day]
                      if (!h) return null
                      const isOpen = h.open
                      return (
                        <div key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: radius.sm, background: isOpen ? C.bg : C.errorBg, border: `1px solid ${isOpen ? C.border : C.error + '22'}` }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isOpen ? C.text : C.textSub, width: 36 }}>{day}</span>
                          <span style={{ fontSize: '12px', color: isOpen ? C.text : C.textSub, fontWeight: isOpen ? 500 : 400 }}>{formatDayHours(h)}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: isOpen ? C.blue500 : C.textSub, letterSpacing: '0.05em' }}>{isOpen ? 'OPEN' : 'CLOSED'}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: C.bg, borderRadius: radius.sm }}>
                    No opening hours on file for this provider.
                  </div>
                )}
              </GGCard>

              {/* Payment / Disbursement */}
              <GGCard padding="22px">
                <SectionLabel>Payment / Disbursement Details</SectionLabel>
                {selected.paymentMethod ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Method</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: C.text }}>
                        {selected.paymentMethod === 'mpesa' ? 'M-Pesa Paybill' : selected.paymentMethod === 'bank' ? 'Bank Transfer' : 'Mobile Money'}
                      </div>
                    </div>
                    {selected.paymentMethod === 'mpesa' && selected.mpesaPaybill && (
                      <div style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Paybill No.</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: C.text, fontFamily: "'Courier New', monospace" }}>{selected.mpesaPaybill}</div>
                      </div>
                    )}
                    {selected.paymentMethod === 'bank' && (
                      <>
                        {selected.bankName && (
                          <div style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Bank Name</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{selected.bankName}</div>
                          </div>
                        )}
                        {selected.bankAccount && (
                          <div style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Account No.</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: C.text, fontFamily: "'Courier New', monospace" }}>{selected.bankAccount}</div>
                          </div>
                        )}
                        {selected.bankBranch && (
                          <div style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: '10px', color: C.textSub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>SWIFT / Branch Code</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, fontFamily: "'Courier New', monospace" }}>{selected.bankBranch}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: C.bg, borderRadius: radius.sm }}>
                    No payout or disbursement details on file for this provider.
                  </div>
                )}
              </GGCard>

              {/* Documents */}
              <GGCard padding="22px">
                <SectionLabel>Uploaded Documents ({selected.documents?.length ?? 0})</SectionLabel>
                {selected.documents && selected.documents.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selected.documents.map((doc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                        <div style={{ width: 32, height: 32, borderRadius: radius.sm, background: doc.type === 'pdf' ? '#FEF3C7' : C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {doc.type === 'pdf' ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="10" height="12" rx="1.5" stroke="#D97706" strokeWidth="1.2"/><path d="M4 5h6M4 7.5h4" stroke="#D97706" strokeWidth="1.1" strokeLinecap="round"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.5" stroke={C.blue500} strokeWidth="1.2"/><circle cx="4.5" cy="5.5" r="1.2" stroke={C.blue500} strokeWidth="1"/><path d="M1 10l3-3 2.5 2.5L9 7l4 3" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                          <div style={{ fontSize: '10px', color: C.textSub, marginTop: '2px' }}>{doc.size} · Uploaded {formatDate(doc.uploadedAt)}</div>
                        </div>
                        {doc.kind === 'license' && (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: C.blue500, background: C.blue100, border: `1px solid ${C.blue500}33`, borderRadius: radius.full, padding: '2px 7px', flexShrink: 0, whiteSpace: 'nowrap' }}>LICENCE</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: C.bg, borderRadius: radius.sm }}>
                    No registration documents on file for this provider.
                  </div>
                )}
              </GGCard>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
