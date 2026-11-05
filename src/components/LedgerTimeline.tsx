import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LedgerEntry } from '@/types/ledger.types'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { route } from '@/router/routes'
import { Pager, usePaged } from '@/components/paging'
import { VITAL_LABELS, isOwnEntry, ledgerFamilyName, ledgerHeadline, matchesLedgerPerson, vitalWithUnit, type LedgerBeneficiaryOption } from '@/utils/ledger-entries'

export type { LedgerBeneficiaryOption }

type KindFilter = 'all' | 'visit' | 'prescription'
type DateFilter = 'all' | '30d' | '6m' | '12m'
type Viewer = 'patient' | 'provider'
type VisitEntry = Extract<LedgerEntry, { kind: 'visit' }>
type RxEntry = Extract<LedgerEntry, { kind: 'prescription' }>

const CYAN_DEEP = '#0B7BC0'
const GREEN = '#15803D'
const SELECTED_BG = '#EEF7FE'
const KIND = {
  visit: { label: 'Visit', fg: CYAN_DEEP, bg: C.blue100 },
  prescription: { label: 'Prescription', fg: GREEN, bg: '#DCFCE7' },
} as const

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

const prettyCategory = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, ' ') : '')

function KindIcon({ kind, size = 16 }: { kind: LedgerEntry['kind']; size?: number }) {
  return kind === 'visit' ? (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 2.5v4a3.5 3.5 0 007 0v-4M4 2.5H3M11 2.5h1M7.5 10v1.5a4 4 0 008 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="15.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2.2" y="6.4" width="13.6" height="5.2" rx="2.6" transform="rotate(-45 9 9)" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.6 6.6l4.8 4.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

const FAMILY = '#6D28D9'

/** Whose record this is, as a dot and a first name rather than a badge. */
function FamilyTag({ entry }: { entry: LedgerEntry }) {
  if (isOwnEntry(entry)) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: FAMILY, whiteSpace: 'nowrap', flexShrink: 0 }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: radius.full, background: FAMILY }} />
      {ledgerFamilyName(entry).split(' ')[0]}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Record detail                                                      */
/* ------------------------------------------------------------------ */

/** Titles longer than this read as paragraphs, so the detail shows them as body text instead. */
const TITLE_MAX = 80
const CLAMP_CHARS = 280

/** The pane title: the headline when it is short, otherwise what the visit was for. */
function paneTitle(entry: LedgerEntry) {
  const headline = ledgerHeadline(entry)
  if (headline.length <= TITLE_MAX || entry.kind !== 'visit') return headline
  return entry.service || entry.services[0] || 'Visit'
}

/** Free text typed by providers can run long: show a few lines, with the rest on request. */
function LongText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > CLAMP_CHARS
  return (
    <>
      <div style={long && !expanded ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}>
        {text}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded}
          style={{ marginTop: 4, padding: 0, background: 'none', border: 'none', color: CYAN_DEEP, fontSize: 13.5, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  )
}

function Section({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  )
}

