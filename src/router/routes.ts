export const LOGO = '/gg-logo-v4.png'

export const ROUTES = {
  // Public
  SPLASH:          '/',
  LOGIN:           '/login',
  REGISTER:        '/register',
  VERIFY:          '/verify',
  ONBOARDING:      '/onboarding',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',
  TERMS:           '/terms',
  PRIVACY_POLICY:  '/privacy',

  // Patient portal
  DASHBOARD:    '/app/dashboard',
  FIND_SERVICE: '/app/services',
  PROVIDER_LIST:    '/app/services/:category',
  PROVIDER_PROFILE: '/app/services/provider/:id',
  BOOKING:         '/app/booking',
  BOOKING_CONFIRM: '/app/booking/confirm',
  CREDIT_WALLET:      '/app/credit',
  CREDIT_DISCLAIMER:  '/app/credit/disclaimer',
  CREDIT_APPLY:       '/app/credit/apply',
  CREDIT_INCREASE:    '/app/credit/increase',
  CREDIT_STATUS:      '/app/credit/status',
  INVOICE_LIST:   '/app/invoices',
  INVOICE_REVIEW: '/app/invoices/:id',
  PIN_AUTH:          '/app/invoices/:id/pay',
  PAYMENT_SUCCESS:   '/app/invoices/:id/success',
  APPOINTMENTS: '/app/appointments',
  PRESCRIPTION_REQUESTS: '/app/prescriptions',
  PRESCRIPTION_CONFIRM: '/app/prescriptions/confirm',
  PRESCRIPTION_DETAIL: '/app/prescriptions/:id',
  TRANSACTIONS: '/app/transactions',
  PROFILE:       '/app/profile',
  SECURITY_PIN:  '/app/security/pin',
  LEDGER:        '/app/ledger',
  LEDGER_PIN:    '/app/ledger/pin',
  LEDGER_ACCESS: '/app/ledger/access',
  NOTIFICATIONS: '/app/notifications',

  // Service Provider portal
  SP_PENDING:      '/sp/pending',
  SP_DASHBOARD:    '/sp/dashboard',
  SP_APPOINTMENTS: '/sp/appointments',
  SP_APT_DETAIL:   '/sp/appointments/:id',
  SP_PATIENTS:     '/sp/patients',
  SP_PATIENT_DETAIL: '/sp/patients/:id',
  SP_PATIENT_LEDGER: '/sp/patients/:id/ledger',
  SP_LEDGER_UNLOCK:  '/sp/ledger/unlock',
  SP_VISIT_RECORD:   '/sp/visits/record',
  SP_INVOICES:       '/sp/invoices',
  SP_INVOICE_UPLOAD: '/sp/invoices/upload',
  SP_INVOICE_DETAIL: '/sp/invoices/:id',
  SP_PRESCRIPTIONS: '/sp/prescriptions',
  SP_PRESCRIPTION_DETAIL: '/sp/prescriptions/:id',
  SP_PAYMENTS:  '/sp/payments',
  SP_SETTINGS:  '/sp/settings',

  // Admin (public)
  ADMIN_LOGIN: '/admin/login',

  // Admin portal
  ADMIN_DASHBOARD:    '/admin/dashboard',
  ADMIN_APPLICATIONS: '/admin/applications',
  ADMIN_CREDIT_APPLICATIONS: '/admin/credit-applications',
  ADMIN_USERS:        '/admin/users',
  ADMIN_PROVIDERS:    '/admin/providers',
  ADMIN_PAYMENTS:     '/admin/payments',
  ADMIN_ANALYTICS:    '/admin/analytics',
  ADMIN_NEWS:         '/admin/news',
  ADMIN_ADS:          '/admin/ads',
  ADMIN_LEDGER_ACCESS: '/admin/ledger-access',
} as const

/** Dynamic route builders for navigation */
export const route = {
  patientInvoice: (id: string) => `/app/invoices/${id}`,
  patientInvoicePay: (id: string) => `/app/invoices/${id}/pay`,
  patientInvoiceSuccess: (id: string) => `/app/invoices/${id}/success`,
  providerList: (category: string) => `/app/services/${category}`,
  patientPrescription: (id: string) => `/app/prescriptions/${id}`,
  providerProfile: (id: number | string) => `/app/services/provider/${id}`,
  spAppointment: (id: string) => `/sp/appointments/${id}`,
  spPatient: (id: string) => `/sp/patients/${id}`,
  spPatientLedger: (id: string) => `/sp/patients/${id}/ledger`,
  spInvoice: (id: string) => `/sp/invoices/${id}`,
  spPrescription: (id: string) => `/sp/prescriptions/${id}`,
  spRecordVisit: () => '/sp/visits/record',
} as const

/** Portal home routes keyed by role */
export const PORTAL_HOME = {
  patient: ROUTES.DASHBOARD,
  sp:      ROUTES.SP_DASHBOARD,
  admin:   ROUTES.ADMIN_DASHBOARD,
} as const
