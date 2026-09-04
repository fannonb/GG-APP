import { useEffect, useMemo, useState } from 'react'
import type { LedgerEntry } from '@/types/ledger.types'
import { GGBadge, GGCard, GGDivider, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'

export type LedgerBeneficiaryOption = {
  id: string | undefined
  label: string
}

type KindFilter = 'all' | 'visit' | 'prescription'
type DateFilter = 'all' | '30d' | '6m' | '12m'

function entryKey(entry: LedgerEntry) {
  return `${entry.kind}-${entry.id}`
}

function formatRowDate(iso: string) {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDetailDate(iso: string) {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return iso
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function monthGroupLabel(iso: string) {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()
}

function monthGroupKey(iso: string) {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
}

function beneficiaryLabel(name: string | null) {
  if (!name) return 'Patient'
  const cleaned = name.replace(/\s*\([^)]*\)/, '').trim()
  if (!cleaned || cleaned.toLowerCase() === 'self' || cleaned.toLowerCase() === 'me') return 'Patient'
  return cleaned
}

function entryTitle(entry: LedgerEntry) {
  if (entry.kind === 'prescription') return 'Prescription'
  return entry.service || 'Medical visit'
}

function entrySummary(entry: LedgerEntry) {
  if (entry.kind === 'visit') {
    return entry.diagnosis || entry.treatment || entry.services[0] || 'Visit recorded'
  }
  if (entry.items.length === 0) return `Prescription fulfilled · ${entry.reference}`
  const first = entry.items[0]?.name
  const extra = entry.items.length - 1
  return extra > 0 ? `${first} + ${extra} more` : first
}

function entrySearchText(entry: LedgerEntry) {
  const parts = [
    entryTitle(entry),
    entry.provider.name,
    entry.provider.category,
    entry.beneficiaryName,
    entrySummary(entry),
  ]
  if (entry.kind === 'visit') {
    parts.push(entry.diagnosis, entry.treatment, entry.followUp, entry.service, ...entry.services, ...Object.values(entry.vitals))
  } else {
    parts.push(entry.reference, entry.fulfillmentMode, ...entry.items.map(item => item.name))
  }
  return parts.filter(Boolean).join(' ').toLowerCase()
}

function matchesBeneficiary(entry: LedgerEntry, filter: string | undefined, options: LedgerBeneficiaryOption[]) {
  if (!filter) return true
  if (filter === 'self') {
    if (!entry.beneficiaryName) return true
    const name = entry.beneficiaryName.toLowerCase()
    return name === 'self' || name === 'me'
  }
  const selected = options.find(option => option.id === filter)
  const target = (selected ? selected.label : filter).toLowerCase().trim()
  if (!entry.beneficiaryName) return false
  const entryName = entry.beneficiaryName.toLowerCase()
  return entryName.includes(target) || target.includes(entryName)
}

function matchesDate(iso: string, filter: DateFilter) {
  if (filter === 'all') return true
  const date = new Date(iso).getTime()
  if (isNaN(date)) return true
  const now = Date.now()
  const days = filter === '30d' ? 30 : filter === '6m' ? 182 : 365
  return now - date <= days * 24 * 60 * 60 * 1000
}

const VITAL_LABELS: Record<string, string> = {
  bp: 'Blood pressure',
  temp: 'Temperature',
  weight: 'Weight',
  sats: 'O₂ sats',
  glucose: 'Glucometer',
  pulse: 'Pulse',
  height: 'Height',
  bmi: 'BMI',
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: radius.full,
        border: `1.5px solid ${active ? C.navy800 : C.border}`,
        background: active ? C.navy800 : '#fff',
        color: active ? '#fff' : C.textSub,
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: font.family,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.textLight,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function VisitDetail({ entry }: { entry: Extract<LedgerEntry, { kind: 'visit' }> }) {
  const vitals = Object.entries(entry.vitals).filter(([, value]) => value)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {entry.diagnosis && <DetailField label="Diagnosis" value={entry.diagnosis} />}
      {entry.treatment && <DetailField label="Treatment" value={entry.treatment} />}
      {vitals.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.textLight,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            Vitals
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
            {vitals.map(([key, value]) => (
              <div
                key={key}
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: radius.sm,
                  background: C.bg,
                }}
              >
                <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600 }}>{VITAL_LABELS[key] ?? key}</div>
                <div style={{ fontSize: 15, color: C.navy800, fontWeight: 700, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {entry.services.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.textLight,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            Services
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {entry.services.map(service => (
              <GGBadge key={service} type="outline">
                {service}
              </GGBadge>
            ))}
          </div>
        </div>
      )}
      {entry.followUp && <DetailField label="Follow-up" value={entry.followUp} />}
    </div>
  )
}

function PrescriptionDetail({ entry }: { entry: Extract<LedgerEntry, { kind: 'prescription' }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <GGBadge type="primary">{entry.fulfillmentMode === 'DELIVERY' ? 'Delivered' : 'Collected'}</GGBadge>
        <span style={{ fontSize: 12.5, color: C.textSub }}>
          Ref <span style={{ fontWeight: 700, color: C.navy800 }}>{entry.reference}</span>
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.textLight,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}
        >
          Medication dispensed
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entry.items.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.textSub }}>Prescription fulfilled ({entry.reference})</div>
          ) : (
            entry.items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: `1px solid ${C.border}`,
                  fontSize: 14,
                }}
              >
                <span style={{ fontWeight: 600, color: C.text }}>{item.name}</span>
                {item.quantity && <span style={{ color: C.textSub }}>{item.quantity}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function RecordDetail({ entry }: { entry: LedgerEntry }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.navy800, letterSpacing: '-0.02em' }}>{entryTitle(entry)}</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
            {formatDetailDate(entry.date)} · {entry.provider.name}
          </div>
        </div>
        <GGBadge type="info">{beneficiaryLabel(entry.beneficiaryName)}</GGBadge>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 16px' }}>
        <GGBadge type="navy">{categoryLabel(entry.provider.category)}</GGBadge>
        {entry.kind === 'prescription' && <GGBadge type="primary">Prescription</GGBadge>}
      </div>
      <GGDivider margin="0 0 16px 0" />
      {entry.kind === 'visit' ? <VisitDetail entry={entry} /> : <PrescriptionDetail entry={entry} />}
    </div>
  )
}

