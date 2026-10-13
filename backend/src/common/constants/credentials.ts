/**
 * Which licences a provider must give, by country and service.
 *
 * Kept identical in the web app (src/config/credentials.ts): the form builds its
 * licence cards from it and the API re-checks every application against it.
 * Research and open questions: "Provider registration: licence numbers by category".
 * Number formats are not published by the regulators, so numbers are only
 * checked loosely (see CREDENTIAL_NUMBER_PATTERN); examples are given only where known.
 */

export type CredentialCountry = 'KE' | 'ZW' | 'ZM'
export type CredentialService = 'Hospital' | 'Clinic' | 'Doctor' | 'Pharmacy' | 'Laboratory' | 'Radiology'

export const CREDENTIAL_SERVICES: CredentialService[] = ['Hospital', 'Clinic', 'Doctor', 'Pharmacy', 'Laboratory', 'Radiology']

export interface CredentialType {
  kind: string
  country: CredentialCountry
  /** Card title, e.g. "Facility licence". */
  label: string
  /** Short regulator name shown on the card. */
  regulator: string
  /** 'facility': a licence for the premises or equipment. 'person': the registered professional in charge. */
  holder: 'facility' | 'person'
  numberLabel: string
  example?: string
  /** Ask for the expiry date (licences renewed every year). */
  expires: boolean
  /** Ask for a photo or PDF of the certificate. */
  document: boolean
  /** Insurer or registry entries the provider may add but does not have to. */
  optionalOnly?: boolean
  /** Where an admin checks the number. */
  verifyUrl?: string
  verifyHint?: string
}