function VisitDetail({ entry, showDiagnosis }: { entry: VisitEntry; showDiagnosis: boolean }) {
  const vitals = Object.entries(entry.vitals).filter(([, value]) => value)
  const diagnosis = showDiagnosis ? entry.diagnosis : null
  const hasAny = diagnosis || entry.treatment || vitals.length > 0 || entry.services.length > 0 || entry.followUp || entry.appointmentRef
  if (!hasAny) return <div style={{ gridColumn: '1 / -1', fontSize: 14, color: C.textSub }}>No further details were recorded for this visit.</div>
  return (
    <>
      {diagnosis && <Section label="Diagnosis" wide><LongText text={diagnosis} /></Section>}
      {entry.treatment && <Section label="Treatment" wide><LongText text={entry.treatment} /></Section>}
      {vitals.length > 0 && (
        <Section label="Vitals" wide>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {vitals.map(([key, raw]) => {
              const { value, unit } = vitalWithUnit(key, raw)
              return (
                <div key={key} style={{ background: '#F4F8FC', borderRadius: radius.sm, padding: '9px 12px' }}>
                  <div style={{ fontSize: 12, color: C.textSub }}>{VITAL_LABELS[key] ?? key}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginTop: 2 }}>
                    {value}{unit && <span style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginLeft: 4 }}>{unit}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}
      {entry.services.length > 0 && (
        <Section label="Services">
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entry.services.map(service => (
              <li key={service} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 4, color: CYAN_DEEP }}>
                  <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{service}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {entry.followUp && <Section label="Follow-up"><LongText text={entry.followUp} /></Section>}
      {entry.appointmentRef && <Section label="Appointment">{entry.appointmentRef}</Section>}
    </>
  )
}

function PrescriptionDetail({ entry, viewer }: { entry: RxEntry; viewer: Viewer }) {
  return (
    <>
      <Section label={entry.items.length === 1 ? 'Medicine' : `Medicines (${entry.items.length})`} wide>
        {entry.items.length === 0 ? (
          <span style={{ color: C.textSub }}>No items were listed.</span>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
            {entry.items.map((item, index) => (
              <div key={`${item.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderTop: index > 0 ? `1px solid ${C.border}` : 'none', background: index % 2 ? '#FBFCFE' : '#fff' }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                {item.quantity && <span style={{ color: C.textSub, whiteSpace: 'nowrap' }}>{item.quantity}</span>}
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section label="Received">{entry.fulfillmentMode === 'DELIVERY' ? 'Delivered' : 'Collected from the pharmacy'}</Section>
      <Section label="Order">
        {entry.reference}
        {viewer === 'patient' && (
          <Link to={route.patientPrescription(entry.reference)} style={{ marginLeft: 10, fontWeight: 700, color: CYAN_DEEP, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            View order →
          </Link>
        )}
      </Section>
    </>
  )
}

/** `showDiagnosis`: true when the heading above did not already show the full diagnosis. */
function DetailBody({ entry, viewer, columns, showDiagnosis }: { entry: LedgerEntry; viewer: Viewer; columns: 1 | 2; showDiagnosis: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns === 2 ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)', gap: '18px 24px' }}>
      {entry.kind === 'visit' ? <VisitDetail entry={entry} showDiagnosis={showDiagnosis} /> : <PrescriptionDetail entry={entry} viewer={viewer} />}
      {!isOwnEntry(entry) && (
        <div style={{ gridColumn: '1 / -1', fontSize: 13, color: C.textSub }}>
          Recorded for <span style={{ fontWeight: 600, color: FAMILY }}>{ledgerFamilyName(entry)}</span>
        </div>
      )}
    </div>
  )
}

function NavButton({ label, onClick, direction }: { label: string; onClick?: () => void; direction: 'up' | 'down' }) {
  const disabled = !onClick
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{ width: 34, height: 34, borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: disabled ? '#C8CEDA' : C.text, cursor: disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ transform: direction === 'up' ? 'rotate(180deg)' : 'none' }}>
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/** The selected record, shown beside the list on desktop. */
function DetailPane({ entry, viewer, position, total, onNewer, onOlder }: {
  entry: LedgerEntry
  viewer: Viewer
  position: number
  total: number
  onNewer?: () => void
  onOlder?: () => void
}) {
  const kind = KIND[entry.kind]
  return (
    <article aria-label={ledgerHeadline(entry)} style={{ padding: '22px 24px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* A quiet label line, not badges: the title below is what matters. */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: kind.fg }}>
          <KindIcon kind={entry.kind} size={14} />
          {kind.label}
          {!isOwnEntry(entry) && (
            <span style={{ color: FAMILY }}>· For {ledgerFamilyName(entry)}</span>
          )}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, color: C.textSub, marginRight: 4 }}>{position} of {total}</span>
          <NavButton label="Newer record" direction="up" onClick={onNewer} />
          <NavButton label="Older record" direction="down" onClick={onOlder} />
        </div>
      </div>

      <h2 style={{ margin: '14px 0 0', fontSize: 19, fontWeight: 700, color: C.text, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{paneTitle(entry)}</h2>
      <div style={{ fontSize: 13.5, color: C.textSub, marginTop: 6, lineHeight: 1.5 }}>
        {fmt(entry.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {fmt(entry.date, { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 12px', background: '#F7F9FC', borderRadius: radius.sm }}>
        <span aria-hidden style={{ width: 32, height: 32, borderRadius: radius.sm, background: '#fff', border: `1px solid ${C.border}`, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M10 9h4M12 7v4M9 21v-5h6v5" /></svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.provider.name}</div>
          {entry.provider.category && <div style={{ fontSize: 12.5, color: C.textSub }}>{prettyCategory(entry.provider.category)}</div>}
        </div>
      </div>

      <div style={{ height: 1, background: C.border, margin: '20px 0' }} />
      <DetailBody key={entryKey(entry)} entry={entry} viewer={viewer} columns={2} showDiagnosis={paneTitle(entry) !== ledgerHeadline(entry)} />
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  Record list                                                        */
/* ------------------------------------------------------------------ */

function RecordRow({ entry, selected, expandable, onSelect }: { entry: LedgerEntry; selected: boolean; expandable: boolean; onSelect: () => void }) {
  const kind = KIND[entry.kind]
  const headline = ledgerHeadline(entry)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={!expandable && selected ? 'true' : undefined}
      aria-expanded={expandable ? selected : undefined}
      title={headline}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px 12px 13px',
        borderLeft: `3px solid ${selected ? CYAN_DEEP : 'transparent'}`,
        background: selected ? SELECTED_BG : '#fff',
        cursor: 'pointer',
        fontFamily: font.family,
      }}
      onMouseEnter={event => { if (!selected) event.currentTarget.style.background = '#F7FAFD' }}
      onMouseLeave={event => { event.currentTarget.style.background = selected ? SELECTED_BG : '#fff' }}
    >
      <span aria-hidden style={{ width: 34, height: 34, borderRadius: radius.sm, background: kind.bg, color: kind.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <KindIcon kind={entry.kind} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline}</span>
          <FamilyTag entry={entry} />
        </span>
        <span style={{ display: 'block', fontSize: 12.5, color: C.textSub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subLine(entry)}</span>
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: C.textSub, whiteSpace: 'nowrap', flexShrink: 0 }}>{fmt(entry.date, { day: 'numeric', month: 'short' })}</span>
      {expandable && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, color: C.textLight, transform: selected ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Toolbar                                                            */
/* ------------------------------------------------------------------ */

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

function Segmented<T extends string>({ value, onChange, options, fill }: { value: T; onChange: (value: T) => void; options: Array<{ id: T; label: string; count: number }>; fill?: boolean }) {
  return (
    <div role="tablist" aria-label="Record type" style={{ display: fill ? 'flex' : 'inline-flex', padding: 3, gap: 2, background: '#E3ECF6', borderRadius: radius.sm, flexShrink: 0 }}>
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
              flex: fill ? 1 : undefined,
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

/* ------------------------------------------------------------------ */
/*  Records                                                            */
/* ------------------------------------------------------------------ */

/**
 * A patient's visits and prescriptions. Desktop: a compact, month-grouped list beside a
 * detail pane for the selected record, so scanning never pushes the list around.
 * Tablet and phone: the same list, with each row opening in place.
 */
export function LedgerTimeline({
  entries,
  emptyMessage,
  beneficiaryOptions = [],
  viewer = 'patient',
}: {
  entries: LedgerEntry[]
  emptyMessage?: string
  beneficiaryOptions?: LedgerBeneficiaryOption[]
  /** Patients get links to their own orders; providers see the same record read-only. */
  viewer?: Viewer
}) {
  const { isMobile, isDesktop } = useResponsive()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [period, setPeriod] = useState<DateFilter>('all')
  const [person, setPerson] = useState<string | undefined>(undefined)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const narrowed = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries
      .filter(entry => matchesLedgerPerson(entry, person, beneficiaryOptions))
      .filter(entry => withinPeriod(entry.date, period, now))
      .filter(entry => !needle || searchText(entry).includes(needle))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [entries, person, beneficiaryOptions, period, now, query])

  const visible = useMemo(() => (kind === 'all' ? narrowed : narrowed.filter(entry => entry.kind === kind)), [narrowed, kind])
  const { pageItems, pager } = usePaged(visible, `${query}|${kind}|${period}|${person}`)

  const groups = useMemo(() => {
    const out: Array<{ key: string; label: string; items: LedgerEntry[] }> = []
    for (const entry of pageItems) {
      const date = new Date(entry.date)
      const key = isNaN(date.getTime()) ? 'unknown' : `${date.getFullYear()}-${date.getMonth()}`
      const last = out[out.length - 1]
      if (last?.key === key) last.items.push(entry)
      else out.push({ key, label: isNaN(date.getTime()) ? 'Unknown date' : fmt(entry.date, { month: 'long', year: 'numeric' }), items: [entry] })
    }
    return out
  }, [pageItems])

  const personCounts = useMemo(
    () => new Map(beneficiaryOptions.map(option => [option.id ?? '', entries.filter(entry => matchesLedgerPerson(entry, option.id, beneficiaryOptions)).length])),
    [beneficiaryOptions, entries],
  )

  // Desktop always shows one record: the chosen one if it is on this page, otherwise the page's newest.
  const paneEntry = isDesktop ? pageItems.find(entry => entryKey(entry) === selectedKey) ?? pageItems[0] ?? null : null
  const paneIndex = paneEntry ? visible.indexOf(paneEntry) : -1
  const goTo = (index: number) => {
    const target = visible[index]
    if (!target) return
    setSelectedKey(entryKey(target))
    pager.onPage(Math.floor(index / pager.pageSize))
  }

  const filtersOn = Boolean(query.trim()) || period !== 'all' || Boolean(person) || kind !== 'all'
  const clearFilters = () => { setQuery(''); setPeriod('all'); setKind('all'); setPerson(undefined) }

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

  const toolbar = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: isMobile ? 12 : '14px 16px', borderBottom: `1px solid ${C.border}` }}>
      <Segmented
        value={kind}
        onChange={setKind}
        fill={isMobile}
        options={[
          { id: 'all', label: 'All', count: narrowed.length },
          { id: 'visit', label: 'Visits', count: narrowed.filter(entry => entry.kind === 'visit').length },
          { id: 'prescription', label: isMobile ? 'Meds' : 'Prescriptions', count: narrowed.filter(entry => entry.kind === 'prescription').length },
        ]}
      />
      <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1 1 200px', minWidth: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2.2" strokeLinecap="round" aria-hidden style={{ position: 'absolute', left: 12, top: 12 }}>
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          aria-label="Search records"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search diagnosis, medicine, provider…"
          style={{ ...controlStyle, cursor: 'text', width: '100%', paddingLeft: 36 }}
        />
      </div>
      {beneficiaryOptions.length > 0 && (
        <select aria-label="Whose records" value={person ?? ''} onChange={event => setPerson(event.target.value || undefined)} style={{ ...controlStyle, flex: isMobile ? 1 : 'none', minWidth: 0 }}>
          {beneficiaryOptions.map(option => (
            <option key={option.id ?? 'all'} value={option.id ?? ''}>{option.label} ({personCounts.get(option.id ?? '') ?? 0})</option>
          ))}
        </select>
      )}
      <select aria-label="Period" value={period} onChange={event => setPeriod(event.target.value as DateFilter)} style={{ ...controlStyle, flex: isMobile ? 1 : 'none', minWidth: 0 }}>
        <option value="all">Any time</option>
        <option value="30d">Last 30 days</option>
        <option value="6m">Last 6 months</option>
        <option value="12m">Last 12 months</option>
      </select>
    </div>
  )

  const noMatches = (
    <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 14, color: C.textSub }}>
      Nothing matches these filters.
      {filtersOn && (
        <button type="button" onClick={clearFilters} style={{ marginLeft: 6, background: 'none', border: 'none', padding: 0, color: CYAN_DEEP, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: font.family }}>
          Show everything
        </button>
      )}
    </div>
  )

  const list = (
    <div>
      {groups.map(group => (
        <section key={group.key} aria-label={group.label}>
          <h3 style={{ margin: 0, padding: '8px 16px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textSub, background: '#F7F9FC', borderBottom: `1px solid ${C.border}` }}>
            {group.label}
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {group.items.map(entry => {
              const key = entryKey(entry)
              const open = isDesktop ? paneEntry === entry : selectedKey === key
              return (
                <li key={key} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <RecordRow
                    entry={entry}
                    selected={open}
                    expandable={!isDesktop}
                    onSelect={() => setSelectedKey(!isDesktop && open ? null : key)}
                  />
                  {!isDesktop && open && (
                    <div style={{ padding: isMobile ? '4px 14px 18px' : '6px 20px 20px 63px', background: SELECTED_BG, borderLeft: `3px solid ${CYAN_DEEP}` }}>
                      <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 14 }}>
                        {fmt(entry.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {/* The row above truncates its title, so a diagnosis that doesn't fit is repeated in full. */}
                      <DetailBody entry={entry} viewer={viewer} columns={isMobile ? 1 : 2} showDiagnosis={ledgerHeadline(entry).length > 45} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <div style={{ padding: '0 16px 14px' }}><Pager {...pager} /></div>
    </div>
  )

  return (
    // `clip` keeps the rounded corners without creating a scroll container, so the sticky pane still works.
    <GGCard padding="0" noPad style={{ overflow: 'clip', fontFamily: font.family }}>
      {toolbar}
      {visible.length === 0 ? noMatches : isDesktop && paneEntry ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(0, 1.25fr)', alignItems: 'stretch' }}>
          <div style={{ borderRight: `1px solid ${C.border}`, minWidth: 0 }}>{list}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ position: 'sticky', top: 0 }}>
              <DetailPane
                entry={paneEntry}
                viewer={viewer}
                position={paneIndex + 1}
                total={visible.length}
                onNewer={paneIndex > 0 ? () => goTo(paneIndex - 1) : undefined}
                onOlder={paneIndex < visible.length - 1 ? () => goTo(paneIndex + 1) : undefined}
              />
            </div>
          </div>
        </div>
      ) : (
        list
      )}
    </GGCard>
  )
}
