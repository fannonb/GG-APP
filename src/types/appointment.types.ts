export type AppointmentStatus = 'new' | 'confirmed' | 'completed' | 'cancelled'

export type AppointmentMode = 'Home Visit' | 'In-Person' | 'Telehealth'

export interface Attachment {
  name: string
  type: 'pdf' | 'image' | 'document'
  size: string
}

export interface Vitals {
  bp: string
  temp: string
  weight: string
  sats: string
}

export interface BeneficiaryRef {
  name: string
  relation: string
  age: number
}

export interface VisitHistory {
  id: string
  date: string
  appointmentId: string
  service: string
  forBeneficiary: BeneficiaryRef | null
  diagnosis: string
  treatment: string
  followUp: string
  internalNote: string
  services: string[]
  amount: number
  invoiceRef: string
  status: 'paid' | 'pending' | 'disputed'
  vitals: Vitals
}

export interface Appointment {
  id: string
  patient: string
  phone: string
  service: string
  description: string
  date: string
  time: string
  status: AppointmentStatus
  attachments: Attachment[]
  forSelf: boolean
  beneficiary: BeneficiaryRef | null
  medicalHistory: string[]
  allergies: string[]
  requestedAt: string
  mode: AppointmentMode
  address: string
  duration: string
}

export interface SPPatient {
  id: string
  name: string
  phone: string
  email: string
  dob: string
  gender: string
  address: string
  bloodType: string
  lastVisit: string
  visits: number
  totalSpent: number
  conditions: string[]
  allergies: string[]
  currentMedications: string[]
  beneficiaries: BeneficiaryRef[]
  visitHistory: VisitHistory[]
}
