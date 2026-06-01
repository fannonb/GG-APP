export const LOGO = '/logo.png'

export const ROUTES = {
  // Public
  SPLASH:   '/',
  LOGIN:    '/login',
  REGISTER: '/register',
  VERIFY:   '/verify',
  ONBOARDING: '/onboarding',

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
  TRANSACTIONS: '/app/transactions',
  PROFILE:       '/app/profile',
  NOTIFICATIONS: '/app/notifications',

  // Service Provider portal
  SP_PENDING:      '/sp/pending',
  SP_DASHBOARD:    '/sp/dashboard',
  SP_APPOINTMENTS: '/sp/appointments',
  SP_APT_DETAIL:   '/sp/appointments/:id',
  SP_PATIENTS:     '/sp/patients',
  SP_PATIENT_DETAIL: '/sp/patients/:id',
  SP_INVOICES:       '/sp/invoices',
  SP_INVOICE_UPLOAD: '/sp/invoices/upload',
  SP_INVOICE_DETAIL: '/sp/invoices/:id',
  SP_PAYMENTS:  '/sp/payments',
  SP_SETTINGS:  '/sp/settings',

  // Admin
  ADMIN_DASHBOARD:    '/admin/dashboard',
  ADMIN_APPLICATIONS: '/admin/applications',
  ADMIN_DISPUTES:     '/admin/disputes',
  ADMIN_INVOICES:     '/admin/invoices',
} as const

/** Dynamic route builders for navigation */
export const route = {
  patientInvoice: (id: string) => `/app/invoices/${id}`,
  patientInvoicePay: (id: string) => `/app/invoices/${id}/pay`,
  patientInvoiceSuccess: (id: string) => `/app/invoices/${id}/success`,
  providerList: (category: string) => `/app/services/${category}`,
  providerProfile: (id: number | string) => `/app/services/provider/${id}`,
  spAppointment: (id: string) => `/sp/appointments/${id}`,
  spPatient: (id: string) => `/sp/patients/${id}`,
  spInvoice: (id: string) => `/sp/invoices/${id}`,
} as const

/** Portal home routes keyed by role */
export const PORTAL_HOME = {
  patient: ROUTES.DASHBOARD,
  sp:      ROUTES.SP_DASHBOARD,
  admin:   ROUTES.ADMIN_DASHBOARD,
} as const
