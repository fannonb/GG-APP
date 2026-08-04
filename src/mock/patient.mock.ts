import type { Patient, Beneficiary, NewsItem, Transaction, Notification, Appointment } from '@/types/user.types'
import type { Provider, ProviderReview } from '@/types/provider.types'
import type { PatientInvoice } from '@/types/invoice.types'

export const MOCK_USER: Patient = {
  name: 'Sarah Johnson',
  email: 'sarah.johnson@email.com',
  phone: '+254 712 345 678',
  nationalId: 'KE-30482175-A',
  country: 'Kenya',
  countryCode: 'KE',
  residenceCountry: 'Kenya',
  residesAbroad: false,
  creditLimit: 5000,
  creditUsed: 2550,
  creditAvailable: 2450,
  creditStatus: 'approved',
  memberSince: '2025-08-01',
  hasPaymentPin: true,
  financePartnerId: 'equity',
  creditAccountRef: 'GGA-847291',
  beneficiariesEnabled: true,
}

const MON_FRI = (from: string, to: string) => ({
  Mon: { open: true,  from, to }, Tue: { open: true,  from, to },
  Wed: { open: true,  from, to }, Thu: { open: true,  from, to },
  Fri: { open: true,  from, to }, Sat: { open: false, from, to },
  Sun: { open: false, from, to },
})
const MON_SAT = (from: string, to: string) => ({
  Mon: { open: true,  from, to }, Tue: { open: true,  from, to },
  Wed: { open: true,  from, to }, Thu: { open: true,  from, to },
  Fri: { open: true,  from, to }, Sat: { open: true,  from, to },
  Sun: { open: false, from, to },
})
const ALL_WEEK = (from: string, to: string) => ({
  Mon: { open: true, from, to }, Tue: { open: true, from, to },
  Wed: { open: true, from, to }, Thu: { open: true, from, to },
  Fri: { open: true, from, to }, Sat: { open: true, from, to },
  Sun: { open: true, from, to },
})

export const MOCK_PROVIDERS: Provider[] = [
  { id: 1, name: 'City Medical Centre',   category: 'doctor',    rating: 4.8, reviews: 124, distance: '1.2 km', status: 'open',   services: ['General Practice', 'Internal Medicine', 'Pediatrics'],             hours: 'Mon–Fri: 08:00–18:00', openingHours: MON_FRI('08:00', '18:00'), phone: '+263 4 123 4567', country: 'Zimbabwe', address: '14 Samora Machel Ave, Harare', lat: -17.8260, lng: 31.0530 },
  { id: 2, name: 'LifeCare Pharmacy',     category: 'pharmacy',  rating: 4.6, reviews: 89,  distance: '0.8 km', status: 'open',   services: ['Prescription Fill', 'OTC Medications', 'Health Products', 'Vaccinations'], hours: 'Mon–Sat: 07:30–20:00', openingHours: MON_SAT('07:30', '20:00'), phone: '+263 4 234 5678', country: 'Zimbabwe', address: '3 Fife Ave, Harare',            lat: -17.8170, lng: 31.0510 },
  { id: 3, name: 'Premier Diagnostics',   category: 'laboratory',rating: 4.9, reviews: 56,  distance: '2.4 km', status: 'open',   services: ['Blood Tests', 'Urinalysis', 'Pathology', 'PCR Testing'],           hours: 'Mon–Fri: 07:00–17:00', openingHours: MON_FRI('07:00', '17:00'), phone: '+263 4 345 6789', country: 'Zimbabwe', address: '88 Enterprise Rd, Harare',     lat: -17.8480, lng: 31.1010 },
  { id: 4, name: 'Apex Radiology',        category: 'radiology', rating: 4.7, reviews: 43,  distance: '3.1 km', status: 'closed', services: ['X-Ray', 'Ultrasound', 'CT Scan', 'MRI'],                          hours: 'Mon–Fri: 08:00–16:00', openingHours: MON_FRI('08:00', '16:00'), phone: '+263 4 456 7890', country: 'Zimbabwe', address: '56 Borrowdale Rd, Harare',     lat: -17.7700, lng: 31.0820 },
  { id: 5, name: 'Parirenyatwa Hospital', category: 'hospital',  rating: 4.4, reviews: 312, distance: '4.7 km', status: 'open',   services: ['Emergency', 'Surgery', 'Maternity', 'ICU', 'Outpatients'],         hours: '24/7',                 openingHours: ALL_WEEK('00:00', '23:59'), phone: '+263 4 791 2000', country: 'Zimbabwe', address: 'Mazowe St, Harare',             lat: -17.8120, lng: 31.0480 },
  { id: 6, name: 'MedPlus Clinic',        category: 'clinic',    rating: 4.5, reviews: 78,  distance: '1.9 km', status: 'open',   services: ['General Practice', 'Vaccinations', 'Minor Surgery', 'Wellness Checks'], hours: 'Mon–Sat: 07:00–19:00', openingHours: MON_SAT('07:00', '19:00'), phone: '+263 4 567 8901', country: 'Zimbabwe', address: '22 Greendale Ave, Harare',  lat: -17.8080, lng: 31.1090 },
]

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-2026-001', provider: 'City Medical Centre',  amount: 450.00, date: '2026-05-15', status: 'authorized', service: 'General Consultation' },
  { id: 'TXN-2026-002', provider: 'LifeCare Pharmacy',    amount: 125.50, date: '2026-05-10', status: 'authorized', service: 'Prescription Fill' },
  { id: 'TXN-2026-003', provider: 'Premier Diagnostics',  amount: 280.00, date: '2026-05-03', status: 'authorized', service: 'Blood Panel' },
  { id: 'TXN-2026-004', provider: 'MedPlus Clinic',       amount: 95.00,  date: '2026-04-28', status: 'authorized', service: 'Follow-up Consultation' },
  { id: 'TXN-2026-005', provider: 'Apex Radiology',       amount: 380.00, date: '2026-04-20', status: 'authorized', service: 'Chest X-Ray & Report' },
]

