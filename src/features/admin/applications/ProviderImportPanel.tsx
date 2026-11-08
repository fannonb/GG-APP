import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { Pager, usePaged } from '@/features/admin/paging'
import {
  MAX_IMPORT_BYTES,
  fetchProviderImportTemplate,
  fileToBase64,
  importErrorMessage,
  importFileKind,
  importProviders,
  type ImportOutcome,
  type ImportSource,
  type ProviderImportResult,
  type ProviderImportRow,
} from './providerImport.api'

const REQUIRED_COLUMNS = ['practiceName', 'email', 'phone', 'country', 'serviceTypes', 'address']
const ACCEPT = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const CYAN_DEEP = '#0B7BC0'
const GREEN = '#15803D'
const AMBER = '#B45309'
const RED = '#B42318'
const GREY = '#6B7280'
const ROWS_PER_PAGE = 50

type Filter = ImportOutcome | 'all'
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'import', label: 'Ready' },
  { id: 'needs_email', label: 'Needs email' },
  { id: 'skip', label: 'Skipped' },
  { id: 'error', label: 'Errors' },
]

/** The last check of the file, or the import that followed it. */
interface Preview extends ProviderImportResult {
  committed: boolean
}

const code: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12.5, color: C.text }
const th: CSSProperties = { padding: '10px 12px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textSub, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', textAlign: 'left' }
const cell: CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, fontSize: 13, verticalAlign: 'top' }

/** Hands the browser a file to save. The link must be in the page, and stay valid until the save starts. */
function saveFile(contents: string, name: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function count(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function summaryText(result: ProviderImportResult): string {
  if (result.format === 'outscraper') {
    const s = result.summary
    return `Outscraper file · ${s.toImport} to import · ${s.needsEmail} need email · ${s.skipped} skipped · ${s.errors} errors`
  }
  if (result.valid) return `${result.rows.length} rows ready.`
  const bad = result.rows.filter(row => row.outcome === 'error').length
  return `${bad} of ${result.rows.length} rows need fixing. Nothing was imported.`
}

function chip(active: boolean): CSSProperties {
  return { height: 30, padding: '0 12px', borderRadius: radius.full, border: `1px solid ${active ? CYAN_DEEP : C.border}`, background: active ? C.blue100 : '#fff', color: active ? CYAN_DEEP : C.textSub, fontSize: 12.5, fontWeight: 600, fontFamily: font.family, cursor: 'pointer' }
}

function Step({ number, title, children, done }: { number: number; title: string; children: ReactNode; done?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 14, minWidth: 0 }}>
      <span aria-hidden style={{ width: 28, height: 28, borderRadius: radius.full, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, background: done ? '#DCFCE7' : C.blue100, color: done ? GREEN : CYAN_DEEP }}>
        {done ? '✓' : number}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, marginTop: 4 }}>{title}</div>
        <div style={{ marginTop: 10 }}>{children}</div>
      </div>
    </div>
  )
}

function PreviewRow({ row }: { row: ProviderImportRow }) {
  const failed = row.outcome === 'error' || row.errors.length > 0
  const result = failed
    ? { text: row.errors.join('. ') || 'Error', color: RED }
    : row.outcome === 'import'
      ? { text: 'Ready', color: GREEN }
      : row.outcome === 'needs_email'
        ? { text: 'Needs email', color: AMBER }
        : { text: row.skipReason ? `Skipped: ${row.skipReason}` : 'Skipped', color: C.textSub }

  return (
    <tr style={{ verticalAlign: 'top' }}>
      <td style={cell}>
        <div style={{ fontWeight: 600, color: C.text }}>{row.practiceName || '—'}</div>
        {row.warnings.length > 0 && <div style={{ marginTop: 2, fontSize: 12, color: GREY }}>{row.warnings.join('. ')}</div>}
      </td>
      <td style={{ ...cell, color: C.textSub }}>{row.serviceTypes.join(', ') || '—'}</td>
      <td style={{ ...cell, color: C.textSub, whiteSpace: 'nowrap' }}>{row.city || '—'}</td>
      <td style={{ ...cell, fontWeight: 600, color: result.color }}>{result.text}</td>
    </tr>
  )
}

