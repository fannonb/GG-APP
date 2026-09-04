// Curated strategic health intelligence datasets matching datapoints.md specifications

export interface DiseaseCategoryMetric {
  category: string
  cases: number
  percentage: number
  trend: '+12%' | '+5%' | '-3%' | '+8%' | '+2%'
  acuteOrChronic: 'acute' | 'chronic' | 'specialized'
  avgCostUsd: number
  topPathway: string
}

export interface CountyDiseaseBurden {
  county: string
  country: 'Kenya' | 'Zimbabwe'
  totalPatientsTreated: number
  topCondition: string
  acuteCases: number
  chronicCases: number
  maternalCases: number
  pediatricCases: number
  mentalHealthCases: number
  avgCostPerVisit: number
  prevalentSeekTime: 'Day (08:00 - 16:00)' | 'Evening (16:00 - 20:00)' | 'Night (20:00 - 06:00)'
}

export interface AgeBandMetric {
  band: string
  rangeLabel: string
  applicantsCount: number
  beneficiariesCount: number
  malePercentage: number
  femalePercentage: number
  topCondition: string
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High'
}

export interface MedicalInflationDriver {
  factor: string
  inflationRate: number
  benchmarkRate: number
  variance: number
  impactSummary: string
  primaryDriver: string
}

export interface ProviderBenchmark {
  providerName: string
  category: string
  county: string
  consultationAvgCost: number
  malariaPathwayCost: number
  diabetesPathwayCost: number
  patientSatisfactionScore: number
  totalEncounterVolume: number
}

export interface ConsumerHealthData {
  npsScore: number
  csatPercentage: number
  totalReviews: number
  topProvidersByRating: {
    name: string
    category: string
    rating: number
    reviews: number
    preferredFor: string
  }[]
  spendingPatterns: {
    channel: string
    percentage: number
    avgTicketUsd: number
  }[]
  repaymentPreferences: {
    method: string
    share: number
    growth: string
  }[]
}

