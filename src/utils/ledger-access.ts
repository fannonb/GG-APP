import type { LedgerGrant } from '@/types/ledger.types'

function timeRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`
}

/** Headline + detail describing which providers can currently read the patient's ledger. */
export function describeLedgerAccess(grants: LedgerGrant[]) {
  const names = grants.map(g => g.provider.name)
  const headline =
    grants.length === 1
      ? `${names[0]} can view your health ledger`
      : `${grants.length} providers can view your health ledger`
  const detail =
    grants.length === 1
      ? `Access expires in ${timeRemaining(grants[0].expiresAt)}. You can revoke it anytime.`
      : `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2} more` : ''}. Access lasts 24 hours per unlock.`
  return { headline, detail }
}

/** "5h left" / "20m left" for an access grant, measured from `now`. */
export function formatTimeLeft(expiresAt: string, now: number) {
  const ms = new Date(expiresAt).getTime() - now
  if (ms <= 0) return 'ending now'
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h left` : `${minutes}m left`
}
