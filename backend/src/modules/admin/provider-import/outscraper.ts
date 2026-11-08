import { isEmail } from 'class-validator'
import { normalizeRegion } from '../../../common/constants/health-data'
import { coordinatePair } from '../../../common/utils/provider-location'

/** An Outscraper Google Maps export always has these columns. Matching is case-insensitive. */
export function isOutscraperHeaders(headers: string[]): boolean {
  const names = new Set(headers.map(h => h.trim().toLowerCase()))
  return ['name', 'place_id', 'latitude'].every(h => names.has(h))
}

export type CountryCode = 'KE' | 'ZW' | 'ZM'

const COUNTRY_NAMES: Record<CountryCode, string> = { KE: 'Kenya', ZW: 'Zimbabwe', ZM: 'Zambia' }

export function countryCodeOf(value: string): CountryCode | undefined {
  const code = value.trim().toUpperCase()
  return code === 'KE' || code === 'ZW' || code === 'ZM' ? code : undefined
}

export function countryNameOf(code: CountryCode): string {
  return COUNTRY_NAMES[code]
}

/** GG'APP service name -> Outscraper category text that maps to it (matched case-insensitively, exact text). */
const SERVICE_SYNONYMS: Record<string, string[]> = {
  Pharmacy: ['pharmacy', 'drug store', 'chemist'],
  Hospital: ['hospital', 'medical center', 'medical centre', 'maternity hospital', 'general hospital'],
  Clinic: [
    'medical clinic', 'clinic', 'dental clinic', 'specialized clinic', 'skin care clinic', 'eye care center', 'dialysis center',
    'fertility clinic', 'reproductive health clinic', "women's health clinic", 'mental health service', 'cancer treatment center',
  ],
  Doctor: [
    'doctor', 'dentist', 'dermatologist', 'obstetrician-gynecologist', 'psychiatrist', 'fertility physician', 'pediatrician',
    'physician', 'general practitioner', 'surgeon', 'gynecologist',
  ],
  Laboratory: ['medical laboratory', 'laboratory', 'diagnostic laboratory'],
  Radiology: ['radiologist', 'medical diagnostic imaging center', 'diagnostic center', 'x-ray lab', 'mri center'],
}

const SERVICE_BY_TEXT = new Map<string, string>(
  Object.entries(SERVICE_SYNONYMS).flatMap(([service, names]) => names.map(name => [name, service] as [string, string])),
)

/** Businesses that sell to or support care providers but don't treat patients. */
const NOT_CARE = /\b(supplier|suppliers|store|shop|company|office|wholesaler|distributor|manufacturer|consultant|examiner|ayurvedic)\b/

/**
 * Exact synonyms first, then patterns for the long tail of Google categories
 * ("Cardiologist", "Private hospital", "Urology clinic", "Community health center", ...).
 */
function serviceForText(text: string): string | undefined {
  const key = labelKey(text)
  const exact = SERVICE_BY_TEXT.get(key)
  if (exact) return exact
  if (!key || NOT_CARE.test(key)) return undefined
  if (/\bpharmac(y|ies)\b|\bchemist\b/.test(key)) return 'Pharmacy'
  if (/\bhospital\b/.test(key)) return 'Hospital'
  if (/\b(imaging|radiolog\w*|x-ray|mri|ultrasound)\b/.test(key)) return 'Radiology'
  if (/\blaborator(y|ies)\b|\blab\b/.test(key)) return 'Laboratory'
  if (/\b(clinic|health cent(er|re)|medical cent(er|re)|emergency care|urgent care|dialysis)\b/.test(key)) return 'Clinic'
  if (/(ologist|physician|surgeon|practitioner|pediatrician|paediatrician|dentist|endoscopist|orthodontist)\b/.test(key)) return 'Doctor'
  return undefined
}

/** Counties (Kenya) for towns that are not county names. Values must be on REGIONS_BY_COUNTRY. */
const CITY_TO_COUNTY: Record<string, string> = {
  thika: 'Kiambu', 'thika town': 'Kiambu', ruiru: 'Kiambu', juja: 'Kiambu', kikuyu: 'Kiambu', kiambu: 'Kiambu', ruaka: 'Kiambu',
  mombasa: 'Mombasa', kisumu: 'Kisumu', nakuru: 'Nakuru', naivasha: 'Nakuru', eldoret: 'Uasin Gishu',
  machakos: 'Machakos', 'athi river': 'Machakos', kajiado: 'Kajiado', kitengela: 'Kajiado', 'ongata rongai': 'Kajiado',
}

function labelKey(value: string): string {
  return value.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()
}

function splitList(value: string): string[] {
  return value.split(',').map(part => part.trim()).filter(Boolean)
}

function firstQueryPart(query: string): string {
  return query.split(',')[0].trim()
}

/**
 * Service types for one place. The `type` category maps first, then each `subtypes` entry, so a hospital
 * that also lists a pharmacy gets both. Without a type or subtypes, the first part of the search query is used.
 */
