/**
 * Standard lists for data the app collects for admin insights. Keep in step
 * with the API's copy in backend/src/common/constants/health-data.ts (the API
 * validates against it). The mobile app has its own copy in @gg/shared-config.
 */

export type ConditionGroup = 'acute' | 'chronic' | 'mental' | 'maternal' | 'child' | 'preventive' | 'other'

/** Condition the provider picks when recording a visit. */
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

export const CONDITION_GROUP_LABEL: Record<ConditionGroup, string> = {
  acute: 'Short-term illness',
  chronic: 'Long-term condition',
  mental: 'Mental health',
  maternal: 'Maternal & reproductive',
  child: 'Child health',
  preventive: 'Check-ups & screening',
  other: 'Other',
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

/** Region list for a country given as a code ("KE") or name ("Kenya"). */
export function regionsFor(country: string | null | undefined): string[] {
  const key = (country ?? '').trim().toUpperCase()
  const code = key === 'KENYA' ? 'KE' : key === 'ZIMBABWE' ? 'ZW' : key === 'ZAMBIA' ? 'ZM' : key
  return REGIONS_BY_COUNTRY[code as 'KE' | 'ZW' | 'ZM'] ?? []
}

/** "County" in Kenya, "Province" elsewhere. */
export function regionLabel(country: string | null | undefined) {
  const key = (country ?? '').trim().toUpperCase()
  return key === 'KE' || key === 'KENYA' ? 'County' : 'Province'
}

export const REPAYMENT_METHODS: Array<{ code: string; label: string }> = [
  { code: 'mobile_money', label: 'Mobile money (M-Pesa, EcoCash, Airtel Money)' },
  { code: 'bank', label: 'Bank transfer or debit order' },
  { code: 'salary', label: 'Salary deduction' },
  { code: 'card', label: 'Debit or credit card' },
  { code: 'cash', label: "Cash at the finance partner's branch" },
]

export const BENEFICIARY_GENDERS: Array<{ code: 'female' | 'male' | 'prefer_not_to_say'; label: string }> = [
  { code: 'female', label: 'Female' },
  { code: 'male', label: 'Male' },
  { code: 'prefer_not_to_say', label: 'Prefer not to say' },
]
