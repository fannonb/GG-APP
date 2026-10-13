import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import {
  AppointmentStatus,
  CreditApplicationStatus,
  CreditStatus,
  InvoiceStatus,
  LedgerAuditAction,
  PrescriptionRequestStatus,
  ProviderApplicationStatus,
  ProviderLifecycleStatus,
  UserRole,
  UserStatus,
} from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { FieldEncryptionService } from '../../common/services/field-encryption.service'
import { decryptClinicalField } from '../../common/utils/clinical-field.util'
import { AGE_BANDS, ageBandOf, CONDITION_GROUP_LABEL, conditionOf, CREDIT_BANDS, DAY_HOURS, REPAYMENT_METHODS } from '../../common/constants/health-data'

/**
 * Admin analytics computed from live data.
 *
 * Every page takes a country (KE / ZW / ZM / all) and a range (7d / 30d / 90d / 12m),
 * and compares with the period just before it. Money is always reported per
 * country in that country's currency and is never added across countries.
 *
 * Volumes are small today, so records in the window are loaded and aggregated
 * in memory; move the heavy pages to SQL GROUP BY once a window exceeds ~50k rows.
 */

export type MetricsCountry = 'KE' | 'ZW' | 'ZM'
export type MetricsRange = '7d' | '30d' | '90d' | '12m'

const COUNTRIES: MetricsCountry[] = ['KE', 'ZW', 'ZM']
const DAY = 86_400_000
const MIN_GROUP = 5 // clinical groups smaller than this are hidden so patients can't be singled out

const COUNTRY_ALIASES: Record<string, MetricsCountry> = {
  KE: 'KE', KENYA: 'KE',
  ZW: 'ZW', ZIMBABWE: 'ZW',
  ZM: 'ZM', ZAMBIA: 'ZM',
}

/** Providers store country as a code or a name ("ZW", "Kenya"); patients store a code. */
export function normalizeCountry(value: string | null | undefined): MetricsCountry | null {
  if (!value) return null
  return COUNTRY_ALIASES[value.trim().toUpperCase()] ?? null
}

interface Window {
  from: Date
  to: Date
  prevFrom: Date
  bucket: 'day' | 'week' | 'month'
  buckets: Array<{ key: string; label: string; start: Date }>
}

const toNumber = (value: unknown) => (value == null ? 0 : Number(value))
const median = (values: number[]) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null)
const round = (value: number | null, dp = 1) => (value == null ? null : Math.round(value * 10 ** dp) / 10 ** dp)
const within = (date: Date | null | undefined, from: Date, to: Date) => !!date && date >= from && date < to

const APPROVED_INVOICE = new Set<InvoiceStatus>([InvoiceStatus.AUTHORIZED, InvoiceStatus.PAID])

// Keyword groups for free-text diagnoses. Order matters: first match wins.
const DIAGNOSIS_GROUPS: Array<{ group: string; words: RegExp }> = [
  { group: 'Malaria & fevers', words: /malaria|typhoid|fever|febrile/i },
  { group: 'Respiratory infections', words: /respirat|cough|flu|influenza|pneumon|bronch|tonsil|pharyng|sinus|cold|urti|strep/i },
  { group: 'Hypertension & heart', words: /hypertens|blood pressure|cardiac|heart|angina/i },
  { group: 'Diabetes & metabolic', words: /diabet|glucose|sugar|thyroid|cholesterol/i },
  { group: 'Stomach & gut', words: /gastr|diarrh|vomit|ulcer|stomach|abdomin|cholera|amoeb/i },
  { group: 'Ear, eye & skin', words: /otitis|ear|eye|conjunctiv|skin|rash|derma|fung/i },
  { group: 'Urinary & sexual health', words: /urinary|uti|bladder|kidney|sti|std|hiv/i },
  { group: 'Maternal & child', words: /pregnan|antenatal|prenatal|maternal|postnatal|immuni|vaccin|child/i },
  { group: 'Injuries', words: /injur|fractur|wound|sprain|burn|trauma/i },
  { group: 'Mental health', words: /depress|anxiety|stress|mental|insomnia/i },
  { group: 'Pain & muscles', words: /back pain|arthrit|joint|muscle|headache|migraine/i },
]

function diagnosisGroup(text: string | null) {
  if (!text) return null
  return DIAGNOSIS_GROUPS.find(g => g.words.test(text))?.group ?? 'Other'
}

function bpBand(value: string | undefined) {
  const match = value?.match(/(\d{2,3})\s*\/\s*(\d{2,3})/)
  if (!match) return null
  const sys = Number(match[1])
  const dia = Number(match[2])
  if (sys >= 140 || dia >= 90) return 'High (stage 2)'
  if (sys >= 130 || dia >= 80) return 'High (stage 1)'
  if (sys >= 120) return 'Elevated'
  return 'Normal'
}

function ageAt(dob: Date, at: Date) {
  return Math.floor((at.getTime() - dob.getTime()) / (365.25 * DAY))
}
function ageBand(dob: Date, now: Date) {
  return ageBandOf(ageAt(dob, now))
}
const AGE_ORDER = AGE_BANDS.map(b => b.name)

/** Hours ahead of UTC in each market (no daylight saving in any of them). */
const UTC_OFFSET: Record<MetricsCountry, number> = { KE: 3, ZW: 2, ZM: 2 }
function localHour(date: Date, country: MetricsCountry | null) {
  return (date.getUTCHours() + (country ? UTC_OFFSET[country] : 3)) % 24
}

/** "Up to 5,000", "5,001–15,000", …, "Over 60,000" for a list of upper edges. */
function creditBandLabels(edges: number[]) {
  const f = (n: number) => n.toLocaleString('en-US')
  return [
    `Up to ${f(edges[0])}`,
    ...edges.slice(1).map((e, i) => `${f(edges[i] + 1)}–${f(e)}`),
    `Over ${f(edges[edges.length - 1])}`,
  ]
}

const GENDER_LABEL: Record<string, string> = { female: 'Female', male: 'Male', prefer_not_to_say: 'Prefer not to say' }
const REPAYMENT_LABEL: Record<string, string> = Object.fromEntries(REPAYMENT_METHODS.map(m => [m.code, m.label]))

/** Parses "14:30" / "2:30 PM" style labels into an hour of the day. */
function hourOf(label: string | null | undefined) {
  const match = label?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!match) return null
  let hour = Number(match[1])
  const meridiem = match[3]?.toLowerCase()
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  return hour >= 0 && hour < 24 ? hour : null
}