export const MOCK_INVOICE: PatientInvoice = {
  id: 'INV-2026-0842',
  providerId: 1,
  status: 'pending_auth',
  provider: { name: 'City Medical Centre', license: 'MCZ-2019-04821', phone: '+263 4 123 4567', address: '14 Samora Machel Ave, Harare' },
  date: '2026-05-19',
  dueDate: '2026-05-26',
  amount: 450.00,
  billedTo: { name: 'Sarah Johnson', nationalId: 'KE-30482175-A' },
  serviceFor: { type: 'beneficiary', name: 'Emma Johnson', relation: 'Child', age: 13 },
  services: [
    { name: 'Consultation Fee',                      amount: 150.00 },
    { name: 'Blood Pressure Monitoring',             amount: 80.00 },
    { name: 'Medication — Amlodipine 5mg × 30',     amount: 120.00 },
    { name: 'Dressing & Wound Care',                 amount: 100.00 },
  ],
}

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 1,
    title: 'WHO Issues Updated Guidance on Hypertension Management',
    source: 'World Health Organization',
    date: '2026-05-19',
    tag: 'Health Alert',
    body: 'The World Health Organization has released updated clinical guidelines for the management of hypertension, recommending earlier intervention thresholds and expanded access to combination therapy in low- and middle-income countries.\n\nKey changes include a revised blood pressure target of below 130/80 mmHg for most adults, and a stronger emphasis on lifestyle modifications alongside pharmacological treatment. Health systems are urged to integrate hypertension screening into routine primary care visits.\n\nThe guidelines also highlight the importance of patient education and self-monitoring, noting that uncontrolled hypertension remains the leading preventable risk factor for cardiovascular disease globally.',
    url: 'https://www.who.int/news/item/hypertension-guidelines',
  },
  {
    id: 2,
    title: 'Zimbabwe MoH Launches Free Diabetes Screening Programme',
    source: 'Ministry of Health Zimbabwe',
    date: '2026-05-18',
    tag: 'Local Health',
    body: 'The Zimbabwe Ministry of Health and Child Care has announced the rollout of a nationwide free diabetes screening programme, targeting adults aged 35 and above across all provinces.\n\nThe initiative, supported by the Global Fund, will deploy mobile screening units to rural and peri-urban areas where access to diagnostic services has historically been limited. Participants will receive blood glucose testing, BMI assessment, and dietary counselling at no cost.\n\nEarly detection is critical — studies show that up to 50% of diabetes cases in sub-Saharan Africa remain undiagnosed. Residents are encouraged to visit their nearest public clinic or GG\'APP-listed provider to take part in the programme.',
    url: 'https://www.mohcc.gov.zw/news',
  },
  {
    id: 3,
    title: 'New Study Links Sleep Quality to Cardiovascular Health',
    source: 'Centers for Disease Control and Prevention',
    date: '2026-05-17',
    tag: 'Research',
    body: 'A large-scale study published in the Journal of the American Heart Association has found strong evidence that poor sleep quality significantly increases the risk of heart disease, stroke, and hypertension — independent of other lifestyle factors.\n\nResearchers followed over 150,000 adults across 10 countries for a period of eight years. Those who consistently slept fewer than six hours per night or reported frequent sleep disturbances had a 34% higher risk of major cardiovascular events.\n\nThe CDC recommends adults aim for 7–9 hours of quality sleep per night and advises healthcare providers to include sleep assessments as part of routine cardiovascular risk evaluations.',
    url: 'https://www.cdc.gov/sleep/about_sleep/cardiovascular.html',
  },
]

