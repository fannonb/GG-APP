/**
 * Standard lists behind the admin insights. Each is the single place to change
 * a definition; the web and mobile apps keep matching copies of the lists they
 * show (src/config/dataCapture.ts and @gg/shared-config).
 */

export type ConditionGroup = 'acute' | 'chronic' | 'mental' | 'maternal' | 'child' | 'preventive' | 'other'

/**
 * Condition picked by the provider when recording a visit. A starter list for
 * GG'APP: clinical/actuarial partners should confirm it before it is shared
 * externally. Codes are stored; labels can change freely.
 */
export const CONDITION_CATEGORIES: Array<{ code: string; label: string; group: ConditionGroup }> = [
  { code: 'malaria', label: 'Malaria', group: 'acute' },
  { code: 'respiratory', label: 'Respiratory infection (cough, flu, pneumonia)', group: 'acute' },
  { code: 'diarrhoeal', label: 'Diarrhoea or stomach infection', group: 'acute' },
  { code: 'urinary_sti', label: 'Urinary tract or sexually transmitted infection', group: 'acute' },
  { code: 'skin_eye_ear', label: 'Skin, eye or ear condition', group: 'acute' },
  { code: 'injury', label: 'Injury, wound or burn', group: 'acute' },
  { code: 'other_acute', label: 'Other short-term illness', group: 'acute' },
  { code: 'hypertension', label: 'Hypertension or heart disease', group: 'chronic' },
  { code: 'diabetes', label: 'Diabetes or other metabolic condition', group: 'chronic' },
  { code: 'asthma_copd', label: 'Asthma or chronic lung disease', group: 'chronic' },
  { code: 'hiv_tb', label: 'HIV or TB', group: 'chronic' },
  { code: 'other_chronic', label: 'Other long-term condition', group: 'chronic' },
  { code: 'mental_health', label: 'Mental health', group: 'mental' },
  { code: 'maternal', label: 'Pregnancy, antenatal or postnatal care', group: 'maternal' },
  { code: 'family_planning', label: 'Family planning or reproductive health', group: 'maternal' },
  { code: 'child_wellness', label: 'Child check-up or immunisation', group: 'child' },
  { code: 'checkup', label: 'General check-up or screening', group: 'preventive' },
  { code: 'other', label: 'Other', group: 'other' },
]

export const CONDITION_CODES = CONDITION_CATEGORIES.map(c => c.code)

export const CONDITION_GROUP_LABEL: Record<ConditionGroup, string> = {
  acute: 'Acute (short-term)',
  chronic: 'Chronic (long-term)',
  mental: 'Mental health',
  maternal: 'Maternal & reproductive',
  child: 'Child health',
  preventive: 'Check-ups & screening',
  other: 'Other',
}

export function conditionOf(code: string | null | undefined) {
  return CONDITION_CATEGORIES.find(c => c.code === code) ?? null
}

/** Counties (Kenya) and provinces (Zimbabwe, Zambia). */
export const REGIONS_BY_COUNTRY: Record<'KE' | 'ZW' | 'ZM', string[]> = {
  KE: [
    'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
    'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
    'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru',
    'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
    'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
  ],
  ZW: [
    'Bulawayo', 'Harare', 'Manicaland', 'Mashonaland Central', 'Mashonaland East', 'Mashonaland West', 'Masvingo',
    'Matabeleland North', 'Matabeleland South', 'Midlands',
  ],
  ZM: ['Central', 'Copperbelt', 'Eastern', 'Luapula', 'Lusaka', 'Muchinga', 'Northern', 'North-Western', 'Southern', 'Western'],
}

/** Returns the standard spelling of a region for the country, or null when it isn't on the list. */
export function normalizeRegion(country: 'KE' | 'ZW' | 'ZM' | null, value: string | null | undefined): string | null {
  if (!country || !value) return null
  const wanted = value.trim().toLowerCase().replace(/\s+(county|province)$/i, '')
  return REGIONS_BY_COUNTRY[country].find(r => r.toLowerCase() === wanted) ?? null
}

export const REPAYMENT_METHODS: Array<{ code: string; label: string }> = [
  { code: 'mobile_money', label: 'Mobile money (M-Pesa, EcoCash, Airtel Money)' },
  { code: 'bank', label: 'Bank transfer or debit order' },
  { code: 'salary', label: 'Salary deduction' },
  { code: 'card', label: 'Debit or credit card' },
  { code: 'cash', label: "Cash at the finance partner's branch" },
]

export const BENEFICIARY_GENDERS = ['female', 'male', 'prefer_not_to_say'] as const

/** Five membership age bands used everywhere in the admin insights. */
export const AGE_BANDS: Array<{ name: string; min: number; max: number }> = [
  { name: 'Under 18', min: 0, max: 17 },
  { name: '18–24', min: 18, max: 24 },
  { name: '25–34', min: 25, max: 34 },
  { name: '35–50', min: 35, max: 50 },
  { name: '51+', min: 51, max: 200 },
]

export function ageBandOf(age: number) {
  return AGE_BANDS.find(b => age >= b.min && age <= b.max)?.name ?? '51+'
}

/** Treatment sought between these hours (inclusive start, exclusive end) counts as daytime. */
export const DAY_HOURS = { start: 6, end: 18 }

/**
 * Credit amount ranges per country, in local currency. Edges are the upper
 * bound of each range; the last range is open-ended. Confirm with finance.
 */
export const CREDIT_BANDS: Record<'KE' | 'ZW' | 'ZM', number[]> = {
  KE: [5_000, 15_000, 30_000, 60_000],
  ZW: [100, 300, 600, 1_200],
  ZM: [500, 1_500, 3_000, 6_000],
}