/** With `onClose`, the panel opens straight away and shows a Close button instead of collapsing. */
export function ProviderImportPanel({ onClose }: { onClose?: () => void } = {}) {
  const cache = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [expanded, setOpen] = useState(false)
  const open = Boolean(onClose) || expanded
  const [source, setSource] = useState<ImportSource | null>(null)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  // null is the default: the errors view when there are errors, otherwise all rows.
  const [filter, setFilter] = useState<Filter | null>(null)
  const [busy, setBusy] = useState<'' | 'read' | 'preview' | 'import'>('')
  const [error, setError] = useState('')

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, import: 0, needs_email: 0, skip: 0, error: 0 }
    for (const row of preview?.rows ?? []) {
      c.all += 1
      c[row.outcome] += 1
    }
    return c
  }, [preview])
  const activeFilter: Filter = filter ?? (counts.error > 0 ? 'error' : 'all')
  const visibleRows = useMemo(() => {
    const rows = preview?.rows ?? []
    if (activeFilter !== 'all') return rows.filter(row => row.outcome === activeFilter)
    // Errors go to the top of the full list.
    return [...rows].sort((a, b) => Number(b.outcome === 'error') - Number(a.outcome === 'error'))
  }, [preview, activeFilter])
  const { pageItems, pager } = usePaged(visibleRows, activeFilter, ROWS_PER_PAGE)

  const committed = Boolean(preview?.committed)
  const toImport = preview?.summary.toImport ?? 0
  const needsEmail = preview?.summary.needsEmail ?? 0
  const canImport = Boolean(source) && !busy && !committed && Boolean(preview?.valid) && toImport + needsEmail > 0
  const importLabel = busy === 'import'
    ? 'Importing…'
    : committed
      ? 'Imported'
      : preview?.valid && toImport + needsEmail > 0
        ? `Import ${count(toImport, 'provider')}${needsEmail > 0 ? ` and save ${needsEmail} without email` : ''}`
        : 'Import'

  async function run(commit: boolean) {
    if (!source) return
    setBusy(commit ? 'import' : 'preview'); setError('')
    try {
      const data = await importProviders(source, commit)
      const saved = commit && data.imported + data.leadsCreated > 0
      setPreview({ ...data, committed: saved })
      setFilter(null)
      if (saved) {
        setSource(null); setFileName('')
        await cache.invalidateQueries()
      }
    } catch (e) {
      setError(importErrorMessage(e, commit ? 'Import failed' : 'Could not check this file'))
    } finally {
      setBusy('')
    }
  }

  async function downloadTemplate() {
    setError('')
    try {
      saveFile(await fetchProviderImportTemplate(), 'provider-import-template.csv')
    } catch (e) {
      setError(importErrorMessage(e, 'Could not download the template'))
    }
  }

  async function chooseFile(file: File | undefined) {
    setPreview(null); setFilter(null); setError(''); setSource(null); setFileName('')
    if (!file) return
    const kind = importFileKind(file.name)
    if (!kind) { setError('Choose a .csv or .xlsx file.'); return }
    if (file.size > MAX_IMPORT_BYTES) { setError('The file must be smaller than 15 MB.'); return }
    setBusy('read')
    try {
      const next: ImportSource = kind === 'csv'
        ? { csv: await file.text() }
        : { fileBase64: await fileToBase64(file), fileName: file.name }
      setSource(next); setFileName(file.name)
    } catch {
      setError('Could not read this file.')
    } finally {
      setBusy('')
    }
  }

  return (
    <GGCard padding="0" noPad style={{ fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          aria-expanded={open}
          disabled={Boolean(onClose)}
          onClick={() => setOpen(value => !value)}
          style={{ all: 'unset', boxSizing: 'border-box', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', cursor: onClose ? 'default' : 'pointer', fontFamily: font.family }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Import providers</span>
          {!onClose && (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, color: C.textSub, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        {onClose && (
          <div style={{ paddingRight: 22 }}>
            <GGButton variant="secondary" size="sm" onClick={onClose}>Close</GGButton>
          </div>
        )}
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Step number={1} title="Download template or use an Outscraper export">
            <GGButton variant="secondary" size="sm" onClick={() => void downloadTemplate()}>Download template</GGButton>
            <div style={{ marginTop: 10, fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
              Template: {REQUIRED_COLUMNS.map((column, index) => <span key={column}><span style={code}>{column}</span>{index < REQUIRED_COLUMNS.length - 1 ? ', ' : ''}</span>)}, and <span style={code}>latitude</span>/<span style={code}>longitude</span> or <span style={code}>googleMapsUrl</span>. Separate services with <span style={code}>|</span>.
            </div>
          </Step>

          <Step number={2} title="Upload file" done={Boolean(source)}>
            <input ref={fileInput} type="file" accept={ACCEPT} hidden disabled={Boolean(busy)} onChange={event => { void chooseFile(event.target.files?.[0]); event.target.value = '' }} />
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => fileInput.current?.click()}
              style={{ width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `1.5px dashed ${source ? GREEN : '#B9CBE0'}`, borderRadius: radius.md, background: source ? '#F3FBF6' : '#FBFCFE', cursor: busy ? 'default' : 'pointer', fontFamily: font.family, textAlign: 'left' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={source ? GREEN : CYAN_DEEP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {busy === 'read' ? 'Reading file…' : fileName || 'Choose a .csv or .xlsx file'}
              </span>
            </button>
          </Step>

          <Step number={3} title="Preview and import" done={committed}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <GGButton variant="secondary" size="sm" disabled={!source || Boolean(busy)} onClick={() => void run(false)}>{busy === 'preview' ? 'Checking…' : 'Preview'}</GGButton>
              <GGButton variant="primary" size="sm" disabled={!canImport} onClick={() => void run(true)}>{importLabel}</GGButton>
            </div>
            {preview && !preview.valid && !committed && (
              <div style={{ marginTop: 10, fontSize: 13, color: AMBER }}>Fix the errors in the file, then upload it again.</div>
            )}
          </Step>

          {error && (
            <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: radius.sm, background: C.errorBg, color: RED, fontSize: 13.5, lineHeight: 1.5 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>
              <span>{error}</span>
            </div>
          )}

          {preview && (
            <div aria-live="polite">
              <div style={{ padding: '12px 14px', borderRadius: radius.sm, fontSize: 13.5, lineHeight: 1.5, marginBottom: 12, background: committed || preview.valid ? '#F0FDF4' : '#FFF7ED', color: committed || preview.valid ? GREEN : AMBER }}>
                {committed ? `Imported ${preview.imported}. ${preview.leadsCreated} saved under Needs email.` : summaryText(preview)}
              </div>

              <div role="group" aria-label="Filter rows" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {FILTERS.map(f => (
                  <button key={f.id} type="button" aria-pressed={f.id === activeFilter} onClick={() => setFilter(f.id)} style={chip(f.id === activeFilter)}>
                    {f.label} <span style={{ fontWeight: 700 }}>{counts[f.id]}</span>
                  </button>
                ))}
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: 'auto', maxHeight: 360 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F7F9FC', position: 'sticky', top: 0 }}>
                      {['Practice', 'Services', 'City', 'Result'].map(head => <th key={head} style={th}>{head}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.length === 0
                      ? <tr><td colSpan={4} style={{ ...cell, textAlign: 'center', color: C.textSub }}>Nothing in this view.</td></tr>
                      : pageItems.map(row => <PreviewRow key={row.record} row={row} />)}
                  </tbody>
                </table>
              </div>
              <Pager {...pager} />
            </div>
          )}
        </div>
      )}
    </GGCard>
  )
}
