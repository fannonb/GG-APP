import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useLedgerAccessLog, useLedgerStatus, useRevokeLedgerGrantMutation, useRevokeLedgerPinMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { font } from '@/design-system/tokens'
import { ROUTES } from '@/router/routes'
import { LedgerPrivacyOverview } from './components/LedgerPrivacyOverview'
import { LedgerActivityFeed } from './components/LedgerActivityFeed'
import { ActiveAccessCard, LedgerPinCard, LedgerSafetyCard } from './components/LedgerAccessCards'

export function LedgerAccessScreen() {
  const navigate = useNavigate()
  const { isDesktop } = useResponsive()
  const statusQuery = useLedgerStatus()
  const accessQuery = useLedgerAccessLog()
  const revokeGrant = useRevokeLedgerGrantMutation()
  const revokePin = useRevokeLedgerPinMutation()
  const [now] = useState(() => Date.now())

  const status = statusQuery.data
  const hasPin = status?.hasPin ?? false
  const pinExpired = status?.pinExpired ?? false
  const events = accessQuery.data?.events ?? []
  const activeGrants = (accessQuery.data?.grants ?? []).filter(grant => grant.status === 'active')
  const since = now - 30 * 86_400_000
  const recent = events.filter(event => new Date(event.createdAt).getTime() >= since)
  const views30d = recent.filter(event => event.action === 'LEDGER_VIEWED' || event.action === 'UNLOCK_SUCCESS').length
  const failedAttempts30d = recent.filter(event => event.action === 'UNLOCK_FAILED').length
  const endingId = revokeGrant.isPending ? (revokeGrant.variables ?? null) : null

  const overview = (
    <LedgerPrivacyOverview hasPin={hasPin} pinExpired={pinExpired} activeCount={activeGrants.length} views30d={views30d} failedAttempts30d={failedAttempts30d} />
  )
  const access = <ActiveAccessCard grants={activeGrants} now={now} onEnd={id => revokeGrant.mutate(id)} endingId={endingId} />
  const pin = (
    <LedgerPinCard
      // Remount when the PIN turns off or on, so the card's "are you sure" prompt closes.
      key={hasPin && !pinExpired ? 'pin-on' : 'pin-off'}
      status={status}
      onChangePin={() => navigate(ROUTES.LEDGER_PIN)}
      onTurnOff={() => revokePin.mutate(undefined)}
      turningOff={revokePin.isPending}
    />
  )
  const activity = <LedgerActivityFeed events={events} now={now} isLoading={accessQuery.isLoading} />
  const safety = <LedgerSafetyCard />

  return (
    <AppLayout title="Ledger access" back>
      <div style={{ maxWidth: 1120, margin: '0 auto', fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {overview}
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(300px, 1fr)', gap: 16, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              {access}
              {activity}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, position: 'sticky', top: 16 }}>
              {pin}
              {safety}
            </div>
          </div>
        ) : (
          <>
            {access}
            {pin}
            {activity}
            {safety}
          </>
        )}
      </div>
    </AppLayout>
  )
}