export function serviceTypesFor(type: string, subtypes: string, query: string): { serviceTypes: string[]; label: string } {
  const subtypeList = splitList(subtypes)
  const fallback = firstQueryPart(query)
  const texts = type || subtypeList.length ? [type, ...subtypeList] : [fallback]
  const serviceTypes = [...new Set(texts.map(text => serviceForText(text)).filter((s): s is string => !!s))]
  return { serviceTypes, label: type || subtypeList[0] || fallback || 'no category' }
}

/** Google marks a place closed with CLOSED_TEMPORARILY or CLOSED_PERMANENTLY. */
export function isClosedOnGoogle(businessStatus: string): boolean {
  return /^CLOSED_/i.test(businessStatus.trim())
}

/** Spaces and dashes removed, so `+254 769 594234` is stored as `+254769594234`. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, '')
}

/** Valid, unique emails from the candidate cells in priority order; invalid ones are reported separately. */
export function pickEmails(values: string[]): { emails: string[]; invalid: string[] } {
  const candidates = [...new Set(values.flatMap(value => value.split(/[,;\s]+/)).map(v => v.trim().toLowerCase()).filter(Boolean))]
  return { emails: candidates.filter(e => isEmail(e)), invalid: candidates.filter(e => !isEmail(e)) }
}

/** Parts of a free-text location to try, e.g. "Nairobi City" -> "Nairobi", "45655 Nairobi" -> "Nairobi". */
function placeCandidates(value: string): string[] {
  const parts = [value, ...value.split(',')]
    .map(part => part.replace(/^\d+\s+/, '').replace(/\s+(city|town)$/i, '').trim())
    .filter(Boolean)
  return [...new Set(parts)]
}

/** Standard region for the city, then for the county field. Outscraper's county is usually a neighbourhood, so it rarely matches. */
export function regionFor(country: CountryCode | undefined, city: string, county: string): string | undefined {
  if (!country) return undefined
  for (const value of [city, county]) {
    for (const candidate of placeCandidates(value)) {
      const direct = normalizeRegion(country, candidate)
      if (direct) return direct
      const mapped = country === 'KE' ? CITY_TO_COUNTY[candidate.toLowerCase()] : undefined
      const viaTown = mapped ? normalizeRegion(country, mapped) : null
      if (viaTown) return viaTown
    }
  }
  return undefined
}

/** Coordinates when both are valid and not the 0,0 placeholder. */
export function coordinatesOf(lat: string, lng: string): { lat: number; lng: number } | undefined {
  if (!lat || !lng) return undefined
  try {
    const point = coordinatePair(lat, lng)
    return point.lat === 0 && point.lng === 0 ? undefined : point
  } catch {
    return undefined
  }
}

export const OPENING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export type OpeningDay = (typeof OPENING_DAYS)[number]
export interface OpeningEntry { day: OpeningDay; status: 'open' | 'closed'; from?: string; to?: string }

const MINUTES_PER_DAY = 24 * 60
const LAST_MINUTE = MINUTES_PER_DAY - 1
const TWELVE_HOURS = 12 * 60

function dayOf(key: string): OpeningDay | undefined {
  const short = key.trim().slice(0, 3).toLowerCase()
  return OPENING_DAYS.find(day => day.toLowerCase() === short)
}

/** Lower case, unicode dashes and spaces made ASCII, and dots read as clock colons ("9.30am", "a.m."). */
function normalizeTime(value: string): string {
  return value
    .replace(/[\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/[\u00a0\u2009\u202f]/g, ' ')
    .replace(/([ap])\.m\.?/gi, '$1m')
    .replace(/\./g, ':')
    .replace(/\s+/g, ' ')
    .replace(/[:\s]+$/, '')
    .trim()
    .toLowerCase()
}

interface Clock { hour: number; minute: number; meridiem?: 'am' | 'pm' }

function parseClock(text: string): Clock | undefined {
  if (text === 'noon') return { hour: 12, minute: 0, meridiem: 'pm' }
  if (text === 'midnight') return { hour: 12, minute: 0, meridiem: 'am' }
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(text)
  if (!match) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2] ?? 0)
  const meridiem = match[3] as 'am' | 'pm' | undefined
  if (minute > 59) return undefined
  if (meridiem ? hour < 1 || hour > 12 : hour > 24) return undefined
  return { hour, minute, meridiem }
}

/** Minutes after midnight this clock time could mean. An unlabelled 1-12 has an am and a pm reading. */
function candidates(clock: Clock, closing: boolean): number[] {
  const { hour, minute, meridiem } = clock
  let values: number[]
  if (meridiem) values = [((hour % 12) + (meridiem === 'pm' ? 12 : 0)) * 60 + minute]
  else if (hour === 0 || hour > 12) values = [hour * 60 + minute]
  else values = [(hour % 12) * 60 + minute, (hour % 12 + 12) * 60 + minute]
  // A closing time of 12am means the end of that day, not the start.
  return values.map(value => (closing && value === 0 ? MINUTES_PER_DAY : value))
}

