import { useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatDate } from '@/utils/format'
import { useNews } from '@/providers/NewsProvider'
import type { NewsItem } from '@/types/user.types'

// ─── Exact card styles from HealthNewsSection ─────────────────────────────────

const CARD_STYLES = [
  {
    cardBg: `linear-gradient(135deg, ${C.navy800} 0%, #152B55 100%)`,
    textColor: '#FFFFFF', arrowColor: C.blue500,
    borderColor: 'rgba(255,255,255,0.08)', dividerColor: 'rgba(255,255,255,0.08)',
    hoverBorder: C.blue500, labelColor: 'rgba(255,255,255,0.4)',
    badgeFill: 'rgba(56,182,255,0.18)', tagColor: C.blue500,
    slotLabel: 'Slot 1 — Lead story',
  },
  {
    cardBg: 'linear-gradient(135deg, #EBF8FF 0%, #FFFFFF 100%)',
    textColor: C.navy800, arrowColor: C.blue500,
    borderColor: 'rgba(56,182,255,0.15)', dividerColor: 'rgba(56,182,255,0.12)',
    hoverBorder: C.blue500, labelColor: C.textLight,
    badgeFill: 'rgba(56,182,255,0.08)', tagColor: '#0369A1',
    slotLabel: 'Slot 2 — Secondary',
  },
  {
    cardBg: '#FFFFFF',
    textColor: C.navy800, arrowColor: C.navy800,
    borderColor: C.border, dividerColor: 'rgba(9,28,68,0.08)',
    hoverBorder: C.navy800, labelColor: C.textLight,
    badgeFill: 'rgba(9,28,68,0.05)', tagColor: C.navy800,
    slotLabel: 'Slot 3+',
  },
]

const SUGGESTED_TAGS = ['Health Alert', 'Local Health', 'Research', 'Wellness', 'Policy', 'Treatment', 'Prevention', 'Nutrition']

// ─── Preview card (matches patient card exactly) ──────────────────────────────

