import type { Notification } from '@/types/user.types'
import type { PaymentBannerItem } from '@/components/PaymentAlertBanner'

export function getUnreadPaymentBannerItems(notifications: Notification[]): PaymentBannerItem[] {
  return notifications
    .filter(notification => !notification.read && notification.type === 'payment')
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}
