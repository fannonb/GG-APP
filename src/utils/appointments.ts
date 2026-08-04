export interface AppointmentStatusSource {
  status: string
  hasInvoice?: boolean
}

export function getAppointmentDisplayStatus<T extends AppointmentStatusSource>(appointment: T) {
  return appointment.hasInvoice ? 'completed' : appointment.status
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
