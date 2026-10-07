import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { HealthNewsSection } from '@/components/HealthNewsSection'
import { Dialog, ErrorLine, Field, MoreMenu } from '@/features/admin/accounts/AccountManagement'
import { SearchBox, SidePanel, StatusTabs } from '@/features/admin/accounts/AccountListKit'
import {
  useAdminNewsArticles, useDeleteNews, useNewsCategories, useNewsCategoryMutations, useNewsStatus, useSaveNewsArticle,
} from '@/hooks/api/useAdminNews'
import { formatDate, formatRelativeTime } from '@/utils/format'
import type { NewsItem } from '@/types/user.types'

const CYAN_DEEP = '#0B7BC0'
const ON_DASHBOARD = 3

type Tab = 'published' | 'draft' | 'archived'
type Draft = { title: string; tag: string; source: string; date: string; url: string; body: string }

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY: Draft = { title: '', tag: '', source: '', date: today(), url: '', body: '' }
const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)
const ORDINAL = ['first', 'second', 'third']

const button = (tone: 'primary' | 'plain' | 'danger' = 'plain'): React.CSSProperties => ({
  height: 38,
  padding: '0 14px',
  borderRadius: radius.sm,
  border: tone === 'plain' ? `1px solid ${C.border}` : 'none',
  background: tone === 'primary' ? `linear-gradient(135deg, #1A9BE6, ${CYAN_DEEP})` : tone === 'danger' ? '#DC2626' : '#fff',
  color: tone === 'plain' ? C.text : '#fff',
  fontSize: 13.5,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 42,
  padding: '0 12px',
  border: `1px solid ${C.border}`,
  borderRadius: radius.sm,
  fontSize: 14,
  fontFamily: font.family,
  color: C.text,
  background: '#fff',
  outline: 'none',
}

const byDateDesc = (a: NewsItem, b: NewsItem) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

// ── status pill ─────────────────────────────────────────────────────────────

function StatusLabel({ article, slot }: { article: NewsItem; slot: number }) {
  const style = article.status === 'draft'
    ? { label: 'Draft', fg: '#B45309', bg: '#FEF3C7' }
    : article.status === 'archived'
      ? { label: 'Archived', fg: C.textSub, bg: C.bg }
      : slot >= 0
        ? { label: `On dashboards · ${slot + 1}`, fg: CYAN_DEEP, bg: '#E0F2FE' }
        : { label: 'Published', fg: '#15803D', bg: '#DCFCE7' }
  return <span style={{ fontSize: 12, fontWeight: 700, color: style.fg, background: style.bg, padding: '3px 9px', borderRadius: radius.full, whiteSpace: 'nowrap' }}>{style.label}</span>
}

// ── tags dialog ─────────────────────────────────────────────────────────────

function TagsDialog({ onClose }: { onClose: () => void }) {
  const { data: tags = [] } = useNewsCategories()
  const { create, remove } = useNewsCategoryMutations()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = async () => {
    const value = name.trim()
    if (!value) return
    setError(null)
    try { await create.mutateAsync(value); setName('') } catch (e) { setError(errMsg(e, 'Couldn’t add the tag.')) }
  }
  const drop = async (id: number, tagName: string, count: number) => {
    if (count > 0 && !window.confirm(`${count} article${count === 1 ? '' : 's'} use “${tagName}”. They keep the tag; it just won’t be suggested any more. Remove it?`)) return
    setError(null)
    try { await remove.mutateAsync(id) } catch (e) { setError(errMsg(e, 'Couldn’t remove the tag.')) }
  }

  return (
    <Dialog title="Tags" subtitle="Suggested when writing an article. Removing one doesn’t change existing articles." onClose={onClose} footer={<button type="button" onClick={onClose} style={button()}>Done</button>}>
      <form onSubmit={e => { e.preventDefault(); void add() }} style={{ display: 'flex', gap: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="New tag, e.g. Vaccination" aria-label="New tag" style={inputStyle} />
        <button type="submit" disabled={!name.trim() || create.isPending} style={{ ...button('primary'), height: 42, opacity: name.trim() ? 1 : 0.5 }}>Add</button>
      </form>
      <ErrorLine text={error} />
      {tags.length === 0 ? (
        <div style={{ fontSize: 13.5, color: C.textSub }}>No tags yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {tags.map((t, i) => (
            <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>{t.name}</span>
              <span style={{ fontSize: 12.5, color: C.textSub }}>{t.articleCount} article{t.articleCount === 1 ? '' : 's'}</span>
              <button type="button" onClick={() => void drop(t.id, t.name, t.articleCount)} style={{ background: 'none', border: 'none', color: '#B91C1C', fontSize: 13, fontWeight: 600, fontFamily: font.family, cursor: 'pointer' }}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}

// ── editor ──────────────────────────────────────────────────────────────────

function ArticleEditor({ article, articles, onDone, onDirty }: {
  article: NewsItem | null
  articles: NewsItem[]
  onDone: (message: string) => void
  onDirty: (dirty: boolean) => void
}) {
  const initial: Draft = article
    ? { title: article.title, tag: article.tag, source: article.source, date: article.date.slice(0, 10), url: article.url ?? '', body: article.body }
    : EMPTY
  const [draft, setDraft] = useState<Draft>(initial)
  const [error, setError] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const { data: tags = [] } = useNewsCategories()
  const { create: createTag } = useNewsCategoryMutations()
  const save = useSaveNewsArticle()
  const setStatus = useNewsStatus()

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(d => ({ ...d, [key]: e.target.value }))
  const missing = (['title', 'tag', 'source', 'body'] as const).filter(k => !draft[k].trim())
  const urlBad = draft.url.trim() !== '' && !/^https?:\/\/\S+\.\S+/.test(draft.url.trim())
  const tagIsNew = draft.tag.trim() !== '' && !tags.some(t => t.name.toLowerCase() === draft.tag.trim().toLowerCase())
  const words = wordCount(draft.body)

  // Where this article would sit on dashboards if it were published with this date.
  const asItem: NewsItem = { id: article?.id ?? Number.MAX_SAFE_INTEGER, title: draft.title || 'Your headline', tag: draft.tag, source: draft.source || 'Source', date: new Date(`${draft.date || today()}T12:00:00`).toISOString(), url: draft.url || undefined, body: draft.body || 'The first lines of the article appear here.', status: 'published' }
  const lineup = [...articles.filter(a => a.status === 'published' && a.id !== article?.id), asItem].sort(byDateDesc)
  const rank = lineup.findIndex(a => a.id === asItem.id)
  const pushedOut = rank < ON_DASHBOARD && article?.status !== 'published' ? lineup[ON_DASHBOARD] : undefined

  const run = async (status: 'draft' | 'published' | null) => {
    setTried(true)
    if (missing.length || urlBad) return
    setError(null)
    try {
      if (tagIsNew) await createTag.mutateAsync(draft.tag.trim()).catch(() => undefined)
      const payload = { title: draft.title.trim(), tag: draft.tag.trim(), source: draft.source.trim(), body: draft.body.trim(), url: draft.url.trim() || undefined, date: new Date(`${draft.date}T12:00:00`).toISOString() }
      if (!article) {
        await save.mutateAsync({ payload: { ...payload, status: status ?? 'published' } })
        onDone(status === 'draft' ? 'Draft saved.' : rank < ON_DASHBOARD ? 'Published. It’s on dashboards now.' : 'Published. It isn’t among the 3 newest, so dashboards don’t show it.')
        return
      }
      await save.mutateAsync({ id: article.id, payload })
      if (status && status !== article.status) await setStatus.mutateAsync({ id: article.id, status })
      onDone(status === 'published' && article.status !== 'published' ? 'Published.' : 'Changes saved.')
    } catch (e) {
      setError(errMsg(e, 'Couldn’t save the article.'))
    }
  }

  const busy = save.isPending || setStatus.isPending
  const fieldError = (key: keyof Draft) => tried && missing.includes(key as typeof missing[number])
  const bordered = (bad: boolean): React.CSSProperties => ({ ...inputStyle, borderColor: bad ? '#DC2626' : C.border })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <header style={{ padding: '22px 22px 6px' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, paddingRight: 44 }}>{article ? 'Edit article' : 'New article'}</h2>
        {article && <div style={{ fontSize: 13, color: C.textSub, marginTop: 3 }}><StatusLabel article={article} slot={-1} />{article.updatedAt ? <span style={{ marginLeft: 8 }}>Last edited {formatRelativeTime(article.updatedAt)}</span> : null}</div>}
      </header>

      <div style={{ padding: '14px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <Field label="Headline" hint={`${draft.title.length} characters · dashboards show about 2 lines`}>
          <input value={draft.title} onChange={set('title')} placeholder="e.g. WHO updates guidance on managing high blood pressure" style={bordered(fieldError('title'))} />
        </Field>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Tag</span>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(t => {
                const on = draft.tag.trim().toLowerCase() === t.name.toLowerCase()
                return (
                  <button key={t.id} type="button" aria-pressed={on} onClick={() => setDraft(d => ({ ...d, tag: on ? '' : t.name }))} style={{ padding: '5px 11px', borderRadius: radius.full, border: `1px solid ${on ? CYAN_DEEP : C.border}`, background: on ? '#E0F2FE' : '#fff', color: on ? CYAN_DEEP : C.text, fontSize: 12.5, fontWeight: 600, fontFamily: font.family, cursor: 'pointer' }}>
                    {t.name}
                  </button>
                )
              })}
            </div>
          )}
          <input value={draft.tag} onChange={set('tag')} placeholder={tags.length ? 'Or type a new tag' : 'e.g. Heart health'} aria-label="Tag" style={bordered(fieldError('tag'))} />
          {tagIsNew && <span style={{ fontSize: 12, color: C.textSub }}>“{draft.tag.trim()}” will be added to your tags.</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px', gap: 10 }}>
          <Field label="Source">
            <input value={draft.source} onChange={set('source')} placeholder="e.g. World Health Organization" style={bordered(fieldError('source'))} />
          </Field>
          <Field label="Date">
            <input type="date" value={draft.date} onChange={set('date')} style={inputStyle} />
          </Field>
        </div>

        <Field label="Link to the original (optional)" hint={urlBad ? undefined : 'Adds a “Read the full article” button.'}>
          <input value={draft.url} onChange={set('url')} placeholder="https://" inputMode="url" style={bordered(urlBad)} />
        </Field>
        {urlBad && <span style={{ fontSize: 12, color: '#B91C1C', marginTop: -8 }}>Enter a full link starting with https://</span>}

        <Field label="Article" hint={`${words} words · ${Math.max(1, Math.round(words / 200))} min read · leave a blank line between paragraphs`}>
          <textarea value={draft.body} onChange={set('body')} rows={10} placeholder="Write or paste the article. The first lines show on the dashboard card." style={{ ...bordered(fieldError('body')), height: 'auto', padding: '10px 12px', lineHeight: 1.6, resize: 'vertical' }} />
        </Field>

        {tried && missing.length > 0 && <ErrorLine text={`Add ${missing.map(k => (k === 'title' ? 'a headline' : k === 'body' ? 'the article text' : `a ${k}`)).join(', ')}.`} />}
        <ErrorLine text={error} />

        <section style={{ marginTop: 6, padding: 16, borderRadius: radius.lg, background: '#fff', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Preview</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 2, marginBottom: 14, lineHeight: 1.5 }}>
            {rank < ON_DASHBOARD
              ? <>Once published, this shows <strong style={{ color: C.text }}>{ORDINAL[rank]}</strong> on patient and provider dashboards{pushedOut ? <> and “{pushedOut.title}” drops off</> : null}.</>
              : <>Once published, this <strong style={{ color: '#B45309' }}>won’t show on dashboards</strong>: 3 published articles have later dates. Use a later date to feature it.</>}
          </div>
          <HealthNewsSection articles={rank < ON_DASHBOARD ? lineup.slice(0, ON_DASHBOARD) : [asItem]} />
        </section>
      </div>

      <footer style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 22px', background: '#fff', borderTop: `1px solid ${C.border}` }}>
        {(!article || article.status === 'draft') && (
          <button type="button" disabled={busy} onClick={() => void run('draft')} style={button()}>{article ? 'Save draft' : 'Save as draft'}</button>
        )}
        {article && article.status !== 'draft' ? (
          <button type="button" disabled={busy} onClick={() => void run(null)} style={button('primary')}>{busy ? 'Saving…' : 'Save changes'}</button>
        ) : (
          <button type="button" disabled={busy} onClick={() => void run('published')} style={button('primary')}>{busy ? 'Publishing…' : 'Publish'}</button>
        )}
      </footer>
    </div>
  )
}

// ── screen ──────────────────────────────────────────────────────────────────

type Confirm = { kind: 'archive' | 'delete'; article: NewsItem }

export function AdminNewsScreen() {
  const { isMobile } = useResponsive()
  const { data: articles = [], isLoading, error } = useAdminNewsArticles()
  const { data: tags = [] } = useNewsCategories()
  const setStatus = useNewsStatus()
  const deleteNews = useDeleteNews()

  const [tab, setTab] = useState<Tab>('published')
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  // ?new=1 opens the editor straight away (e.g. from a link elsewhere in the admin).
  const [searchParams] = useSearchParams()
  const [editor, setEditor] = useState<{ article: NewsItem | null } | null>(searchParams.get('new') ? { article: null } : null)
  const [dirty, setDirty] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const published = useMemo(() => articles.filter(a => a.status === 'published').sort(byDateDesc), [articles])
  const onDashboards = published.slice(0, ON_DASHBOARD)
  const slotOf = (a: NewsItem) => onDashboards.findIndex(d => d.id === a.id)
  const counts = {
    published: published.length,
    draft: articles.filter(a => a.status === 'draft').length,
    archived: articles.filter(a => a.status === 'archived').length,
  }
  const q = query.trim().toLowerCase()
  const rows = articles
    .filter(a => a.status === tab)
    .filter(a => !tagFilter || a.tag === tagFilter)
    .filter(a => !q || a.title.toLowerCase().includes(q) || a.source.toLowerCase().includes(q) || a.body.toLowerCase().includes(q))
    .sort(tab === 'published' ? byDateDesc : (a, b) => (b.updatedAt ?? b.date).localeCompare(a.updatedAt ?? a.date))
  const tagOptions = [...new Set([...tags.map(t => t.name), ...articles.map(a => a.tag)].filter(Boolean))].sort()

  const closeEditor = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return
    setEditor(null)
    setDirty(false)
  }

  const changeStatus = async (article: NewsItem, status: 'draft' | 'published' | 'archived', message: string) => {
    setActionError(null)
    try { await setStatus.mutateAsync({ id: article.id, status }); setToast(message) } catch (e) { setActionError(errMsg(e, 'Couldn’t update the article.')) }
  }

  const runConfirm = async () => {
    if (!confirm) return
    const { kind, article } = confirm
    setActionError(null)
    try {
      if (kind === 'archive') await setStatus.mutateAsync({ id: article.id, status: 'archived' })
      else await deleteNews.mutateAsync(article.id)
      setToast(kind === 'archive' ? 'Archived. It’s no longer on dashboards.' : 'Article deleted.')
      setConfirm(null)
    } catch (e) {
      setActionError(errMsg(e, 'Something went wrong.'))
    }
  }

  const actionsFor = (a: NewsItem) => {
    const edit = () => setEditor({ article: a })
    if (a.status === 'published') {
      return {
        main: <button type="button" onClick={edit} style={button()}>Edit</button>,
        more: [
          { label: 'Move to drafts', onClick: () => void changeStatus(a, 'draft', 'Moved to drafts.') },
          { label: 'Archive', onClick: () => setConfirm({ kind: 'archive', article: a }), danger: true },
        ],
      }
    }
    if (a.status === 'draft') {
      return {
        main: <button type="button" onClick={edit} style={button()}>Edit</button>,
        more: [
          { label: 'Publish now', onClick: () => void changeStatus(a, 'published', 'Published.') },
          { label: 'Delete draft', onClick: () => setConfirm({ kind: 'delete', article: a }), danger: true },
        ],
      }
    }
    return {
      main: <button type="button" onClick={() => void changeStatus(a, 'published', 'Restored and published.')} style={button()}>Restore</button>,
      more: [
        { label: 'Edit', onClick: edit },
        { label: 'Delete permanently', onClick: () => setConfirm({ kind: 'delete', article: a }), danger: true },
      ],
    }
  }

  const td: React.CSSProperties = { padding: '12px', borderTop: `1px solid ${C.border}`, verticalAlign: 'middle' }

  return (
    <AdminLayout title="News">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: font.family }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, flex: '1 1 320px', fontSize: 14, color: C.textSub, lineHeight: 1.5 }}>
            Patients and providers see the 3 published articles with the latest dates on their home screen.
          </p>
          <button type="button" onClick={() => setTagsOpen(true)} style={button()}>Tags{tags.length ? ` (${tags.length})` : ''}</button>
          <button type="button" onClick={() => setEditor({ article: null })} style={button('primary')}>New article</button>
        </div>

        <section style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? 16 : 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>On dashboards now</h2>
            <span style={{ fontSize: 13, color: C.textSub }}>
              Exactly as patients and providers see it. Click a card to read it.
              {onDashboards.length > 0 && onDashboards.length < ON_DASHBOARD && ` ${ON_DASHBOARD - onDashboards.length === 1 ? 'One spot is' : `${ON_DASHBOARD - onDashboards.length} spots are`} free.`}
            </span>
          </div>
          {onDashboards.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 14, color: C.textSub, background: C.bg, borderRadius: radius.sm }}>
              Nothing is showing. Publish an article to fill this space.
            </div>
          ) : (
            <div style={{ background: '#F7FAFD', borderRadius: radius.lg, padding: isMobile ? 12 : 18 }}>
              <HealthNewsSection articles={onDashboards} />
            </div>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatusTabs<Tab>
            tabs={[
              { id: 'published', label: 'Published', count: counts.published },
              { id: 'draft', label: 'Drafts', count: counts.draft },
              { id: 'archived', label: 'Archived', count: counts.archived },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search headline, source or text" />
            <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} aria-label="Filter by tag" style={{ ...inputStyle, width: 'auto', minWidth: 160, height: 40, cursor: 'pointer' }}>
              <option value="">All tags</option>
              {tagOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <ErrorLine text={actionError} />

          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? 0 : '6px 6px 4px' }}>
            {isLoading ? (
              <div style={{ padding: 24, fontSize: 14, color: C.textSub }}>Loading articles…</div>
            ) : error ? (
              <div style={{ padding: 24, fontSize: 14, color: '#B91C1C' }}>{errMsg(error, 'Couldn’t load articles.')}</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', fontSize: 14, color: C.textSub }}>
                {q || tagFilter ? 'No articles match.' : tab === 'draft' ? 'No drafts. Use “Save as draft” to work on an article before publishing.' : tab === 'archived' ? 'Nothing archived.' : 'No published articles yet.'}
              </div>
            ) : isMobile ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {rows.map((a, i) => {
                  const actions = actionsFor(a)
                  return (
                    <li key={a.id} style={{ padding: '14px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <StatusLabel article={a} slot={slotOf(a)} />
                        <span style={{ fontSize: 12.5, color: C.textSub }}>{formatDate(a.date)}</span>
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{a.title}</div>
                      <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{a.tag} · {a.source}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>{actions.main}<MoreMenu items={actions.more} /></div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    {['Article', 'Tag', 'Date', 'Status', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12.5, fontWeight: 600, color: C.textSub }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(a => {
                    const actions = actionsFor(a)
                    const firstLine = a.body.split('\n')[0] ?? ''
                    return (
                      <tr key={a.id}>
                        <td style={{ ...td, maxWidth: 0, width: '55%' }}>
                          <button type="button" onClick={() => setEditor({ article: a })} style={{ all: 'unset', cursor: 'pointer', display: 'block', fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{a.title}</button>
                          <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.source} · {firstLine}</div>
                        </td>
                        <td style={td}><span style={{ fontSize: 12.5, fontWeight: 600, color: C.text, background: C.bg, padding: '3px 9px', borderRadius: radius.full, whiteSpace: 'nowrap' }}>{a.tag}</span></td>
                        <td style={{ ...td, color: C.textSub, fontSize: 13.5, whiteSpace: 'nowrap' }}>{formatDate(a.date)}</td>
                        <td style={td}><StatusLabel article={a} slot={slotOf(a)} /></td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>{actions.main}<MoreMenu items={actions.more} /></div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <SidePanel open={!!editor} onClose={closeEditor} label={editor?.article ? 'Edit article' : 'New article'}>
        {editor && (
          <ArticleEditor
            key={editor.article?.id ?? 'new'}
            article={editor.article}
            articles={articles}
            onDirty={setDirty}
            onDone={message => { setEditor(null); setDirty(false); setToast(message) }}
          />
        )}
      </SidePanel>

      {tagsOpen && <TagsDialog onClose={() => setTagsOpen(false)} />}

      {confirm && (
        <Dialog
          title={confirm.kind === 'archive' ? 'Archive this article?' : 'Delete this article?'}
          subtitle={confirm.kind === 'archive'
            ? `“${confirm.article.title}” will be taken off dashboards${slotOf(confirm.article) >= 0 && published.length > ON_DASHBOARD ? ' and the next newest article takes its place' : ''}. You can restore it later.`
            : `“${confirm.article.title}” will be removed for good. This can’t be undone.`}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" onClick={() => setConfirm(null)} style={button()}>Cancel</button>
              <button type="button" onClick={() => void runConfirm()} disabled={setStatus.isPending || deleteNews.isPending} style={button('danger')}>
                {confirm.kind === 'archive' ? 'Archive' : 'Delete'}
              </button>
            </>
          }
        >
          <ErrorLine text={actionError} />
        </Dialog>
      )}

      {toast && (
        <div role="status" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1300, background: C.navy800, color: '#fff', padding: '11px 18px', borderRadius: radius.sm, fontSize: 13.5, fontWeight: 600, boxShadow: '0 10px 30px rgba(9,28,68,0.25)', fontFamily: font.family }}>
          {toast}
        </div>
      )}
    </AdminLayout>
  )
}
