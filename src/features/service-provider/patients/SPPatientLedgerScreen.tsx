import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { LedgerTimeline } from '@/components/LedgerTimeline'
import { useSPPatient, useSPPatientLedger } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { ApiError } from '@/api/types'
import { ROUTES, route } from '@/router/routes'
import { formatTimeLeft } from '@/utils/ledger-access'
import { isOwnEntry } from '@/utils/ledger-entries'

const CYAN_DEEP = '#0B7BC0'

function isLockedError(error: unknown) {
  if (!error) return false
  const status = (error as { status?: number; statusCode?: number }).status ?? (error as { statusCode?: number }).statusCode
  return (error instanceof ApiError && error.status === 403)
    || status === 403
    || (error instanceof Error && error.message.toLowerCase().includes('ledger pin'))
}

export function SPPatientLedgerScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const ledgerQuery = useSPPatientLedger(id)
  const patientQuery = useSPPatient(id)
  const [now] = useState(() => Date.now())

  const locked = isLockedError(ledgerQuery.error)
  const ledger = ledgerQuery.data
  const patientName = ledger?.patient.name ?? patientQuery.data?.name
  const entries = useMemo(() => ledger?.entries ?? [], [ledger?.entries])

  const personOptions = useMemo(() => {
    const family = new Map<string, { id: string; label: string }>()
    ;(ledger?.patient.beneficiaries ?? []).forEach(b => family.set(b.name.toLowerCase(), { id: b.id, label: `${b.name} (${b.relation})` }))
    entries.forEach(entry => {
      if (isOwnEntry(entry) || !entry.beneficiaryName) return
      const clean = entry.beneficiaryName.replace(/\s*\([^)]*\)/, '').trim()
      if (!family.has(clean.toLowerCase())) family.set(clean.toLowerCase(), { id: entry.beneficiaryName, label: entry.beneficiaryName })
    })
    if (family.size === 0) return []
    return [{ id: undefined, label: 'Everyone' }, { id: 'self', label: patientName?.split(' ')[0] ?? 'Patient only' }, ...family.values()]
  }, [ledger?.patient.beneficiaries, entries, patientName])

  const openUnlock = () => navigate(ROUTES.SP_LEDGER_UNLOCK, { state: { patientId: id, patientName, returnTo: id ? route.spPatientLedger(id) : undefined } })

  return (
    <SPLayout title="Health history" back>
      <div style={{ maxWidth: 1120, margin: '0 auto', fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {ledgerQuery.isLoading && (
          <GGCard padding="24px"><div style={{ textAlign: 'center', color: C.textSub, fontSize: 14 }}>Loading history…</div></GGCard>
        )}

        {locked && (
          <GGCard padding="32px 24px">
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <span aria-hidden style={{ width: 52, height: 52, borderRadius: radius.full, background: C.blue100, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>
                {patientName ? `${patientName}’s history is private` : 'This history is private'}
              </h2>
              <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6, maxWidth: 400, margin: 0 }}>
                Ask the patient for their Ledger PIN. It gives you 24 hours to see their past visits and prescriptions.
              </p>
              <div style={{ marginTop: 6 }}>
                <GGButton variant="primary" size="md" onClick={openUnlock}>Enter Ledger PIN</GGButton>
              </div>
            </div>
          </GGCard>
        )}

        {ledgerQuery.isError && !locked && (
          <GGCard padding="24px">
            <div style={{ textAlign: 'center', color: C.error, fontSize: 14 }}>
              {ledgerQuery.error instanceof Error ? ledgerQuery.error.message : 'We couldn’t load this history.'}
            </div>
          </GGCard>
        )}

        {ledger && (
          <>
            <GGCard padding={isMobile ? '16px' : '18px 20px'}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>{ledger.patient.name}</h2>
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 3 }}>
                    {entries.length} {entries.length === 1 ? 'record' : 'records'}
                    {ledger.grant && (
                      <> · <span style={{ color: CYAN_DEEP, fontWeight: 700 }}>Access {formatTimeLeft(ledger.grant.expiresAt, now)}</span></>
                    )}
                  </div>
                </div>
                <GGButton variant="secondary" size="sm" fullWidth={isMobile} onClick={() => navigate(route.spPatient(id!))}>
                  Patient profile
                </GGButton>
              </div>
            </GGCard>

            <LedgerTimeline
              entries={entries}
              beneficiaryOptions={personOptions}
              viewer="provider"
              emptyMessage="This patient has no visits or prescriptions on GG’APP yet."
            />

            <p style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.6, margin: '0 4px' }}>
              Shared by the patient with their Ledger PIN. Other providers’ private notes are not included. Treat this information as confidential.
            </p>
          </>
        )}
      </div>
    </SPLayout>
  )
}
