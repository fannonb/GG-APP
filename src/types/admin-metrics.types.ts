/** Shapes returned by GET /admin/metrics/* (see backend admin-metrics.service.ts). */

export type MetricsCountry = 'KE' | 'ZW' | 'ZM'
export type MetricsRange = '7d' | '30d' | '90d' | '12m'
export type MetricsPage = 'overview' | 'money' | 'patients' | 'activity' | 'providers' | 'health'

export interface MetricsMeta {
  country: MetricsCountry | 'all'
  range: MetricsRange
  from: string
  to: string
  bucket: 'day' | 'week' | 'month'
  labels: string[]
}

export interface Kpi {
  key: string
  label: string
  value: number | null
  previous: number | null
  format: 'count' | 'percent' | 'hours' | 'money'
  series?: number[]
  /** What the figure covers when there is no previous period to compare with. */
  note?: string
}

export interface NameValue {
  name: string
  value: number
}

export interface OverviewMetrics {
  meta: MetricsMeta
  queue: {
    providerApplications: number
    creditApplications: number
    disputedInvoices: number
    staleInvoices: number
    failedPinAttempts: number
  }
  kpis: Kpi[]
  trend: Array<{ label: string; appointments: number; invoices: number; spend: Partial<Record<MetricsCountry, number>> }>
  funnel: Array<{ stage: string; value: number }>
  countries: Array<{ country: MetricsCountry; patients: number; providers: number; appointments: number; spend: number; spendPrevious: number }>
}

export interface MoneyMetrics {
  meta: MetricsMeta & { country: MetricsCountry; requested: MetricsCountry | 'all' }
  totalsByCountry: Array<{ country: MetricsCountry; value: number }>
  kpis: Kpi[]
  byStatus: Array<{ label: string; approved: number; pending: number; rejected: number }>
  byCategory: Array<{ category: string; average: number; count: number; averageYearAgo: number | null; change: number | null }>
  /** Average invoice now vs the same period a year earlier: a rough price-trend read, not a medical CPI. */
  priceTrend: { average: number | null; averageYearAgo: number | null; change: number | null; invoices: number; invoicesYearAgo: number }
  /** Approved invoices: paid from GG'APP credit vs paid to the provider directly. */
  walletSplit: { credit: number; direct: number }
  topProviders: Array<{ id: number; name: string; category: string | null; invoices: number; approvedValue: number; approvalRate: number | null; averageInvoice: number; medianInvoice: number | null }>
  owedToProviders: Array<{ id: number; name: string; invoices: number; value: number }>
}

export interface PatientMetrics {
  meta: MetricsMeta
  kpis: Kpi[]
  signups: Array<{ label: string; value: number }>
  signupMethod: NameValue[]
  verification: NameValue[]
  ageBands: NameValue[]
  gender: NameValue[]
  country: NameValue[]
  abroad: number
  familyRelations: NameValue[]
  familyAgeBands: NameValue[]
  familyGender: NameValue[]
  creditStatus: NameValue[]
  financePartner: NameValue[]
  applicationsTrend: Array<{ label: string; approved: number; pending: number; declined: number }>
  employment: NameValue[]
  applicationType: NameValue[]
  repaymentMethod: NameValue[]
  creditBands: Array<{ country: MetricsCountry; bands: NameValue[] }>
  satisfaction: {
    average: number | null
    previous: number | null
    responses: number
    distribution: NameValue[]
    comments: Array<{ rating: number; comment: string; role: string; platform: string | null; date: string }>
  }
  creditByCountry: Array<{ country: MetricsCountry; limit: number; used: number; utilisation: number | null; avgRequested: number | null; avgApproved: number | null }>
}

export interface ActivityMetrics {
  meta: MetricsMeta
  kpis: Kpi[]
  appointmentsTrend: Array<{ label: string; completed: number; confirmed: number; requested: number; cancelled: number }>
  mode: NameValue[]
  category: NameValue[]
  forWhom: NameValue[]
  /** 7 rows (Mon–Sun) × 24 hours */
  heatmap: number[][]
  dayNight: { dayHours: { start: number; end: number }; slot: { day: number; night: number }; booked: { day: number; night: number } }
  leadTime: NameValue[]
  cancellationReasons: NameValue[]
  prescriptionFunnel: Array<{ stage: string; value: number }>
  prescriptionLost: NameValue[]
  fulfilment: NameValue[]
}

export interface ProviderMetrics {
  meta: MetricsMeta
  kpis: Kpi[]
  byCategory: NameValue[]
  byCountry: NameValue[]
  byRegion: NameValue[]
  regionUsage: Array<{ country: MetricsCountry | null; region: string; providers: number; bookings: number; completed: number; approvedValue: number }>
  pipeline: NameValue[]
  ratings: NameValue[]
  payoutMethod: NameValue[]
  table: Array<{
    id: number
    name: string
    category: string
    country: MetricsCountry | null
    region: string | null
    status: string
    bookings: number
    completed: number
    approvedValue: number
    approvalRate: number | null
    rating: number | null
    reviews: number
    inactive: boolean
  }>
}

export interface HealthMetrics {
  meta: MetricsMeta & { minGroup: number; dayHours: { start: number; end: number } }
  kpis: Kpi[]
  /** Unique people treated per bucket; family members count as their own person. */
  treatedTrend: Array<{ label: string; people: number; family: number }>
  visitsTrend: Array<{ label: string; value: number }>
  byCategory: NameValue[]
  byRegion: NameValue[]
  conditions: Array<{ code: string; name: string; group: string; patients: number }>
  conditionGroups: NameValue[]
  hiddenConditionPatients: number
  conditionsByAge: Array<{ condition: string; bands: NameValue[] }>
  preferredProviders: Array<{ condition: string; providers: NameValue[] }>
  costByCondition: Array<{ condition: string; country: MetricsCountry; average: number; invoices: number }>
  diagnosisGroups: Array<{ name: string; patients: number }>
  hiddenPatients: number
  bloodPressure: NameValue[]
}

export interface MetricsByPage {
  overview: OverviewMetrics
  money: MoneyMetrics
  patients: PatientMetrics
  activity: ActivityMetrics
  providers: ProviderMetrics
  health: HealthMetrics
}
