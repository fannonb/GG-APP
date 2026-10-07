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
  byCategory: Array<{ category: string; average: number; count: number }>
  topProviders: Array<{ id: number; name: string; category: string | null; invoices: number; approvedValue: number; approvalRate: number | null }>
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
  creditStatus: NameValue[]
  financePartner: NameValue[]
  applicationsTrend: Array<{ label: string; approved: number; pending: number; declined: number }>
  employment: NameValue[]
  applicationType: NameValue[]
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
  pipeline: NameValue[]
  ratings: NameValue[]
  payoutMethod: NameValue[]
  table: Array<{
    id: number
    name: string
    category: string
    country: MetricsCountry | null
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
  meta: MetricsMeta & { minGroup: number }
  kpis: Kpi[]
  visitsTrend: Array<{ label: string; value: number }>
  byCategory: NameValue[]
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
