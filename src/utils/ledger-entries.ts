import type { LedgerEntry } from '@/types/ledger.types'

export const VITAL_LABELS: Record<string, string> = {
  bp: 'Blood pressure',
  temp: 'Temperature',
  weight: 'Weight',
  sats: 'Oxygen',
  glucose: 'Blood sugar',
  pulse: 'Pulse',
  height: 'Height',
  bmi: 'BMI',
}

/** A family member's name without the "(Son)" style relation suffix. */
export function ledgerFamilyName(entry: LedgerEntry) {
  return (entry.beneficiaryName ?? '').replace(/\s*\([^)]*\)/, '').trim()
}

/** True when the record belongs to the account holder rather than a family member. */
export function isOwnEntry(entry: LedgerEntry) {
  const name = ledgerFamilyName(entry).toLowerCase()
  return !name || name === 'self' || name === 'me'
}

/** The thing that happened: a diagnosis for a visit, the medicine for a prescription. */
export function ledgerHeadline(entry: LedgerEntry) {
  if (entry.kind === 'visit') return entry.diagnosis || entry.service || entry.services[0] || 'Visit'
  if (entry.items.length === 0) return 'Prescription'
  const extra = entry.items.length - 1
  return extra > 0 ? `${entry.items[0].name} +${extra} more` : entry.items[0].name
}

export type LedgerBeneficiaryOption = {
  id: string | undefined
  label: string
}

/** Whether a record belongs to the person picked in the people filter ('self' = the account holder). */
export function matchesLedgerPerson(entry: LedgerEntry, filter: string | undefined, options: LedgerBeneficiaryOption[]) {
  if (!filter) return true
  if (filter === 'self') return isOwnEntry(entry)
  if (isOwnEntry(entry)) return false
  const target = (options.find(option => option.id === filter)?.label ?? filter).replace(/\s*\([^)]*\)/, '').toLowerCase().trim()
  const name = ledgerFamilyName(entry).toLowerCase()
  return name.includes(target) || target.includes(name)
}
