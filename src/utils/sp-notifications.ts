import type { Notification } from '@/types/user.types'

export interface CancelledAppointmentBannerItem {
  id: string
  headline: string
  detail: string
  screen?: string
}

export function getUnreadCancelledAppointmentItems(
  notifications: Notification[],
): CancelledAppointmentBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'appointment' &&
        /cancel/i.test(notification.title),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export interface PrescriptionBannerItem {
  id: string
  headline: string
  detail: string
  screen?: string
}

export function getUnreadPrescriptionAcceptedItems(
  notifications: Notification[],
): PrescriptionBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'prescription' &&
        /quote accepted/i.test(notification.title),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export function getUnreadPrescriptionDeclinedItems(
  notifications: Notification[],
): PrescriptionBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'prescription' &&
        /quote declined/i.test(notification.title),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export interface SPActionBannerItem {
  id: string
  headline: string
  detail: string
  screen?: string
}

export function getUnreadRescheduleAcceptedItems(
  notifications: Notification[],
): SPActionBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'appointment' &&
        /reschedule accepted/i.test(notification.title),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export function getUnreadNewReviewItems(
  notifications: Notification[],
): SPActionBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'invoice' &&
        /new patient review/i.test(notification.title),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}
