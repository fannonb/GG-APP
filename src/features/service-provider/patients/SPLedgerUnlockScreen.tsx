import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GGButton, GGCard, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useUnlockLedgerMutation } from '@/hooks/api'
import { ROUTES, route } from '@/router/routes'

type UnlockLocationState = {
  patientId?: string
  patientName?: string
  returnTo?: string
}

export function SPLedgerUnlockScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const unlockMutation = useUnlockLedgerMutation()
  const locationState = (location.state ?? null) as UnlockLocationState | null

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleUnlock = async () => {
    setError('')
    if (!/^\d{4,6}$/.test(pin)) {
      setError('Enter the 4–6 digit ledger PIN shared by the patient')
      return
    }

    try {
      const result = await unlockMutation.mutateAsync({
        pin,
        patientId: locationState?.patientId,
      })
      navigate(route.spPatientLedger(result.patientId), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unlock the ledger')
    }
  }

  return (
    <SPLayout
      title="Unlock Patient Ledger"
      back
    >
      <div style={{ maxWidth: 560, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="28px">
          <div style={{ padding: '14px 16px', background: C.blue100, borderRadius: radius.sm, border: '1px solid rgba(74,173,223,0.2)', fontSize: '13px', color: '#1A5D8A', lineHeight: 1.6, marginBottom: '18px' }}>
            <strong>Patient consent required:</strong> ask the patient for the Ledger PIN from
            their GG'APP dashboard (Health Ledger). Access lasts 24 hours and the patient is
            notified of every unlock.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <GGInput
              label="Ledger PIN"
              type="password"
              value={pin}
              onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="4–6 digit PIN"
              required
            />

            {error && <div style={{ fontSize: '12px', color: C.error, fontWeight: 600 }}>{error}</div>}

            <GGButton
              variant="primary"
              size="md"
              onClick={handleUnlock}
              disabled={unlockMutation.isPending}
            >
              {unlockMutation.isPending ? 'Unlocking...' : 'Unlock Ledger'}
            </GGButton>

            <button
              type="button"
              onClick={() => navigate(locationState?.returnTo ?? ROUTES.SP_PATIENTS)}
              style={{ background: 'none', border: 'none', color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}
            >
              Cancel
            </button>
          </div>
        </GGCard>
      </div>
    </SPLayout>
  )
}
