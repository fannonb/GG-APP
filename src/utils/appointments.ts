export interface AppointmentStatusSource {
  status: string
  hasInvoice?: boolean
}

export function getAppointmentDisplayStatus<T extends AppointmentStatusSource>(appointment: T) {
  return appointment.hasInvoice ? 'completed' : appointment.status
}

/** New or confirmed visits from today forward — the rolling clinic board. */
export function isUpcomingScheduleItem<T extends AppointmentStatusSource & { date: string }>(
  appointment: T,
): boolean {
  if (getDaysUntilAppointment(appointment.date) < 0) return false
  const display = getAppointmentDisplayStatus(appointment)
  return display === 'new' || display === 'confirmed'
}

export function getScheduleDayLabel(dateStr: string): string {
  const days = getDaysUntilAppointment(dateStr)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function appointmentHasRecordedVisit<T extends { visitId?: string; hasVisit?: boolean }>(
  appointment: T,
): boolean {
  return Boolean(appointment.hasVisit || appointment.visitId)
}

export function getDaysUntilAppointment(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const apt = new Date(dateStr)
  apt.setHours(0, 0, 0, 0)
  return Math.round((apt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export interface AppointmentUrgency {
  label: string
  isToday: boolean
  isTomorrow: boolean
}

/** Returns urgency info for appointments ≤3 days away, null otherwise */
export function getAppointmentUrgency(dateStr: string): AppointmentUrgency | null {
  const days = getDaysUntilAppointment(dateStr)
  if (days < 0) return null
  if (days === 0) return { label: 'TODAY', isToday: true, isTomorrow: false }
  if (days === 1) return { label: 'TOMORROW', isToday: false, isTomorrow: true }
  if (days <= 3) return { label: `IN ${days} DAYS`, isToday: false, isTomorrow: false }
  return null
}