function countBy<T>(items: T[], key: (item: T) => string | null | undefined) {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    if (k) map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

@Injectable()
export class AdminMetricsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FieldEncryptionService) private readonly encryption: FieldEncryptionService,
  ) {}

  // ── shared helpers ────────────────────────────────────────────────────────

  parseCountry(value?: string): MetricsCountry | 'all' {
    if (!value || value.toLowerCase() === 'all') return 'all'
    const code = normalizeCountry(value)
    if (!code) throw new BadRequestException('country must be KE, ZW, ZM or all')
    return code
  }

  private window(range?: string): Window {
    const r = (['7d', '30d', '90d', '12m'] as MetricsRange[]).includes(range as MetricsRange) ? (range as MetricsRange) : '30d'
    const now = new Date()
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) // end of today
    const buckets: Window['buckets'] = []
    let from: Date
    let bucket: Window['bucket']
    if (r === '12m') {
      bucket = 'month'
      from = new Date(to.getFullYear(), to.getMonth() - 11, 1)
      for (let i = 0; i < 12; i++) {
        const start = new Date(from.getFullYear(), from.getMonth() + i, 1)
        buckets.push({ key: start.toISOString(), start, label: start.toLocaleDateString('en-GB', { month: 'short' }) })
      }
    } else {
      const days = r === '7d' ? 7 : r === '30d' ? 30 : 91
      from = new Date(to.getTime() - days * DAY)
      bucket = r === '90d' ? 'week' : 'day'
      const step = bucket === 'week' ? 7 : 1
      for (let d = 0; d < days; d += step) {
        const start = new Date(from.getTime() + d * DAY)
        buckets.push({ key: start.toISOString(), start, label: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) })
      }
    }
    const span = to.getTime() - from.getTime()
    return { from, to, prevFrom: new Date(from.getTime() - span), bucket, buckets }
  }

  private bucketIndex(win: Window, date: Date) {
    for (let i = win.buckets.length - 1; i >= 0; i--) {
      if (date >= win.buckets[i].start) return i
    }
    return -1
  }

  private series(win: Window, dates: Array<Date | null | undefined>) {
    const out = win.buckets.map(() => 0)
    for (const d of dates) {
      if (!within(d, win.from, win.to)) continue
      const i = this.bucketIndex(win, d!)
      if (i >= 0) out[i] += 1
    }
    return out
  }

  private patientWhere(country: MetricsCountry | 'all') {
    return country === 'all' ? {} : { patientProfile: { countryCode: country } }
  }

  /** Provider ids in scope; null means every provider. */
  private async providerIds(country: MetricsCountry | 'all') {
    if (country === 'all') return null
    const providers = await this.prisma.provider.findMany({ select: { id: true, country: true } })
    return providers.filter(p => normalizeCountry(p.country) === country).map(p => p.id)
  }

  private async providerCountryMap() {
    const providers = await this.prisma.provider.findMany({ select: { id: true, country: true, name: true, category: true, region: true } })
    return new Map(providers.map(p => [p.id, { ...p, code: normalizeCountry(p.country) }]))
  }

  private meta(country: MetricsCountry | 'all', win: Window, range?: string) {
    return {
      country,
      range: (range ?? '30d') as MetricsRange,
      from: win.from.toISOString(),
      to: win.to.toISOString(),
      bucket: win.bucket,
      labels: win.buckets.map(b => b.label),
    }
  }

  /** `note` says what a figure covers when it has no previous period to compare with. */
  private kpi(key: string, label: string, current: number | null, previous: number | null, format: 'count' | 'percent' | 'hours', series?: number[], note?: string) {
    return { key, label, value: current, previous, format, series, ...(note ? { note } : {}) }
  }

  // ── Overview ──────────────────────────────────────────────────────────────

  async overview(countryParam?: string, range?: string) {
    const country = this.parseCountry(countryParam)
    const win = this.window(range)
    const providerIds = await this.providerIds(country)
    const providerFilter = providerIds ? { providerId: { in: providerIds } } : {}
    const providers = await this.providerCountryMap()

    const [patients, appointments, invoices, creditApps, prescriptions, pendingSp, failedPins] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.PATIENT, ...this.patientWhere(country) },
        select: {
          id: true,
          createdAt: true,
          status: true,
          patientProfile: { select: { countryCode: true, creditStatus: true } },
        },
      }),
      this.prisma.appointment.findMany({ where: providerFilter, select: { patientUserId: true, providerId: true, requestedAt: true, status: true } }),
      this.prisma.invoice.findMany({ where: providerFilter, select: { patientUserId: true, providerId: true, amount: true, status: true, submittedAt: true, paymentAuthorizedAt: true, disputedAt: true } }),
      this.prisma.creditApplication.findMany({
        where: country === 'all' ? {} : { patient: { patientProfile: { countryCode: country } } },
        select: { status: true, submittedAt: true, reviewedAt: true },
      }),
      this.prisma.prescriptionRequest.findMany({ where: providerFilter, select: { patientUserId: true, createdAt: true } }),
      this.prisma.providerApplication.findMany({
        where: { status: { in: [ProviderApplicationStatus.PENDING, ProviderApplicationStatus.INFO_REQUESTED] } },
        select: { country: true },
      }),
      this.prisma.ledgerAccessAudit.count({ where: { action: LedgerAuditAction.UNLOCK_FAILED, createdAt: { gte: new Date(Date.now() - 7 * DAY) }, ...(providerIds ? { providerId: { in: providerIds } } : {}) } }),
    ])

    const inRange = (d: Date | null | undefined) => within(d, win.from, win.to)
    const inPrev = (d: Date | null | undefined) => within(d, win.prevFrom, win.from)

    const activeIn = (test: (d: Date | null | undefined) => boolean) => new Set([
      ...appointments.filter(a => test(a.requestedAt)).map(a => a.patientUserId),
      ...invoices.filter(i => test(i.submittedAt)).map(i => i.patientUserId),
      ...prescriptions.filter(r => test(r.createdAt)).map(r => r.patientUserId),
    ]).size

    const decided = (test: (d: Date | null | undefined) => boolean) => invoices.filter(i => test(i.submittedAt) && i.status !== InvoiceStatus.PENDING_AUTH)
    const approvalRate = (test: (d: Date | null | undefined) => boolean) => {
      const d = decided(test)
      return pct(d.filter(i => APPROVED_INVOICE.has(i.status)).length, d.length)
    }

    const spendByCountry = (test: (d: Date | null | undefined) => boolean) => {
      const totals: Partial<Record<MetricsCountry, number>> = {}
      for (const inv of invoices) {
        if (!APPROVED_INVOICE.has(inv.status) || !test(inv.paymentAuthorizedAt ?? inv.submittedAt)) continue
        const code = providers.get(inv.providerId)?.code
        if (!code) continue
        totals[code] = (totals[code] ?? 0) + toNumber(inv.amount)
      }
      return totals
    }
    const spendNow = spendByCountry(inRange)
    const spendPrev = spendByCountry(inPrev)

    const kpis = [
      this.kpi('newPatients', 'New patients', patients.filter(p => inRange(p.createdAt)).length, patients.filter(p => inPrev(p.createdAt)).length, 'count', this.series(win, patients.map(p => p.createdAt))),
      this.kpi('activePatients', 'Active patients', activeIn(inRange), activeIn(inPrev), 'count'),
      this.kpi('appointments', 'Appointments booked', appointments.filter(a => inRange(a.requestedAt)).length, appointments.filter(a => inPrev(a.requestedAt)).length, 'count', this.series(win, appointments.map(a => a.requestedAt))),
      this.kpi('creditApproved', 'Credit approved', creditApps.filter(c => c.status === CreditApplicationStatus.APPROVED && inRange(c.reviewedAt)).length, creditApps.filter(c => c.status === CreditApplicationStatus.APPROVED && inPrev(c.reviewedAt)).length, 'count', this.series(win, creditApps.filter(c => c.status === CreditApplicationStatus.APPROVED).map(c => c.reviewedAt))),
      this.kpi('invoiceApproval', 'Invoices approved', approvalRate(inRange), approvalRate(inPrev), 'percent'),
    ]

    const trend = win.buckets.map((b, i) => {
      const end = win.buckets[i + 1]?.start ?? win.to
      const inBucket = (d: Date | null | undefined) => within(d, b.start, end)
      return {
        label: b.label,
        appointments: appointments.filter(a => inBucket(a.requestedAt)).length,
        invoices: invoices.filter(inv => inBucket(inv.submittedAt)).length,
        spend: spendByCountry(inBucket),
      }
    })

    // All-time journey for the patients in scope.
    const booked = new Set(appointments.map(a => a.patientUserId))
    const paid = new Set(invoices.filter(i => APPROVED_INVOICE.has(i.status)).map(i => i.patientUserId))
    const ids = patients.map(p => p.id)
    const funnel = [
      { stage: 'Signed up', value: ids.length },
      { stage: 'Credit approved', value: patients.filter(p => p.patientProfile?.creditStatus === CreditStatus.APPROVED).length },
      { stage: 'Booked care', value: ids.filter(id => booked.has(id)).length },
      { stage: 'Paid with credit', value: ids.filter(id => paid.has(id)).length },
    ]

    const countries = (country === 'all' ? COUNTRIES : [country]).map(code => ({
      country: code,
      patients: patients.filter(p => p.patientProfile?.countryCode === code).length,
      providers: [...providers.values()].filter(p => p.code === code).length,
      appointments: appointments.filter(a => inRange(a.requestedAt) && providers.get(a.providerId)?.code === code).length,
      spend: spendNow[code] ?? 0,
      spendPrevious: spendPrev[code] ?? 0,
    }))

    const queue = {
      providerApplications: pendingSp.filter(a => country === 'all' || normalizeCountry(a.country) === country).length,
      creditApplications: creditApps.filter(c => c.status === CreditApplicationStatus.SUBMITTED).length,
      disputedInvoices: invoices.filter(i => i.status === InvoiceStatus.DISPUTED).length,
      staleInvoices: invoices.filter(i => i.status === InvoiceStatus.PENDING_AUTH && Date.now() - i.submittedAt.getTime() > 2 * DAY).length,
      failedPinAttempts: failedPins,
    }

    return { meta: this.meta(country, win, range), queue, kpis, trend, funnel, countries }
  }

  // ── Money ─────────────────────────────────────────────────────────────────

  async money(countryParam?: string, range?: string) {
    const requested = this.parseCountry(countryParam)
    const win = this.window(range)
    const providers = await this.providerCountryMap()
    const span = win.to.getTime() - win.from.getTime()
    const yearAgoFrom = new Date(win.from.getTime() - 365 * DAY)
    const [invoicesAll, yearAgoAll] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { submittedAt: { gte: win.prevFrom, lt: win.to } },
        select: { id: true, providerId: true, amount: true, walletAmountPaid: true, offAppAmountDue: true, status: true, submittedAt: true, paymentAuthorizedAt: true, paidAt: true, disputedAt: true },
      }),
      // The same window a year earlier: a rough read on how prices are moving.
      this.prisma.invoice.findMany({
        where: { submittedAt: { gte: yearAgoFrom, lt: new Date(yearAgoFrom.getTime() + span) } },
        select: { providerId: true, amount: true },
      }),
    ])

    // Money is per currency: with "all", report the country with the most spend.
    const totalsByCountry = COUNTRIES.map(code => ({
      country: code,
      value: invoicesAll.filter(i => providers.get(i.providerId)?.code === code && within(i.submittedAt, win.from, win.to)).reduce((s, i) => s + toNumber(i.amount), 0),
    }))
    const country: MetricsCountry = requested === 'all'
      ? [...totalsByCountry].sort((a, b) => b.value - a.value)[0].country
      : requested
    const invoices = invoicesAll.filter(i => providers.get(i.providerId)?.code === country)
    const now = invoices.filter(i => within(i.submittedAt, win.from, win.to))
    const prev = invoices.filter(i => within(i.submittedAt, win.prevFrom, win.from))
    const yearAgo = yearAgoAll.filter(i => providers.get(i.providerId)?.code === country)

    const sum = (list: typeof invoices, test?: (s: InvoiceStatus) => boolean) => list.filter(i => !test || test(i.status)).reduce((s, i) => s + toNumber(i.amount), 0)
    const avg = (list: Array<{ amount: unknown }>) => (list.length ? list.reduce((s, i) => s + toNumber(i.amount), 0) / list.length : null)
    const decidedRate = (list: typeof invoices, status: (s: InvoiceStatus) => boolean) => {
      const decided = list.filter(i => i.status !== InvoiceStatus.PENDING_AUTH)
      return pct(decided.filter(i => status(i.status)).length, decided.length)
    }
    const hoursToApprove = (list: typeof invoices) => median(list.filter(i => i.paymentAuthorizedAt).map(i => (i.paymentAuthorizedAt!.getTime() - i.submittedAt.getTime()) / 3_600_000))
    const approved = (s: InvoiceStatus) => APPROVED_INVOICE.has(s)
    const change = (current: number | null, before: number | null) => (current != null && before ? round(((current - before) / before) * 100) : null)

    const kpis = [
      { key: 'approvedValue', label: 'Approved spend', value: sum(now, approved), previous: sum(prev, approved), format: 'money' as const },
      { key: 'invoiced', label: 'Invoiced', value: sum(now), previous: sum(prev), format: 'money' as const },
      { key: 'avgInvoice', label: 'Average invoice', value: avg(now), previous: avg(prev), format: 'money' as const },
      { key: 'approvalRate', label: 'Approval rate', value: decidedRate(now, approved), previous: decidedRate(prev, approved), format: 'percent' as const },
      { key: 'rejectionRate', label: 'Rejected', value: decidedRate(now, s => s === InvoiceStatus.REJECTED), previous: decidedRate(prev, s => s === InvoiceStatus.REJECTED), format: 'percent' as const },
      { key: 'hoursToApprove', label: 'Time to approve', value: round(hoursToApprove(now)), previous: round(hoursToApprove(prev)), format: 'hours' as const },
    ]

    const byStatus = win.buckets.map((b, i) => {
      const end = win.buckets[i + 1]?.start ?? win.to
      const list = now.filter(inv => within(inv.submittedAt, b.start, end))
      return {
        label: b.label,
        approved: sum(list, approved),
        pending: sum(list, s => s === InvoiceStatus.PENDING_AUTH),
        rejected: sum(list, s => s === InvoiceStatus.REJECTED || s === InvoiceStatus.DISPUTED),
      }
    })

    const groupByCategory = (list: Array<{ providerId: number; amount: unknown }>) => {
      const map = new Map<string, Array<{ amount: unknown }>>()
      for (const inv of list) {
        const cat = providers.get(inv.providerId)?.category ?? 'OTHER'
        map.set(cat, [...(map.get(cat) ?? []), inv])
      }
      return map
    }
    const nowByCat = groupByCategory(now)
    const yearAgoByCat = groupByCategory(yearAgo)

    // Every provider with invoices in the period: totals, plus average and median invoice.
    const byProvider = new Map<number, { amounts: number[]; value: number; approved: number; decided: number }>()
    for (const inv of now) {
      const row = byProvider.get(inv.providerId) ?? { amounts: [], value: 0, approved: 0, decided: 0 }
      row.amounts.push(toNumber(inv.amount))
      if (approved(inv.status)) row.value += toNumber(inv.amount)
      if (inv.status !== InvoiceStatus.PENDING_AUTH) row.decided += 1
      if (approved(inv.status)) row.approved += 1
      byProvider.set(inv.providerId, row)
    }
    // Approved but not yet marked paid, across all time: what providers are still owed.
    const owed = await this.prisma.invoice.groupBy({
      by: ['providerId'],
      where: { status: InvoiceStatus.AUTHORIZED },
      _sum: { amount: true },
      _count: true,
    })

    // How approved invoices were settled: GG'APP credit vs paid to the provider directly.
    const approvedNow = now.filter(i => approved(i.status))
    const walletSplit = {
      credit: approvedNow.reduce((s, i) => s + (i.walletAmountPaid != null ? toNumber(i.walletAmountPaid) : toNumber(i.amount)), 0),
      direct: approvedNow.reduce((s, i) => s + toNumber(i.offAppAmountDue), 0),
    }

    const avgNow = avg(now)
    const avgYearAgo = avg(yearAgo)

    return {
      meta: { ...this.meta(country, win, range), requested },
      totalsByCountry,
      kpis,
      byStatus,
      byCategory: [...nowByCat.entries()]
        .map(([category, list]) => {
          const average = avg(list) ?? 0
          const before = avg(yearAgoByCat.get(category) ?? [])
          return { category, average, count: list.length, averageYearAgo: before, change: change(average, before) }
        })
        .sort((a, b) => b.average - a.average),
      priceTrend: { average: avgNow, averageYearAgo: avgYearAgo, change: change(avgNow, avgYearAgo), invoices: now.length, invoicesYearAgo: yearAgo.length },
      walletSplit,
      topProviders: [...byProvider.entries()]
        .map(([id, r]) => ({
          id,
          name: providers.get(id)?.name ?? `Provider ${id}`,
          category: providers.get(id)?.category ?? null,
          invoices: r.amounts.length,
          approvedValue: r.value,
          approvalRate: pct(r.approved, r.decided),
          averageInvoice: r.amounts.reduce((s, a) => s + a, 0) / r.amounts.length,
          medianInvoice: median(r.amounts),
        }))
        .sort((a, b) => b.approvedValue - a.approvedValue),
      owedToProviders: owed
        .filter(o => providers.get(o.providerId)?.code === country)
        .map(o => ({ id: o.providerId, name: providers.get(o.providerId)?.name ?? `Provider ${o.providerId}`, invoices: o._count, value: toNumber(o._sum.amount) }))
        .sort((a, b) => b.value - a.value),
    }
  }

  // ── Patients & credit ─────────────────────────────────────────────────────

  async patients(countryParam?: string, range?: string) {
    const country = this.parseCountry(countryParam)
    const win = this.window(range)
    const now = new Date()
    const [users, creditApps, feedback] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.PATIENT, ...this.patientWhere(country) },
        select: {
          createdAt: true,
          status: true,
          authProvider: true,
          patientProfile: {
            select: {
              countryCode: true, dateOfBirth: true, gender: true, residesAbroad: true,
              creditStatus: true, creditLimit: true, creditUsed: true, financePartnerId: true,
              beneficiaries: { select: { relation: true, dateOfBirth: true, gender: true } },
            },
          },
        },
      }),
      this.prisma.creditApplication.findMany({
        where: country === 'all' ? {} : { patient: { patientProfile: { countryCode: country } } },
        select: { type: true, status: true, employment: true, repaymentMethod: true, requestedAmount: true, approvedAmount: true, financePartnerId: true, submittedAt: true, reviewedAt: true, patient: { select: { patientProfile: { select: { countryCode: true } } } } },
      }),
      this.prisma.appFeedback.findMany({
        where: {
          createdAt: { gte: win.prevFrom, lt: win.to },
          ...(country === 'all' ? {} : { user: { patientProfile: { countryCode: country } } }),
        },
        select: { rating: true, comment: true, role: true, platform: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    const profiles = users.map(u => u.patientProfile).filter((p): p is NonNullable<typeof p> => !!p)
    const family = profiles.flatMap(p => p.beneficiaries)
    const inRange = (d: Date | null | undefined) => within(d, win.from, win.to)
    const inPrev = (d: Date | null | undefined) => within(d, win.prevFrom, win.from)
    const decisionHours = (list: typeof creditApps) => median(list.filter(c => c.reviewedAt).map(c => (c.reviewedAt!.getTime() - c.submittedAt.getTime()) / 3_600_000))
    const approvalRate = (list: typeof creditApps) => {
      const decided = list.filter(c => c.status !== CreditApplicationStatus.SUBMITTED)
      return pct(decided.filter(c => c.status === CreditApplicationStatus.APPROVED).length, decided.length)
    }
    const appsNow = creditApps.filter(c => inRange(c.submittedAt))
    const appsPrev = creditApps.filter(c => inPrev(c.submittedAt))

    const bands = (dobs: Date[]) => {
      const counts = countBy(dobs, d => ageBand(d, now))
      return AGE_ORDER.map(name => ({ name, value: counts.find(a => a.name === name)?.value ?? 0 }))
    }
    const withFamily = profiles.filter(p => p.beneficiaries.length > 0).length

    const ratingsNow = feedback.filter(f => inRange(f.createdAt))
    const ratingsPrev = feedback.filter(f => inPrev(f.createdAt))
    const avgRating = (list: typeof feedback) => (list.length ? round(list.reduce((s, f) => s + f.rating, 0) / list.length) : null)

    return {
      meta: this.meta(country, win, range),
      kpis: [
        this.kpi('signups', 'New sign-ups', users.filter(u => inRange(u.createdAt)).length, users.filter(u => inPrev(u.createdAt)).length, 'count'),
        this.kpi('total', 'All patients', users.length, null, 'count', undefined, 'All time'),
        this.kpi('creditApps', 'Credit applications', appsNow.length, appsPrev.length, 'count'),
        this.kpi('approvalRate', 'Credit approval rate', approvalRate(appsNow), approvalRate(appsPrev), 'percent'),
        this.kpi('decisionHours', 'Time to decide', round(decisionHours(appsNow)), round(decisionHours(appsPrev)), 'hours'),
        this.kpi('family', 'Covering family', pct(withFamily, profiles.length), null, 'percent', undefined, 'Of all patients'),
      ],
      signups: win.buckets.map((b, i) => {
        const end = win.buckets[i + 1]?.start ?? win.to
        return { label: b.label, value: users.filter(u => within(u.createdAt, b.start, end)).length }
      }),
      signupMethod: countBy(users, u => (u.authProvider === 'GOOGLE' ? 'Google' : 'Email')),
      verification: countBy(users, u => (u.status === UserStatus.ACTIVE ? 'Verified' : u.status === UserStatus.SUSPENDED ? 'Suspended' : 'Not verified')),
      ageBands: bands(profiles.map(p => p.dateOfBirth)),
      gender: countBy(profiles, p => p.gender ?? 'Not recorded'),
      country: countBy(profiles, p => p.countryCode),
      abroad: profiles.filter(p => p.residesAbroad).length,
      familyRelations: countBy(family, b => b.relation),
      familyAgeBands: bands(family.map(b => b.dateOfBirth)),
      familyGender: countBy(family, b => GENDER_LABEL[b.gender ?? ''] ?? 'Not recorded'),
      creditStatus: countBy(profiles, p => ({ APPROVED: 'Approved', PENDING: 'Pending', REJECTED: 'Declined', NOT_APPLIED: 'Not applied' } as Record<CreditStatus, string>)[p.creditStatus]),
      financePartner: countBy(profiles.filter(p => p.creditStatus === CreditStatus.APPROVED), p => (p.financePartnerId === 'equity' ? 'Equity' : p.financePartnerId === 'moneymart' ? 'Moneymart' : 'Other')),
      applicationsTrend: win.buckets.map((b, i) => {
        const end = win.buckets[i + 1]?.start ?? win.to
        const list = creditApps.filter(c => within(c.submittedAt, b.start, end))
        return {
          label: b.label,
          approved: list.filter(c => c.status === CreditApplicationStatus.APPROVED).length,
          pending: list.filter(c => c.status === CreditApplicationStatus.SUBMITTED).length,
          declined: list.filter(c => c.status === CreditApplicationStatus.REJECTED).length,
        }
      }),
      employment: countBy(appsNow.length ? appsNow : creditApps, c => c.employment),
      applicationType: countBy(appsNow.length ? appsNow : creditApps, c => (c.type === 'INCREASE' ? 'Increase' : 'First application')),
      repaymentMethod: countBy(appsNow.length ? appsNow : creditApps, c => REPAYMENT_LABEL[c.repaymentMethod ?? ''] ?? null),
      // Amounts applied for, in ranges, per country (each in its own currency). First applications only.
      creditBands: (country === 'all' ? COUNTRIES : [country]).map(code => {
        const edges = CREDIT_BANDS[code]
        const list = appsNow.filter(c => c.type !== 'INCREASE' && c.patient.patientProfile?.countryCode === code)
        const bandOf = (amount: number) => edges.findIndex(e => amount <= e)
        return {
          country: code,
          bands: creditBandLabels(edges).map((name, i) => ({
            name,
            value: list.filter(c => {
              const b = bandOf(toNumber(c.requestedAmount))
              return (b === -1 ? edges.length : b) === i
            }).length,
          })),
        }
      }),
      // Amounts and utilisation per country, each in its own currency.
      creditByCountry: (country === 'all' ? COUNTRIES : [country]).map(code => {
        const list = profiles.filter(p => p.countryCode === code)
        const limit = list.reduce((s, p) => s + toNumber(p.creditLimit), 0)
        const used = list.reduce((s, p) => s + toNumber(p.creditUsed), 0)
        const apps = creditApps.filter(c => c.patient.patientProfile?.countryCode === code)
        const approvedApps = apps.filter(c => c.status === CreditApplicationStatus.APPROVED)
        return {
          country: code,
          limit,
          used,
          utilisation: pct(used, limit),
          avgRequested: apps.length ? apps.reduce((s, c) => s + toNumber(c.requestedAmount), 0) / apps.length : null,
          avgApproved: approvedApps.length ? approvedApps.reduce((s, c) => s + toNumber(c.approvedAmount), 0) / approvedApps.length : null,
        }
      }),
      satisfaction: {
        average: avgRating(ratingsNow),
        previous: avgRating(ratingsPrev),
        responses: ratingsNow.length,
        distribution: [5, 4, 3, 2, 1].map(stars => ({ name: `${stars}★`, value: ratingsNow.filter(f => f.rating === stars).length })),
        comments: ratingsNow
          .filter(f => f.comment)
          .slice(0, 8)
          .map(f => ({ rating: f.rating, comment: f.comment!, role: f.role, platform: f.platform, date: f.createdAt.toISOString() })),
      },
    }
  }

  // ── Care activity ─────────────────────────────────────────────────────────

  async activity(countryParam?: string, range?: string) {
    const country = this.parseCountry(countryParam)
    const win = this.window(range)
    const providerIds = await this.providerIds(country)
    const providers = await this.providerCountryMap()
    const providerFilter = providerIds ? { providerId: { in: providerIds } } : {}
    const [appointments, prescriptions] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { ...providerFilter, requestedAt: { gte: win.prevFrom, lt: win.to } },
        select: { providerId: true, status: true, mode: true, date: true, timeLabel: true, requestedAt: true, forSelf: true, cancellationReason: true },
      }),
      this.prisma.prescriptionRequest.findMany({
        where: { ...providerFilter, createdAt: { gte: win.prevFrom, lt: win.to } },
        select: { status: true, fulfillmentMode: true, createdAt: true, quotedAt: true, fulfilledAt: true, quotedAmount: true },
      }),
    ])
    const now = appointments.filter(a => within(a.requestedAt, win.from, win.to))
    const prev = appointments.filter(a => within(a.requestedAt, win.prevFrom, win.from))
    const rxNow = prescriptions.filter(r => within(r.createdAt, win.from, win.to))
    const rxPrev = prescriptions.filter(r => within(r.createdAt, win.prevFrom, win.from))
    const cancelRate = (list: typeof now) => pct(list.filter(a => a.status === AppointmentStatus.CANCELLED).length, list.length)
    const quoteHours = (list: typeof rxNow) => median(list.filter(r => r.quotedAt).map(r => (r.quotedAt!.getTime() - r.createdAt.getTime()) / 3_600_000))
    const fulfilRate = (list: typeof rxNow) => pct(list.filter(r => r.status === PrescriptionRequestStatus.FULFILLED).length, list.length)

    // Day-of-week × hour heatmap from the booked slot.
    const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    for (const a of now) {
      const hour = hourOf(a.timeLabel)
      if (hour == null) continue
      heat[(a.date.getDay() + 6) % 7][hour] += 1 // Monday first
    }

    // Day vs night, for the slot booked and for the moment the patient booked (local time).
    const isDay = (h: number) => h >= DAY_HOURS.start && h < DAY_HOURS.end
    const slotHours = now.map(a => hourOf(a.timeLabel)).filter((h): h is number => h != null)
    const bookedHours = now.map(a => localHour(a.requestedAt, providers.get(a.providerId)?.code ?? null))
    const dayNight = {
      dayHours: DAY_HOURS,
      slot: { day: slotHours.filter(isDay).length, night: slotHours.filter(h => !isDay(h)).length },
      booked: { day: bookedHours.filter(isDay).length, night: bookedHours.filter(h => !isDay(h)).length },
    }

    const leadDays = now.map(a => Math.max(0, Math.round((a.date.getTime() - a.requestedAt.getTime()) / DAY)))
    const leadBands = [
      { name: 'Same day', value: leadDays.filter(d => d === 0).length },
      { name: '1–2 days', value: leadDays.filter(d => d >= 1 && d <= 2).length },
      { name: '3–7 days', value: leadDays.filter(d => d >= 3 && d <= 7).length },
      { name: '8+ days', value: leadDays.filter(d => d >= 8).length },
    ]

    const rxStage = (r: (typeof rxNow)[number]) => r.status
    const reached = (stages: PrescriptionRequestStatus[]) => rxNow.filter(r => stages.includes(rxStage(r))).length
    const S = PrescriptionRequestStatus

    return {
      meta: this.meta(country, win, range),
      kpis: [
        this.kpi('appointments', 'Appointments', now.length, prev.length, 'count'),
        this.kpi('completed', 'Completed visits', now.filter(a => a.status === AppointmentStatus.COMPLETED).length, prev.filter(a => a.status === AppointmentStatus.COMPLETED).length, 'count'),
        this.kpi('cancelRate', 'Cancelled', cancelRate(now), cancelRate(prev), 'percent'),
        this.kpi('prescriptions', 'Prescriptions sent', rxNow.length, rxPrev.length, 'count'),
        this.kpi('quoteHours', 'Time to quote', round(quoteHours(rxNow)), round(quoteHours(rxPrev)), 'hours'),
        this.kpi('fulfilRate', 'Prescriptions collected', fulfilRate(rxNow), fulfilRate(rxPrev), 'percent'),
      ],
      appointmentsTrend: win.buckets.map((b, i) => {
        const end = win.buckets[i + 1]?.start ?? win.to
        const list = now.filter(a => within(a.requestedAt, b.start, end))
        return {
          label: b.label,
          completed: list.filter(a => a.status === AppointmentStatus.COMPLETED).length,
          confirmed: list.filter(a => a.status === AppointmentStatus.CONFIRMED).length,
          requested: list.filter(a => a.status === AppointmentStatus.REQUESTED).length,
          cancelled: list.filter(a => a.status === AppointmentStatus.CANCELLED).length,
        }
      }),
      mode: countBy(now, a => ({ IN_PERSON: 'In person', HOME_VISIT: 'Home visit', TELEHEALTH: 'Telehealth' } as Record<string, string>)[a.mode]),
      category: countBy(now, a => providers.get(a.providerId)?.category ?? null),
      forWhom: countBy(now, a => (a.forSelf ? 'Self' : 'Family member')),
      heatmap: heat,
      dayNight,
      leadTime: leadBands,
      cancellationReasons: countBy(now.filter(a => a.status === AppointmentStatus.CANCELLED), a => a.cancellationReason?.trim() || 'No reason given'),
      prescriptionFunnel: [
        { stage: 'Sent', value: rxNow.length },
        { stage: 'Quoted', value: reached([S.QUOTED, S.ACCEPTED, S.PREPARING, S.READY, S.FULFILLED]) },
        { stage: 'Accepted', value: reached([S.ACCEPTED, S.PREPARING, S.READY, S.FULFILLED]) },
        { stage: 'Ready', value: reached([S.READY, S.FULFILLED]) },
        { stage: 'Collected', value: reached([S.FULFILLED]) },
      ],
      prescriptionLost: countBy(rxNow.filter(r => r.status === S.REJECTED || r.status === S.CANCELLED), r => (r.status === S.REJECTED ? 'Declined by pharmacy' : 'Cancelled')),
      fulfilment: countBy(rxNow, r => (r.fulfillmentMode === 'DELIVERY' ? 'Delivery' : 'Pickup')),
    }
  }

  // ── Providers ─────────────────────────────────────────────────────────────

  async providers(countryParam?: string, range?: string) {
    const country = this.parseCountry(countryParam)
    const win = this.window(range)
    const [providers, applications, reviews] = await Promise.all([
      this.prisma.provider.findMany({
        select: {
          id: true, name: true, category: true, country: true, region: true, lifecycleStatus: true, rating: true, reviewCount: true, joinedAt: true,
          payoutAccounts: { where: { isDefault: true }, select: { method: true } },
          appointments: { where: { requestedAt: { gte: win.from, lt: win.to } }, select: { status: true, requestedAt: true } },
          invoices: { where: { submittedAt: { gte: win.from, lt: win.to } }, select: { amount: true, status: true } },
        },
      }),
      this.prisma.providerApplication.findMany({ select: { status: true, country: true, submittedAt: true, decidedAt: true } }),
      this.prisma.providerReview.findMany({ select: { rating: true, providerId: true } }),
    ])
    const scoped = providers.filter(p => country === 'all' || normalizeCountry(p.country) === country)
    const live = scoped.filter(p => p.lifecycleStatus === ProviderLifecycleStatus.ACTIVE)
    const scopedIds = new Set(scoped.map(p => p.id))
    const apps = applications.filter(a => country === 'all' || normalizeCountry(a.country) === country)
    const lastThirty = Date.now() - 30 * DAY
    const reviewDays = median(apps.filter(a => a.decidedAt).map(a => (a.decidedAt!.getTime() - a.submittedAt.getTime()) / DAY))
    const lastActivity = (p: (typeof scoped)[number]) => p.appointments.reduce<number>((m, a) => Math.max(m, a.requestedAt.getTime()), 0)
    const approvedValue = (p: (typeof scoped)[number]) => p.invoices.filter(i => APPROVED_INVOICE.has(i.status)).reduce((s, i) => s + toNumber(i.amount), 0)

    // Usage per county / province (where the care happened).
    const regionRows = new Map<string, { country: MetricsCountry | null; region: string; providers: number; bookings: number; completed: number; approvedValue: number }>()
    for (const p of live) {
      const code = normalizeCountry(p.country)
      const region = p.region ?? 'Not set'
      const key = `${code}|${region}`
      const row = regionRows.get(key) ?? { country: code, region, providers: 0, bookings: 0, completed: 0, approvedValue: 0 }
      row.providers += 1
      row.bookings += p.appointments.length
      row.completed += p.appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length
      row.approvedValue += approvedValue(p)
      regionRows.set(key, row)
    }

    return {
      meta: this.meta(country, win, range),
      kpis: [
        this.kpi('live', 'Live providers', live.length, null, 'count', undefined, 'Right now'),
        this.kpi('joined', 'Joined this period', scoped.filter(p => within(p.joinedAt, win.from, win.to)).length, scoped.filter(p => within(p.joinedAt, win.prevFrom, win.from)).length, 'count'),
        this.kpi('pendingApps', 'Applications waiting', apps.filter(a => a.status === ProviderApplicationStatus.PENDING || a.status === ProviderApplicationStatus.INFO_REQUESTED).length, null, 'count', undefined, 'Right now'),
        this.kpi('reviewDays', 'Days to review an application', round(reviewDays), null, 'count', undefined, 'Median, all applications'),
        this.kpi('inactive', 'No bookings in 30 days', live.filter(p => lastActivity(p) < lastThirty).length, null, 'count', undefined, 'Live providers, last 30 days'),
      ],
      // Supply counts cover live providers only, so they add up to "Live providers".
      byCategory: countBy(live, p => p.category),
      byCountry: countBy(live, p => normalizeCountry(p.country)),
      byRegion: countBy(live, p => p.region ?? 'Not set'),
      regionUsage: [...regionRows.values()].sort((a, b) => b.bookings - a.bookings),
      pipeline: [
        { name: 'Waiting', value: apps.filter(a => a.status === ProviderApplicationStatus.PENDING).length },
        { name: 'Info requested', value: apps.filter(a => a.status === ProviderApplicationStatus.INFO_REQUESTED).length },
        { name: 'Approved', value: apps.filter(a => a.status === ProviderApplicationStatus.APPROVED).length },
        { name: 'Rejected', value: apps.filter(a => a.status === ProviderApplicationStatus.REJECTED).length },
      ],
      ratings: [5, 4, 3, 2, 1].map(stars => ({ name: `${stars}★`, value: reviews.filter(r => scopedIds.has(r.providerId) && r.rating === stars).length })),
      payoutMethod: countBy(live, p => ({ MPESA: 'M-Pesa', BANK: 'Bank', MOBILE_MONEY: 'Mobile money' } as Record<string, string>)[p.payoutAccounts[0]?.method ?? ''] ?? 'Not set'),
      table: scoped
        .map(p => {
          const decided = p.invoices.filter(i => i.status !== InvoiceStatus.PENDING_AUTH)
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            country: normalizeCountry(p.country),
            region: p.region ?? null,
            status: p.lifecycleStatus,
            bookings: p.appointments.length,
            completed: p.appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
            approvedValue: approvedValue(p),
            approvalRate: pct(decided.filter(i => APPROVED_INVOICE.has(i.status)).length, decided.length),
            rating: p.reviewCount > 0 ? toNumber(p.rating) : null,
            reviews: p.reviewCount,
            inactive: p.lifecycleStatus === ProviderLifecycleStatus.ACTIVE && lastActivity(p) < lastThirty,
          }
        })
        .sort((a, b) => b.bookings - a.bookings),
    }
  }

  // ── Health insights ───────────────────────────────────────────────────────

  async health(countryParam?: string, range?: string) {
    const country = this.parseCountry(countryParam)
    const win = this.window(range)
    const providerIds = await this.providerIds(country)
    const providers = await this.providerCountryMap()
    const providerFilter = providerIds ? { providerId: { in: providerIds } } : {}
    const personDob = { patient: { select: { patientProfile: { select: { dateOfBirth: true } } } }, beneficiary: { select: { dateOfBirth: true } } }
    const [visits, completedAppointments, collectedPrescriptions] = await Promise.all([
      this.prisma.providerVisit.findMany({
        where: { ...providerFilter, createdAt: { gte: win.prevFrom, lt: win.to } },
        select: { providerId: true, patientUserId: true, beneficiaryId: true, appointmentId: true, diagnosis: true, conditionCategory: true, vitals: true, createdAt: true, ...personDob },
      }),
      this.prisma.appointment.findMany({
        where: { ...providerFilter, status: AppointmentStatus.COMPLETED, date: { gte: win.prevFrom, lt: win.to } },
        select: { id: true, patientUserId: true, beneficiaryId: true, date: true, ...personDob },
      }),
      this.prisma.prescriptionRequest.findMany({
        where: { ...providerFilter, status: PrescriptionRequestStatus.FULFILLED, fulfilledAt: { gte: win.prevFrom, lt: win.to } },
        select: { patientUserId: true, beneficiaryId: true, fulfilledAt: true },
      }),
    ])
    const now = visits.filter(v => within(v.createdAt, win.from, win.to))
    const prev = visits.filter(v => within(v.createdAt, win.prevFrom, win.from))
    const inRange = (d: Date | null | undefined) => within(d, win.from, win.to)
    const inPrev = (d: Date | null | undefined) => within(d, win.prevFrom, win.from)

    // "Treated" = a completed appointment, a recorded visit, or a collected prescription.
    // Each person counts once; a family member counts as their own person.
    type Encounter = { key: string; at: Date; dob: Date | null }
    const person = (r: { patientUserId: string; beneficiaryId: string | null }) => (r.beneficiaryId ? `b:${r.beneficiaryId}` : `p:${r.patientUserId}`)
    const dobOf = (r: { beneficiary?: { dateOfBirth: Date } | null; patient?: { patientProfile: { dateOfBirth: Date } | null } }) =>
      r.beneficiary?.dateOfBirth ?? r.patient?.patientProfile?.dateOfBirth ?? null
    const appointmentIds = new Set(completedAppointments.map(a => a.id))
    const encounters: Encounter[] = [
      ...completedAppointments.map(a => ({ key: person(a), at: a.date, dob: dobOf(a) })),
      // A visit recorded for a completed appointment is the same encounter.
      ...visits.filter(v => !v.appointmentId || !appointmentIds.has(v.appointmentId)).map(v => ({ key: person(v), at: v.createdAt, dob: dobOf(v) })),
    ]
    const treatedKeys = (test: (d: Date) => boolean) => new Set([
      ...encounters.filter(e => test(e.at)).map(e => e.key),
      ...collectedPrescriptions.filter(r => r.fulfilledAt && test(r.fulfilledAt)).map(r => person(r)),
    ])
    const treatedNow = treatedKeys(inRange)
    const ageAtEncounter = (e: Encounter) => (e.dob ? ageAt(e.dob, e.at) : null)
    const childNow = encounters.filter(e => inRange(e.at) && (ageAtEncounter(e) ?? 99) < 18).length
    const childPrev = encounters.filter(e => inPrev(e.at) && (ageAtEncounter(e) ?? 99) < 18).length

    // Free-text diagnoses grouped by keyword (visits recorded before condition categories existed).
    const groupPatients = new Map<string, Set<string>>()
    let withDiagnosis = 0
    for (const v of now) {
      const group = diagnosisGroup(decryptClinicalField(this.encryption, v.diagnosis))
      if (!group) continue
      withDiagnosis += 1
      const set = groupPatients.get(group) ?? new Set<string>()
      set.add(person(v))
      groupPatients.set(group, set)
    }
    const groups = [...groupPatients.entries()].map(([name, set]) => ({ name, patients: set.size }))
    const shown = groups.filter(g => g.patients >= MIN_GROUP).sort((a, b) => b.patients - a.patients)
    const hiddenPatients = groups.filter(g => g.patients < MIN_GROUP).reduce((s, g) => s + g.patients, 0)

    // Coded conditions picked by providers on the visit form.
    const coded = now.filter(v => conditionOf(v.conditionCategory))
    const peopleBy = (keyOf: (v: (typeof coded)[number]) => string) => {
      const map = new Map<string, Set<string>>()
      for (const v of coded) {
        const k = keyOf(v)
        map.set(k, (map.get(k) ?? new Set<string>()).add(person(v)))
      }
      return map
    }
    const byCondition = peopleBy(v => v.conditionCategory!)
    const shownConditions = [...byCondition.entries()].filter(([, set]) => set.size >= MIN_GROUP).sort((a, b) => b[1].size - a[1].size)
    const shownCodes = new Set(shownConditions.map(([code]) => code))
    const byGroup = peopleBy(v => conditionOf(v.conditionCategory)!.group)

    const visitAge = (v: (typeof coded)[number]) => {
      const dob = dobOf(v)
      return dob ? ageAt(dob, v.createdAt) : null
    }
    const conditionsByAge = shownConditions.map(([code]) => {
      const list = coded.filter(v => v.conditionCategory === code)
      return {
        condition: conditionOf(code)!.label,
        bands: AGE_ORDER.map(name => ({ name, value: list.filter(v => { const a = visitAge(v); return a != null && ageBandOf(a) === name }).length })),
      }
    })

    const preferredProviders = shownConditions.map(([code]) => {
      const counts = countBy(coded.filter(v => v.conditionCategory === code), v => providers.get(v.providerId)?.name ?? null)
      return { condition: conditionOf(code)!.label, providers: counts.slice(0, 3) }
    })

    // Average invoice for each condition, through the appointment the visit belongs to.
    const linkedAppointmentIds = coded.filter(v => shownCodes.has(v.conditionCategory!) && v.appointmentId).map(v => v.appointmentId!)
    const linkedInvoices = linkedAppointmentIds.length
      ? await this.prisma.invoice.findMany({
          where: { appointmentId: { in: linkedAppointmentIds }, status: { in: [...APPROVED_INVOICE] } },
          select: { appointmentId: true, providerId: true, amount: true },
        })
      : []
    const conditionOfAppointment = new Map(coded.filter(v => v.appointmentId).map(v => [v.appointmentId!, v.conditionCategory!]))
    const costRows = new Map<string, { condition: string; country: MetricsCountry; total: number; invoices: number }>()
    for (const inv of linkedInvoices) {
      const code = conditionOfAppointment.get(inv.appointmentId!)
      const providerCountry = providers.get(inv.providerId)?.code
      if (!code || !providerCountry) continue
      const key = `${code}|${providerCountry}`
      const row = costRows.get(key) ?? { condition: conditionOf(code)!.label, country: providerCountry, total: 0, invoices: 0 }
      row.total += toNumber(inv.amount)
      row.invoices += 1
      costRows.set(key, row)
    }

    const bp = countBy(now, v => bpBand((v.vitals as Record<string, string> | null)?.bp))
    const bpOrder = ['Normal', 'Elevated', 'High (stage 1)', 'High (stage 2)']

    return {
      meta: { ...this.meta(country, win, range), minGroup: MIN_GROUP, dayHours: DAY_HOURS },
      kpis: [
        this.kpi('treated', 'People treated', treatedNow.size, treatedKeys(inPrev).size, 'count', undefined),
        this.kpi('visits', 'Visits recorded', now.length, prev.length, 'count'),
        this.kpi('childEncounters', 'Child visits (under 18)', childNow, childPrev, 'count'),
        this.kpi('withCondition', 'Visits with a condition', pct(coded.length, now.length), null, 'percent', undefined, 'This period'),
        this.kpi('withDiagnosis', 'Visits with a diagnosis', pct(withDiagnosis, now.length), null, 'percent', undefined, 'This period'),
        this.kpi('withVitals', 'Visits with vitals', pct(now.filter(v => v.vitals && Object.keys(v.vitals as object).length > 0).length, now.length), null, 'percent', undefined, 'This period'),
      ],
      treatedTrend: win.buckets.map((b, i) => {
        const end = win.buckets[i + 1]?.start ?? win.to
        const keys = treatedKeys(d => within(d, b.start, end))
        return { label: b.label, people: keys.size, family: [...keys].filter(k => k.startsWith('b:')).length }
      }),
      visitsTrend: win.buckets.map((b, i) => {
        const end = win.buckets[i + 1]?.start ?? win.to
        return { label: b.label, value: now.filter(v => within(v.createdAt, b.start, end)).length }
      }),
      byCategory: countBy(now, v => providers.get(v.providerId)?.category ?? null),
      byRegion: countBy(now, v => {
        const p = providers.get(v.providerId)
        if (!p) return null
        const region = p.region ?? 'Region not set'
        return country === 'all' && p.code ? `${region} (${p.code})` : region
      }),
      conditions: shownConditions.map(([code, set]) => ({ code, name: conditionOf(code)!.label, group: conditionOf(code)!.group, patients: set.size })),
      conditionGroups: [...byGroup.entries()]
        .filter(([, set]) => set.size >= MIN_GROUP)
        .map(([group, set]) => ({ name: CONDITION_GROUP_LABEL[group as keyof typeof CONDITION_GROUP_LABEL], value: set.size }))
        .sort((a, b) => b.value - a.value),
      hiddenConditionPatients: [...byCondition.values()].filter(set => set.size < MIN_GROUP).reduce((s, set) => s + set.size, 0),
      conditionsByAge,
      preferredProviders,
      costByCondition: [...costRows.values()].map(r => ({ condition: r.condition, country: r.country, average: r.total / r.invoices, invoices: r.invoices })).sort((a, b) => b.average - a.average),
      diagnosisGroups: shown,
      hiddenPatients,
      bloodPressure: bpOrder.map(name => ({ name, value: bp.find(b => b.name === name)?.value ?? 0 })),
    }
  }
}