// -----------------------------------------------------------------------------
// 1. Disease Burden Intelligence Data
// -----------------------------------------------------------------------------
export const MOCK_DISEASE_BURDEN = {
  monthlyPatientsTreated: 12450,
  annualizedPatientsTreated: 149400,
  acuteBurdenPercentage: 46,
  chronicBurdenPercentage: 34,
  maternalPercentage: 9,
  pediatricPercentage: 7,
  mentalHealthPercentage: 4,

  daytimeTreatmentSeekingShare: 73, // 06:00 - 18:00
  nighttimeTreatmentSeekingShare: 27, // 18:00 - 06:00
  peakTreatmentHours: [
    { hour: '06:00 - 09:00', volume: 1840, label: 'Early Morning Routine' },
    { hour: '09:00 - 12:00', volume: 3920, label: 'Peak Outpatient Consultations' },
    { hour: '12:00 - 15:00', volume: 2210, label: 'Afternoon Reviews' },
    { hour: '15:00 - 18:00', volume: 2480, label: 'Post-Work & Pharmacy Pickups' },
    { hour: '18:00 - 21:00', volume: 1420, label: 'Evening Urgent Care' },
    { hour: '21:00 - 06:00', volume: 580, label: 'Emergency & Late Night' },
  ],

  topDiseaseCategories: [
    {
      category: 'Infectious & Parasitic (Malaria, Typhoid)',
      cases: 4210,
      percentage: 33.8,
      trend: '+5%',
      acuteOrChronic: 'acute',
      avgCostUsd: 42,
      topPathway: 'Rapid Diagnostic Test + Artemether Combination Therapy (ACT)',
    },
    {
      category: 'Cardiovascular & Hypertension',
      cases: 2340,
      percentage: 18.8,
      trend: '+8%',
      acuteOrChronic: 'chronic',
      avgCostUsd: 68,
      topPathway: 'Monthly ECG, Blood Pressure Tracking + Amlodipine / Telmisartan',
    },
    {
      category: 'Endocrine & Metabolic (Type 2 Diabetes)',
      cases: 1890,
      percentage: 15.2,
      trend: '+12%',
      acuteOrChronic: 'chronic',
      avgCostUsd: 85,
      topPathway: 'HbA1c Lab Panel + Metformin & Glucometer Strips',
    },
    {
      category: 'Respiratory (Asthma, Acute Bronchitis)',
      cases: 1540,
      percentage: 12.4,
      trend: '-3%',
      acuteOrChronic: 'acute',
      avgCostUsd: 55,
      topPathway: 'Nebulizer Therapy + Inhalers (Salbutamol, Fluticasone)',
    },
    {
      category: 'Maternal & Prenatal Health',
      cases: 1120,
      percentage: 9.0,
      trend: '+2%',
      acuteOrChronic: 'specialized',
      avgCostUsd: 130,
      topPathway: 'Ultrasound Scan, Iron Supplements & Nurse Midwife Check',
    },
    {
      category: 'Pediatric Infectious & Nutritional',
      cases: 870,
      percentage: 7.0,
      trend: '+5%',
      acuteOrChronic: 'specialized',
      avgCostUsd: 38,
      topPathway: 'Under-5 Immunization, Oral Rehydration & Amoxicillin',
    },
    {
      category: 'Mental Health & Clinical Depression',
      cases: 480,
      percentage: 3.8,
      trend: '+12%',
      acuteOrChronic: 'specialized',
      avgCostUsd: 95,
      topPathway: 'Psychiatric Evaluation & Cognitive Behavioral Follow-ups',
    },
  ] as DiseaseCategoryMetric[],

  countyBurdenList: [
    {
      county: 'Nairobi',
      country: 'Kenya',
      totalPatientsTreated: 4520,
      topCondition: 'Hypertension & Upper Respiratory',
      acuteCases: 1980,
      chronicCases: 1650,
      maternalCases: 420,
      pediatricCases: 310,
      mentalHealthCases: 160,
      avgCostPerVisit: 54,
      prevalentSeekTime: 'Evening (16:00 - 20:00)',
    },
    {
      county: 'Kiambu',
      country: 'Kenya',
      totalPatientsTreated: 2310,
      topCondition: 'Diabetes & Pediatric Allergies',
      acuteCases: 1040,
      chronicCases: 880,
      maternalCases: 210,
      pediatricCases: 130,
      mentalHealthCases: 50,
      avgCostPerVisit: 46,
      prevalentSeekTime: 'Day (08:00 - 16:00)',
    },
    {
      county: 'Mombasa',
      country: 'Kenya',
      totalPatientsTreated: 1890,
      topCondition: 'Malaria & Gastrointestinal Infections',
      acuteCases: 1120,
      chronicCases: 510,
      maternalCases: 140,
      pediatricCases: 90,
      mentalHealthCases: 30,
      avgCostPerVisit: 39,
      prevalentSeekTime: 'Night (20:00 - 06:00)',
    },
    {
      county: 'Nakuru',
      country: 'Kenya',
      totalPatientsTreated: 1420,
      topCondition: 'Trauma & Respiratory Infections',
      acuteCases: 820,
      chronicCases: 420,
      maternalCases: 110,
      pediatricCases: 50,
      mentalHealthCases: 20,
      avgCostPerVisit: 41,
      prevalentSeekTime: 'Day (08:00 - 16:00)',
    },
    {
      county: 'Harare',
      country: 'Zimbabwe',
      totalPatientsTreated: 1280,
      topCondition: 'Cardiovascular & Chronic Diabetes',
      acuteCases: 510,
      chronicCases: 560,
      maternalCases: 120,
      pediatricCases: 60,
      mentalHealthCases: 30,
      avgCostPerVisit: 62,
      prevalentSeekTime: 'Day (08:00 - 16:00)',
    },
    {
      county: 'Bulawayo',
      country: 'Zimbabwe',
      totalPatientsTreated: 1030,
      topCondition: 'Hypertension & Seasonal Viral Fevers',
      acuteCases: 490,
      chronicCases: 380,
      maternalCases: 90,
      pediatricCases: 50,
      mentalHealthCases: 20,
      avgCostPerVisit: 58,
      prevalentSeekTime: 'Day (08:00 - 16:00)',
    },
  ] as CountyDiseaseBurden[],

  providerTariffBenchmarks: [
    {
      providerName: 'City Medical Centre',
      category: 'Clinic',
      county: 'Harare',
      consultationAvgCost: 35,
      malariaPathwayCost: 45,
      diabetesPathwayCost: 75,
      patientSatisfactionScore: 4.8,
      totalEncounterVolume: 1280,
    },
    {
      providerName: 'Equity Diagnostics Lab',
      category: 'Laboratory',
      county: 'Harare',
      consultationAvgCost: 20,
      malariaPathwayCost: 15,
      diabetesPathwayCost: 55,
      patientSatisfactionScore: 4.6,
      totalEncounterVolume: 2140,
    },
    {
      providerName: 'Avenues Comprehensive Clinic',
      category: 'Hospital / Clinic',
      county: 'Nairobi',
      consultationAvgCost: 45,
      malariaPathwayCost: 50,
      diabetesPathwayCost: 90,
      patientSatisfactionScore: 4.9,
      totalEncounterVolume: 3410,
    },
    {
      providerName: 'MedPlus Express Pharmacy',
      category: 'Pharmacy',
      county: 'Nairobi',
      consultationAvgCost: 10,
      malariaPathwayCost: 28,
      diabetesPathwayCost: 48,
      patientSatisfactionScore: 4.7,
      totalEncounterVolume: 4290,
    },
    {
      providerName: 'Coast Care Specialists',
      category: 'Hospital',
      county: 'Mombasa',
      consultationAvgCost: 40,
      malariaPathwayCost: 42,
      diabetesPathwayCost: 82,
      patientSatisfactionScore: 4.5,
      totalEncounterVolume: 1840,
    },
  ] as ProviderBenchmark[],
}

