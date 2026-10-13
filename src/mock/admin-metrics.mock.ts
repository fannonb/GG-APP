import type {
  Kpi,
  MetricsByPage,
  MetricsCountry,
  MetricsMeta,
  MetricsPage,
  MetricsRange,
} from '@/types/admin-metrics.types'

// Mock-mode analytics so the admin pages render without a backend.
// Numbers are deterministic (seeded) so screenshots stay stable.

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function labelsFor(range: MetricsRange) {
  const now = new Date()
  if (range === '12m') {
    return Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1).toLocaleDateString('en-GB', { month: 'short' }))
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 91
  const step = range === '90d' ? 7 : 1
  const out: string[] = []
  for (let d = days - 1; d >= 0; d -= step) {
    out.push(new Date(now.getTime() - d * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))
  }
  return out
}

const scaleFor = (range: MetricsRange) => ({ '7d': 1, '30d': 3, '90d': 8, '12m': 30 })[range]

export function buildMockMetrics<P extends MetricsPage>(page: P, country: MetricsCountry | 'all', range: MetricsRange): MetricsByPage[P] {
  const rand = seeded(page.length * 97 + range.length * 13 + (country === 'all' ? 7 : country.charCodeAt(0)))
  const labels = labelsFor(range)
  const k = scaleFor(range) * (country === 'all' ? 1 : 0.45)
  const n = (base: number) => Math.max(0, Math.round(base * k * (0.75 + rand() * 0.5)))
  const series = (base: number) => labels.map(() => Math.max(0, Math.round((base * k) / labels.length * (0.4 + rand() * 1.4))))
  const meta: MetricsMeta = { country, range, from: '', to: '', bucket: range === '12m' ? 'month' : range === '90d' ? 'week' : 'day', labels }
  const kpi = (key: string, label: string, value: number | null, previous: number | null, format: Kpi['format'], withSeries?: number[], note?: string): Kpi => ({ key, label, value, previous, format, series: withSeries, note })
  const countries: MetricsCountry[] = country === 'all' ? ['KE', 'ZW', 'ZM'] : [country]

  const pages: { [K in MetricsPage]: () => MetricsByPage[K] } = {
    overview: () => ({
      meta,
      queue: { providerApplications: 3, creditApplications: 5, disputedInvoices: 1, staleInvoices: 2, failedPinAttempts: 4 },
      kpis: [
        kpi('newPatients', 'New patients', n(42), n(36), 'count', series(42)),
        kpi('activePatients', 'Active patients', n(118), n(104), 'count'),
        kpi('appointments', 'Appointments booked', n(96), n(88), 'count', series(96)),
        kpi('creditApproved', 'Credit approved', n(18), n(21), 'count', series(18)),
        kpi('invoiceApproval', 'Invoices approved', 91.4, 88.2, 'percent'),
      ],
      trend: labels.map(label => ({
        label,
        appointments: Math.round((96 * k) / labels.length * (0.5 + rand())),
        invoices: Math.round((70 * k) / labels.length * (0.5 + rand())),
        spend: Object.fromEntries(countries.map(c => [c, Math.round(((c === 'KE' ? 420000 : c === 'ZW' ? 3800 : 9200) * k) / labels.length * (0.5 + rand()))])),
      })),
      funnel: [
        { stage: 'Signed up', value: 640 },
        { stage: 'Credit approved', value: 312 },
        { stage: 'Booked care', value: 228 },
        { stage: 'Paid with credit', value: 171 },
      ],
      countries: countries.map(c => ({
        country: c,
        patients: c === 'KE' ? 412 : c === 'ZW' ? 168 : 60,
        providers: c === 'KE' ? 34 : c === 'ZW' ? 21 : 7,
        appointments: n(c === 'KE' ? 60 : c === 'ZW' ? 28 : 8),
        spend: Math.round((c === 'KE' ? 420000 : c === 'ZW' ? 3800 : 9200) * k),
        spendPrevious: Math.round((c === 'KE' ? 380000 : c === 'ZW' ? 4100 : 7600) * k),
      })),
    }),
    money: () => {
      const c: MetricsCountry = country === 'all' ? 'KE' : country
      const base = c === 'KE' ? 4800 : c === 'ZW' ? 42 : 110
      return {
        meta: { ...meta, country: c, requested: country },
        totalsByCountry: [
          { country: 'KE', value: Math.round(420000 * k) },
          { country: 'ZW', value: Math.round(3800 * k) },
          { country: 'ZM', value: Math.round(9200 * k) },
        ],
        kpis: [
          { key: 'approvedValue', label: 'Approved spend', value: base * n(80), previous: base * n(72), format: 'money' },
          { key: 'invoiced', label: 'Invoiced', value: base * n(92), previous: base * n(84), format: 'money' },
          { key: 'avgInvoice', label: 'Average invoice', value: base * 1.08, previous: base, format: 'money' },
          { key: 'approvalRate', label: 'Approval rate', value: 91.4, previous: 88.2, format: 'percent' },
          { key: 'rejectionRate', label: 'Rejected', value: 4.2, previous: 5.9, format: 'percent' },
          { key: 'hoursToApprove', label: 'Time to approve', value: 3.6, previous: 5.1, format: 'hours' },
        ],
        byStatus: labels.map(label => ({
          label,
          approved: Math.round(base * (80 * k) / labels.length * (0.5 + rand())),
          pending: Math.round(base * (8 * k) / labels.length * rand()),
          rejected: Math.round(base * (4 * k) / labels.length * rand()),
        })),
        byCategory: ([['HOSPITAL', 2.4, 14, 9.1], ['RADIOLOGY', 1.9, 6, 4.0], ['LABORATORY', 0.9, 18, 6.3], ['CLINIC', 0.8, 30, 7.7], ['DOCTOR', 0.7, 22, -2.1], ['PHARMACY', 0.35, 40, 12.4]] as Array<[string, number, number, number]>)
          .map(([category, mult, count, change]) => ({ category, average: base * mult, count: n(count), averageYearAgo: (base * mult) / (1 + change / 100), change })),
        priceTrend: { average: base * 1.08, averageYearAgo: base, change: 8, invoices: n(92), invoicesYearAgo: n(61) },
        walletSplit: { credit: base * n(72), direct: base * n(8) },
        topProviders: ['Avenues Hospital', 'City Medical Centre', 'LifeCare Pharmacy', 'CityLab Diagnostics', 'MedPlus Clinic'].map((name, i) => {
          const invoices = n(20 - i * 3)
          const average = base * [2.3, 0.9, 0.35, 0.95, 0.8][i]
          return { id: i + 1, name, category: ['HOSPITAL', 'CLINIC', 'PHARMACY', 'LABORATORY', 'CLINIC'][i], invoices, approvedValue: Math.round(average * invoices * 0.92), approvalRate: 96 - i * 3, averageInvoice: average, medianInvoice: average * 0.86 }
        }),
        owedToProviders: [
          { id: 1, name: 'Avenues Hospital', invoices: 4, value: base * 9 },
          { id: 3, name: 'LifeCare Pharmacy', invoices: 6, value: base * 2.2 },
        ],
      }
    },
    patients: () => ({
      meta,
      kpis: [
        kpi('signups', 'New sign-ups', n(42), n(36), 'count'),
        kpi('total', 'All patients', 640, null, 'count', undefined, 'All time'),
        kpi('creditApps', 'Credit applications', n(26), n(24), 'count'),
        kpi('approvalRate', 'Credit approval rate', 72.5, 69.8, 'percent'),
        kpi('decisionHours', 'Time to decide', 19.5, 26.0, 'hours'),
        kpi('family', 'Covering family', 38.4, null, 'percent', undefined, 'Of all patients'),
      ],
      signups: labels.map(label => ({ label, value: Math.round((42 * k) / labels.length * (0.4 + rand() * 1.3)) })),
      signupMethod: [{ name: 'Email', value: 452 }, { name: 'Google', value: 188 }],
      verification: [{ name: 'Verified', value: 596 }, { name: 'Not verified', value: 38 }, { name: 'Suspended', value: 6 }],
      ageBands: [['Under 18', 4], ['18–24', 88], ['25–34', 214], ['35–50', 226], ['51+', 108]].map(([name, value]) => ({ name: name as string, value: value as number })),
      gender: [{ name: 'Female', value: 248 }, { name: 'Male', value: 196 }, { name: 'Not recorded', value: 190 }, { name: 'Prefer not to say', value: 6 }],
      country: [{ name: 'KE', value: 412 }, { name: 'ZW', value: 168 }, { name: 'ZM', value: 60 }],
      abroad: 23,
      familyRelations: [{ name: 'Child', value: 168 }, { name: 'Spouse', value: 92 }, { name: 'Parent', value: 61 }, { name: 'Sibling', value: 14 }],
      familyAgeBands: [['Under 18', 172], ['18–24', 18], ['25–34', 44], ['35–50', 52], ['51+', 49]].map(([name, value]) => ({ name: name as string, value: value as number })),
      familyGender: [{ name: 'Not recorded', value: 201 }, { name: 'Female', value: 71 }, { name: 'Male', value: 58 }, { name: 'Prefer not to say', value: 5 }],
      creditStatus: [{ name: 'Approved', value: 312 }, { name: 'Not applied', value: 241 }, { name: 'Pending', value: 39 }, { name: 'Declined', value: 48 }],
      financePartner: [{ name: 'Equity', value: 214 }, { name: 'Moneymart', value: 98 }],
      applicationsTrend: labels.map(label => ({
        label,
        approved: Math.round((18 * k) / labels.length * (0.4 + rand() * 1.3)),
        pending: Math.round((4 * k) / labels.length * rand()),
        declined: Math.round((5 * k) / labels.length * rand()),
      })),
      employment: [{ name: 'Employed', value: 128 }, { name: 'Self-employed', value: 74 }, { name: 'Business owner', value: 31 }, { name: 'Student', value: 12 }],
      applicationType: [{ name: 'First application', value: 184 }, { name: 'Increase', value: 61 }],
      repaymentMethod: [{ name: 'Mobile money (M-Pesa, EcoCash, Airtel Money)', value: 96 }, { name: 'Salary deduction', value: 41 }, { name: 'Bank transfer or debit order', value: 33 }, { name: 'Debit or credit card', value: 9 }, { name: "Cash at the finance partner's branch", value: 5 }],
      creditBands: countries.map(c => ({
        country: c,
        bands: (c === 'KE' ? ['Up to 5,000', '5,001–15,000', '15,001–30,000', '30,001–60,000', 'Over 60,000'] : c === 'ZW' ? ['Up to 100', '101–300', '301–600', '601–1,200', 'Over 1,200'] : ['Up to 500', '501–1,500', '1,501–3,000', '3,001–6,000', 'Over 6,000'])
          .map((name, i) => ({ name, value: [6, 18, 31, 14, 4][i] })),
      })),
      satisfaction: {
        average: 4.4,
        previous: 4.2,
        responses: n(48),
        distribution: [{ name: '5★', value: n(26) }, { name: '4★', value: n(14) }, { name: '3★', value: n(5) }, { name: '2★', value: n(2) }, { name: '1★', value: n(1) }],
        comments: [
          { rating: 5, comment: 'Paying with my PIN was quick and the clinic got the money straight away.', role: 'patient', platform: 'mobile', date: new Date(Date.now() - 2 * 86_400_000).toISOString() },
          { rating: 4, comment: 'Easy to use, but I wish I could see my repayment dates on the home screen.', role: 'patient', platform: 'web', date: new Date(Date.now() - 5 * 86_400_000).toISOString() },
          { rating: 2, comment: 'Had to enter my PIN three times, which felt slow.', role: 'patient', platform: 'mobile', date: new Date(Date.now() - 9 * 86_400_000).toISOString() },
        ],
      },
      creditByCountry: countries.map(c => ({
        country: c,
        limit: c === 'KE' ? 6_240_000 : c === 'ZW' ? 52_000 : 140_000,
        used: c === 'KE' ? 2_810_000 : c === 'ZW' ? 19_800 : 44_000,
        utilisation: c === 'KE' ? 45 : c === 'ZW' ? 38.1 : 31.4,
        avgRequested: c === 'KE' ? 24_000 : c === 'ZW' ? 260 : 900,
        avgApproved: c === 'KE' ? 20_000 : c === 'ZW' ? 210 : 750,
      })),
    }),
    activity: () => ({
      meta,
      kpis: [
        kpi('appointments', 'Appointments', n(96), n(88), 'count'),
        kpi('completed', 'Completed visits', n(71), n(64), 'count'),
        kpi('cancelRate', 'Cancelled', 8.3, 9.9, 'percent'),
        kpi('prescriptions', 'Prescriptions sent', n(40), n(33), 'count'),
        kpi('quoteHours', 'Time to quote', 1.8, 2.6, 'hours'),
        kpi('fulfilRate', 'Prescriptions collected', 78.5, 74.1, 'percent'),
      ],
      appointmentsTrend: labels.map(label => ({
        label,
        completed: Math.round((71 * k) / labels.length * (0.5 + rand())),
        confirmed: Math.round((12 * k) / labels.length * rand()),
        requested: Math.round((6 * k) / labels.length * rand()),
        cancelled: Math.round((7 * k) / labels.length * rand()),
      })),
      mode: [{ name: 'In person', value: n(78) }, { name: 'Telehealth', value: n(12) }, { name: 'Home visit', value: n(6) }],
      category: [{ name: 'CLINIC', value: n(30) }, { name: 'DOCTOR', value: n(22) }, { name: 'LABORATORY', value: n(18) }, { name: 'HOSPITAL', value: n(14) }, { name: 'RADIOLOGY', value: n(6) }],
      forWhom: [{ name: 'Self', value: n(70) }, { name: 'Family member', value: n(26) }],
      heatmap: Array.from({ length: 7 }, (_, day) => Array.from({ length: 24 }, (_, hour) => {
        if (hour < 7 || hour > 20) return hour === 22 && rand() > 0.7 ? 1 : 0
        const peak = hour >= 9 && hour <= 11 ? 3 : hour >= 16 && hour <= 18 ? 2 : 1
        const weekend = day >= 5 ? 0.5 : 1
        return Math.round(peak * weekend * k * rand())
      })),
      dayNight: { dayHours: { start: 6, end: 18 }, slot: { day: n(88), night: n(8) }, booked: { day: n(71), night: n(25) } },
      leadTime: [{ name: 'Same day', value: n(28) }, { name: '1–2 days', value: n(38) }, { name: '3–7 days', value: n(22) }, { name: '8+ days', value: n(8) }],
      cancellationReasons: [{ name: 'Schedule conflict', value: n(4) }, { name: 'Felt better', value: n(2) }, { name: 'Provider unavailable', value: n(2) }, { name: 'No reason given', value: n(1) }],
      prescriptionFunnel: [
        { stage: 'Sent', value: n(40) },
        { stage: 'Quoted', value: n(36) },
        { stage: 'Accepted', value: n(33) },
        { stage: 'Ready', value: n(32) },
        { stage: 'Collected', value: n(31) },
      ],
      prescriptionLost: [{ name: 'Declined by pharmacy', value: n(3) }, { name: 'Cancelled', value: n(2) }],
      fulfilment: [{ name: 'Pickup', value: n(29) }, { name: 'Delivery', value: n(11) }],
    }),
    providers: () => ({
      meta,
      kpis: [
        kpi('live', 'Live providers', 58, null, 'count', undefined, 'Right now'),
        kpi('joined', 'Joined this period', n(4), n(3), 'count'),
        kpi('pendingApps', 'Applications waiting', 3, null, 'count', undefined, 'Right now'),
        kpi('reviewDays', 'Days to review an application', 2.4, null, 'count', undefined, 'Median, all applications'),
        kpi('inactive', 'No bookings in 30 days', 9, null, 'count', undefined, 'Live providers, last 30 days'),
      ],
      byCategory: [{ name: 'PHARMACY', value: 16 }, { name: 'CLINIC', value: 14 }, { name: 'DOCTOR', value: 11 }, { name: 'LABORATORY', value: 8 }, { name: 'HOSPITAL', value: 6 }, { name: 'RADIOLOGY', value: 3 }],
      byCountry: [{ name: 'KE', value: 32 }, { name: 'ZW', value: 19 }, { name: 'ZM', value: 7 }],
      byRegion: [{ name: 'Nairobi', value: 18 }, { name: 'Harare', value: 12 }, { name: 'Mombasa', value: 7 }, { name: 'Bulawayo', value: 5 }, { name: 'Lusaka', value: 5 }, { name: 'Kiambu', value: 4 }, { name: 'Not set', value: 7 }],
      regionUsage: ([['KE', 'Nairobi', 18, 412, 340, 1_840_000], ['ZW', 'Harare', 12, 188, 151, 9_400], ['KE', 'Mombasa', 7, 96, 81, 410_000], ['ZW', 'Bulawayo', 5, 64, 52, 2_900], ['ZM', 'Lusaka', 5, 52, 44, 21_000], ['KE', 'Kiambu', 4, 41, 30, 160_000], ['KE', 'Not set', 7, 22, 18, 64_000]] as Array<[MetricsCountry, string, number, number, number, number]>)
        .filter(([c]) => countries.includes(c))
        .map(([c, region, providersCount, bookings, completed, approvedValue]) => ({ country: c, region, providers: providersCount, bookings, completed, approvedValue })),
      pipeline: [{ name: 'Waiting', value: 2 }, { name: 'Info requested', value: 1 }, { name: 'Approved', value: 58 }, { name: 'Rejected', value: 6 }],
      ratings: [{ name: '5★', value: 214 }, { name: '4★', value: 96 }, { name: '3★', value: 22 }, { name: '2★', value: 7 }, { name: '1★', value: 4 }],
      payoutMethod: [{ name: 'M-Pesa', value: 29 }, { name: 'Bank', value: 18 }, { name: 'Mobile money', value: 8 }, { name: 'Not set', value: 3 }],
      table: ['Avenues Hospital', 'City Medical Centre', 'LifeCare Pharmacy', 'CityLab Diagnostics', 'MedPlus Clinic', 'Premier Diagnostics', 'Dr. T. Moyo'].map((name, i) => ({
        id: i + 1,
        name,
        category: ['HOSPITAL', 'CLINIC', 'PHARMACY', 'LABORATORY', 'CLINIC', 'RADIOLOGY', 'DOCTOR'][i],
        country: (['KE', 'ZW', 'ZW', 'KE', 'KE', 'ZW', 'ZM'] as MetricsCountry[])[i],
        region: ['Nairobi', 'Harare', 'Bulawayo', 'Nairobi', 'Mombasa', 'Harare', 'Lusaka'][i],
        status: 'ACTIVE',
        bookings: 30 - i * 4,
        completed: 26 - i * 4,
        approvedValue: Math.round((i % 3 === 0 ? 4800 : 42) * n(30 - i * 4)),
        approvalRate: 97 - i * 2,
        rating: 4.9 - i * 0.1,
        reviews: 40 - i * 5,
        inactive: i === 6,
      })),
    }),
    health: () => ({
      meta: { ...meta, minGroup: 5, dayHours: { start: 6, end: 18 } },
      kpis: [
        kpi('treated', 'People treated', n(92), n(84), 'count'),
        kpi('visits', 'Visits recorded', n(71), n(64), 'count'),
        kpi('childEncounters', 'Child visits (under 18)', n(19), n(15), 'count'),
        kpi('withCondition', 'Visits with a condition', 74.6, null, 'percent', undefined, 'This period'),
        kpi('withDiagnosis', 'Visits with a diagnosis', 86.2, null, 'percent', undefined, 'This period'),
        kpi('withVitals', 'Visits with vitals', 61.5, null, 'percent', undefined, 'This period'),
      ],
      treatedTrend: labels.map(label => {
        const people = Math.round((92 * k) / labels.length * (0.5 + rand()))
        return { label, people, family: Math.round(people * 0.27) }
      }),
      visitsTrend: labels.map(label => ({ label, value: Math.round((71 * k) / labels.length * (0.5 + rand())) })),
      byCategory: [{ name: 'CLINIC', value: n(30) }, { name: 'DOCTOR', value: n(22) }, { name: 'HOSPITAL', value: n(12) }, { name: 'LABORATORY', value: n(7) }],
      byRegion: [{ name: 'Nairobi', value: n(28) }, { name: 'Harare', value: n(17) }, { name: 'Mombasa', value: n(9) }, { name: 'Lusaka', value: n(6) }, { name: 'Bulawayo', value: n(5) }],
      conditions: [
        { code: 'respiratory', name: 'Respiratory infection (cough, flu, pneumonia)', group: 'acute', patients: 31 },
        { code: 'malaria', name: 'Malaria', group: 'acute', patients: 22 },
        { code: 'hypertension', name: 'Hypertension or heart disease', group: 'chronic', patients: 17 },
        { code: 'diarrhoeal', name: 'Diarrhoea or stomach infection', group: 'acute', patients: 12 },
        { code: 'diabetes', name: 'Diabetes or other metabolic condition', group: 'chronic', patients: 9 },
        { code: 'maternal', name: 'Pregnancy, antenatal or postnatal care', group: 'maternal', patients: 8 },
        { code: 'child_wellness', name: 'Child check-up or immunisation', group: 'child', patients: 7 },
        { code: 'mental_health', name: 'Mental health', group: 'mental', patients: 5 },
      ],
      conditionGroups: [{ name: 'Acute (short-term)', value: 71 }, { name: 'Chronic (long-term)', value: 29 }, { name: 'Maternal & reproductive', value: 11 }, { name: 'Child health', value: 7 }, { name: 'Mental health', value: 5 }],
      hiddenConditionPatients: 6,
      conditionsByAge: ([
        ['Respiratory infection (cough, flu, pneumonia)', [12, 5, 7, 5, 2]],
        ['Malaria', [8, 4, 5, 3, 2]],
        ['Hypertension or heart disease', [0, 0, 2, 6, 9]],
        ['Diarrhoea or stomach infection', [6, 2, 2, 1, 1]],
        ['Diabetes or other metabolic condition', [0, 0, 1, 3, 5]],
      ] as Array<[string, number[]]>).map(([condition, values]) => ({ condition, bands: ['Under 18', '18–24', '25–34', '35–50', '51+'].map((name, i) => ({ name, value: values[i] })) })),
      preferredProviders: [
        { condition: 'Respiratory infection (cough, flu, pneumonia)', providers: [{ name: 'City Medical Centre', value: 14 }, { name: 'MedPlus Clinic', value: 9 }, { name: 'Avenues Hospital', value: 5 }] },
        { condition: 'Malaria', providers: [{ name: 'MedPlus Clinic', value: 11 }, { name: 'City Medical Centre', value: 7 }] },
        { condition: 'Hypertension or heart disease', providers: [{ name: 'Avenues Hospital', value: 10 }, { name: 'Dr. T. Moyo', value: 4 }] },
      ],
      costByCondition: ([
        ['Hypertension or heart disease', 'KE', 6_400, 12],
        ['Respiratory infection (cough, flu, pneumonia)', 'KE', 3_100, 24],
        ['Malaria', 'KE', 2_450, 17],
        ['Respiratory infection (cough, flu, pneumonia)', 'ZW', 38, 9],
        ['Malaria', 'ZW', 31, 6],
      ] as Array<[string, MetricsCountry, number, number]>)
        .filter(([, c]) => countries.includes(c))
        .map(([condition, c, average, invoices]) => ({ condition, country: c, average, invoices })),
      diagnosisGroups: [
        { name: 'Respiratory infections', patients: 23 },
        { name: 'Hypertension & heart', patients: 14 },
        { name: 'Malaria & fevers', patients: 12 },
        { name: 'Stomach & gut', patients: 11 },
        { name: 'Diabetes & metabolic', patients: 9 },
      ],
      hiddenPatients: 7,
      bloodPressure: [{ name: 'Normal', value: n(22) }, { name: 'Elevated', value: n(9) }, { name: 'High (stage 1)', value: n(8) }, { name: 'High (stage 2)', value: n(4) }],
    }),
  }
  return pages[page]() as MetricsByPage[P]
}
