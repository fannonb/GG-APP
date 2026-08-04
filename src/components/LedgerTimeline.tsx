import { useState } from 'react'
import type { LedgerEntry } from '@/types/ledger.types'
import { GGBadge, GGCard, GGDivider } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'

function formatDateHeader(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const dateStr = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} at ${timeStr}`
}

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
}

const VITAL_LABELS: Record<string, string> = {
  bp: 'Blood Pressure',
  temp: 'Temperature',
  weight: 'Weight',
  sats: 'O₂ Sats',
  glucose: 'Glucometer',
  pulse: 'Pulse',
  height: 'Height',
  bmi: 'BMI',
}

const VITAL_ICONS: Record<string, React.ReactNode> = {
  bp: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  temp: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </svg>
  ),
  sats: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  glucose: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  pulse: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
    </svg>
  ),
}

function VitalChip({ label, value, vitalKey }: { label: string; value: string; vitalKey: string }) {
  const icon = VITAL_ICONS[vitalKey]
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: radius.sm,
        padding: '8px 12px',
        flex: '1 1 130px',
        minWidth: 120,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {icon && (
        <div
          style={{
            color: C.blue500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: C.blue100,
            borderRadius: radius.xs,
            width: 26,
            height: 26,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 13, color: C.navy800, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  )
}

function DetailField({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        background: highlight ? C.blue100 : C.bg,
        border: `1px solid ${highlight ? C.blue300 : C.border}`,
        borderRadius: radius.sm,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: highlight ? C.navy800 : C.textSub,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6, fontWeight: highlight ? 600 : 400 }}>{value}</div>
    </div>
  )
}

function VisitCardContent({ entry }: { entry: Extract<LedgerEntry, { kind: 'visit' }> }) {
  const vitals = Object.entries(entry.vitals).filter(([, value]) => value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
      {entry.beneficiaryName && (
        <div>
          <GGBadge type="info">For: {entry.beneficiaryName}</GGBadge>
        </div>
      )}

      {vitals.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Vitals Recorded
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {vitals.map(([key, value]) => (
              <VitalChip key={key} vitalKey={key} label={VITAL_LABELS[key] ?? key} value={value} />
            ))}
          </div>
        </div>
      )}

      {entry.diagnosis && <DetailField label="Diagnosis" value={entry.diagnosis} highlight />}
      {entry.treatment && <DetailField label="Treatment" value={entry.treatment} />}

      {entry.services.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
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

function PrescriptionCardContent({ entry }: { entry: Extract<LedgerEntry, { kind: 'prescription' }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <GGBadge type="primary">{entry.fulfillmentMode === 'DELIVERY' ? 'Delivered' : 'Collected'}</GGBadge>
        {entry.beneficiaryName && <GGBadge type="info">For: {entry.beneficiaryName}</GGBadge>}
        <div style={{ fontSize: 12, color: C.textSub, marginLeft: 'auto' }}>
          Ref: <span style={{ fontWeight: 600, color: C.navy800 }}>{entry.reference}</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Medication Dispensed ({entry.items.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entry.items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                fontSize: 13.5,
                color: C.text,
                padding: '8px 12px',
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: radius.sm,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: C.blue500,
                  }}
                />
                <span style={{ fontWeight: 600 }}>{item.name}</span>
              </div>
              {item.quantity && <span style={{ color: C.textSub, fontSize: 13 }}>{item.quantity}</span>}
            </div>
          ))}
          {entry.items.length === 0 && (
            <div style={{ fontSize: 13, color: C.textSub, padding: '8px 12px', background: C.bg, borderRadius: radius.sm }}>
              Prescription fulfilled ({entry.reference})
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CollapsibleEntryCard({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: LedgerEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  const isVisit = entry.kind === 'visit'
  const dateHeading = formatDateHeader(entry.date)

  const vitalsCount = isVisit ? Object.values(entry.vitals).filter(Boolean).length : 0

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: radius.lg,
        border: `1.5px solid ${isExpanded ? C.blue400 : C.border}`,
        boxShadow: isExpanded ? shadow.md : shadow.sm,
        transition: 'all 0.2s ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* Header Bar */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          background: isExpanded ? 'rgba(56, 182, 255, 0.03)' : C.surface,
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          {/* Light Blue Icon Badge */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: radius.md,
              background: C.blue100,
              color: C.blue500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isVisit ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.8 2.3A.3.3 0 0 0 4.5 2.6V11a6 6 0 0 0 12 0V2.6a.3.3 0 0 0-.3-.3" />
                <path d="M10.5 17a6 6 0 0 0 6 6h1.5a4.5 4.5 0 0 0 4.5-4.5v-3.5" />
                <circle cx="22.5" cy="15" r="1.5" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
            )}
          </div>

          {/* Main Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* DATE HEADING */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.navy800,
                }}
              >
                {dateHeading}
              </span>
              {entry.beneficiaryName && <GGBadge type="info">For: {entry.beneficiaryName}</GGBadge>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: C.textSub }}>
              <span style={{ fontWeight: 600 }}>{entry.provider.name}</span>
              <span style={{ color: C.borderDark }}>•</span>
              <GGBadge type="navy">{categoryLabel(entry.provider.category)}</GGBadge>
              {isVisit ? (
                <>
                  <span style={{ color: C.borderDark }}>•</span>
                  <span>{entry.service ?? 'Medical Visit'}</span>
                </>
              ) : (
                <>
                  <span style={{ color: C.borderDark }}>•</span>
                  <GGBadge type="primary">Prescription</GGBadge>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side stats & toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Quick info chip */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isVisit ? (
              <>
                {vitalsCount > 0 && <GGBadge type="outline">{vitalsCount} Vitals</GGBadge>}
                {entry.services.length > 0 && <GGBadge type="outline">{entry.services.length} Services</GGBadge>}
              </>
            ) : (
              <>
                <GGBadge type="primary">{entry.fulfillmentMode === 'DELIVERY' ? 'Delivered' : 'Collected'}</GGBadge>
                <GGBadge type="outline">{entry.items.length} Items</GGBadge>
              </>
            )}
          </div>

          {/* Toggle Chevron Button */}
          <button
            type="button"
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              border: `1px solid ${isExpanded ? C.blue500 : C.border}`,
              background: isExpanded ? C.blue100 : C.bg,
              color: isExpanded ? C.blue500 : C.textSub,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease',
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Content Body */}
      {isExpanded && (
        <div style={{ padding: '0 20px 20px 20px' }}>
          <GGDivider margin="0 0 16px 0" />
          {isVisit ? <VisitCardContent entry={entry} /> : <PrescriptionCardContent entry={entry} />}
        </div>
      )}
    </div>
  )
}

export function LedgerTimeline({ entries, emptyMessage }: { entries: LedgerEntry[]; emptyMessage?: string }) {
  // Track expanded card IDs. Default to expanding the first item if available.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (entries.length > 0) {
      initial.add(`${entries[0].kind}-${entries[0].id}`)
    }
    return initial
  })

  if (entries.length === 0) {
    return (
      <GGCard>
        <div style={{ textAlign: 'center', padding: '32px 16px', color: C.textSub, fontSize: 14, fontFamily: font.family }}>
          {emptyMessage ?? 'No treatment history recorded yet.'}
        </div>
      </GGCard>
    )
  }

  const allIds = entries.map(e => `${e.kind}-${e.id}`)
  const allExpanded = allIds.every(id => expandedIds.has(id))

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set())
    } else {
      setExpandedIds(new Set(allIds))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: font.family }}>
      {/* Timeline Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <div style={{ fontSize: 13, color: C.textSub, fontWeight: 600 }}>
          {entries.length} {entries.length === 1 ? 'treatment record' : 'treatment records'}
        </div>
        <button
          type="button"
          onClick={toggleAll}
          style={{
            background: 'transparent',
            border: 'none',
            color: C.blue500,
            fontSize: 12.5,
            fontWeight: 700,
            fontFamily: font.family,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: radius.xs,
            transition: 'opacity 0.2s',
          }}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {/* Treatment Record Cards */}
      {entries.map(entry => {
        const idKey = `${entry.kind}-${entry.id}`
        return (
          <CollapsibleEntryCard
            key={idKey}
            entry={entry}
            isExpanded={expandedIds.has(idKey)}
            onToggle={() => toggleExpand(idKey)}
          />
        )
      })}
    </div>
  )
}
