import { ROUTES } from '@/router/routes'
import type { Notification } from '@/types/user.types'

const SCREEN_ROUTE_MAP: Record<string, string> = {
  appointments: ROUTES.APPOINTMENTS,
  'credit-increase': ROUTES.CREDIT_INCREASE,
  'credit-status': ROUTES.CREDIT_STATUS,
  'credit-wallet': ROUTES.CREDIT_WALLET,
  'find-service': ROUTES.FIND_SERVICE,
  'invoice-list': ROUTES.INVOICE_LIST,
  'invoice-review': ROUTES.INVOICE_LIST,
  notifications: ROUTES.NOTIFICATIONS,
  'prescription-requests': ROUTES.PRESCRIPTION_REQUESTS,
  profile: ROUTES.PROFILE,
  ledger: ROUTES.LEDGER,
  'ledger-access': ROUTES.LEDGER_ACCESS,
  'ledger-pin': ROUTES.LEDGER_PIN,
  'transaction-history': ROUTES.TRANSACTIONS,
}

function shouldOpenCreditIncrease(notification: Notification) {
  const text = `${notification.title} ${notification.body}`.toLowerCase()
  return text.includes('increase') || text.includes('low balance')
}

export function resolvePatientNotificationRoute(notification: Notification) {
  const screen = notification.screen?.trim()

  if (screen?.startsWith('/')) {
    return screen
  }

  if (screen && SCREEN_ROUTE_MAP[screen]) {
    return SCREEN_ROUTE_MAP[screen]
  }

  switch (notification.type) {
    case 'appointment':
      return ROUTES.APPOINTMENTS
    case 'invoice':
    case 'payment':
      return ROUTES.INVOICE_LIST
    case 'credit':
      return shouldOpenCreditIncrease(notification)
        ? ROUTES.CREDIT_INCREASE
        : ROUTES.CREDIT_WALLET
    case 'prescription':
      return ROUTES.PRESCRIPTION_REQUESTS
    case 'ledger':
      return ROUTES.LEDGER
    default:
      return ROUTES.DASHBOARD
  }
}
