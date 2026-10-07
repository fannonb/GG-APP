import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LedgerEntry } from '@/types/ledger.types'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { route } from '@/router/routes'
import { VITAL_LABELS, isOwnEntry, ledgerFamilyName, ledgerHeadline, matchesLedgerPerson, type LedgerBeneficiaryOption } from '@/utils/ledger-entries'

export type { LedgerBeneficiaryOption }

type KindFilter = 'all' | 'visit' | 'prescription'
type DateFilter = 'all' | '30d' | '6m' | '12m'
type VisitEntry = Extract<LedgerEntry, { kind: 'visit' }>
type RxEntry = Extract<LedgerEntry, { kind: 'prescription' }>

const CYAN_DEEP = '#0B7BC0'
const GREEN = '#15803D'
const RAIL = 40

const entryKey = (entry: LedgerEntry) => `${entry.kind}-${entry.id}`

function subLine(entry: LedgerEntry) {
  if (entry.kind === 'visit') {
    const what = entry.diagnosis && entry.service ? entry.service : 'Visit'
    return `${what} · ${entry.provider.name}`
  }
  return `${entry.fulfillmentMode === 'DELIVERY' ? 'Delivered' : 'Collected'} · ${entry.provider.name}`
}

function searchText(entry: LedgerEntry) {
  const parts = [ledgerHeadline(entry), entry.provider.name, entry.provider.category, entry.beneficiaryName]
  if (entry.kind === 'visit') {
    parts.push(entry.diagnosis, entry.treatment, entry.followUp, entry.service, ...entry.services, entry.appointmentRef)
  } else {
    parts.push(entry.reference, ...entry.items.map(item => item.name))
  }
  return parts.filter(Boolean).join(' ').toLowerCase()
}

function withinPeriod(iso: string, filter: DateFilter, now: number) {
  if (filter === 'all') return true
  const time = new Date(iso).getTime()
  if (isNaN(time)) return true
  const days = filter === '30d' ? 30 : filter === '6m' ? 182 : 365
  return now - time <= days * 86_400_000
}

const fmt = (iso: string, options: Intl.DateTimeFormatOptions) => {
  const date = new Date(iso)
  return isNaN(date.getTime()) ? iso : date.toLocaleString('en-GB', options)
}

