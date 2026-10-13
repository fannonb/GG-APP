import type { MetricsByPage, MetricsPage } from '@/types/admin-metrics.types'
import { countryName, currencySymbol, prettyCategory } from './metricsFormat'
import { buildReportCsv, downloadCsv, kpiBlock, nameValueBlock, periodLabel, reportFilename, rowsBlock, type ReportBlock } from './reportCsv'

const TITLES: Record<MetricsPage, string> = {
  overview: 'Overview',
  money: 'Money',
  patients: 'Patients & credit',
  activity: 'Care activity',
  providers: 'Provider performance',
  health: 'Health insights',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const isoDay = (s: string) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s)
const pad2 = (n: number) => String(n).padStart(2, '0')

type Builder<P extends MetricsPage> = (d: MetricsByPage[P]) => ReportBlock[]

/** Every section each page shows, in the order it appears on screen. Figures follow the page's country and range. */
const BUILDERS: { [P in MetricsPage]: Builder<P> } = {
  overview: d => [
    kpiBlock(d.kpis, currencySymbol(d.meta.country)),
    nameValueBlock('Waiting for action', [
      { name: 'Provider applications', value: d.queue.providerApplications },
      { name: 'Credit applications', value: d.queue.creditApplications },
      { name: 'Disputed invoices', value: d.queue.disputedInvoices },
      { name: 'Stale invoices', value: d.queue.staleInvoices },
      { name: 'Failed PIN attempts', value: d.queue.failedPinAttempts },
    ], 'Item', 'Count'),
    rowsBlock('Daily activity', ['Period', 'Appointments', 'Invoices', 'Spend Kenya (KSh)', 'Spend Zimbabwe (Z$)', 'Spend Zambia (ZK)'], d.trend, t => [
      t.label, t.appointments, t.invoices, t.spend.KE, t.spend.ZW, t.spend.ZM,
    ]),
    nameValueBlock('Funnel', d.funnel.map(f => ({ name: f.stage, value: f.value })), 'Stage', 'Count'),
    rowsBlock('Countries', ['Country', 'Patients', 'Providers', 'Appointments', 'Spend (local currency)', 'Spend previous period (local currency)'], d.countries, c => [
      countryName(c.country), c.patients, c.providers, c.appointments, c.spend, c.spendPrevious,
    ]),
  ],

  money: d => {
    const cur = currencySymbol(d.meta.country)
    return [
      kpiBlock(d.kpis, cur),
      rowsBlock('Approved spend by country', ['Country', 'Currency', 'Approved spend'], d.totalsByCountry, t => [countryName(t.country), currencySymbol(t.country), t.value]),
      rowsBlock(`Invoices by status (${cur})`, ['Status', 'Approved', 'Pending', 'Rejected'], d.byStatus, s => [s.label, s.approved, s.pending, s.rejected]),
      rowsBlock('Average invoice by provider type', ['Provider type', `Average invoice (${cur})`, 'Invoices', `Average a year earlier (${cur})`, 'Change vs a year earlier (%)'], d.byCategory, c => [
        prettyCategory(c.category), c.average, c.count, c.averageYearAgo, c.change,
      ]),
      rowsBlock('Price trend', ['Measure', 'Value'], [
        ['Average invoice now (' + cur + ')', d.priceTrend.average],
        ['Average invoice a year earlier (' + cur + ')', d.priceTrend.averageYearAgo],
        ['Change vs a year earlier (%)', d.priceTrend.change],
        ['Invoices now', d.priceTrend.invoices],
        ['Invoices a year earlier', d.priceTrend.invoicesYearAgo],
      ], r => r),
      rowsBlock('How approved invoices were paid', ['Source', `Amount (${cur})`], [
        ['GG’APP credit', d.walletSplit.credit],
        ['Paid directly to provider', d.walletSplit.direct],
      ], r => r),
      rowsBlock('Providers by approved spend', ['Provider', 'Type', 'Invoices', `Approved (${cur})`, `Average invoice (${cur})`, `Median invoice (${cur})`, 'Approval rate (%)'], d.topProviders, p => [
        p.name, prettyCategory(p.category), p.invoices, p.approvedValue, p.averageInvoice, p.medianInvoice, p.approvalRate,
      ]),
      rowsBlock('Approved but not yet paid out', ['Provider', 'Invoices', `Owed (${cur})`], d.owedToProviders, o => [o.name, o.invoices, o.value]),
    ]
  },

  patients: d => {
    const s = d.satisfaction
    return [
      kpiBlock(d.kpis, 'money'),
      rowsBlock('Sign-ups by day', ['Period', 'Sign-ups'], d.signups, r => [r.label, r.value]),
      nameValueBlock('How people sign up', d.signupMethod, 'Method', 'Patients'),
      nameValueBlock('Account verification', d.verification, 'Status', 'Accounts'),
      nameValueBlock('Patient age', d.ageBands, 'Age band', 'Patients with a date of birth'),
      nameValueBlock('Patient gender', d.gender, 'Gender', 'Patients'),
      nameValueBlock('Patient country', d.country, 'Country', 'Patients'),
      nameValueBlock('Patients living abroad', [{ name: 'Living abroad', value: d.abroad }], 'Group', 'Patients'),
      nameValueBlock('Family members covered, by relation', d.familyRelations, 'Relation', 'Family members'),
      nameValueBlock('Family members, by age', d.familyAgeBands, 'Age band', 'Family members'),
      nameValueBlock('Family members, by gender', d.familyGender, 'Gender', 'Family members'),
      nameValueBlock('Credit status of patients', d.creditStatus, 'Status', 'Patients'),
      nameValueBlock('Finance partner', d.financePartner, 'Finance partner', 'Approved patients'),
      rowsBlock('Credit applications by day', ['Period', 'Approved', 'Pending', 'Declined'], d.applicationsTrend, r => [r.label, r.approved, r.pending, r.declined]),
      nameValueBlock('Applicants’ employment', d.employment, 'Employment', 'Applications'),
      nameValueBlock('Application type', d.applicationType, 'Type', 'Applications'),
      nameValueBlock('Preferred repayment method', d.repaymentMethod, 'Method', 'Applications'),
      rowsBlock('Credit amounts applied for', ['Country', 'Amount band (local currency)', 'Applications'], d.creditBands.flatMap(cb => cb.bands.map(b => [countryName(cb.country), b.name, b.value] as const)), r => [...r]),
      rowsBlock('App satisfaction', ['Measure', 'Value'], [
        ['Average rating (out of 5)', s.average],
        ['Average rating, previous period', s.previous],
        ['Ratings this period', s.responses],
      ], r => r),
      nameValueBlock('Rating distribution', s.distribution, 'Stars', 'Ratings'),
      rowsBlock('Recent app comments', ['Date', 'Rating', 'Comment', 'Role', 'Platform'], s.comments, c => [isoDay(c.date), c.rating, c.comment, c.role, c.platform]),
      rowsBlock('Credit by country', ['Country', 'Total limit (local)', 'Used (local)', 'Utilisation (%)', 'Average requested (local)', 'Average approved (local)'], d.creditByCountry, c => [
        countryName(c.country), c.limit, c.used, c.utilisation, c.avgRequested, c.avgApproved,
      ]),
    ]
  },

  activity: d => [
    kpiBlock(d.kpis, 'money'),
    rowsBlock('Appointments by day', ['Period', 'Completed', 'Confirmed', 'Requested', 'Cancelled'], d.appointmentsTrend, r => [r.label, r.completed, r.confirmed, r.requested, r.cancelled]),
    nameValueBlock('Appointment mode', d.mode, 'Mode', 'Appointments'),
    nameValueBlock('Appointments by provider type', d.category, 'Provider type', 'Appointments'),
    nameValueBlock('Who the appointment is for', d.forWhom, 'Booked for', 'Appointments'),
    rowsBlock('Day or night', ['Slot', 'Hours', 'Slots', 'Booked'], [
      ['Day', `${d.dayNight.dayHours.start}:00 to ${d.dayNight.dayHours.end}:00`, d.dayNight.slot.day, d.dayNight.booked.day],
      ['Night', 'outside those hours', d.dayNight.slot.night, d.dayNight.booked.night],
    ], r => r),
    rowsBlock('Bookings by day and hour', ['Day', 'Hour', 'Bookings'], d.heatmap.flatMap((hours, i) => hours.map((n, h) => [DAYS[i], `${pad2(h)}:00`, n] as const)), r => [...r]),
    nameValueBlock('Booking lead time', d.leadTime, 'Lead time', 'Appointments'),
    nameValueBlock('Cancellation reasons', d.cancellationReasons, 'Reason', 'Cancellations'),
    nameValueBlock('Prescription funnel', d.prescriptionFunnel.map(f => ({ name: f.stage, value: f.value })), 'Stage', 'Prescriptions'),
    nameValueBlock('Prescriptions lost, by reason', d.prescriptionLost, 'Reason', 'Prescriptions'),
    nameValueBlock('Prescription fulfilment', d.fulfilment, 'Outcome', 'Prescriptions'),
  ],

  providers: d => [
    kpiBlock(d.kpis, 'money'),
    nameValueBlock('Live providers by type', d.byCategory, 'Provider type', 'Providers'),
    nameValueBlock('Live providers by country', d.byCountry, 'Country', 'Providers'),
    nameValueBlock('Live providers by county / province', d.byRegion, 'County / province', 'Providers'),
    rowsBlock('Use by county / province', ['Country', 'County / province', 'Live providers', 'Bookings', 'Completed', 'Approved spend (local)', 'Currency'], d.regionUsage, r => [
      countryName(r.country), r.region, r.providers, r.bookings, r.completed, r.approvedValue, currencySymbol(r.country ?? ''),
    ]),
    nameValueBlock('Applications by stage', d.pipeline, 'Stage', 'Applications'),
    nameValueBlock('Ratings', d.ratings, 'Stars', 'Reviews'),
    nameValueBlock('How live providers get paid', d.payoutMethod, 'Payout method', 'Providers'),
    rowsBlock('Every provider', ['Provider', 'Type', 'Country', 'County / province', 'Status', 'Bookings', 'Completed', 'Approved spend (local)', 'Approval rate (%)', 'Rating', 'Reviews'], d.table, p => [
      p.name, prettyCategory(p.category), countryName(p.country), p.region, p.inactive ? 'Inactive' : prettyCategory(p.status), p.bookings, p.completed, p.approvedValue, p.approvalRate, p.rating, p.reviews,
    ]),
  ],

  health: d => [
    kpiBlock(d.kpis, 'money'),
    rowsBlock('People treated by day', ['Period', 'People treated', 'Family members'], d.treatedTrend, r => [r.label, r.people, r.family]),
    rowsBlock('Visits by day', ['Period', 'Visits'], d.visitsTrend, r => [r.label, r.value]),
    nameValueBlock('Visits by provider type', d.byCategory, 'Provider type', 'Visits'),
    nameValueBlock('Visits by county / province', d.byRegion, 'County / province', 'Visits'),
    rowsBlock('Conditions', ['Condition', 'Group', 'Patients'], d.conditions, c => [c.name, prettyCategory(c.group), c.patients]),
    nameValueBlock('Condition groups', d.conditionGroups, 'Group', 'Patients'),
    rowsBlock('Conditions by age', ['Condition', 'Age at visit', 'Visits'], d.conditionsByAge.flatMap(c => c.bands.map(b => [c.condition, b.name, b.value] as const)), r => [...r]),
    rowsBlock('Preferred providers by condition', ['Condition', 'Provider', 'Visits'], d.preferredProviders.flatMap(c => c.providers.map(p => [c.condition, p.name, p.value] as const)), r => [...r]),
    rowsBlock('Average cost by condition', ['Condition', 'Country', 'Average cost (local)', 'Invoices'], d.costByCondition, c => [c.condition, countryName(c.country), c.average, c.invoices]),
    nameValueBlock('Free-text diagnosis groups', d.diagnosisGroups.map(g => ({ name: g.name, value: g.patients })), 'Group', 'Patients'),
    nameValueBlock('Blood pressure readings', d.bloodPressure, 'Band', 'Readings'),
    nameValueBlock('Hidden for privacy (groups under 5 patients)', [
      { name: 'Patients in conditions too small to show', value: d.hiddenConditionPatients },
      { name: 'Patients in diagnosis groups too small to show', value: d.hiddenPatients },
    ], 'Item', 'Patients'),
  ],
}

/** Downloads one CSV with every section on the page, for the country and range the admin has selected. */
export function exportReport<P extends MetricsPage>(page: P, data: MetricsByPage[P]) {
  const meta = data.meta
  const blocks = (BUILDERS[page] as Builder<P>)(data)
  const csv = buildReportCsv({
    title: TITLES[page],
    period: periodLabel(meta),
    country: meta.country === 'all' ? 'All countries' : countryName(meta.country),
    blocks,
  })
  downloadCsv(reportFilename(page, meta), csv)
}
