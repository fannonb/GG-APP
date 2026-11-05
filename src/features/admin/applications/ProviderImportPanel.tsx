import { useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { ApiError } from '@/api/types'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'

interface ImportResult {
  imported: number
  valid: boolean
  rows: Array<{ record: number; practiceName: string; email: string; lat?: number; lng?: number; errors: string[] }>
}

const REQUIRED_COLUMNS = ['practiceName', 'email', 'phone', 'country', 'serviceTypes', 'address']
const CYAN_DEEP = '#0B7BC0'
const GREEN = '#15803D'

const code: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12.5, color: C.text }

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

/** With `onClose`, the panel opens straight away and shows a Close button instead of collapsing. */
export function ProviderImportPanel({ onClose }: { onClose?: () => void } = {}) {
  const cache = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [expanded, setOpen] = useState(false)
  const open = Boolean(onClose) || expanded
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [busy, setBusy] = useState<'' | 'preview' | 'import'>('')
  const [error, setError] = useState('')

  async function run(commit: boolean) {
    setBusy(commit ? 'import' : 'preview'); setError('')
    try {
      const { data } = await apiClient.post<ImportResult>('/admin/providers/import', { csv, commit })
      setResult(data)
      if (data.imported) { setCsv(''); setFileName(''); await cache.invalidateQueries() }
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed') }
    finally { setBusy('') }
  }

  async function downloadTemplate() {
    setError('')
    try {
      const { data } = await apiClient.get<string>('/admin/provider-import/template', { responseType: 'text' })
      saveFile(data, 'provider-import-template.csv')
    } catch (e) {
      // An API started before this feature existed answers with a 404 (or a provider lookup error).
      const stale = e instanceof ApiError && (e.status === 404 || /provider not found/i.test(e.message))
      setError(stale
        ? 'The API server is running an older build. Restart the API, then try again.'
        : e instanceof Error ? e.message : 'Could not download the template')
    }
  }

  async function chooseFile(file: File | undefined) {
    setResult(null); setError(''); setCsv(''); setFileName('')
    if (!file) return
    if (file.size > 1_000_000) { setError('The CSV must be smaller than 1 MB.'); return }
    try { setCsv(await file.text()); setFileName(file.name) } catch { setError('Could not read this file.') }
  }

  const readyRows = result?.rows.filter(row => row.errors.length === 0).length ?? 0
  const imported = (result?.imported ?? 0) > 0

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
          <Step number={1} title="Download template">
            <GGButton variant="secondary" size="sm" onClick={() => void downloadTemplate()}>Download template</GGButton>
            <div style={{ marginTop: 10, fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
              Required: {REQUIRED_COLUMNS.map((column, index) => <span key={column}><span style={code}>{column}</span>{index < REQUIRED_COLUMNS.length - 1 ? ', ' : ''}</span>)}, and <span style={code}>latitude</span>/<span style={code}>longitude</span> or <span style={code}>googleMapsUrl</span>. Separate services with <span style={code}>|</span>.
            </div>
          </Step>

          <Step number={2} title="Upload file" done={Boolean(csv)}>
            <input ref={fileInput} type="file" accept=".csv,text/csv" hidden disabled={Boolean(busy)} onChange={event => { void chooseFile(event.target.files?.[0]); event.target.value = '' }} />
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => fileInput.current?.click()}
              style={{ width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `1.5px dashed ${csv ? GREEN : '#B9CBE0'}`, borderRadius: radius.md, background: csv ? '#F3FBF6' : '#FBFCFE', cursor: busy ? 'default' : 'pointer', fontFamily: font.family, textAlign: 'left' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={csv ? GREEN : CYAN_DEEP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'Choose CSV file'}</span>
            </button>
          </Step>

          <Step number={3} title="Preview and import" done={imported}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <GGButton variant="secondary" size="sm" disabled={!csv || Boolean(busy)} onClick={() => void run(false)}>{busy === 'preview' ? 'Checking…' : 'Preview'}</GGButton>
              <GGButton variant="primary" size="sm" disabled={!csv || Boolean(busy) || !result?.valid || imported} onClick={() => void run(true)}>
                {busy === 'import' ? 'Importing…' : result?.valid ? `Import ${readyRows}` : 'Import'}
              </GGButton>
            </div>
          </Step>

          {error && (
            <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: radius.sm, background: C.errorBg, color: '#B42318', fontSize: 13.5, lineHeight: 1.5 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div aria-live="polite">
              <div style={{ padding: '12px 14px', borderRadius: radius.sm, fontSize: 13.5, lineHeight: 1.5, marginBottom: 12, background: imported || result.valid ? '#F0FDF4' : '#FFF7ED', color: imported || result.valid ? GREEN : '#B45309' }}>
                {imported
                  ? `${result.imported} imported. They are under To review.`
                  : result.valid
                    ? `${result.rows.length} rows ready.`
                    : `${result.rows.length - readyRows} of ${result.rows.length} rows need fixing. Nothing was imported.`}
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: 'auto', maxHeight: 360 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F7F9FC', position: 'sticky', top: 0 }}>
                      {['Row', 'Practice', 'Email', 'Coordinates', 'Check'].map(head => (
                        <th key={head} style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textSub, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map(row => {
                      const ok = row.errors.length === 0
                      return (
                        <tr key={row.record} style={{ borderBottom: `1px solid ${C.border}`, verticalAlign: 'top' }}>
                          <td style={{ padding: '10px 12px', color: C.textSub }}>{row.record}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: C.text }}>{row.practiceName || '—'}</td>
                          <td style={{ padding: '10px 12px', color: C.textSub }}>{row.email || '—'}</td>
                          <td style={{ padding: '10px 12px', color: C.textSub, whiteSpace: 'nowrap', ...code }}>{row.lat != null ? `${row.lat}, ${row.lng}` : '—'}</td>
                          <td style={{ padding: '10px 12px', color: ok ? GREEN : '#B42318', fontWeight: ok ? 700 : 500 }}>{ok ? '✓ Ready' : row.errors.join('. ')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </GGCard>
  )
}
