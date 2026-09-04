import type { Notification } from '@/types/user.types'
import type { PrescriptionRequest } from '@/types/prescription.types'

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

export interface PrescriptionReadyForPickupBannerItem {
  id: string
  prescriptionId: string
  patient: string
  headline: string
  detail: string
  screen?: string
  fulfillmentMode: 'pickup' | 'delivery'
}

function isPrescriptionPaidNotification(notification: Notification): boolean {
  return (
    notification.type === 'prescription' &&
    (/paid/i.test(notification.title) ||
      /ready for pickup|ready for pick up/i.test(notification.title) ||
      /patient approved order/i.test(notification.title) ||
      /prepare the medication|prepare medication/i.test(notification.body) ||
      /approved preparation/i.test(notification.body))
  )
}

export function getUnreadPrescriptionPaidItems(
  notifications: Notification[],
): PrescriptionReadyForPickupBannerItem[] {
  return notifications
    .filter(notification => !notification.read && isPrescriptionPaidNotification(notification))
    .map(notification => {
      const rxIdMatch = notification.screen?.match(/\/sp\/prescriptions\/([^/]+)/)
      const rxId = rxIdMatch ? rxIdMatch[1] : notification.id.replace(/^notif-/, '')
      const isDelivery = /delivery/i.test(notification.title) || /delivery/i.test(notification.body)

      return {
        id: notification.id,
        prescriptionId: rxId,
        patient: notification.body?.split(' ')[0] || 'Patient',
        headline: notification.title,
        detail: notification.body,
        screen: notification.screen,
        fulfillmentMode: (isDelivery ? 'delivery' : 'pickup') as 'pickup' | 'delivery',
      }
    })
}

export function buildPrescriptionReadyForPickupBannerItems(
  notifications: Notification[],
  prescriptionRequests: PrescriptionRequest[],
  dismissedIds: Set<string>,
): PrescriptionReadyForPickupBannerItem[] {
  const fromNotifications = getUnreadPrescriptionPaidItems(notifications).filter(
    item => !dismissedIds.has(item.id) && !dismissedIds.has(`rx-${item.prescriptionId}`),
  )

  const coveredPrescriptionIds = new Set(
    fromNotifications.map(item => item.prescriptionId).filter(Boolean),
  )

  const fromPrescriptions = prescriptionRequests
    .filter(
      request =>
        (request.status === 'accepted' || request.status === 'preparing') &&
        (request.invoiceStatus === 'paid' || request.invoiceStatus === 'authorized'),
    )
    .filter(request => !coveredPrescriptionIds.has(request.id))
    .filter(request => !dismissedIds.has(`rx-${request.id}`))
    .map(request => {
      const isDelivery = request.fulfillmentMode === 'delivery'
      const patientName = request.patient || 'Patient'
      const modeLabel = isDelivery ? 'delivery' : 'pickup'

      return {
        id: `rx-${request.id}`,
        prescriptionId: request.id,
        patient: patientName,
        headline: isDelivery
          ? 'Prescription Paid · Ready for Delivery'
          : 'Prescription Paid · Ready for Pickup',
        detail: `${patientName} paid for prescription ${request.id}. Prepare the medication and mark it ready for ${modeLabel}.`,
        screen: `/sp/prescriptions/${request.id}`,
        fulfillmentMode: (isDelivery ? 'delivery' : 'pickup') as 'pickup' | 'delivery',
      }
    })

  return [...fromNotifications, ...fromPrescriptions]
}

