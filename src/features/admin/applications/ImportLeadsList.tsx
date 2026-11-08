import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SearchBox } from '@/features/admin/accounts/AccountListKit'
import { Pager, usePaged } from '@/features/admin/paging'
import {
  deleteImportLead,
  fetchImportLeads,
  importErrorMessage,
  importLead,
  providerImportKeys,
  type ImportLead,
} from './providerImport.api'

const CYAN_DEEP = '#0B7BC0'
const GREEN = '#15803D'
const RED = '#B42318'
const PAGE_SIZE = 25
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const textButton: CSSProperties = { all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: CYAN_DEEP }
const input: CSSProperties = { flex: 1, minWidth: 0, height: 36, padding: '0 10px', border: `1px solid ${C.border}`, borderRadius: radius.sm, fontSize: 14, fontFamily: font.family, color: C.text, background: '#fff', outline: 'none' }

/** Only web addresses become links. Anything else, such as javascript: or mailto:, is left out. */
function webHref(value: string | undefined): string | undefined {
  const v = (value ?? '').trim()
  if (!v || /\s/.test(v)) return undefined
  if (/^https?:\/\//i.test(v)) return v
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v) ? `https://${v}` : undefined
}

function Note({ children }: { children: ReactNode }) {
  return <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 14, color: C.textSub }}>{children}</div>
}

/** One provider waiting for an email: find the address on the website or map, then add it here. */
function LeadRow({ lead, onAdded, onRemoved }: { lead: ImportLead; onAdded: () => void; onRemoved: () => void }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const web = webHref(lead.website)
  const map = webHref(lead.googleMapsUrl)
  const details = [lead.serviceTypes.join(', '), lead.city, lead.phone].filter(Boolean).join(' · ')

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    if (!EMAIL.test(value)) { setError('Enter a valid email address.'); return }
    setBusy(true); setError('')
    try {
      await importLead(lead.id, value)
      onAdded()
    } catch (e) {
      setError(importErrorMessage(e, 'Could not add this provider.'))
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true); setError('')
    try {
      await deleteImportLead(lead.id)
      onRemoved()
    } catch (e) {
      setError(importErrorMessage(e, 'Could not remove this provider.'))
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <li style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderTop: `1px solid ${C.border}` }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, overflowWrap: 'anywhere' }}>{lead.practiceName}</div>
        {details && <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>{details}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 13 }}>
          {web && <a href={web} target="_blank" rel="noopener noreferrer" style={{ color: CYAN_DEEP, fontWeight: 600 }}>Website</a>}
          {map && <a href={map} target="_blank" rel="noopener noreferrer" style={{ color: CYAN_DEEP, fontWeight: 600 }}>Map</a>}
          {confirming ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: C.textSub }}>Remove this provider?</span>
              <button type="button" disabled={busy} onClick={() => void remove()} style={{ ...textButton, color: RED }}>Yes, remove</button>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} style={{ ...textButton, color: C.textSub }}>Cancel</button>
            </span>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirming(true)} style={{ ...textButton, color: C.textLight }}>Remove</button>
          )}
        </div>
      </div>

      <form onSubmit={event => void add(event)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 330px', minWidth: 0 }}>
        <input
          type="email"
          aria-label={`Email for ${lead.practiceName}`}
          placeholder="Email"
          value={email}
          disabled={busy}
          onChange={event => setEmail(event.target.value)}
          style={input}
        />
        <GGButton type="submit" size="sm" disabled={busy} loading={busy}>Add</GGButton>
      </form>

      {error && <div role="alert" style={{ flexBasis: '100%', fontSize: 13, color: RED }}>{error}</div>}
    </li>
  )
}

/** Providers from an Outscraper import that have no email yet. Shown above the applications list, like the import panel. */
export function ImportLeadsList({ onClose }: { onClose: () => void }) {
  const cache = useQueryClient()
  const leadsQuery = useQuery({ queryKey: providerImportKeys.leads, queryFn: fetchImportLeads })
  const leads = leadsQuery.data
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (leads ?? []).filter(lead => !q || lead.practiceName.toLowerCase().includes(q))
  }, [leads, search])
  const { pageItems, pager } = usePaged(matches, search, PAGE_SIZE)

  /** Drops the row here, then refreshes the rest of the screen (applications, counts). */
  function settle(id: string, message: string) {
    cache.setQueryData<ImportLead[]>(providerImportKeys.leads, list => list?.filter(lead => lead.id !== id))
    setNotice(message)
    void cache.invalidateQueries()
  }

  return (
    <GGCard padding="20px 22px" style={{ fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Needs email</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>Find the email on the website or map, then add it.</div>
        </div>
        <GGButton variant="secondary" size="sm" onClick={onClose}>Close</GGButton>
      </div>

      <div style={{ display: 'flex', marginTop: 16 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name" />
      </div>

      {notice && <div role="status" style={{ marginTop: 12, fontSize: 13.5, color: GREEN }}>{notice}</div>}

      <div style={{ marginTop: 8 }}>
        {leadsQuery.isLoading ? (
          <Note>Loading…</Note>
        ) : leadsQuery.isError ? (
          <div role="alert" style={{ padding: '12px 0', fontSize: 13.5, color: RED }}>{importErrorMessage(leadsQuery.error, 'Could not load providers.')}</div>
        ) : !leads?.length ? (
          <Note>No providers waiting for an email.</Note>
        ) : !matches.length ? (
          <Note>No matches.</Note>
        ) : (
          <>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {pageItems.map(lead => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  onAdded={() => settle(lead.id, 'Added. Send the setup link from Setup links.')}
                  onRemoved={() => settle(lead.id, '')}
                />
              ))}
            </ul>
            <Pager {...pager} />
          </>
        )}
      </div>
    </GGCard>
  )
}