function KindIcon({ kind }: { kind: LedgerEntry['kind'] }) {
  return kind === 'visit' ? (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 2.5v4a3.5 3.5 0 007 0v-4M4 2.5H3M11 2.5h1M7.5 10v1.5a4 4 0 008 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="15.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2.2" y="6.4" width="13.6" height="5.2" rx="2.6" transform="rotate(-45 9 9)" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.6 6.6l4.8 4.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

function VisitBody({ entry }: { entry: VisitEntry }) {
  const vitals = Object.entries(entry.vitals).filter(([, value]) => value)
  return (
    <>
      {entry.treatment && <Field label="Treatment" wide>{entry.treatment}</Field>}
      {vitals.length > 0 && (
        <Field label="Vitals" wide>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {vitals.map(([key, value]) => (
              <span key={key} style={{ fontSize: 13, padding: '5px 10px', borderRadius: radius.full, background: C.bg, color: C.textSub, whiteSpace: 'nowrap' }}>
                {VITAL_LABELS[key] ?? key} <strong style={{ color: C.text, fontWeight: 700 }}>{value}</strong>
              </span>
            ))}
          </div>
        </Field>
      )}
      {entry.services.length > 0 && <Field label="Services">{entry.services.join(', ')}</Field>}
      {entry.followUp && <Field label="Follow-up">{entry.followUp}</Field>}
      {entry.appointmentRef && <Field label="Appointment">{entry.appointmentRef}</Field>}
    </>
  )
}

function PrescriptionBody({ entry, viewer }: { entry: RxEntry; viewer: 'patient' | 'provider' }) {
  return (
    <>
      <Field label="Medicines" wide>
        {entry.items.length === 0 ? (
          <span style={{ color: C.textSub }}>No items were listed.</span>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, marginTop: 2 }}>
            {entry.items.map((item, index) => (
              <div key={`${item.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 12px', borderTop: index > 0 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                {item.quantity && <span style={{ color: C.textSub, whiteSpace: 'nowrap' }}>{item.quantity}</span>}
              </div>
            ))}
          </div>
        )}
      </Field>
      <Field label="Reference">
        {entry.reference}
        {viewer === 'patient' && (
          <Link to={route.patientPrescription(entry.reference)} style={{ marginLeft: 10, fontWeight: 700, color: CYAN_DEEP, textDecoration: 'none' }}>
            View order
          </Link>
        )}
      </Field>
    </>
  )
}

function TimelineItem({ entry, open, onToggle, last, viewer }: { entry: LedgerEntry; open: boolean; onToggle: () => void; last: boolean; viewer: 'patient' | 'provider' }) {
  const { isMobile } = useResponsive()
  const visit = entry.kind === 'visit'
  const tint = visit ? { fg: CYAN_DEEP, bg: C.blue100 } : { fg: GREEN, bg: '#DCFCE7' }
  const panelId = `ledger-${entryKey(entry)}`
  // Centre the node on the collapsed header row.
  const nodeTop = isMobile ? 11 : 15
  return (
    <li style={{ position: 'relative', display: 'flex', gap: isMobile ? 12 : 14, paddingBottom: last ? 0 : 12 }}>
      {/* Rail: one node per record, joined by a thin line. */}
      <div style={{ position: 'relative', width: RAIL, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {!last && <span aria-hidden style={{ position: 'absolute', top: nodeTop + RAIL + 4, bottom: -nodeTop + 2, width: 2, background: '#D6E2EF' }} />}
        <span aria-hidden style={{ position: 'relative', marginTop: nodeTop, width: RAIL, height: RAIL, borderRadius: radius.full, background: tint.bg, color: tint.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <KindIcon kind={entry.kind} />
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0, background: '#fff', border: `1px solid ${open ? 'rgba(11,123,192,0.35)' : C.border}`, borderRadius: radius.lg, boxShadow: open ? '0 6px 18px rgba(13,30,66,0.06)' : 'none', overflow: 'hidden' }}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '12px 14px' : '14px 18px', cursor: 'pointer', fontFamily: font.family }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ledgerHeadline(entry)}</span>
              {!isOwnEntry(entry) && (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.10)', padding: '2px 8px', borderRadius: radius.full, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {ledgerFamilyName(entry).split(' ')[0]}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fmt(entry.date, { day: 'numeric', month: 'short' })} · {subLine(entry)}
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, color: C.textLight, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div
            id={panelId}
            style={{
              borderTop: `1px solid ${C.border}`,
              padding: isMobile ? 14 : '16px 18px 18px',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '14px 24px',
              fontFamily: font.family,
            }}
          >
            {visit ? <VisitBody entry={entry} /> : <PrescriptionBody entry={entry} viewer={viewer} />}
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: C.textLight }}>
              {fmt(entry.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {!isOwnEntry(entry) ? ` · for ${ledgerFamilyName(entry)}` : ''}
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

const controlStyle: React.CSSProperties = {
  height: 40,
  padding: '0 12px',
  fontSize: 14,
  fontFamily: font.family,
  color: C.text,
  background: '#fff',
  border: `1px solid ${C.border}`,
  borderRadius: radius.sm,
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: Array<{ id: T; label: string; count: number }> }) {
  return (
    <div role="tablist" style={{ display: 'inline-flex', padding: 3, gap: 2, background: '#E3ECF6', borderRadius: radius.sm, flexShrink: 0 }}>
      {options.map(option => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            style={{
              height: 34,
              padding: '0 12px',
              border: 'none',
              borderRadius: 7,
              background: active ? '#fff' : 'transparent',
              boxShadow: active ? '0 1px 3px rgba(13,30,66,0.12)' : 'none',
              color: active ? C.text : C.textSub,
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: font.family,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {option.label} <span style={{ fontWeight: 600, color: active ? CYAN_DEEP : C.textLight }}>{option.count}</span>
          </button>
        )
      })}
    </div>
  )
}

export function LedgerTimeline({
  entries,
  emptyMessage,
  beneficiaryOptions = [],
  viewer = 'patient',
  person: controlledPerson,
  onPersonChange,
}: {
  entries: LedgerEntry[]
  emptyMessage?: string
  beneficiaryOptions?: LedgerBeneficiaryOption[]
  /** Patients get links to their own orders; providers see the same record read-only. */
  viewer?: 'patient' | 'provider'
  /** Pass both to drive the people filter from outside (e.g. a sidebar); otherwise a dropdown is shown. */
  person?: string
  onPersonChange?: (person: string | undefined) => void
}) {
  const { isMobile } = useResponsive()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [period, setPeriod] = useState<DateFilter>('all')
  const [ownPerson, setOwnPerson] = useState<string | undefined>(undefined)
  // undefined = nothing chosen yet, so the newest record starts open.
  const [openKey, setOpenKey] = useState<string | null | undefined>(undefined)
  const [now] = useState(() => Date.now())

  const controlled = onPersonChange !== undefined
  const person = controlled ? controlledPerson : ownPerson
  const setPerson = controlled ? onPersonChange : setOwnPerson

  const narrowed = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries
      .filter(entry => matchesLedgerPerson(entry, person, beneficiaryOptions))
      .filter(entry => withinPeriod(entry.date, period, now))
      .filter(entry => !needle || searchText(entry).includes(needle))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [entries, person, beneficiaryOptions, period, now, query])

  const visible = useMemo(() => (kind === 'all' ? narrowed : narrowed.filter(entry => entry.kind === kind)), [narrowed, kind])

  const groups = useMemo(() => {
    const out: Array<{ key: string; label: string; items: LedgerEntry[] }> = []
    for (const entry of visible) {
      const date = new Date(entry.date)
      const key = isNaN(date.getTime()) ? 'unknown' : `${date.getFullYear()}-${date.getMonth()}`
      const last = out[out.length - 1]
      if (last?.key === key) last.items.push(entry)
      else out.push({ key, label: isNaN(date.getTime()) ? 'Unknown date' : fmt(entry.date, { month: 'long', year: 'numeric' }), items: [entry] })
    }
    return out
  }, [visible])

  const currentOpen = openKey === undefined ? (visible[0] ? entryKey(visible[0]) : null) : openKey
  const filtersOn = Boolean(query.trim()) || period !== 'all' || Boolean(person) || kind !== 'all'

  if (entries.length === 0) {
    return (
      <GGCard padding="36px 20px">
        <div style={{ textAlign: 'center', fontFamily: font.family }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>No records yet</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 1.6 }}>
            {emptyMessage ?? 'Visits and prescriptions from GG’APP providers will appear here automatically.'}
          </div>
        </div>
      </GGCard>
    )
  }

  return (
    <div style={{ fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { id: 'all', label: 'All', count: narrowed.length },
            { id: 'visit', label: 'Visits', count: narrowed.filter(entry => entry.kind === 'visit').length },
            { id: 'prescription', label: isMobile ? 'Meds' : 'Prescriptions', count: narrowed.filter(entry => entry.kind === 'prescription').length },
          ]}
        />
        <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1 1 200px', minWidth: 0, order: isMobile ? 3 : 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2.2" strokeLinecap="round" aria-hidden style={{ position: 'absolute', left: 12, top: 12 }}>
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            aria-label="Search records"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search records"
            style={{ ...controlStyle, cursor: 'text', width: '100%', paddingLeft: 36 }}
          />
        </div>
        <select aria-label="Period" value={period} onChange={event => setPeriod(event.target.value as DateFilter)} style={{ ...controlStyle, flex: isMobile ? 1 : 'none' }}>
          <option value="all">Any time</option>
          <option value="30d">Last 30 days</option>
          <option value="6m">Last 6 months</option>
          <option value="12m">Last 12 months</option>
        </select>
        {!controlled && beneficiaryOptions.length > 0 && (
          <select aria-label="Person" value={person ?? ''} onChange={event => setPerson(event.target.value || undefined)} style={{ ...controlStyle, flex: isMobile ? 1 : 'none' }}>
            {beneficiaryOptions.map(option => <option key={option.id ?? 'all'} value={option.id ?? ''}>{option.label}</option>)}
          </select>
        )}
      </div>

      {visible.length === 0 ? (
        <GGCard padding="28px 16px">
          <div style={{ textAlign: 'center', fontSize: 14, color: C.textSub }}>
            Nothing matches.
            {filtersOn && (
              <button
                type="button"
                onClick={() => { setQuery(''); setPeriod('all'); setKind('all'); setPerson(undefined) }}
                style={{ marginLeft: 6, background: 'none', border: 'none', padding: 0, color: CYAN_DEEP, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: font.family }}
              >
                Show everything
              </button>
            )}
          </div>
        </GGCard>
      ) : (
        groups.map(group => (
          <section key={group.key} aria-label={group.label}>
            <h3 style={{ margin: `0 0 10px ${RAIL + (isMobile ? 12 : 14)}px`, fontSize: 13, fontWeight: 700, color: C.textSub }}>{group.label}</h3>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {group.items.map((entry, index) => {
                const key = entryKey(entry)
                return (
                  <TimelineItem
                    key={key}
                    entry={entry}
                    viewer={viewer}
                    open={currentOpen === key}
                    last={index === group.items.length - 1}
                    onToggle={() => setOpenKey(currentOpen === key ? null : key)}
                  />
                )
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  )
}