export function LedgerTimeline({
  entries,
  emptyMessage,
  beneficiaryOptions = [],
}: {
  entries: LedgerEntry[]
  emptyMessage?: string
  beneficiaryOptions?: LedgerBeneficiaryOption[]
}) {
  const { isDesktop } = useResponsive()
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [beneficiaryFilter, setBeneficiaryFilter] = useState<string | undefined>(undefined)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...entries]
      .filter(entry => matchesBeneficiary(entry, beneficiaryFilter, beneficiaryOptions))
      .filter(entry => kindFilter === 'all' || entry.kind === kindFilter)
      .filter(entry => matchesDate(entry.date, dateFilter))
      .filter(entry => (needle ? entrySearchText(entry).includes(needle) : true))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [entries, beneficiaryFilter, beneficiaryOptions, kindFilter, dateFilter, query])

  useEffect(() => {
    if (filteredEntries.length === 0) {
      setSelectedKey(null)
      return
    }
    const stillVisible = selectedKey && filteredEntries.some(entry => entryKey(entry) === selectedKey)
    if (!stillVisible) setSelectedKey(entryKey(filteredEntries[0]))
  }, [filteredEntries, selectedKey])

  const selectedEntry = filteredEntries.find(entry => entryKey(entry) === selectedKey) ?? null
  const grouped = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: LedgerEntry[] }> = []
    for (const entry of filteredEntries) {
      const key = monthGroupKey(entry.date)
      const last = groups[groups.length - 1]
      if (last && last.key === key) {
        last.items.push(entry)
      } else {
        groups.push({ key, label: monthGroupLabel(entry.date), items: [entry] })
      }
    }
    return groups
  }, [filteredEntries])

  const hasActiveFilters = Boolean(query.trim()) || kindFilter !== 'all' || dateFilter !== 'all' || Boolean(beneficiaryFilter)

  const resetFilters = () => {
    setQuery('')
    setKindFilter('all')
    setDateFilter('all')
    setBeneficiaryFilter(undefined)
  }

  if (entries.length === 0) {
    return (
      <GGCard>
        <div style={{ textAlign: 'center', padding: '32px 16px', color: C.textSub, fontSize: 14, fontFamily: font.family }}>
          {emptyMessage ?? 'No treatment history recorded yet.'}
        </div>
      </GGCard>
    )
  }

  const filterBar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <GGInput
        placeholder="Search diagnosis, medication, provider, reference…"
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <FilterChip label="All" active={kindFilter === 'all'} onClick={() => setKindFilter('all')} />
        <FilterChip label="Visits" active={kindFilter === 'visit'} onClick={() => setKindFilter('visit')} />
        <FilterChip label="Prescriptions" active={kindFilter === 'prescription'} onClick={() => setKindFilter('prescription')} />
        <FilterChip label="Last 30 days" active={dateFilter === '30d'} onClick={() => setDateFilter(dateFilter === '30d' ? 'all' : '30d')} />
        <FilterChip label="Last 6 months" active={dateFilter === '6m'} onClick={() => setDateFilter(dateFilter === '6m' ? 'all' : '6m')} />
        <FilterChip label="Last 12 months" active={dateFilter === '12m'} onClick={() => setDateFilter(dateFilter === '12m' ? 'all' : '12m')} />
      </div>
      {beneficiaryOptions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {beneficiaryOptions.map(option => (
            <FilterChip
              key={option.id ?? 'all'}
              label={option.label}
              active={beneficiaryFilter === option.id}
              onClick={() => setBeneficiaryFilter(option.id)}
            />
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: C.textSub, fontWeight: 600 }}>
          {filteredEntries.length} {filteredEntries.length === 1 ? 'record' : 'records'}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            style={{
              background: 'none',
              border: 'none',
              color: C.blue500,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: font.family,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )

  const list = (
    <div>
      {filteredEntries.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center', color: C.textSub, fontSize: 13.5 }}>
          No records match these filters.
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.key}>
            <div
              style={{
                padding: '8px 14px',
                background: C.bg,
                borderTop: `1px solid ${C.border}`,
                borderBottom: `1px solid ${C.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: C.textSub }}>{group.label}</span>
              <span style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{group.items.length}</span>
            </div>
            {group.items.map(entry => {
              const key = entryKey(entry)
              const active = key === selectedKey
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    border: 'none',
                    borderBottom: `1px solid ${C.border}`,
                    background: active ? C.bg : '#fff',
                    cursor: 'pointer',
                    fontFamily: font.family,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 58, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: C.navy800, paddingTop: 1 }}>
                      {formatRowDate(entry.date)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.navy800 }}>{entryTitle(entry)}</span>
                        {entry.kind === 'prescription' && <GGBadge type="primary">Rx</GGBadge>}
                      </div>
                      <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{entry.provider.name}</div>
                      <div style={{ fontSize: 12.5, color: C.textLight, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entrySummary(entry)}
                        {entry.kind === 'visit' && entry.followUp ? ` · ${entry.followUp}` : ''}
                        {` · ${beneficiaryLabel(entry.beneficiaryName)}`}
                      </div>
                    </div>
                    <span style={{ color: C.textLight, fontSize: 16, lineHeight: 1, paddingTop: 2 }}>›</span>
                  </div>
                </button>
              )
            })}
          </div>
        ))
      )}
    </div>
  )

  if (!isDesktop) {
    return (
      <div style={{ fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filterBar}
        <GGCard padding="0" style={{ overflow: 'hidden' }}>
          {list}
        </GGCard>
        {selectedEntry && (
          <GGCard padding="20px">
            <RecordDetail entry={selectedEntry} />
          </GGCard>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {filterBar}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 0.92fr) minmax(360px, 1.08fr)',
          border: `1px solid ${C.border}`,
          borderRadius: radius.lg,
          overflow: 'hidden',
          background: '#fff',
          minHeight: 520,
        }}
      >
        <div style={{ borderRight: `1px solid ${C.border}`, maxHeight: 720, overflow: 'auto' }}>{list}</div>
        <div style={{ padding: 22, maxHeight: 720, overflow: 'auto' }}>
          {selectedEntry ? (
            <RecordDetail entry={selectedEntry} />
          ) : (
            <div style={{ color: C.textSub, fontSize: 14, padding: 24 }}>Select a record to view details.</div>
          )}
        </div>
      </div>
    </div>
  )
}