export const CREDENTIAL_TYPES: CredentialType[] = [
  // Kenya
  { kind: 'KE_KMPDC_FACILITY', country: 'KE', label: 'Facility licence', regulator: 'KMPDC', holder: 'facility', numberLabel: 'KMPDC facility registration number', expires: true, document: true, verifyUrl: 'https://kmpdc.go.ke', verifyHint: 'Search for a registered health facility, or SMS 20547' },
  { kind: 'KE_COC_CLINIC', country: 'KE', label: 'Clinic licence (clinical officer)', regulator: 'Clinical Officers Council', holder: 'facility', numberLabel: 'Clinical Officers Council clinic licence number', expires: true, document: true, verifyUrl: 'https://clinicalofficerscouncil.org' },
  { kind: 'KE_KMHFL_CODE', country: 'KE', label: 'Master Facility List code', regulator: 'Ministry of Health (KMHFL)', holder: 'facility', numberLabel: 'KMHFL facility code', expires: false, document: false, optionalOnly: true, verifyUrl: 'https://kmhfl.health.go.ke' },
  { kind: 'KE_KMPDC_PRACTITIONER', country: 'KE', label: 'Doctor or dentist registration', regulator: 'KMPDC', holder: 'person', numberLabel: 'KMPDC registration number', example: 'A1234', expires: true, document: true, verifyUrl: 'https://kmpdc.go.ke', verifyHint: 'Online register, or SMS 20547 with P# and the name or number' },
  { kind: 'KE_PPB_PREMISES', country: 'KE', label: 'Pharmacy premises licence', regulator: 'Pharmacy and Poisons Board', holder: 'facility', numberLabel: 'PPB premises licence number', expires: true, document: true, verifyUrl: 'https://pharmacyboardkenya.org', verifyHint: 'PPB portal, or SMS 21031' },
  { kind: 'KE_PPB_PHARMACIST', country: 'KE', label: 'Superintendent pharmacist', regulator: 'Pharmacy and Poisons Board', holder: 'person', numberLabel: 'PPB registration number', expires: false, document: false, verifyUrl: 'https://pharmacyboardkenya.org', verifyHint: 'PPB portal, or SMS 21031' },
  { kind: 'KE_KMLTTB_LAB', country: 'KE', label: 'Laboratory registration', regulator: 'KMLTTB', holder: 'facility', numberLabel: 'KMLTTB laboratory registration number', expires: true, document: true, verifyUrl: 'https://kmlttb.org' },
  { kind: 'KE_KMLTTB_SUPERINTENDENT', country: 'KE', label: 'Laboratory superintendent', regulator: 'KMLTTB', holder: 'person', numberLabel: 'KMLTTB registration number', expires: false, document: false, verifyUrl: 'https://kmlttb.org' },
  { kind: 'KE_KNRA_XRAY', country: 'KE', label: 'X-ray / radiation licence', regulator: 'Kenya Nuclear Regulatory Authority', holder: 'facility', numberLabel: 'KNRA authorisation number', expires: true, document: true },
  { kind: 'KE_SHA_CONTRACT', country: 'KE', label: 'SHA contract', regulator: 'Social Health Authority', holder: 'facility', numberLabel: 'SHA facility or contract number', expires: true, document: false, optionalOnly: true, verifyUrl: 'https://sha.go.ke' },

  // Zimbabwe
  { kind: 'ZW_HPA_INSTITUTION', country: 'ZW', label: 'Health institution registration', regulator: 'Health Professions Authority', holder: 'facility', numberLabel: 'HPA registration number', expires: true, document: true, verifyUrl: 'https://hpa.co.zw', verifyHint: 'HPA electronic register' },
  { kind: 'ZW_MDPCZ_PRACTITIONER', country: 'ZW', label: 'Doctor or dentist registration', regulator: 'MDPCZ', holder: 'person', numberLabel: 'MDPCZ registration number', expires: true, document: true, verifyUrl: 'https://mdpcz.co.zw', verifyHint: 'MDPCZ Search Register' },
  { kind: 'ZW_MCAZ_PREMISES', country: 'ZW', label: 'Pharmacy premises licence', regulator: 'MCAZ', holder: 'facility', numberLabel: 'MCAZ premises licence number', expires: true, document: true, verifyUrl: 'https://www.mcaz.co.zw' },
  { kind: 'ZW_PCZ_PHARMACIST', country: 'ZW', label: 'Supervising pharmacist', regulator: 'Pharmacists Council of Zimbabwe', holder: 'person', numberLabel: 'Pharmacists Council registration number', expires: false, document: false },
  { kind: 'ZW_MLCSCZ_SCIENTIST', country: 'ZW', label: 'Lead laboratory scientist', regulator: 'Medical Laboratory and Clinical Scientists Council', holder: 'person', numberLabel: 'MLCSCZ registration number', expires: false, document: false },
  { kind: 'ZW_RPAZ_XRAY', country: 'ZW', label: 'X-ray / radiation licence', regulator: 'Radiation Protection Authority of Zimbabwe', holder: 'facility', numberLabel: 'RPAZ licence number', expires: true, document: true },
  { kind: 'ZW_AHFOZ_GRADING', country: 'ZW', label: 'Medical aid grading', regulator: 'Association of Health Funders of Zimbabwe', holder: 'facility', numberLabel: 'AHFoZ number', expires: false, document: false, optionalOnly: true },

  // Zambia
  { kind: 'ZM_HPCZ_FACILITY', country: 'ZM', label: 'Health facility licence', regulator: 'HPCZ', holder: 'facility', numberLabel: 'HPCZ facility licence number', expires: true, document: true, verifyUrl: 'https://www.hpcz.org.zm' },
  { kind: 'ZM_HPCZ_PRACTITIONER', country: 'ZM', label: 'Doctor or dentist registration', regulator: 'HPCZ', holder: 'person', numberLabel: 'HPCZ registration number', expires: true, document: true, verifyUrl: 'https://www.hpcz.org.zm' },
  { kind: 'ZM_ZAMRA_PREMISES', country: 'ZM', label: 'Pharmacy premises registration', regulator: 'ZAMRA', holder: 'facility', numberLabel: 'ZAMRA certificate of registration number', expires: true, document: true, verifyUrl: 'https://www.zamra.co.zm' },
  { kind: 'ZM_PHARMACIST', country: 'ZM', label: 'Pharmacist in charge', regulator: 'HPCZ', holder: 'person', numberLabel: 'Pharmacist registration number', expires: false, document: false, verifyUrl: 'https://www.hpcz.org.zm' },
  { kind: 'ZM_RPA_XRAY', country: 'ZM', label: 'X-ray / radiation licence', regulator: 'Radiation Protection Authority', holder: 'facility', numberLabel: 'Ionising radiation licence number', expires: true, document: true },
  { kind: 'ZM_NHIMA_ACCREDITATION', country: 'ZM', label: 'NHIMA accreditation', regulator: 'NHIMA', holder: 'facility', numberLabel: 'NHIMA accreditation number', expires: true, document: false, optionalOnly: true, verifyUrl: 'https://www.nhima.co.zm' },
]

/**
 * Per service: `required` is a list of groups. The registered person in charge of a pharmacy
 * or lab is optional at sign-up; admins request it when the premises certificate doesn't name them.
 * A `required` group is satisfied by any ONE of
 * its kinds (Kenyan clinics are licensed by KMPDC or by the Clinical Officers Council).
 */
interface ServiceRule {
  required: string[][]
  optional?: string[]
}

