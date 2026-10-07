import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { LedgerTimeline } from '@/components/LedgerTimeline'
import { VITAL_LABELS, isOwnEntry, matchesLedgerPerson, type LedgerBeneficiaryOption } from '@/utils/ledger-entries'
import { formatTimeLeft } from '@/utils/ledger-access'
import { getPatientDisplayName } from '@/features/patient/patientAccount'
import { useLedgerStatus, useOwnLedger } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { useUserStore } from '@/store/user.store'
import type { LedgerEntry, LedgerStatusResponse } from '@/types/ledger.types'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

type Access = { tone: 'safe' | 'shared' | 'warn'; label: string; detail: string; cta: string; to: string }

function describeAccess(status: LedgerStatusResponse | undefined, now: number): Access | null {
  if (!status) return null
  if (status.pinExpired) return { tone: 'warn', label: 'PIN expired', detail: 'Providers can’t open your record until you set a new PIN.', cta: 'Set a new PIN', to: ROUTES.LEDGER_PIN }
  if (!status.hasPin) return { tone: 'warn', label: 'No PIN yet', detail: 'Create a PIN so you can let a provider see your record.', cta: 'Create PIN', to: ROUTES.LEDGER_PIN }
  const grants = status.activeGrants ?? []
  if (grants.length === 1) return { tone: 'shared', label: `Shared with ${grants[0].provider.name}`, detail: `Ends automatically · ${formatTimeLeft(grants[0].expiresAt, now)}`, cta: 'Manage access', to: ROUTES.LEDGER_ACCESS }
  if (grants.length > 1) return { tone: 'shared', label: `Shared with ${grants.length} providers`, detail: grants.map(g => g.provider.name).join(', '), cta: 'Manage access', to: ROUTES.LEDGER_ACCESS }
  const soon = status.pinExpiresAt && new Date(status.pinExpiresAt).getTime() - now < 14 * 86_400_000
  return {
    tone: soon ? 'warn' : 'safe',
    label: 'Private',
    detail: soon && status.pinExpiresAt ? `PIN expires ${shortDate(status.pinExpiresAt)}` : 'Only you can see this right now',
    cta: 'Manage access',
    to: ROUTES.LEDGER_ACCESS,
  }
}

const TONES = {
  safe: { fg: '#15803D', bg: '#DCFCE7' },
  shared: { fg: CYAN_DEEP, bg: C.blue100 },
  warn: { fg: '#B45309', bg: '#FEF3C7' },
}

function LockIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d={open ? 'M8 10.5V7a4 4 0 017.6-1.8' : 'M8 10.5V7a4 4 0 118 0v3.5'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function RecordHeader({ name, entries, access }: { name: string; entries: LedgerEntry[]; access: Access | null }) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  const own = entries.filter(isOwnEntry)
  const visits = own.filter(entry => entry.kind === 'visit').length
  const oldest = entries.reduce<string | null>((min, entry) => (!min || entry.date < min ? entry.date : min), null)
  const tone = access ? TONES[access.tone] : null

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? 16 : '20px 22px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 20, alignItems: isMobile ? 'stretch' : 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        <span aria-hidden style={{ width: 56, height: 56, borderRadius: radius.full, background: `linear-gradient(135deg, ${CYAN_MID}, ${CYAN_DEEP})`, color: '#fff', fontSize: 19, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {initials}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.textSub }}>Health record</div>
          <div style={{ fontSize: isMobile ? 19 : 22, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{name}</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
            {entries.length === 0
              ? 'Nothing recorded yet'
              : `${own.length} ${own.length === 1 ? 'record' : 'records'} · ${visits} ${visits === 1 ? 'visit' : 'visits'}${oldest ? ` · since ${new Date(oldest).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : ''}`}
          </div>
        </div>
      </div>

      {access && tone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: isMobile ? '12px 14px' : '12px 16px', borderRadius: radius.md, background: C.bg, minWidth: isMobile ? 0 : 300 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: tone.fg, background: tone.bg, padding: '4px 10px', borderRadius: radius.full }}>
              <LockIcon open={access.tone === 'shared'} />
              {access.label}
            </span>
            <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6 }}>{access.detail}</div>
          </div>
          <button
            type="button"
            onClick={() => navigate(access.to)}
            style={{ height: 36, padding: '0 14px', borderRadius: radius.sm, border: 'none', background: access.tone === 'warn' ? `linear-gradient(135deg, ${CYAN_MID}, ${CYAN_DEEP})` : '#fff', color: access.tone === 'warn' ? '#fff' : CYAN_DEEP, boxShadow: access.tone === 'warn' ? 'none' : `inset 0 0 0 1px ${C.border}`, fontSize: 13, fontWeight: 700, fontFamily: font.family, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {access.cta}
          </button>
        </div>
      )}
    </div>
  )
}

function SideCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <GGCard padding="16px 18px">
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>{title}</h2>
      {note && <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{note}</div>}
      <div style={{ marginTop: 10 }}>{children}</div>
    </GGCard>
  )
}

const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 13.5 }

function Snapshot({ entries, now, compact }: { entries: LedgerEntry[]; now: number; compact?: boolean }) {
  const own = entries.filter(isOwnEntry).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const vitalsVisit = own.find((entry): entry is Extract<LedgerEntry, { kind: 'visit' }> => entry.kind === 'visit' && Object.values(entry.vitals).some(Boolean))
  const medicines = own
    .filter((entry): entry is Extract<LedgerEntry, { kind: 'prescription' }> => entry.kind === 'prescription' && now - new Date(entry.date).getTime() <= 90 * 86_400_000)
    .flatMap(entry => entry.items.map(item => ({ name: item.name, date: entry.date, key: `${entry.id}-${item.name}` })))
    .slice(0, 5)

  if (compact) {
    if (!vitalsVisit && medicines.length === 0) return null
    return (
      <GGCard padding="14px 16px">
        {vitalsVisit && (
          <>
            <div style={{ fontSize: 12.5, color: C.textSub }}>Latest vitals · {shortDate(vitalsVisit.date)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginTop: 8 }}>
              {Object.entries(vitalsVisit.vitals).filter(([, value]) => value).map(([key, value]) => (
                <div key={key}>
                  <div style={{ fontSize: 12, color: C.textSub }}>{VITAL_LABELS[key] ?? key}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{value}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {medicines.length > 0 && (
          <div style={{ marginTop: vitalsVisit ? 12 : 0, paddingTop: vitalsVisit ? 12 : 0, borderTop: vitalsVisit ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ fontSize: 12.5, color: C.textSub }}>Recent medicines</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4, lineHeight: 1.5 }}>{[...new Set(medicines.map(item => item.name))].join(', ')}</div>
          </div>
        )}
      </GGCard>
    )
  }

  return (
    <>
      {vitalsVisit && (
        <SideCard title="Latest vitals" note={`${shortDate(vitalsVisit.date)} · ${vitalsVisit.provider.name}`}>
          {Object.entries(vitalsVisit.vitals).filter(([, value]) => value).map(([key, value], index) => (
            <div key={key} style={{ ...row, borderTop: index > 0 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ color: C.textSub }}>{VITAL_LABELS[key] ?? key}</span>
              <span style={{ fontWeight: 800, color: C.text }}>{value}</span>
            </div>
          ))}
        </SideCard>
      )}
      {medicines.length > 0 && (
        <SideCard title="Recent medicines" note="Last 90 days">
          {medicines.map((item, index) => (
            <div key={item.key} style={{ ...row, borderTop: index > 0 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ fontWeight: 600, color: C.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
              <span style={{ color: C.textSub, whiteSpace: 'nowrap' }}>{new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </SideCard>
      )}
    </>
  )
}

function People({ options, entries, value, onChange }: { options: LedgerBeneficiaryOption[]; entries: LedgerEntry[]; value: string | undefined; onChange: (id: string | undefined) => void }) {
  return (
    <SideCard title="People">
      <div role="radiogroup" aria-label="Whose records" style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '0 -8px' }}>
        {options.map(option => {
          const active = value === option.id
          const count = entries.filter(entry => matchesLedgerPerson(entry, option.id, options)).length
          return (
            <button
              key={option.id ?? 'all'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', borderRadius: radius.sm, background: active ? C.blue100 : 'transparent', color: active ? CYAN_DEEP : C.text, fontSize: 13.5, fontWeight: active ? 700 : 500, fontFamily: font.family, cursor: 'pointer', textAlign: 'left' }}
            >
              <span>{option.label}</span>
              <span style={{ fontSize: 12, color: active ? CYAN_DEEP : C.textLight, fontWeight: 600 }}>{count}</span>
            </button>
          )
        })}
      </div>
    </SideCard>
  )
}

export function HealthLedgerScreen() {
  const { isDesktop } = useResponsive()
  const statusQuery = useLedgerStatus()
  const ledgerQuery = useOwnLedger()
  const user = useUserStore(s => s.user)
  const storeBeneficiaries = useUserStore(s => s.beneficiaries)
  const [now] = useState(() => Date.now())
  const [person, setPerson] = useState<string | undefined>(undefined)

  const entries = useMemo(() => ledgerQuery.data?.entries ?? [], [ledgerQuery.data?.entries])
  const queryBeneficiaries = useMemo(() => ledgerQuery.data?.patient.beneficiaries ?? [], [ledgerQuery.data?.patient.beneficiaries])
  const name = getPatientDisplayName(user) || ledgerQuery.data?.patient.name || 'You'
  const access = describeAccess(statusQuery.data, now)

  // Family members from the profile, the store, and any names that appear on records.
  const personOptions = useMemo<LedgerBeneficiaryOption[]>(() => {
    const names = new Map<string, { id: string; name: string }>()
    queryBeneficiaries.forEach(b => names.set(b.id, { id: b.id, name: b.name }))
    storeBeneficiaries.forEach(b => { if (!names.has(b.id)) names.set(b.id, { id: b.id, name: b.name }) })
    entries.forEach(entry => {
      if (isOwnEntry(entry) || !entry.beneficiaryName) return
      const clean = entry.beneficiaryName.replace(/\s*\([^)]*\)/, '').trim()
      if (![...names.values()].some(b => b.name.toLowerCase() === clean.toLowerCase())) names.set(entry.beneficiaryName, { id: entry.beneficiaryName, name: clean })
    })
    const family = [...names.values()].map(b => ({ id: b.id as string | undefined, label: b.name }))
    const all: LedgerBeneficiaryOption[] = [{ id: undefined, label: 'Everyone' }, { id: 'self', label: 'You' }, ...family]
    // Only list family members who actually have records.
    const withRecords = family.filter(option => entries.some(entry => matchesLedgerPerson(entry, option.id, all)))
    if (withRecords.length === 0) return []
    return [{ id: undefined, label: 'Everyone' }, { id: 'self', label: 'You' }, ...withRecords]
  }, [queryBeneficiaries, storeBeneficiaries, entries])

  const timeline = ledgerQuery.isLoading ? (
    <GGCard padding="24px"><div style={{ textAlign: 'center', color: C.textSub, fontSize: 14 }}>Loading your record…</div></GGCard>
  ) : (
    <LedgerTimeline
      entries={entries}
      beneficiaryOptions={personOptions}
      viewer="patient"
      {...(isDesktop && personOptions.length > 0 ? { person, onPersonChange: setPerson } : {})}
    />
  )

  return (
    <AppLayout title="Health Ledger">
      <div style={{ maxWidth: 1160, margin: '0 auto', fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <RecordHeader name={name} entries={entries} access={access} />

        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: '290px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
            <aside style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {personOptions.length > 0 && <People options={personOptions} entries={entries} value={person} onChange={setPerson} />}
              <Snapshot entries={entries} now={now} />
            </aside>
            <div>{timeline}</div>
          </div>
        ) : (
          <>
            <Snapshot entries={entries} now={now} compact />
            {timeline}
          </>
        )}
      </div>
    </AppLayout>
  )
}
