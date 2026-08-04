import type { Notification } from '@/types/user.types'
import type { PrescriptionRequest } from '@/types/prescription.types'

export interface PrescriptionBannerItem {
  id: string
  headline: string
  detail: string
  screen?: string
}

function isPrescriptionQuoteNotification(notification: Notification) {
  return (
    notification.type === 'prescription' &&
    (/quote ready/i.test(notification.title) ||
      /sent pricing/i.test(notification.title) ||
      /sent pricing/i.test(notification.body) ||
      /review and accept or decline/i.test(notification.body))
  )
}

export function getUnreadPrescriptionQuoteItems(notifications: Notification[]): PrescriptionBannerItem[] {
  return notifications
    .filter(notification => !notification.read && isPrescriptionQuoteNotification(notification))
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export function buildPrescriptionQuoteBannerItems(
  notifications: Notification[],
  prescriptions: PrescriptionRequest[],
  dismissedIds: Set<string>,
): PrescriptionBannerItem[] {
  const fromNotifications = getUnreadPrescriptionQuoteItems(notifications).filter(
    item => !dismissedIds.has(item.id),
  )

  const coveredPrescriptionIds = new Set(
    fromNotifications
      .map(item => item.screen?.match(/\/app\/prescriptions\/([^/]+)/)?.[1])
      .filter((id): id is string => Boolean(id)),
  )

  const fromPrescriptions = prescriptions
    .filter(request => request.status === 'quoted')
    .filter(request => !coveredPrescriptionIds.has(request.id))
    .filter(request => !dismissedIds.has(`rx-${request.id}`))
    .map(request => ({
      id: `rx-${request.id}`,
      headline: 'Quote Ready',
      detail: `${request.provider ?? 'Your pharmacy'} sent pricing for prescription ${request.id}. Review and accept or decline the quote to continue.`,
      screen: `/app/prescriptions/${request.id}`,
    }))

  return [...fromNotifications, ...fromPrescriptions]
}

export function getUnreadPrescriptionReadyItems(notifications: Notification[]): PrescriptionBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'prescription' &&
        /medication ready/i.test(notification.title),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export function getUnreadPrescriptionInvoiceItems(notifications: Notification[]): PrescriptionBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'invoice' &&
        (/invoice ready for payment/i.test(notification.title) ||
          /medication invoice/i.test(notification.body)),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export function isSyntheticPrescriptionBannerId(id: string) {
  return id.startsWith('rx-')
}
