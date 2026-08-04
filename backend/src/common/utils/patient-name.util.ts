export function formatPatientFullName(profile?: {
  firstName?: string | null
  lastName?: string | null
} | null) {
  if (!profile) return 'Patient'
  return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'Patient'
}