export const CREDENTIAL_RULES: Record<CredentialCountry, Record<CredentialService, ServiceRule>> = {
  KE: {
    Hospital: { required: [['KE_KMPDC_FACILITY']], optional: ['KE_KMHFL_CODE', 'KE_SHA_CONTRACT'] },
    Clinic: { required: [['KE_KMPDC_FACILITY', 'KE_COC_CLINIC']], optional: ['KE_KMHFL_CODE', 'KE_SHA_CONTRACT'] },
    Doctor: { required: [['KE_KMPDC_PRACTITIONER']] },
    Pharmacy: { required: [['KE_PPB_PREMISES']], optional: ['KE_PPB_PHARMACIST', 'KE_KMHFL_CODE', 'KE_SHA_CONTRACT'] },
    Laboratory: { required: [['KE_KMLTTB_LAB']], optional: ['KE_KMLTTB_SUPERINTENDENT', 'KE_KMHFL_CODE', 'KE_SHA_CONTRACT'] },
    Radiology: { required: [['KE_KNRA_XRAY'], ['KE_KMPDC_FACILITY']], optional: ['KE_KMHFL_CODE', 'KE_SHA_CONTRACT'] },
  },
  ZW: {
    Hospital: { required: [['ZW_HPA_INSTITUTION']], optional: ['ZW_AHFOZ_GRADING'] },
    Clinic: { required: [['ZW_HPA_INSTITUTION']], optional: ['ZW_AHFOZ_GRADING'] },
    Doctor: { required: [['ZW_MDPCZ_PRACTITIONER']] },
    Pharmacy: { required: [['ZW_MCAZ_PREMISES']], optional: ['ZW_PCZ_PHARMACIST', 'ZW_AHFOZ_GRADING'] },
    Laboratory: { required: [['ZW_HPA_INSTITUTION']], optional: ['ZW_MLCSCZ_SCIENTIST', 'ZW_AHFOZ_GRADING'] },
    Radiology: { required: [['ZW_RPAZ_XRAY'], ['ZW_HPA_INSTITUTION']], optional: ['ZW_AHFOZ_GRADING'] },
  },
  ZM: {
    Hospital: { required: [['ZM_HPCZ_FACILITY']], optional: ['ZM_NHIMA_ACCREDITATION'] },
    Clinic: { required: [['ZM_HPCZ_FACILITY']], optional: ['ZM_NHIMA_ACCREDITATION'] },
    Doctor: { required: [['ZM_HPCZ_PRACTITIONER']] },
    Pharmacy: { required: [['ZM_ZAMRA_PREMISES']], optional: ['ZM_PHARMACIST', 'ZM_NHIMA_ACCREDITATION'] },
    Laboratory: { required: [['ZM_HPCZ_FACILITY']], optional: ['ZM_NHIMA_ACCREDITATION'] },
    Radiology: { required: [['ZM_RPA_XRAY'], ['ZM_HPCZ_FACILITY']], optional: ['ZM_NHIMA_ACCREDITATION'] },
  },
}

/** Business registration and tax labels per country. */
export const BUSINESS_FIELDS: Record<CredentialCountry, { registration: string; tax: string }> = {
  KE: { registration: 'Business registration number', tax: 'KRA PIN' },
  ZW: { registration: 'Company registration number', tax: 'ZIMRA BP number' },
  ZM: { registration: 'PACRA registration number', tax: 'ZRA TPIN' },
}

/** Letters, digits and / . - or spaces; 2 to 40 characters. Regulators publish no stricter format. */
export const CREDENTIAL_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ./-]{1,39}$/
export const CREDENTIAL_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
export const CREDENTIAL_FILE_MAX_BYTES = 5 * 1024 * 1024

export function credentialType(kind: string): CredentialType | undefined {
  return CREDENTIAL_TYPES.find(t => t.kind === kind)
}

export function toCredentialCountry(value: string | null | undefined): CredentialCountry | null {
  const v = (value ?? '').trim().toUpperCase()
  if (v === 'KE' || v === 'KENYA') return 'KE'
  if (v === 'ZW' || v === 'ZIMBABWE') return 'ZW'
  if (v === 'ZM' || v === 'ZAMBIA') return 'ZM'
  return null
}

export function toCredentialService(value: string): CredentialService | null {
  const v = value.trim().toLowerCase()
  return CREDENTIAL_SERVICES.find(s => s.toLowerCase() === v || (s === 'Radiology' && v.startsWith('radiology'))) ?? null
}

/**
 * The licence groups a provider must cover for the services they ticked, without
 * duplicates. A group is dropped when one of its kinds is already required on its own
 * (a Kenyan hospital that also ticks Clinic needs the KMPDC licence once, not twice).
 */
export function credentialsFor(country: CredentialCountry, services: string[]) {
  const picked = services.map(toCredentialService).filter((s): s is CredentialService => !!s)
  const groups: string[][] = []
  const optional = new Set<string>()
  for (const service of picked) {
    const rule = CREDENTIAL_RULES[country][service]
    for (const group of rule.required) {
      if (!groups.some(g => g.length === group.length && g.every(k => group.includes(k)))) groups.push(group)
    }
    for (const kind of rule.optional ?? []) optional.add(kind)
  }
  const single = new Set(groups.filter(g => g.length === 1).map(g => g[0]))
  const required = groups.filter(g => g.length === 1 || !g.some(k => single.has(k)))
  const requiredKinds = new Set(required.flat())
  return {
    required,
    optional: [...optional].filter(k => !requiredKinds.has(k)),
  }
}

/** Every kind a provider may send for these services (required groups plus optional ones). */
export function allowedCredentialKinds(country: CredentialCountry, services: string[]) {
  const { required, optional } = credentialsFor(country, services)
  return new Set([...required.flat(), ...optional])
}

/** Only an individual doctor (no premises) may leave out the business registration number. */
export function needsBusinessRegistration(services: string[]) {
  const picked = services.map(toCredentialService).filter(Boolean)
  return picked.some(s => s !== 'Doctor')
}
