import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { PinInput } from '@/components/PinInput'
import { useUnlockLedgerMutation } from '@/hooks/api'
import { ROUTES, route } from '@/router/routes'

type UnlockLocationState = {
  patientId?: string
  patientName?: string
  returnTo?: string
}

const CYAN_DEEP = '#0B7BC0'

export function SPLedgerUnlockScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const unlockMutation = useUnlockLedgerMutation()
  const state = (location.state ?? null) as UnlockLocationState | null
  const patient = state?.patientName?.split(' ')[0] ?? 'the patient'

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleUnlock = async () => {
    setError('')
    if (!/^\d{4,6}$/.test(pin)) {
      setError('Enter the 4 to 6 digit PIN the patient gave you')
      return
    }
    try {
      const result = await unlockMutation.mutateAsync({ pin, patientId: state?.patientId })
      navigate(route.spPatientLedger(result.patientId), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That PIN didn’t work. Check it with the patient and try again.')
    }
  }

  return (
    <SPLayout title="Open health history" back>
      <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="26px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span aria-hidden style={{ width: 44, height: 44, borderRadius: radius.full, background: C.blue100, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>
                {state?.patientName ? `${state.patientName}’s health history` : 'Patient health history'}
              </h2>
              <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>Ask {patient} for their Ledger PIN.</div>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <PinInput label="Ledger PIN" value={pin} onChange={value => { setPin(value); setError('') }} error={error} autoFocus onEnter={() => void handleUnlock()} />
          </div>

          <div style={{ marginTop: 16, fontSize: 12.5, color: C.textSub, lineHeight: 1.6 }}>
            You’ll have access for 24 hours. The patient sees every time you open their history and can end your access early.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20 }}>
            <GGButton variant="primary" size="md" fullWidth onClick={() => void handleUnlock()} disabled={unlockMutation.isPending}>
              {unlockMutation.isPending ? 'Opening…' : 'Open history'}
            </GGButton>
            <button
              type="button"
              onClick={() => navigate(state?.returnTo && state.patientId ? route.spPatient(state.patientId) : ROUTES.SP_PATIENTS)}
              style={{ background: 'none', border: 'none', padding: 10, color: C.textSub, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}
            >
              Cancel
            </button>
          </div>
        </GGCard>
      </div>
    </SPLayout>
  )
}