export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'APT-2026-001', providerId: 1, provider: 'City Medical Centre', category: 'doctor',     date: '2026-06-05', time: '10:30', status: 'confirmed', forSelf: false, beneficiaryId: 'BEN-002', for: 'Emma Johnson',  service: 'General Consultation' },
  { id: 'APT-2026-002', providerId: 6, provider: 'MedPlus Clinic',      category: 'clinic',     date: '2026-06-12', time: '14:00', status: 'confirmed', forSelf: true,  for: 'Sarah Johnson', service: 'Wellness Check' },
  { id: 'APT-2026-003', providerId: 3, provider: 'Premier Diagnostics', category: 'laboratory', date: '2026-06-20', time: '11:00', status: 'pending',   forSelf: true,  for: 'Sarah Johnson', service: 'Blood Panel', rescheduledAt: '2026-06-11T09:45:00' },
  { id: 'APT-2026-004', providerId: 2, provider: 'LifeCare Pharmacy',   category: 'pharmacy',   date: '2026-06-25', time: '08:30', status: 'pending',   forSelf: true,  for: 'Sarah Johnson', service: 'Prescription Fill' },
]

export const MOCK_PAST_APPOINTMENTS: Appointment[] = [
  { id: 'APT-2026-P001', providerId: 1, provider: 'City Medical Centre', category: 'doctor',     date: '2026-05-15', time: '10:30', status: 'completed', forSelf: false, beneficiaryId: 'BEN-002', for: 'Emma Johnson',  service: 'General Consultation' },
  { id: 'APT-2026-P002', providerId: 2, provider: 'LifeCare Pharmacy',   category: 'pharmacy',   date: '2026-05-10', time: '14:00', status: 'completed', forSelf: true,  for: 'Sarah Johnson', service: 'Prescription Fill' },
  { id: 'APT-2026-P003', providerId: 3, provider: 'Premier Diagnostics', category: 'laboratory', date: '2026-05-03', time: '09:00', status: 'completed', forSelf: true,  for: 'Sarah Johnson', service: 'Blood Panel' },
  { id: 'APT-2026-P004', providerId: 6, provider: 'MedPlus Clinic',      category: 'clinic',     date: '2026-04-28', time: '11:30', status: 'completed', forSelf: true,  for: 'Sarah Johnson', service: 'Follow-up Consultation' },
  { id: 'APT-2026-P005', providerId: 4, provider: 'Apex Radiology',      category: 'radiology',  date: '2026-04-20', time: '14:30', status: 'cancelled', forSelf: false, beneficiaryId: 'BEN-001', for: 'David Johnson', service: 'Chest X-Ray & Report' },
]

