import { GGBadge, GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useLedgerAccessLog, useRevokeLedgerGrantMutation } from '@/hooks/api'
import type { LedgerAccessEvent } from '@/types/ledger.types'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const EVENT_LABELS: Record<LedgerAccessEvent['action'], { label: string; type: 'success' | 'error' | 'primary' | 'default' | 'warning' }> = {
  PIN_CREATED: { label: 'You created a ledger PIN', type: 'primary' },
  PIN_ROTATED: { label: 'You changed your ledger PIN', type: 'primary' },
  PIN_REVOKED: { label: 'You revoked your ledger PIN', type: 'warning' },
  UNLOCK_SUCCESS: { label: 'Unlocked your ledger', type: 'success' },
  UNLOCK_FAILED: { label: 'Failed unlock attempt', type: 'error' },
  LEDGER_VIEWED: { label: 'Viewed your ledger', type: 'default' },
  GRANT_REVOKED: { label: 'Access revoked', type: 'warning' },
  GRANT_EXPIRED: { label: 'Access expired', type: 'default' },
}

const GRANT_STATUS_BADGE: Record<string, { label: string; type: 'success' | 'error' | 'default' }> = {
  active: { label: 'Active', type: 'success' },
  expired: { label: 'Expired', type: 'default' },
  revoked: { label: 'Revoked', type: 'error' },
}

export function LedgerAccessScreen() {
  const accessQuery = useLedgerAccessLog()
  const revokeGrantMutation = useRevokeLedgerGrantMutation()

  const grants = accessQuery.data?.grants ?? []
  const events = accessQuery.data?.events ?? []

  return (
    <AppLayout
      title="Ledger Access Log"
      subtitle="Every provider who has unlocked or viewed your health ledger"
      back
    >
      <div style={{ maxWidth: 760, margin: '0 auto', fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <GGCard padding="24px">
          <div style={{ fontSize: 15, fontWeight: 700, color: C.navy800, marginBottom: 14 }}>Access grants</div>
          {grants.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.textSub, padding: '8px 0' }}>
              No provider has unlocked your ledger yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grants.map(grant => {
                const badge = GRANT_STATUS_BADGE[grant.status]
                return (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.navy800 }}>{grant.provider.name}</span>
                        <GGBadge type={badge.type}>{badge.label}</GGBadge>
                      </div>
                      <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
                        Unlocked {formatDateTime(grant.unlockedAt)}
                        {grant.status !== 'revoked' ? ` · expires ${formatDateTime(grant.expiresAt)}` : ''}
                      </div>
                    </div>
                    {grant.status === 'active' && (
                      <GGButton
                        variant="danger"
                        size="sm"
                        onClick={() => revokeGrantMutation.mutate(grant.id)}
                        disabled={revokeGrantMutation.isPending}
                      >
                        Revoke
                      </GGButton>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </GGCard>

        <GGCard padding="24px">
          <div style={{ fontSize: 15, fontWeight: 700, color: C.navy800, marginBottom: 14 }}>Activity</div>
          {events.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.textSub, padding: '8px 0' }}>No ledger activity yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {events.map((event, index) => {
                const meta = EVENT_LABELS[event.action] ?? { label: event.action, type: 'default' as const }
                return (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: index < events.length - 1 ? `1px solid ${C.border}` : 'none',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <GGBadge type={meta.type}>{meta.label}</GGBadge>
                      {event.provider && (
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{event.provider.name}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: C.textLight }}>{formatDateTime(event.createdAt)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </GGCard>
      </div>
    </AppLayout>
  )
}