/** Picks the reading that gives the shortest opening period, so "2-4pm" is 14:00-16:00 and "9-5pm" is 09:00-17:00. */
function rangeOf(start: Clock, end: Clock): [number, number] | undefined {
  const starts = candidates(start, false)
  const ends = candidates(end, true)
  // "8am-5am" is almost always 8am-5pm.
  const bothAm = start.meridiem === 'am' && end.meridiem === 'am'
  let best: [number, number] | undefined
  for (const from of starts) {
    for (const to0 of ends) {
      for (const to of bothAm ? [to0, to0 + TWELVE_HOURS] : [to0]) {
        if (to > from && (!best || to - from < best[1] - best[0])) best = [from, to]
      }
    }
  }
  if (best) return [best[0], Math.min(best[1], LAST_MINUTE)]
  // Both times are labelled, so an overnight period such as 6pm-2am is kept as written.
  if (start.meridiem && end.meridiem) return [starts[0], Math.min(ends[0], LAST_MINUTE)]
  return undefined
}

function parseRange(text: string): [number, number] | undefined {
  const parts = text.split('-')
  if (parts.length !== 2) return undefined
  const start = parseClock(parts[0].trim())
  const end = parseClock(parts[1].trim())
  return start && end ? rangeOf(start, end) : undefined
}

function clockText(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

/** One day's texts, e.g. ["9am-9:30pm"] or ["8am-1pm", "2pm-6pm"]. Several ranges become first opening to last closing. */
function dayEntry(texts: string[]): Omit<OpeningEntry, 'day'> | undefined {
  // Ranges can arrive as separate array items or joined by commas in one text.
  const items = texts.flatMap(text => normalizeTime(text).split(',')).map(item => item.trim()).filter(item => item && item !== 'closed')
  if (!items.length) return { status: 'closed' }
  if (items.some(text => /^open 24 hours?$/.test(text))) return { status: 'open', from: '00:00', to: '23:59' }
  const ranges: Array<[number, number]> = []
  for (const item of items) {
    const range = parseRange(item)
    if (!range) return undefined
    ranges.push(range)
  }
  return { status: 'open', from: clockText(ranges[0][0]), to: clockText(ranges[ranges.length - 1][1]) }
}

/**
 * Outscraper `working_hours` JSON (`{"Monday": ["9am-5pm"], ...}`) as registration hours, Monday first.
 * Returns null when the value is missing, not JSON, or any day cannot be read.
 */
export function parseOpeningHours(raw: string): OpeningEntry[] | null {
  if (!raw.trim()) return null
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return null }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const byDay = new Map<OpeningDay, unknown>()
  for (const [key, value] of Object.entries(parsed)) {
    const day = dayOf(key)
    if (day) byDay.set(day, value)
  }
  const entries: OpeningEntry[] = []
  for (const day of OPENING_DAYS) {
    if (!byDay.has(day)) continue
    const value = byDay.get(day)
    const texts: unknown[] = Array.isArray(value) ? value : [value]
    if (texts.some(text => typeof text !== 'string')) return null
    const entry = dayEntry(texts as string[])
    if (!entry) return null
    entries.push({ day, ...entry })
  }
  return entries.length ? entries : null
}

export interface MappedOutscraperRecord {
  practiceName: string
  address: string
  road?: string
  city?: string
  locationLabel?: string
  region?: string
  country?: string
  countryCode?: CountryCode
  coords?: { lat: number; lng: number }
  phone: string
  /** Valid emails in priority order. The first is the primary email, the second the secondary. */
  emails: string[]
  invalidEmails: string[]
  serviceTypes: string[]
  /** Category text used in the "Not a care provider" message. */
  serviceLabel: string
  closed: boolean
  hours: OpeningEntry[] | null
  website?: string
  placeId?: string
  googleMapsUrl?: string
}

/** Maps one Outscraper row (lower-case header -> cell text) to GG'APP fields. Pure: no database access. */
export function mapOutscraperRecord(data: Record<string, string>): MappedOutscraperRecord {
  const get = (key: string) => (data[key] ?? '').trim()
  const countryCode = countryCodeOf(get('country_code'))
  const city = get('city')
  const county = get('county')
  const { serviceTypes, label } = serviceTypesFor(get('type'), get('subtypes'), get('query'))
  const { emails, invalid } = pickEmails(['email_1', 'email', 'emails', 'email_2', 'email_3'].map(get))
  return {
    practiceName: get('name'),
    address: get('address'),
    road: get('street') || undefined,
    city: city || undefined,
    locationLabel: county && county.toLowerCase() !== 'none' ? county : undefined,
    region: regionFor(countryCode, city, county),
    country: countryCode ? COUNTRY_NAMES[countryCode] : undefined,
    countryCode,
    coords: coordinatesOf(get('latitude'), get('longitude')),
    phone: normalizePhone(get('phone')),
    emails,
    invalidEmails: invalid,
    serviceTypes,
    serviceLabel: label,
    closed: isClosedOnGoogle(get('business_status')),
    hours: parseOpeningHours(get('working_hours')),
    website: get('website') || undefined,
    placeId: get('place_id') || undefined,
    googleMapsUrl: get('location_link') || undefined,
  }
}
