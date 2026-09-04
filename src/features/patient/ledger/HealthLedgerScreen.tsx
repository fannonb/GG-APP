import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GGButton, GGCard, GGBadge, GGDivider } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { LedgerTimeline } from '@/components/LedgerTimeline'
import { useLedgerStatus, useOwnLedger, useRevokeLedgerGrantMutation } from '@/hooks/api'
import { ROUTES } from '@/router/routes'
import { useUserStore } from '@/store/user.store'

function timeRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function HealthLedgerScreen() {
  const navigate = useNavigate()
  const statusQuery = useLedgerStatus()
  const ledgerQuery = useOwnLedger()
  const revokeGrantMutation = useRevokeLedgerGrantMutation()
  const storeBeneficiaries = useUserStore(s => s.beneficiaries)

  const status = statusQuery.data
  const hasPin = status?.hasPin ?? false
  const pinExpired = status?.pinExpired ?? false
  const activeGrants = status?.activeGrants ?? []

  const rawEntries = useMemo(() => ledgerQuery.data?.entries ?? [], [ledgerQuery.data?.entries])
  const queryBeneficiaries = useMemo(() => ledgerQuery.data?.patient.beneficiaries ?? [], [ledgerQuery.data?.patient.beneficiaries])

  // Aggregate all unique beneficiaries from query, store, and treatment entry records
  const beneficiaries = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    queryBeneficiaries.forEach(b => map.set(b.id, { id: b.id, name: b.name }))
    storeBeneficiaries.forEach(b => {
      if (!map.has(b.id)) {
        map.set(b.id, { id: b.id, name: b.name })
      }
    })
    rawEntries.forEach(e => {
      if (e.beneficiaryName) {
        const cleanName = e.beneficiaryName.replace(/\s*\([^)]*\)/, '').trim()
        const existing = Array.from(map.values()).find(b => b.name.toLowerCase() === cleanName.toLowerCase())
        if (!existing) {
          map.set(e.beneficiaryName, { id: e.beneficiaryName, name: cleanName })
        }
      }
    })
    return Array.from(map.values())
  }, [queryBeneficiaries, storeBeneficiaries, rawEntries])

  const beneficiaryOptions = useMemo(
    () => [
      { id: undefined, label: 'Everyone' },
      { id: 'self', label: 'Me only' },
      ...beneficiaries.map(b => ({ id: b.id, label: b.name })),
    ],
    [beneficiaries],
  )

  return (
    <AppLayout
      title="Health Ledger"
      status={
        pinExpired
          ? 'PIN expired'
          : !hasPin
            ? 'PIN not set'
            : activeGrants.length > 0
              ? `${activeGrants.length} active access`
              : undefined
      }
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <GGCard padding="24px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: C.navy800 }}>Ledger PIN</span>
                {hasPin ? <GGBadge type="success">Active</GGBadge> : <GGBadge type="warning">{pinExpired ? 'Expired' : 'Not set'}</GGBadge>}
                {hasPin && status?.pinExpiresAt && (
                  <GGBadge type="info">Expires {formatDate(status.pinExpiresAt)}</GGBadge>
                )}
              </div>
              <p style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.7, margin: '10px 0 0' }}>
                {hasPin
                  ? 'Share your PIN with a service provider to give them 24-hour access to your treatment history. Every access is logged and you can revoke it anytime.'
                  : pinExpired
                    ? 'Your ledger PIN has expired. Providers can no longer unlock your treatment history until you create a new PIN.'
                    : 'Create a PIN to control which service providers can view your treatment and diagnosis history across the platform.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <GGButton variant="primary" size="md" onClick={() => navigate(ROUTES.LEDGER_PIN)}>
                {hasPin ? 'Change PIN' : 'Create PIN'}
              </GGButton>
              <GGButton variant="outline" size="md" onClick={() => navigate(ROUTES.LEDGER_ACCESS)}>
                Access log
              </GGButton>
            </div>
          </div>
        </GGCard>

        {activeGrants.length > 0 && (
          <GGCard padding="24px">
            <div style={{ fontSize: 15, fontWeight: 700, color: C.navy800, marginBottom: 4 }}>
              Providers with access right now
            </div>
            <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 14 }}>
              Access expires automatically 24 hours after unlock.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeGrants.map(grant => (
                <div
                  key={grant.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: C.bg,
                    borderRadius: radius.sm,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.navy800 }}>{grant.provider.name}</span>
                      <GGBadge type="navy">{grant.provider.category}</GGBadge>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
                      {timeRemaining(grant.expiresAt)}
                    </div>
                  </div>
                  <GGButton
                    variant="danger"
                    size="sm"
                    onClick={() => revokeGrantMutation.mutate(grant.id)}
                    disabled={revokeGrantMutation.isPending}
                  >
                    Revoke
                  </GGButton>
                </div>
              ))}
            </div>
          </GGCard>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.navy800 }}>Your treatment history</span>
            <Link to={ROUTES.LEDGER_ACCESS} style={{ fontSize: 13, color: C.blue500, fontWeight: 600, textDecoration: 'none' }}>
              Who has viewed this?
            </Link>
          </div>

          {ledgerQuery.isLoading ? (
            <GGCard>
              <div style={{ padding: 24, textAlign: 'center', color: C.textSub, fontSize: 14 }}>Loading your ledger...</div>
            </GGCard>
          ) : (
            <LedgerTimeline
              entries={rawEntries}
              beneficiaryOptions={beneficiaries.length > 0 ? beneficiaryOptions : []}
            />
          )}
        </div>

        <GGDivider margin="4px 0" />
        <p style={{ fontSize: 12, color: C.textLight, lineHeight: 1.7, margin: 0 }}>
          Only providers you share your Ledger PIN with can see this history. Internal provider
          notes are never shared. If you suspect misuse, change your PIN immediately — it revokes
          all active access.
        </p>
      </div>
    </AppLayout>
  )
}