// -----------------------------------------------------------------------------
// 2. Membership Demographics Data (5 Age Bands)
// -----------------------------------------------------------------------------
export const MOCK_DEMOGRAPHICS: {
  totalRegisteredMembers: number
  totalBeneficiaries: number
  applicantToBeneficiaryRatio: string
  overallGenderSplit: { male: number; female: number; other: number }
  ageBands: AgeBandMetric[]
} = {
  totalRegisteredMembers: 38400,
  totalBeneficiaries: 53760,
  applicantToBeneficiaryRatio: '1 : 1.4',
  overallGenderSplit: { male: 48, female: 51, other: 1 },

  ageBands: [
    {
      band: 'Band 1: Below 18',
      rangeLabel: '0 – 18 years (Pediatric & Adolescents)',
      applicantsCount: 1920,
      beneficiariesCount: 29560,
      malePercentage: 51,
      femalePercentage: 49,
      topCondition: 'Acute Respiratory, Tonsillitis, Malaria',
      riskLevel: 'Moderate',
    },
    {
      band: 'Band 2: 19 – 24',
      rangeLabel: '19 – 24 years (Students & Young Adults)',
      applicantsCount: 6520,
      beneficiariesCount: 8430,
      malePercentage: 46,
      femalePercentage: 54,
      topCondition: 'Accident Trauma, Dermatology, Mental Health',
      riskLevel: 'Low',
    },
    {
      band: 'Band 3: 25 – 34',
      rangeLabel: '25 – 34 years (Early Career & Young Parents)',
      applicantsCount: 14200,
      beneficiariesCount: 6820,
      malePercentage: 47,
      femalePercentage: 53,
      topCondition: 'Maternal/Obstetric, GI Infections, Stress/Anxiety',
      riskLevel: 'Low',
    },
    {
      band: 'Band 4: 35 – 50',
      rangeLabel: '35 – 50 years (Prime Workforce)',
      applicantsCount: 11340,
      beneficiariesCount: 4920,
      malePercentage: 50,
      femalePercentage: 50,
      topCondition: 'Essential Hypertension, Pre-diabetes, Musculoskeletal',
      riskLevel: 'High',
    },
    {
      band: 'Band 5: 51+',
      rangeLabel: '51+ years (Seniors & Retirees)',
      applicantsCount: 4420,
      beneficiariesCount: 4030,
      malePercentage: 45,
      femalePercentage: 55,
      topCondition: 'Type 2 Diabetes, Cardiovascular, Osteoarthritis',
      riskLevel: 'Very High',
    },
  ],
}