function PreviewCard({ item, index }: { item: Partial<NewsItem>; index: number }) {
  const cfg = CARD_STYLES[Math.min(index, 2)]
  const title = item.title || 'Article title will appear here…'
  const source = item.source || 'Source name'
  const date = item.date || new Date().toISOString().slice(0, 10)

  return (
    <div style={{
      background: cfg.cardBg,
      borderRadius: '16px',
      border: `1px solid ${cfg.borderColor}`,
      padding: '20px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      minHeight: '190px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.65 }}>
          <path d="M2 12L12 2M12 2H5M12 2v7" stroke={cfg.arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: cfg.textColor, lineHeight: 1.45, fontFamily: font.family, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '14px', opacity: item.title ? 1 : 0.4 }}>
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: `1px dashed ${cfg.dividerColor}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: cfg.labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' }}>Verified Source</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: cfg.textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: item.source ? 1 : 0.4 }}>{source}</div>
        </div>
        <div style={{ fontSize: '9px', fontWeight: 700, color: cfg.tagColor, background: cfg.badgeFill, padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace', flexShrink: 0 }}>
          {formatDate(date, { month: 'short', day: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

// ─── Article management card ──────────────────────────────────────────────────

function ArticleCard({ item, index, onEdit, onRemove }: {
  item: NewsItem; index: number
  onEdit: () => void; onRemove: () => void
}) {
  const cfg = CARD_STYLES[Math.min(index, 2)]
  const [hovering, setHovering] = useState(false)

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Slot label */}
      <div style={{ fontSize: '9px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: index === 0 ? C.blue500 : index === 1 ? C.blue500 : C.border, display: 'inline-block' }} />
        {cfg.slotLabel}
      </div>

      {/* The card — exact patient card */}
      <div style={{
        background: cfg.cardBg,
        borderRadius: '16px',
        border: `1px solid ${hovering ? cfg.hoverBorder : cfg.borderColor}`,
        padding: '20px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: '190px', transition: 'all 0.18s ease', position: 'relative',
        boxShadow: hovering ? '0 8px 24px rgba(9,28,68,0.10)' : 'none',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: cfg.textColor, lineHeight: 1.45, fontFamily: font.family, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '14px' }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: `1px dashed ${cfg.dividerColor}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: cfg.labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' }}>Verified Source</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: cfg.textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source}</div>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: cfg.tagColor, background: cfg.badgeFill, padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
              {formatDate(item.date, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Action overlay — visible on hover */}
        {hovering && (
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: '6px' }}>
            <button onClick={onEdit}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: radius.sm, background: 'rgba(255,255,255,0.92)', border: `1px solid ${C.border}`, fontSize: '11px', fontWeight: 700, color: C.navy800, cursor: 'pointer', fontFamily: font.family, backdropFilter: 'blur(4px)' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke={C.navy800} strokeWidth="1.2" strokeLinejoin="round"/></svg>
              Edit
            </button>
            <button onClick={onRemove}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: radius.sm, background: 'rgba(255,255,255,0.92)', border: `1px solid ${C.error}44`, fontSize: '11px', fontWeight: 700, color: C.error, cursor: 'pointer', fontFamily: font.family, backdropFilter: 'blur(4px)' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4 3V2h4v1M5 5v4M7 5v4M3 3l.5 7h5L9 3" stroke={C.error} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Unpublish
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Compose / edit form ──────────────────────────────────────────────────────

const EMPTY_DRAFT = { title: '', tag: '', source: '', date: new Date().toISOString().slice(0, 10), url: '', body: '' }

function ComposePanel({
  editing,
  draft, setDraft,
  slotIndex,
  onPublish, onUpdate, onCancel,
}: {
  editing: NewsItem | null
  draft: typeof EMPTY_DRAFT
  setDraft: (d: typeof EMPTY_DRAFT) => void
  slotIndex: number
  onPublish: () => void
  onUpdate: () => void
  onCancel: () => void
}) {
  const isEdit   = editing !== null
  const canSave  = draft.title.trim() && draft.source.trim() && draft.body.trim() && draft.tag.trim()

  const field = (label: string, key: keyof typeof EMPTY_DRAFT, placeholder: string, opts?: { multiline?: boolean; hint?: string }) => (
    <div>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px', fontFamily: font.family }}>{label}</label>
      {opts?.hint && <div style={{ fontSize: '11px', color: C.textLight, marginBottom: '5px', fontFamily: font.family }}>{opts.hint}</div>}
      {opts?.multiline ? (
        <textarea
          value={draft[key]}
          onChange={e => setDraft({ ...draft, [key]: e.target.value })}
          placeholder={placeholder}
          rows={6}
          style={{ width: '100%', padding: '10px 12px', fontSize: '13px', fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
          onFocus={e => (e.target.style.borderColor = C.blue500)}
          onBlur={e  => (e.target.style.borderColor = C.border)}
        />
      ) : (
        <input
          type={key === 'date' ? 'date' : 'text'}
          value={draft[key]}
          onChange={e => setDraft({ ...draft, [key]: e.target.value })}
          placeholder={placeholder}
          style={{ width: '100%', padding: '9px 12px', fontSize: '13px', fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => (e.target.style.borderColor = C.blue500)}
          onBlur={e  => (e.target.style.borderColor = C.border)}
        />
      )}
    </div>
  )

  return (
    <div style={{ background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}`, overflow: 'hidden', position: 'sticky', top: '20px' }}>

      {/* Panel header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: isEdit ? C.blue100 : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{isEdit ? 'Edit Article' : 'Compose New Article'}</div>
          <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>
            {isEdit ? 'Changes apply instantly to all dashboards' : 'Published article appears immediately on patient & SP dashboards'}
          </div>
        </div>
        {isEdit && (
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, fontSize: '13px', fontFamily: font.family }}>✕ Cancel</button>
        )}
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Title */}
        {field('Title', 'title', 'e.g. WHO Issues Updated Guidance on Hypertension Management')}

        {/* Tag */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px', fontFamily: font.family }}>Category Tag</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '7px' }}>
            {SUGGESTED_TAGS.map(t => (
              <button key={t} onClick={() => setDraft({ ...draft, tag: t })}
                style={{ padding: '3px 10px', borderRadius: radius.full, border: `1.5px solid ${draft.tag === t ? C.blue500 : C.border}`, background: draft.tag === t ? C.blue100 : C.bg, color: draft.tag === t ? C.navy800 : C.textSub, fontSize: '11px', fontWeight: draft.tag === t ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.1s' }}>
                {t}
              </button>
            ))}
          </div>
          <input
            value={draft.tag}
            onChange={e => setDraft({ ...draft, tag: e.target.value })}
            placeholder="Or type a custom tag…"
            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = C.blue500)}
            onBlur={e  => (e.target.style.borderColor = C.border)}
          />
        </div>

        {/* Source + Date side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {field('Source', 'source', 'e.g. World Health Organization')}
          {field('Date', 'date', '')}
        </div>

        {/* URL */}
        {field('Source URL', 'url', 'https://… (optional — enables "Visit Source" button)', { hint: 'Optional' })}

        {/* Body */}
        {field('Article Body', 'body', 'Paste the full article content here. Separate paragraphs with a blank line (double Enter).', { multiline: true, hint: 'Separate paragraphs with a blank line.' })}

        {/* Live preview */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: font.family }}>
            Preview — Slot {Math.min(slotIndex + 1, 3)}{slotIndex === 0 ? ' (Lead story)' : ''}
          </div>
          <PreviewCard item={draft} index={slotIndex} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
          {isEdit ? (
            <>
              <button onClick={onCancel}
                style={{ flex: 1, padding: '11px', borderRadius: radius.sm, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: '13px', fontWeight: 600, color: C.textSub, cursor: 'pointer', fontFamily: font.family }}>
                Cancel
              </button>
              <button onClick={onUpdate} disabled={!canSave}
                style={{ flex: 2, padding: '11px', borderRadius: radius.sm, border: 'none', background: canSave ? C.blue500 : C.border, fontSize: '13px', fontWeight: 700, color: canSave ? '#fff' : C.textLight, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: font.family }}>
                Save Changes
              </button>
            </>
          ) : (
            <button onClick={onPublish} disabled={!canSave}
              style={{ flex: 1, padding: '12px', borderRadius: radius.sm, border: 'none', background: canSave ? C.navy800 : C.border, fontSize: '13px', fontWeight: 700, color: canSave ? '#fff' : C.textLight, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: font.family, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v10M3 7l5-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 14h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Publish Article
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AdminNewsScreen() {
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const { articles, publish, update, remove } = useNews()

  const [editing, setEditing]   = useState<NewsItem | null>(null)
  const [draft,   setDraft]     = useState<typeof EMPTY_DRAFT>(EMPTY_DRAFT)
  const [toast,   setToast]     = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handlePublish = () => {
    if (!draft.title.trim() || !draft.source.trim() || !draft.body.trim()) return
    publish({ title: draft.title.trim(), tag: draft.tag.trim(), source: draft.source.trim(), date: draft.date, url: draft.url.trim() || undefined, body: draft.body.trim() })
    setDraft(EMPTY_DRAFT)
    showToast('Article published — now visible on patient and SP dashboards.')
  }

  const handleEdit = (item: NewsItem) => {
    setEditing(item)
    setDraft({ title: item.title, tag: item.tag, source: item.source, date: item.date, url: item.url ?? '', body: item.body })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleUpdate = () => {
    if (!editing) return
    update({ ...editing, title: draft.title.trim(), tag: draft.tag.trim(), source: draft.source.trim(), date: draft.date, url: draft.url.trim() || undefined, body: draft.body.trim() })
    setEditing(null)
    setDraft(EMPTY_DRAFT)
    showToast('Article updated successfully.')
  }

  const handleCancel = () => {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
  }

  const handleRemove = (id: number) => {
    remove(id)
    if (editing?.id === id) handleCancel()
    showToast('Article unpublished and removed from dashboards.')
  }

  // New articles land at position 0, so compose preview slot = 0 when not editing
  const previewSlotIndex = editing ? articles.findIndex(a => a.id === editing.id) : 0

  return (
    <AdminLayout title="News" subtitle="Publish and manage health news for patients and service providers">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Toast */}
        {toast && (
          <div style={{ padding: '12px 18px', background: C.blue100, border: `1px solid ${C.blue500}44`, borderRadius: radius.sm, fontSize: '13px', fontWeight: 600, color: C.navy800 }}>
            {toast}
          </div>
        )}

        {/* Info banner — explains the 3-slot system */}
        <div style={{ padding: '14px 18px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.sm, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ width: 30, height: 30, borderRadius: radius.sm, background: C.navy800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke={C.blue500} strokeWidth="1.3"/>
              <path d="M8 7v5" stroke={C.blue500} strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="5" r="0.8" fill={C.blue500}/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>How news publishing works</div>
            <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.6 }}>
              The <strong>3 most recently published articles</strong> appear on every patient and service provider dashboard as a "Health News" feed. The newest article takes Slot 1 (dark card), the next takes Slot 2 (light blue), and the third takes Slot 3 (white). Articles beyond three are archived and not shown on dashboards.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 420px', gap: '24px', alignItems: 'flex-start' }}>

          {/* Left — published articles list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>
                Published Articles
                <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 500, color: C.textSub }}>({articles.length})</span>
              </div>
              <span style={{ fontSize: '11px', color: C.textSub }}>Newest first · 3 shown on dashboards</span>
            </div>

            {articles.length === 0 ? (
              <div style={{ padding: '60px 40px', textAlign: 'center', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.textSub, marginBottom: '6px' }}>No articles published yet</div>
                <div style={{ fontSize: '12px', color: C.textLight }}>Use the compose panel to publish your first article.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {articles.map((item, index) => (
                  <div key={item.id}>
                    {index === 3 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 20px' }}>
                        <div style={{ flex: 1, height: 1, background: C.border }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Archived — not shown on dashboards</span>
                        <div style={{ flex: 1, height: 1, background: C.border }} />
                      </div>
                    )}
                    <div style={{ opacity: index >= 3 ? 0.55 : 1 }}>
                      <ArticleCard
                        item={item}
                        index={index}
                        onEdit={() => handleEdit(item)}
                        onRemove={() => handleRemove(item.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — compose / edit panel */}
          <ComposePanel
            editing={editing}
            draft={draft}
            setDraft={setDraft}
            slotIndex={previewSlotIndex}
            onPublish={handlePublish}
            onUpdate={handleUpdate}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </AdminLayout>
  )
}
