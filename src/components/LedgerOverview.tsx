import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { VITAL_LABELS, isOwnEntry, vitalWithUnit } from '@/utils/ledger-entries'
import type { LedgerEntry } from '@/types/ledger.types'

type VisitEntry = Extract<LedgerEntry, { kind: 'visit' }>
type RxEntry = Extract<LedgerEntry, { kind: 'prescription' }>

const RECENT_DAYS = 90
const MAX_MEDICINES = 5

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const fullDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function CardHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>{title}</h2>
      {note && <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{note}</div>}
    </div>
  )
}

/**
 * The account holder's record at a glance: the latest vitals (with the reading before each,
 * so a change is visible) and the medicines from the last 90 days. Family members' records
 * are left out because their vitals are not the patient's.
 */
export function LedgerOverview({ entries, now }: { entries: LedgerEntry[]; now: number }) {
  const { isMobile, isDesktop } = useResponsive()
  const own = entries.filter(isOwnEntry).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const visitsWithVitals = own.filter((entry): entry is VisitEntry => entry.kind === 'visit' && Object.values(entry.vitals).some(Boolean))
  const latest = visitsWithVitals[0]

  const vitals = latest
    ? Object.entries(latest.vitals).filter(([, value]) => value).map(([key, value]) => {
        const before = visitsWithVitals.slice(1).find(visit => visit.vitals[key])
        return { key, ...vitalWithUnit(key, value), before: before ? { value: before.vitals[key], date: before.date } : null }
      })
    : []

  const medicines: Array<{ name: string; date: string }> = []
  for (const entry of own) {
    if (entry.kind !== 'prescription' || now - new Date(entry.date).getTime() > RECENT_DAYS * 86_400_000) continue
    for (const item of (entry as RxEntry).items) {
      if (!medicines.some(m => m.name.toLowerCase() === item.name.toLowerCase())) medicines.push({ name: item.name, date: entry.date })
    }
  }
  const shownMedicines = medicines.slice(0, MAX_MEDICINES)

  if (!latest && medicines.length === 0) return null
  const both = Boolean(latest) && medicines.length > 0

  return (
    <section aria-label="At a glance" style={{ display: 'grid', gridTemplateColumns: isDesktop && both ? 'minmax(0, 1.75fr) minmax(0, 1fr)' : '1fr', gap: 16, fontFamily: font.family }}>
      {latest && (
        <GGCard padding={isMobile ? '16px' : '18px 20px'} style={{ height: '100%', boxSizing: 'border-box' }}>
          <CardHeading title="Latest vitals" note={`${fullDate(latest.date)} · ${latest.provider.name}`} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {vitals.map(vital => (
              <div key={vital.key} style={{ background: '#F4F8FC', borderRadius: radius.md, padding: '12px 14px', minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: C.textSub }}>{VITAL_LABELS[vital.key] ?? vital.key}</div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>{vital.value}</span>
                  {vital.unit && <span style={{ fontSize: 12.5, fontWeight: 600, color: C.textSub }}>{vital.unit}</span>}
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {vital.before ? `Before: ${vital.before.value} · ${dayMonth(vital.before.date)}` : 'First reading'}
                </div>
              </div>
            ))}
          </div>
        </GGCard>
      )}

      {medicines.length > 0 && (
        <GGCard padding={isMobile ? '16px' : '18px 20px'} style={{ height: '100%', boxSizing: 'border-box' }}>
          <CardHeading title="Recent medicines" note={`Last ${RECENT_DAYS} days`} />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {shownMedicines.map((medicine, index) => (
              <li key={medicine.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderTop: index > 0 ? `1px solid ${C.border}` : 'none', fontSize: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: radius.full, background: '#16A34A', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={medicine.name}>{medicine.name}</span>
                </span>
                <span style={{ fontSize: 13, color: C.textSub, whiteSpace: 'nowrap' }}>{dayMonth(medicine.date)}</span>
              </li>
            ))}
          </ul>
          {medicines.length > MAX_MEDICINES && (
            <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6 }}>and {medicines.length - MAX_MEDICINES} more in the records below</div>
          )}
        </GGCard>
      )}
    </section>
  )
}
