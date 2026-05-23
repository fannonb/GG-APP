type BadgeType = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'navy' | 'outline'

export function appointmentStatusBadge(status: string): BadgeType {
  switch (status.toLowerCase()) {
    case 'confirmed': return 'success'
    case 'pending':   return 'warning'
    case 'cancelled': return 'error'
    case 'completed': return 'info'
    default:          return 'default'
  }
}

export function invoiceStatusBadge(status: string): BadgeType {
  switch (status.toLowerCase()) {
    case 'paid':      return 'success'
    case 'pending':   return 'warning'
    case 'overdue':   return 'error'
    case 'draft':     return 'default'
    default:          return 'default'
  }
}

export function claimStatusBadge(status: string): BadgeType {
  switch (status.toLowerCase()) {
    case 'approved':  return 'success'
    case 'pending':   return 'warning'
    case 'rejected':  return 'error'
    case 'submitted': return 'primary'
    default:          return 'default'
  }
}

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}
