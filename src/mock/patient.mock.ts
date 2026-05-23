import type { Patient, Beneficiary, NewsItem, Transaction, Notification } from '@/types/user.types'
import type { Provider } from '@/types/provider.types'
import type { PatientInvoice } from '@/types/invoice.types'

export const MOCK_USER: Patient = {
  name: 'Sarah Johnson',
  email: 'sarah.johnson@email.com',
  phone: '+263 77 123 4567',
  nationalId: 'ZW-04821756-A',
  country: 'Zimbabwe',
  creditLimit: 5000,
  creditUsed: 2550,
  creditAvailable: 2450,
  creditStatus: 'approved',
  memberSince: '2025-08-01',
}

export const MOCK_PROVIDERS: Provider[] = [
  { id: 1, name: 'City Medical Centre', category: 'doctor', rating: 4.8, reviews: 124, distance: '1.2 km', status: 'open', services: ['General Practice', 'Internal Medicine', 'Pediatrics'], hours: 'Mon–Fri: 08:00–18:00', phone: '+263 4 123 4567', address: '14 Samora Machel Ave, Harare' },
  { id: 2, name: 'LifeCare Pharmacy', category: 'pharmacy', rating: 4.6, reviews: 89, distance: '0.8 km', status: 'open', services: ['Prescription Fill', 'OTC Medications', 'Health Products', 'Vaccinations'], hours: 'Mon–Sat: 07:30–20:00', phone: '+263 4 234 5678', address: '3 Fife Ave, Harare' },
  { id: 3, name: 'Premier Diagnostics', category: 'laboratory', rating: 4.9, reviews: 56, distance: '2.4 km', status: 'open', services: ['Blood Tests', 'Urinalysis', 'Pathology', 'PCR Testing'], hours: 'Mon–Fri: 07:00–17:00', phone: '+263 4 345 6789', address: '88 Enterprise Rd, Harare' },
  { id: 4, name: 'Apex Radiology', category: 'radiology', rating: 4.7, reviews: 43, distance: '3.1 km', status: 'closed', services: ['X-Ray', 'Ultrasound', 'CT Scan', 'MRI'], hours: 'Mon–Fri: 08:00–16:00', phone: '+263 4 456 7890', address: '56 Borrowdale Rd, Harare' },
  { id: 5, name: 'Parirenyatwa Hospital', category: 'hospital', rating: 4.4, reviews: 312, distance: '4.7 km', status: 'open', services: ['Emergency', 'Surgery', 'Maternity', 'ICU', 'Outpatients'], hours: '24/7', phone: '+263 4 791 2000', address: 'Mazowe St, Harare' },
  { id: 6, name: 'MedPlus Clinic', category: 'clinic', rating: 4.5, reviews: 78, distance: '1.9 km', status: 'open', services: ['General Practice', 'Vaccinations', 'Minor Surgery', 'Wellness Checks'], hours: 'Mon–Sat: 07:00–19:00', phone: '+263 4 567 8901', address: '22 Greendale Ave, Harare' },
]

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-2026-001', provider: 'City Medical Centre',  amount: 450.00, date: '2026-05-15', status: 'completed', service: 'General Consultation' },
  { id: 'TXN-2026-002', provider: 'LifeCare Pharmacy',    amount: 125.50, date: '2026-05-10', status: 'completed', service: 'Prescription Fill' },
  { id: 'TXN-2026-003', provider: 'Premier Diagnostics',  amount: 280.00, date: '2026-05-03', status: 'completed', service: 'Blood Panel' },
  { id: 'TXN-2026-004', provider: 'MedPlus Clinic',       amount: 95.00,  date: '2026-04-28', status: 'completed', service: 'Follow-up Consultation' },
  { id: 'TXN-2026-005', provider: 'Apex Radiology',       amount: 380.00, date: '2026-04-20', status: 'completed', service: 'Chest X-Ray & Report' },
]

export const MOCK_INVOICE: PatientInvoice = {
  id: 'INV-2026-0842',
  status: 'pending_auth',
  provider: { name: 'City Medical Centre', license: 'MCZ-2019-04821', phone: '+263 4 123 4567', address: '14 Samora Machel Ave, Harare' },
  date: '2026-05-19',
  dueDate: '2026-05-26',
  amount: 450.00,
  billedTo: { name: 'Sarah Johnson', nationalId: 'ZW-04821756-A' },
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

export const MOCK_BENEFICIARIES: Beneficiary[] = [
  { id: 'BEN-001', name: 'David Johnson', relation: 'Spouse', dob: '1985-03-12', nationalId: 'ZW-08421756-B', age: 41 },
  { id: 'BEN-002', name: 'Emma Johnson',  relation: 'Child',  dob: '2012-07-24', nationalId: 'ZW-12345678-C', age: 13 },
  { id: 'BEN-003', name: 'Grace Johnson', relation: 'Parent', dob: '1955-11-08', nationalId: 'ZW-56789012-D', age: 70 },
]

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'N001', type: 'payment',     title: 'Payment Received',               body: 'City Medical Centre received Z$450.00 for your consultation on 15 May 2026.',                                   time: '2026-05-15T10:32:00', read: true,  screen: 'transaction-history' },
  { id: 'N002', type: 'invoice',     title: 'Invoice Pending Authorization',  body: 'City Medical Centre has raised invoice INV-2026-0842 for Z$450.00. Please review and authorize.',             time: '2026-05-19T09:15:00', read: false, screen: 'invoice-review' },
  { id: 'N003', type: 'appointment', title: 'Appointment Confirmed',          body: 'City Medical Centre confirmed your appointment for Emma Johnson on 21 May 2026 at 10:30.',                    time: '2026-05-20T14:05:00', read: false, screen: 'find-service' },
  { id: 'N004', type: 'credit',      title: 'Credit Limit Updated',           body: 'Your healthcare credit limit has been reviewed and updated to Z$5,000.00.',                                   time: '2026-05-10T08:00:00', read: true,  screen: 'credit-wallet' },
  { id: 'N005', type: 'appointment', title: 'Appointment Request Sent',       body: 'Your engagement request has been sent to MedPlus Clinic. Awaiting confirmation.',                           time: '2026-05-18T11:20:00', read: true,  screen: 'find-service' },
  { id: 'N006', type: 'appointment', title: 'New Provider Near You',          body: "MedFirst Diagnostics Lab has joined GG'APP and is now available 0.6 km from you.",                          time: '2026-05-21T07:00:00', read: false, screen: 'find-service' },
  { id: 'N007', type: 'system',      title: 'Profile Verification Complete',  body: 'Your identity has been successfully verified. Your account is fully active.',                               time: '2026-05-01T10:00:00', read: true,  screen: 'profile' },
]
