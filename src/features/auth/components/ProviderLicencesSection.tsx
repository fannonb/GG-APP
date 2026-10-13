import { useRef, useState } from 'react'
import { GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import {
  BUSINESS_FIELDS,
  CREDENTIAL_FILE_MAX_BYTES,
  CREDENTIAL_FILE_TYPES,
  CREDENTIAL_NUMBER_PATTERN,
  credentialType,
  credentialsFor,
  needsBusinessRegistration,
  type CredentialCountry,
  type CredentialType,
} from '@/config/credentials'
import type { ProviderCredentialPayload } from '@/api/types'

export interface LicenceFile {
  name: string
  type: string
  size: number
  dataUrl: string
}

export interface LicenceEntry {
  number: string
  holderName: string
  expiresAt: string
  file: LicenceFile | null
}

export interface LicencesState {
  entries: Record<string, LicenceEntry>
  /** For "either regulator" groups (Kenyan clinics): the kind the provider picked, keyed by the group. */
  choices: Record<string, string>
  businessRegNumber: string
  taxPin: string
}

export const EMPTY_LICENCES: LicencesState = { entries: {}, choices: {}, businessRegNumber: '', taxPin: '' }

const EMPTY_ENTRY: LicenceEntry = { number: '', holderName: '', expiresAt: '', file: null }
/** Base64 grows files by a third; keep the whole request well under the API's 25 MB limit. */
const MAX_TOTAL_BYTES = 15 * 1024 * 1024

const groupKey = (group: string[]) => group.join('|')
const today = () => new Date().toISOString().slice(0, 10)

/** The cards to show: one per required group (using the provider's pick where a group offers a choice). */
function cardsFor(country: CredentialCountry, services: string[], choices: Record<string, string>) {
  const { required, optional } = credentialsFor(country, services)
  const requiredCards = required.map(group => {
    const kind = group.length === 1 ? group[0] : (choices[groupKey(group)] ?? group[0])
    return { group, type: credentialType(kind)! }
  })
  const optionalCards = optional.map(kind => credentialType(kind)!).filter(Boolean)
  return { requiredCards, optionalCards }
}

/**
 * Check the licences the way the API does and build the request payload.
 * Returns field errors keyed `${kind}.${field}` (plus `business.*`, `files`).
 */
export function validateLicences(country: CredentialCountry | null, services: string[], state: LicencesState) {
  const errors: Record<string, string> = {}
  const credentials: ProviderCredentialPayload[] = []
  if (!country) return { errors: { country: 'Pick a location in Kenya, Zimbabwe or Zambia first.' }, credentials }

  const { requiredCards, optionalCards } = cardsFor(country, services, state.choices)
  const now = today()
  let totalBytes = 0

  const check = (type: CredentialType, required: boolean) => {
    const entry = state.entries[type.kind] ?? EMPTY_ENTRY
    const number = entry.number.trim()
    const touched = number || entry.holderName.trim() || entry.expiresAt || entry.file
    if (!required && !touched) return
    if (!number) errors[`${type.kind}.number`] = `Enter the ${type.numberLabel}`
    else if (!CREDENTIAL_NUMBER_PATTERN.test(number)) errors[`${type.kind}.number`] = 'Use letters, digits, / . - and spaces (2 to 40 characters)'
    if (type.holder === 'person' && !entry.holderName.trim()) errors[`${type.kind}.holderName`] = 'Enter their full name'
    if (type.expires && !type.optionalOnly && !entry.expiresAt) errors[`${type.kind}.expiresAt`] = 'Enter the expiry date'
    if (entry.expiresAt && entry.expiresAt < now) errors[`${type.kind}.expiresAt`] = 'This licence has expired. Renew it before applying'
    if (type.document && !type.optionalOnly && !entry.file) errors[`${type.kind}.file`] = 'Upload the certificate (PDF, JPG or PNG)'
    if (entry.file) totalBytes += entry.file.size
    credentials.push({
      kind: type.kind,
      number: number.toUpperCase(),
      holderName: entry.holderName.trim() || undefined,
      expiresAt: entry.expiresAt ? new Date(`${entry.expiresAt}T23:59:59`).toISOString() : undefined,
      document: entry.file ? { originalName: entry.file.name, mimeType: entry.file.type, sizeBytes: entry.file.size, dataUrl: entry.file.dataUrl } : undefined,
    })
  }

  requiredCards.forEach(card => check(card.type, true))
  optionalCards.forEach(type => check(type, false))

  if (needsBusinessRegistration(services) && !state.businessRegNumber.trim()) errors['business.registration'] = 'Enter the registration number'
  if (!state.taxPin.trim()) errors['business.tax'] = `Enter the ${BUSINESS_FIELDS[country].tax}`
  if (totalBytes > MAX_TOTAL_BYTES) errors.files = 'The certificates add up to more than 15 MB. Upload smaller scans or photos.'

  return { errors, credentials }
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface Props {
  country: CredentialCountry | null
  services: string[]
  value: LicencesState
  onChange: (next: LicencesState) => void
  errors: Record<string, string>
  focusColor?: string
  focusShadow?: string
}

export function ProviderLicencesSection({ country, services, value, onChange, errors, focusColor, focusShadow }: Props) {
  const [showOptional, setShowOptional] = useState(false)

  if (!country) {
    return <Note tone="error">Pick your practice location in step 1 so we know which regulators apply.</Note>
  }
  if (services.length === 0) {
    return <Note>Choose your services in the previous step to see which licences we need.</Note>
  }

  const { required } = credentialsFor(country, services)
  const { requiredCards, optionalCards } = cardsFor(country, services, value.choices)
  const business = BUSINESS_FIELDS[country]

  const setEntry = (kind: string, patch: Partial<LicenceEntry>) =>
    onChange({ ...value, entries: { ...value.entries, [kind]: { ...(value.entries[kind] ?? EMPTY_ENTRY), ...patch } } })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: font.family }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Licences</div>
        <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 4, lineHeight: 1.55 }}>
          Based on the services you picked. We check each one with its regulator before your practice goes live.
        </div>
      </div>

      {requiredCards.map(({ group, type }) => (
        <div key={groupKey(group)}>
          {group.length > 1 && (
            <div role="radiogroup" aria-label="Who licenses this practice?" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: C.textSub, alignSelf: 'center' }}>Licensed by:</span>
              {group.map(kind => {
                const option = credentialType(kind)!
                const active = type.kind === kind
                return (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ ...value, choices: { ...value.choices, [groupKey(group)]: kind } })}
                    style={{ padding: '6px 12px', borderRadius: radius.full, border: `1.5px solid ${active ? C.blue500 : C.border}`, background: active ? C.blue100 : '#fff', color: active ? C.navy800 : C.textSub, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: font.family }}
                  >
                    {option.regulator}
                  </button>
                )
              })}
            </div>
          )}
          <LicenceCard type={type} entry={value.entries[type.kind] ?? EMPTY_ENTRY} onChange={patch => setEntry(type.kind, patch)} errors={errors} required focusColor={focusColor} focusShadow={focusShadow} />
        </div>
      ))}

      <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Business details</div>
        <GGInput
          label={needsBusinessRegistration(services) ? business.registration : `${business.registration} (optional)`}
          value={value.businessRegNumber}
          onChange={e => onChange({ ...value, businessRegNumber: e.target.value })}
          required={needsBusinessRegistration(services)}
          error={errors['business.registration']}
          focusColor={focusColor}
          focusShadow={focusShadow}
        />
        <GGInput
          label={business.tax}
          value={value.taxPin}
          onChange={e => onChange({ ...value, taxPin: e.target.value })}
          required
          error={errors['business.tax']}
          focusColor={focusColor}
          focusShadow={focusShadow}
        />
      </div>

      {optionalCards.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowOptional(v => !v)} aria-expanded={showOptional} style={{ background: 'none', border: 'none', padding: 0, color: '#0B7BC0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
            {showOptional ? 'Hide optional details' : `Add optional details (${optionalCards.map(t => t.label).join(', ')})`}
          </button>
          {showOptional && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {optionalCards.map(type => (
                <LicenceCard key={type.kind} type={type} entry={value.entries[type.kind] ?? EMPTY_ENTRY} onChange={patch => setEntry(type.kind, patch)} errors={errors} focusColor={focusColor} focusShadow={focusShadow} />
              ))}
            </div>
          )}
        </div>
      )}

      {errors.files && <Note tone="error">{errors.files}</Note>}
      {required.length === 0 && <Note>No licence is needed for the services you picked.</Note>}
    </div>
  )
}