// -----------------------------------------------------------------------------
// 3. Financial Highlights & Medical Inflation Dashboard Data
// -----------------------------------------------------------------------------
export const MOCK_FINANCIAL_HIGHLIGHTS = {
  totalGrossMerchandiseValueUsd: 1480000,
  providerPayoutsUsd: 1243200,
  netPlatformCommissionUsd: 148000,
  appAdvertisingRevenueUsd: 88800,
  aiPredictiveAnnualizedRunrateUsd: 2150000,

  creditThresholdsApplied: [
    { range: '$50 – $250', share: 44, volume: '6,420 applications', defaultRisk: '1.2%' },
    { range: '$251 – $600', share: 36, volume: '5,250 applications', defaultRisk: '2.1%' },
    { range: '$601 – $1,200', share: 15, volume: '2,190 applications', defaultRisk: '3.4%' },
    { range: '$1,201+', share: 5, volume: '730 applications', defaultRisk: '4.8%' },
  ],

  repaymentChannelPreferences: [
    { method: 'M-Pesa Mobile Money', share: 68, growth: '+14% YoY' },
    { method: 'Card / Debit Authorization', share: 19, growth: '+6% YoY' },
    { method: 'Bank Direct Transfer', share: 11, growth: '-2% YoY' },
    { method: 'Other Wallets', share: 2, growth: 'Stable' },
  ],

  // MEDICAL INFLATION COMPARATOR (4.5% CPI vs Healthcare inflation)
  medicalInflationHeadlineRate: 7.8,
  nationalCpiInflationRate: 4.5,
  inflationSpreadDifference: 3.3, // Medical inflation exceeds CPI by 3.3 percentage points

  inflationDrivers: [
    {
      factor: 'Pharmaceuticals & Drug Formulations',
      inflationRate: 9.4,
      benchmarkRate: 4.5,
      variance: 4.9,
      impactSummary: 'Import dependency and foreign currency pressure on active pharmaceutical ingredients (APIs).',
      primaryDriver: 'Antibiotics, Insulins, Antihypertensives',
    },
    {
      factor: 'Advanced Diagnostic Technology',
      inflationRate: 8.8,
      benchmarkRate: 4.5,
      variance: 4.3,
      impactSummary: 'Rising capital equipment replacement and digital scan maintenance costs.',
      primaryDriver: 'Ultrasound, CT Scans, Automated Lab Analyzers',
    },
    {
      factor: 'Provider Tariffs & Specialist Fees',
      inflationRate: 7.2,
      benchmarkRate: 4.5,
      variance: 2.7,
      impactSummary: 'Clinician retention costs and operational hospital energy/overhead escalations.',
      primaryDriver: 'Specialist Consultations, In-hospital Day Beds',
    },
    {
      factor: 'Chronic Disease Complexity',
      inflationRate: 6.9,
      benchmarkRate: 4.5,
      variance: 2.4,
      impactSummary: 'Multi-morbidity treatment regimens requiring frequent multi-specialty reviews.',
      primaryDriver: 'Cardio-Renal and Diabetic Foot Management',
    },
    {
      factor: 'Healthcare Utilization Volume',
      inflationRate: 6.1,
      benchmarkRate: 4.5,
      variance: 1.6,
      impactSummary: 'Higher per-capita digital booking frequency post-onboarding.',
      primaryDriver: 'Telehealth Consults and Prescription Deliveries',
    },
  ] as MedicalInflationDriver[],
}

// -----------------------------------------------------------------------------
// 4. Consumer Health & Satisfaction Data
// -----------------------------------------------------------------------------
export const MOCK_CONSUMER_HEALTH: ConsumerHealthData = {
  npsScore: 68,
  csatPercentage: 94.2,
  totalReviews: 8420,

  topProvidersByRating: [
    {
      name: 'Avenues Comprehensive Clinic',
      category: 'Hospital / Multi-Specialty',
      rating: 4.92,
      reviews: 1420,
      preferredFor: 'Prompt pediatrician attention & clean facilities',
    },
    {
      name: 'City Medical Centre',
      category: 'Family Clinic',
      rating: 4.86,
      reviews: 980,
      preferredFor: 'Accurate medication dispensing & respectful staff',
    },
    {
      name: 'MedPlus Express Pharmacy',
      category: 'Pharmacy & Delivery',
      rating: 4.81,
      reviews: 2140,
      preferredFor: 'Ultra-fast doorstep prescription fulfillment',
    },
    {
      name: 'Equity Diagnostics Lab',
      category: 'Diagnostic Laboratory',
      rating: 4.74,
      reviews: 1250,
      preferredFor: 'Same-day WhatsApp & App lab test result delivery',
    },
  ],

  spendingPatterns: [
    { channel: 'Prescription Medications', percentage: 38, avgTicketUsd: 32 },
    { channel: 'Outpatient Consultations', percentage: 32, avgTicketUsd: 28 },
    { channel: 'Diagnostic Lab Tests', percentage: 18, avgTicketUsd: 45 },
    { channel: 'Maternal & Preventive Care', percentage: 12, avgTicketUsd: 65 },
  ],

  repaymentPreferences: [
    { method: 'M-Pesa Express Auto-Debit', share: 68, growth: '+14% YoY' },
    { method: 'Card / Visa Recurring', share: 19, growth: '+6% YoY' },
    { method: 'Bank Direct Transfer', share: 11, growth: '-2% YoY' },
    { method: 'Other Mobile Wallets', share: 2, growth: 'Stable' },
  ],
}
