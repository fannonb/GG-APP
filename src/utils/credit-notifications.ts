import type { Notification } from '@/types/user.types'

export interface CreditBannerItem {
  id: string
  headline: string
  detail: string
  screen?: string
}

export interface AppointmentConfirmedBannerItem {
  id: string
  headline: string
  detail: string
  screen?: string
}

export function getUnreadConfirmedAppointmentItems(
  notifications: Notification[],
): AppointmentConfirmedBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'appointment' &&
        /confirm/i.test(notification.title),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export function getUnreadProviderCancelledAppointmentItems(
  notifications: Notification[],
): AppointmentConfirmedBannerItem[] {
  return notifications
    .filter(
      notification =>
        !notification.read &&
        notification.type === 'appointment' &&
        /cancelled by provider/i.test(notification.title),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export function getUnreadCreditBannerItems(notifications: Notification[]): CreditBannerItem[] {
  return notifications
    .filter(notification => !notification.read && notification.type === 'credit')
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}

export interface PatientRegistrationBannerItem {
  id: string
  headline: string
  detail: string
  screen?: string
}

export function getUnreadPatientRegistrationItems(notifications: Notification[]): PatientRegistrationBannerItem[] {
  return notifications
    .filter(n => !n.read && n.type === 'system' && /patient registered/i.test(n.title))
    .map(n => ({
      id: n.id,
      headline: n.title,
      detail: n.body,
      screen: n.screen,
    }))
}

export function getPendingCreditApplications<T extends { status: string }>(applications: T[]): T[] {
  return applications.filter(application => application.status === 'submitted')
}

export function getUnreadCreditApprovalItems(notifications: Notification[]): CreditBannerItem[] {
  return notifications
    .filter(notification =>
      !notification.read
      && notification.type === 'credit'
      && /approved/i.test(notification.title),
    )
    .map(notification => ({
      id: notification.id,
      headline: notification.title,
      detail: notification.body,
      screen: notification.screen,
    }))
}