function LicenceCard({ type, entry, onChange, errors, required, focusColor, focusShadow }: {
  type: CredentialType
  entry: LicenceEntry
  onChange: (patch: Partial<LicenceEntry>) => void
  errors: Record<string, string>
  required?: boolean
  focusColor?: string
  focusShadow?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const err = (field: string) => errors[`${type.kind}.${field}`]

  const pickFile = async (file: File | undefined) => {
    setFileError(null)
    if (!file) return
    if (!CREDENTIAL_FILE_TYPES.includes(file.type)) return setFileError('Use a PDF, JPG or PNG file')
    if (file.size > CREDENTIAL_FILE_MAX_BYTES) return setFileError('The file is larger than 5 MB')
    try {
      onChange({ file: { name: file.name, type: file.type, size: file.size, dataUrl: await readFile(file) } })
    } catch {
      setFileError('That file could not be read. Try another one.')
    }
  }

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
          {type.label}
          {!required && <span style={{ fontWeight: 500, color: C.textSub }}> (optional)</span>}
        </div>
        <div style={{ fontSize: 12, color: C.textSub }}>{type.regulator}</div>
      </div>

      {type.holder === 'person' && (
        <GGInput
          label="Full name"
          value={entry.holderName}
          onChange={e => onChange({ holderName: e.target.value })}
          required={required}
          error={err('holderName')}
          focusColor={focusColor}
          focusShadow={focusShadow}
        />
      )}
      <GGInput
        label={type.numberLabel}
        placeholder={type.example ? `e.g. ${type.example}` : 'As printed on the certificate'}
        value={entry.number}
        onChange={e => onChange({ number: e.target.value })}
        required={required}
        error={err('number')}
        focusColor={focusColor}
        focusShadow={focusShadow}
      />
      {type.expires && (
        <GGInput
          label="Expiry date"
          type="date"
          value={entry.expiresAt}
          onChange={e => onChange({ expiresAt: e.target.value })}
          required={required && !type.optionalOnly}
          error={err('expiresAt')}
          focusColor={focusColor}
          focusShadow={focusShadow}
        />
      )}
      {type.document && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            Certificate {required && !type.optionalOnly && <span style={{ color: C.error }}>*</span>}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" style={{ display: 'none' }} onChange={e => { void pickFile(e.target.files?.[0]); e.target.value = '' }} />
          {entry.file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: radius.sm, border: `1px solid ${C.border}`, background: C.bg }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.file.name}</span>
              <span style={{ fontSize: 12, color: C.textSub }}>{(entry.file.size / (1024 * 1024)).toFixed(1)} MB</span>
              <button type="button" onClick={() => fileRef.current?.click()} style={linkBtn}>Replace</button>
              <button type="button" onClick={() => onChange({ file: null })} style={{ ...linkBtn, color: C.error }}>Remove</button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '16px', borderRadius: radius.sm, border: `2px dashed ${err('file') || fileError ? C.error : C.border}`, background: C.bg, color: C.textSub, fontSize: 13, cursor: 'pointer', fontFamily: font.family }}>
              Upload a PDF, JPG or PNG (up to 5 MB)
            </button>
          )}
          {(fileError || err('file')) && <div style={{ fontSize: 12, color: C.error, fontWeight: 500, marginTop: 4 }}>{fileError || err('file')}</div>}
        </div>
      )}
    </div>
  )
}

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, color: '#0B7BC0', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }

function Note({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: radius.sm, border: `1px solid ${tone === 'error' ? `${C.error}55` : C.border}`, background: tone === 'error' ? '#FFF3F2' : C.bg, color: tone === 'error' ? C.error : C.textSub, fontSize: 12.5, lineHeight: 1.55, fontFamily: font.family }}>
      {children}
    </div>
  )
}