export const MOCK_REVIEWS: ProviderReview[] = [
  { id: 'REV-001', providerId: 1, name: 'Michael T.', date: '12 May 2026', rating: 5, text: "Excellent service. Dr. Ndlovu was very thorough and the waiting time was minimal." },
  { id: 'REV-002', providerId: 1, name: 'Grace M.',   date: '8 May 2026',  rating: 4, text: "Clean facility, friendly staff. GG'APP payment made it very easy." },
  { id: 'REV-003', providerId: 1, name: 'David K.',   date: '2 May 2026',  rating: 5, text: "Very professional. Highly recommend for anyone needing a good GP." },
  { id: 'REV-004', providerId: 2, name: 'Tendai M.',  date: '10 May 2026', rating: 4, text: "Quick and efficient. The pharmacist explained everything clearly." },
  { id: 'REV-005', providerId: 2, name: 'Ruth N.',    date: '5 May 2026',  rating: 5, text: "Always well-stocked. Best pharmacy I've visited in Harare." },
  { id: 'REV-006', providerId: 3, name: 'James M.',   date: '3 May 2026',  rating: 5, text: "Results were ready same day. Clean lab with friendly technicians." },
  { id: 'REV-007', providerId: 5, name: 'Chipo N.',   date: '9 May 2026',  rating: 4, text: "Emergency team responded quickly. Maternity ward is top class." },
  { id: 'REV-008', providerId: 6, name: 'Patrick Z.', date: '28 Apr 2026', rating: 4, text: "Convenient hours and the vaccination process was smooth." },
]

export const MOCK_BENEFICIARIES: Beneficiary[] = [
  { id: 'BEN-001', name: 'David Johnson', relation: 'Spouse', dob: '1985-03-12', countryCode: 'KE', nationalId: 'ZW-08421756-B', age: 41 },
  { id: 'BEN-002', name: 'Emma Johnson',  relation: 'Child',  dob: '2012-07-24', countryCode: 'KE', nationalId: 'ZW-12345678-C', age: 13 },
  { id: 'BEN-003', name: 'Grace Johnson', relation: 'Parent', dob: '1955-11-08', countryCode: 'ZW', nationalId: 'ZW-56789012-D', age: 70 },
]

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'N001', type: 'payment',     title: 'Payment Received',               body: 'City Medical Centre received Ksh.450.00 for your consultation on 15 May 2026.',                                   time: '2026-05-15T10:32:00', read: true,  screen: 'transaction-history' },
  { id: 'N002', type: 'invoice',     title: 'Invoice Pending Authorization',  body: 'City Medical Centre has raised invoice INV-2026-0842 for Ksh.450.00. Please review and authorize.',             time: '2026-05-19T09:15:00', read: false, screen: 'invoice-review' },
  { id: 'N003', type: 'appointment', title: 'Appointment Confirmed',          body: 'City Medical Centre confirmed your appointment for Emma Johnson on 5 June 2026 at 10:30 AM.',                  time: '2026-05-31T09:20:00', read: true,  screen: '/app/appointments' },
  { id: 'N008', type: 'appointment', title: 'Reschedule Proposed',            body: 'Premier Diagnostics proposed a new time for Sarah Johnson: Jun 20, 2026 at 11:00. Note: We had to move an equipment maintenance slot.',                                                             time: '2026-06-11T09:45:00', read: false, screen: '/app/appointments/APT-2026-003/reschedule' },
  { id: 'N004', type: 'credit',      title: 'Balance Updated',                body: 'Your healthcare balance has been reviewed and updated to Ksh.5,000.00.',                                     time: '2026-05-10T08:00:00', read: true,  screen: 'credit-wallet' },
  { id: 'N005', type: 'appointment', title: 'Appointment Request Sent',       body: 'Your engagement request has been sent to MedPlus Clinic. Awaiting confirmation.',                           time: '2026-05-18T11:20:00', read: true,  screen: 'find-service' },
  { id: 'N006', type: 'appointment', title: 'New Provider Near You',          body: "MedFirst Diagnostics Lab has joined GG'APP and is now available 0.6 km from you.",                          time: '2026-05-21T07:00:00', read: false, screen: 'find-service' },
  { id: 'N007', type: 'system',      title: 'Profile Verification Complete',  body: 'Your identity has been successfully verified. Your account is fully active.',                               time: '2026-05-01T10:00:00', read: true,  screen: 'profile' },
]
