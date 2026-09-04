import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGBadge, GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { LedgerTimeline } from '@/components/LedgerTimeline'
import { useSPPatientLedger } from '@/hooks/api'
import { ApiError } from '@/api/types'
import { ROUTES, route } from '@/router/routes'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SPPatientLedgerScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ledgerQuery = useSPPatientLedger(id)

  const needsUnlock =
    (ledgerQuery.error instanceof ApiError && ledgerQuery.error.status === 403) ||
    ((ledgerQuery.error as unknown as { status?: number })?.status === 403) ||
    ((ledgerQuery.error as unknown as { statusCode?: number })?.statusCode === 403) ||
    (ledgerQuery.error instanceof Error && ledgerQuery.error.message.toLowerCase().includes('ledger pin'))
  const rawEntries = useMemo(() => ledgerQuery.data?.entries ?? [], [ledgerQuery.data?.entries])
  const queryBeneficiaries = useMemo(
    () => ledgerQuery.data?.patient.beneficiaries ?? [],
    [ledgerQuery.data?.patient.beneficiaries],
  )

  const beneficiaries = useMemo(() => {
    const map = new Map<string, { id: string; name: string; relation?: string }>()
    queryBeneficiaries.forEach(b => map.set(b.id, { id: b.id, name: b.name, relation: b.relation }))
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
  }, [queryBeneficiaries, rawEntries])

  const beneficiaryOptions = useMemo(
    () => [
      { id: undefined, label: 'Everyone' },
      { id: 'self', label: 'Patient only' },
      ...beneficiaries.map(b => ({
        id: b.id,
        label: b.relation ? `${b.name} (${b.relation})` : b.name,
      })),
    ],
    [beneficiaries],
  )

  return (
    <SPLayout title="Patient Health Ledger" back>
      <div style={{ maxWidth: 1120, margin: '0 auto', fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {ledgerQuery.isLoading && (
          <GGCard>
            <div style={{ padding: 24, textAlign: 'center', color: C.textSub, fontSize: 14 }}>Loading ledger...</div>
          </GGCard>
        )}

        {needsUnlock && (
          <GGCard padding="32px">
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.full,
                  background: C.blue100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="10" width="16" height="10" rx="2" stroke={C.navy800} strokeWidth="1.8" />
                  <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke={C.navy800} strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.navy800 }}>Ledger locked</div>
              <p style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.7, maxWidth: 420, margin: 0 }}>
                {ledgerQuery.error instanceof Error
                  ? ledgerQuery.error.message
                  : 'Ask the patient to share their Ledger PIN, then unlock the ledger to view their full treatment history.'}
              </p>
              <GGButton
                variant="primary"
                size="md"
                onClick={() =>
                  navigate(ROUTES.SP_LEDGER_UNLOCK, {
                    state: {
                      patientId: id,
                      returnTo: id ? route.spPatientLedger(id) : undefined,
                    },
                  })
                }
              >
                Unlock with patient PIN
              </GGButton>
            </div>
          </GGCard>
        )}

        {ledgerQuery.isError && !needsUnlock && (
          <GGCard>
            <div style={{ padding: 24, textAlign: 'center', color: C.error, fontSize: 14 }}>
              {ledgerQuery.error instanceof Error ? ledgerQuery.error.message : 'Unable to load the ledger'}
            </div>
          </GGCard>
        )}

        {ledgerQuery.data && (
          <>
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 8,
                background: C.bg,
                paddingBottom: 4,
              }}
            >
              <GGCard padding="16px 20px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: C.navy800 }}>{ledgerQuery.data.patient.name}</div>
                      <GGBadge type="success">Ledger unlocked</GGBadge>
                    </div>
                    <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 4 }}>
                      {beneficiaries.length > 0
                        ? `Patient + ${beneficiaries.length} ${beneficiaries.length === 1 ? 'beneficiary' : 'beneficiaries'}`
                        : 'Patient only'}
                      {ledgerQuery.data.grant ? ` · Access until ${formatDateTime(ledgerQuery.data.grant.expiresAt)}` : ''}
                    </div>
                  </div>
                  <GGButton variant="outline" size="sm" onClick={() => navigate(route.spPatient(id!))}>
                    Patient profile
                  </GGButton>
                </div>
              </GGCard>
            </div>

            <LedgerTimeline
              entries={rawEntries}
              beneficiaryOptions={beneficiaries.length > 0 ? beneficiaryOptions : []}
              emptyMessage="No treatment history recorded for this patient yet."
            />

            <p style={{ fontSize: 12, color: C.textLight, lineHeight: 1.7, margin: 0 }}>
              This history was shared by the patient via their Ledger PIN. Internal provider notes
              are never included. Handle this information in line with patient confidentiality
              obligations.
            </p>
          </>
        )}
      </div>
    </SPLayout>
  )
}
