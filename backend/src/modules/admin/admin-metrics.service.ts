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

function ageBand(dob: Date, now: Date) {
  const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * DAY))
  if (age < 18) return 'Under 18'
  if (age < 25) return '18–24'
  if (age < 35) return '25–34'
  if (age < 45) return '35–44'
  if (age < 55) return '45–54'
  if (age < 65) return '55–64'
  return '65+'
}
const AGE_ORDER = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+']

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
    const providers = await this.prisma.provider.findMany({ select: { id: true, country: true, name: true, category: true } })
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

  private kpi(key: string, label: string, current: number | null, previous: number | null, format: 'count' | 'percent' | 'hours', series?: number[]) {
    return { key, label, value: current, previous, format, series }
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
    const invoicesAll = await this.prisma.invoice.findMany({
      where: { submittedAt: { gte: win.prevFrom, lt: win.to } },
      select: { id: true, providerId: true, amount: true, status: true, submittedAt: true, paymentAuthorizedAt: true, paidAt: true, disputedAt: true },
    })

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

    const sum = (list: typeof invoices, test?: (s: InvoiceStatus) => boolean) => list.filter(i => !test || test(i.status)).reduce((s, i) => s + toNumber(i.amount), 0)
    const decidedRate = (list: typeof invoices, status: (s: InvoiceStatus) => boolean) => {
      const decided = list.filter(i => i.status !== InvoiceStatus.PENDING_AUTH)
      return pct(decided.filter(i => status(i.status)).length, decided.length)
    }
    const hoursToApprove = (list: typeof invoices) => median(list.filter(i => i.paymentAuthorizedAt).map(i => (i.paymentAuthorizedAt!.getTime() - i.submittedAt.getTime()) / 3_600_000))
    const approved = (s: InvoiceStatus) => APPROVED_INVOICE.has(s)

    const kpis = [
      { key: 'approvedValue', label: 'Approved spend', value: sum(now, approved), previous: sum(prev, approved), format: 'money' as const },
      { key: 'invoiced', label: 'Invoiced', value: sum(now), previous: sum(prev), format: 'money' as const },
      { key: 'avgInvoice', label: 'Average invoice', value: now.length ? sum(now) / now.length : null, previous: prev.length ? sum(prev) / prev.length : null, format: 'money' as const },
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

    const byCategory = new Map<string, { total: number; count: number }>()
    for (const inv of now) {
      const cat = providers.get(inv.providerId)?.category ?? 'OTHER'
      const row = byCategory.get(cat) ?? { total: 0, count: 0 }
      row.total += toNumber(inv.amount)
      row.count += 1
      byCategory.set(cat, row)
    }

    const byProvider = new Map<number, { value: number; count: number; approved: number; decided: number; awaitingPayout: number }>()
    for (const inv of now) {
      const row = byProvider.get(inv.providerId) ?? { value: 0, count: 0, approved: 0, decided: 0, awaitingPayout: 0 }
      row.count += 1
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

    return {
      meta: { ...this.meta(country, win, range), requested },
      totalsByCountry,
      kpis,
      byStatus,
      byCategory: [...byCategory.entries()].map(([category, r]) => ({ category, average: r.total / r.count, count: r.count })).sort((a, b) => b.average - a.average),
      topProviders: [...byProvider.entries()]
        .map(([id, r]) => ({ id, name: providers.get(id)?.name ?? `Provider ${id}`, category: providers.get(id)?.category ?? null, invoices: r.count, approvedValue: r.value, approvalRate: pct(r.approved, r.decided) }))
        .sort((a, b) => b.approvedValue - a.approvedValue)
        .slice(0, 10),
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
    const [users, creditApps] = await Promise.all([
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
              beneficiaries: { select: { relation: true } },
            },
          },
        },
      }),
      this.prisma.creditApplication.findMany({
        where: country === 'all' ? {} : { patient: { patientProfile: { countryCode: country } } },
        select: { type: true, status: true, employment: true, requestedAmount: true, approvedAmount: true, financePartnerId: true, submittedAt: true, reviewedAt: true, patient: { select: { patientProfile: { select: { countryCode: true } } } } },
      }),
    ])
    const profiles = users.map(u => u.patientProfile).filter((p): p is NonNullable<typeof p> => !!p)
    const inRange = (d: Date | null | undefined) => within(d, win.from, win.to)
    const inPrev = (d: Date | null | undefined) => within(d, win.prevFrom, win.from)
    const decisionHours = (list: typeof creditApps) => median(list.filter(c => c.reviewedAt).map(c => (c.reviewedAt!.getTime() - c.submittedAt.getTime()) / 3_600_000))
    const approvalRate = (list: typeof creditApps) => {
      const decided = list.filter(c => c.status !== CreditApplicationStatus.SUBMITTED)
      return pct(decided.filter(c => c.status === CreditApplicationStatus.APPROVED).length, decided.length)
    }
    const appsNow = creditApps.filter(c => inRange(c.submittedAt))
    const appsPrev = creditApps.filter(c => inPrev(c.submittedAt))

    const ages = countBy(profiles, p => ageBand(p.dateOfBirth, now))
    const withFamily = profiles.filter(p => p.beneficiaries.length > 0).length

    return {
      meta: this.meta(country, win, range),
      kpis: [
        this.kpi('signups', 'New sign-ups', users.filter(u => inRange(u.createdAt)).length, users.filter(u => inPrev(u.createdAt)).length, 'count'),
        this.kpi('total', 'All patients', users.length, null, 'count'),
        this.kpi('creditApps', 'Credit applications', appsNow.length, appsPrev.length, 'count'),
        this.kpi('approvalRate', 'Credit approval rate', approvalRate(appsNow), approvalRate(appsPrev), 'percent'),
        this.kpi('decisionHours', 'Time to decide', round(decisionHours(appsNow)), round(decisionHours(appsPrev)), 'hours'),
        this.kpi('family', 'Covering family', pct(withFamily, profiles.length), null, 'percent'),
      ],
      signups: win.buckets.map((b, i) => {
        const end = win.buckets[i + 1]?.start ?? win.to
        return { label: b.label, value: users.filter(u => within(u.createdAt, b.start, end)).length }
      }),
      signupMethod: countBy(users, u => (u.authProvider === 'GOOGLE' ? 'Google' : 'Email')),
      verification: countBy(users, u => (u.status === UserStatus.ACTIVE ? 'Verified' : u.status === UserStatus.SUSPENDED ? 'Suspended' : 'Not verified')),
      ageBands: AGE_ORDER.map(name => ({ name, value: ages.find(a => a.name === name)?.value ?? 0 })),
      gender: countBy(profiles, p => p.gender ?? 'Not recorded'),
      country: countBy(profiles, p => p.countryCode),
      abroad: profiles.filter(p => p.residesAbroad).length,
      familyRelations: countBy(profiles.flatMap(p => p.beneficiaries), b => b.relation),
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
          id: true, name: true, category: true, country: true, lifecycleStatus: true, rating: true, reviewCount: true, joinedAt: true,
          payoutAccounts: { where: { isDefault: true }, select: { method: true } },
          appointments: { where: { requestedAt: { gte: win.from, lt: win.to } }, select: { status: true, requestedAt: true } },
          invoices: { where: { submittedAt: { gte: win.from, lt: win.to } }, select: { amount: true, status: true } },
        },
      }),
      this.prisma.providerApplication.findMany({ select: { status: true, country: true, submittedAt: true, decidedAt: true } }),
      this.prisma.providerReview.findMany({ select: { rating: true, providerId: true } }),
    ])
    const scoped = providers.filter(p => country === 'all' || normalizeCountry(p.country) === country)
    const scopedIds = new Set(scoped.map(p => p.id))
    const apps = applications.filter(a => country === 'all' || normalizeCountry(a.country) === country)
    const lastThirty = Date.now() - 30 * DAY
    const reviewDays = median(apps.filter(a => a.decidedAt).map(a => (a.decidedAt!.getTime() - a.submittedAt.getTime()) / DAY))
    const lastActivity = (p: (typeof scoped)[number]) => p.appointments.reduce<number>((m, a) => Math.max(m, a.requestedAt.getTime()), 0)

    return {
      meta: this.meta(country, win, range),
      kpis: [
        this.kpi('live', 'Live providers', scoped.filter(p => p.lifecycleStatus === ProviderLifecycleStatus.ACTIVE).length, null, 'count'),
        this.kpi('joined', 'Joined this period', scoped.filter(p => within(p.joinedAt, win.from, win.to)).length, scoped.filter(p => within(p.joinedAt, win.prevFrom, win.from)).length, 'count'),
        this.kpi('pendingApps', 'Applications waiting', apps.filter(a => a.status === ProviderApplicationStatus.PENDING || a.status === ProviderApplicationStatus.INFO_REQUESTED).length, null, 'count'),
        this.kpi('reviewDays', 'Days to review an application', round(reviewDays), null, 'count'),
        this.kpi('inactive', 'No bookings in 30 days', scoped.filter(p => p.lifecycleStatus === ProviderLifecycleStatus.ACTIVE && lastActivity(p) < lastThirty).length, null, 'count'),
      ],
      byCategory: countBy(scoped, p => p.category),
      byCountry: countBy(scoped, p => normalizeCountry(p.country)),
      pipeline: [
        { name: 'Waiting', value: apps.filter(a => a.status === ProviderApplicationStatus.PENDING).length },
        { name: 'Info requested', value: apps.filter(a => a.status === ProviderApplicationStatus.INFO_REQUESTED).length },
        { name: 'Approved', value: apps.filter(a => a.status === ProviderApplicationStatus.APPROVED).length },
        { name: 'Rejected', value: apps.filter(a => a.status === ProviderApplicationStatus.REJECTED).length },
      ],
      ratings: [5, 4, 3, 2, 1].map(stars => ({ name: `${stars}★`, value: reviews.filter(r => scopedIds.has(r.providerId) && r.rating === stars).length })),
      payoutMethod: countBy(scoped, p => ({ MPESA: 'M-Pesa', BANK: 'Bank', MOBILE_MONEY: 'Mobile money' } as Record<string, string>)[p.payoutAccounts[0]?.method ?? ''] ?? 'Not set'),
      table: scoped
        .map(p => {
          const decided = p.invoices.filter(i => i.status !== InvoiceStatus.PENDING_AUTH)
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            country: normalizeCountry(p.country),
            status: p.lifecycleStatus,
            bookings: p.appointments.length,
            completed: p.appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
            approvedValue: p.invoices.filter(i => APPROVED_INVOICE.has(i.status)).reduce((s, i) => s + toNumber(i.amount), 0),
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
    const visits = await this.prisma.providerVisit.findMany({
      where: { ...(providerIds ? { providerId: { in: providerIds } } : {}), createdAt: { gte: win.prevFrom, lt: win.to } },
      select: { providerId: true, patientUserId: true, diagnosis: true, vitals: true, createdAt: true },
    })
    const now = visits.filter(v => within(v.createdAt, win.from, win.to))
    const prev = visits.filter(v => within(v.createdAt, win.prevFrom, win.from))

    // Group diagnoses by distinct patients so one frequent visitor can't dominate a group.
    const groupPatients = new Map<string, Set<string>>()
    let withDiagnosis = 0
    for (const v of now) {
      const group = diagnosisGroup(decryptClinicalField(this.encryption, v.diagnosis))
      if (!group) continue
      withDiagnosis += 1
      const set = groupPatients.get(group) ?? new Set<string>()
      set.add(v.patientUserId)
      groupPatients.set(group, set)
    }
    const groups = [...groupPatients.entries()].map(([name, set]) => ({ name, patients: set.size }))
    const shown = groups.filter(g => g.patients >= MIN_GROUP).sort((a, b) => b.patients - a.patients)
    const hiddenPatients = groups.filter(g => g.patients < MIN_GROUP).reduce((s, g) => s + g.patients, 0)

    const bp = countBy(now, v => bpBand((v.vitals as Record<string, string> | null)?.bp))
    const bpOrder = ['Normal', 'Elevated', 'High (stage 1)', 'High (stage 2)']

    return {
      meta: { ...this.meta(country, win, range), minGroup: MIN_GROUP },
      kpis: [
        this.kpi('visits', 'Visits recorded', now.length, prev.length, 'count'),
        this.kpi('patients', 'Patients seen', new Set(now.map(v => v.patientUserId)).size, new Set(prev.map(v => v.patientUserId)).size, 'count'),
        this.kpi('withDiagnosis', 'Visits with a diagnosis', pct(withDiagnosis, now.length), null, 'percent'),
        this.kpi('withVitals', 'Visits with vitals', pct(now.filter(v => v.vitals && Object.keys(v.vitals as object).length > 0).length, now.length), null, 'percent'),
      ],
      visitsTrend: win.buckets.map((b, i) => {
        const end = win.buckets[i + 1]?.start ?? win.to
        return { label: b.label, value: now.filter(v => within(v.createdAt, b.start, end)).length }
      }),
      byCategory: countBy(now, v => providers.get(v.providerId)?.category ?? null),
      diagnosisGroups: shown,
      hiddenPatients,
      bloodPressure: bpOrder.map(name => ({ name, value: bp.find(b => b.name === name)?.value ?? 0 })),
    }
  }
}
