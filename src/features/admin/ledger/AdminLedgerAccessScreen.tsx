import { GGBadge, GGCard } from '@/design-system'
import { C, font } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useAdminLedgerAccess } from '@/hooks/api'
import type { AdminLedgerAccessEvent } from '@/types/ledger.types'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ACTION_META: Record<
  AdminLedgerAccessEvent['action'],
  { label: string; type: 'success' | 'error' | 'primary' | 'default' | 'warning' | 'info' }
> = {
  PIN_CREATED: { label: 'PIN created', type: 'primary' },
  PIN_ROTATED: { label: 'PIN rotated', type: 'primary' },
  PIN_REVOKED: { label: 'PIN revoked', type: 'warning' },
  UNLOCK_SUCCESS: { label: 'Unlocked', type: 'success' },
  UNLOCK_FAILED: { label: 'Unlock failed', type: 'error' },
  LEDGER_VIEWED: { label: 'Ledger viewed', type: 'info' },
  GRANT_REVOKED: { label: 'Grant revoked', type: 'warning' },
  GRANT_EXPIRED: { label: 'Grant expired', type: 'default' },
}

export function AdminLedgerAccessScreen() {
  const accessQuery = useAdminLedgerAccess(100)
  const events = accessQuery.data ?? []

  return (
    <AdminLayout title="Ledger Access">
      <div style={{ maxWidth: 960, fontFamily: font.family }}>
        <GGCard padding="24px">
          <div style={{ fontSize: 15, fontWeight: 700, color: C.navy800, marginBottom: 4 }}>
            Recent ledger activity
          </div>
          <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 18 }}>
            Use this log for dispute resolution. Clinical record contents are never shown here —
            only who accessed which patient&apos;s ledger and when.
          </div>

          {accessQuery.isLoading ? (
            <div style={{ padding: '20px 0', color: C.textSub, fontSize: 14 }}>Loading access log...</div>
          ) : events.length === 0 ? (
            <div style={{ padding: '20px 0', color: C.textSub, fontSize: 14 }}>No ledger access events yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {events.map((event, index) => {
                const meta = ACTION_META[event.action] ?? { label: event.action, type: 'default' as const }
                return (
                  <div
                    key={event.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px, auto) 1fr auto',
                      gap: 14,
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: index < events.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}
                  >
                    <GGBadge type={meta.type}>{meta.label}</GGBadge>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.navy800 }}>
                        {event.patient.name}
                        <span style={{ fontWeight: 500, color: C.textSub }}> · {event.patient.email}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>
                        {event.provider
                          ? `${event.provider.name} (${event.provider.category})`
                          : 'Patient action'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: C.textLight, whiteSpace: 'nowrap' }}>
                      {formatDateTime(event.createdAt)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GGCard>

        <p style={{ fontSize: 12, color: C.textLight, marginTop: 14, lineHeight: 1.6 }}>
          Failed unlock attempts are retained for security monitoring. Repeated failures may
          indicate PIN guessing or unauthorized access attempts.
        </p>
      </div>
    </AdminLayout>
  )
}
