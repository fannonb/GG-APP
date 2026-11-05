import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { GGButton, GGCard } from '@/design-system'
import { C } from '@/design-system/tokens'
import { credentialsFor, toCredentialCountry } from '@/config/credentials'
import { EMPTY_LICENCES, ProviderLicencesSection, validateLicences, type LicencesState } from '@/features/auth/components/ProviderLicencesSection'

interface SavedLicences {
  country: string
  serviceTypes: string[]
  businessRegNumber: string
  taxPin: string
  credentials: Array<{ kind: string; number: string; holderName: string; expiresAt: string; hasDocument: boolean; status: string }>
}

export function ProviderLicencesEditor() {
  const cache = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ['sp', 'licences'], queryFn: async () => (await apiClient.get<SavedLicences>('/sp/settings/licences')).data })
  const [value, setValue] = useState<LicencesState>(EMPTY_LICENCES)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (data) setValue({ businessRegNumber: data.businessRegNumber, taxPin: data.taxPin, choices: Object.fromEntries((toCredentialCountry(data.country) ? credentialsFor(toCredentialCountry(data.country)!, data.serviceTypes).required : []).map(group => [group.join('|'), group.find(kind => data.credentials.some(c => c.kind === kind)) ?? group[0]])), entries: Object.fromEntries(data.credentials.map(c => [c.kind, { number: c.number, holderName: c.holderName, expiresAt: c.expiresAt, file: null }])) })
  }, [data])
  return <GGCard padding="22px">
    <details><summary style={{ cursor: 'pointer', fontWeight: 700 }}>Add or update licence details</summary>
      <p style={{ fontSize: 13, color: C.textSub }}>Add details you skipped during registration. Changes are submitted for admin verification. Existing certificate files are retained unless you upload replacements.</p>
      {isLoading ? <p>Loading licences…</p> : error ? <p role="alert">{error.message}</p> : data && <>
        <ProviderLicencesSection country={toCredentialCountry(data.country)} services={data.serviceTypes} value={value} onChange={setValue} errors={errors} />
        {data.credentials.filter(c => c.hasDocument).map(c => <p key={c.kind} style={{ fontSize: 12 }}>Saved certificate: {c.kind} ({c.status.toLowerCase()})</p>)}
        <GGButton variant="primary" size="sm" disabled={busy} onClick={async () => {
          const checked = validateLicences(toCredentialCountry(data.country), data.serviceTypes, value)
          setErrors(checked.errors); setMessage('')
          if (Object.keys(checked.errors).length) return
          setBusy(true)
          try {
            const { data: saved } = await apiClient.patch<SavedLicences>('/sp/settings/licences', { credentials: checked.credentials, businessRegNumber: value.businessRegNumber, taxPin: value.taxPin })
            cache.setQueryData(['sp', 'licences'], saved); setMessage('Licence details saved for verification.')
          } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save licence details') }
          finally { setBusy(false) }
        }}>{busy ? 'Saving…' : 'Save licence details'}</GGButton>
      </>}
      {message && <p role="status">{message}</p>}
    </details>
  </GGCard>
}
