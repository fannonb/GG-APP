import { useCallback, useEffect, useRef, useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { formatDate } from '@/utils/format'
import { useHealthNews } from '@/hooks/api'
import { useNews } from '@/providers/NewsProvider'
import type { NewsItem } from '@/types/user.types'

const CYAN_DEEP = '#0B7BC0'
const SNIPPET_CHARS = 110

function sourceInitials(source: string) {
  const words = source.split(/\s+/).filter(w => /^[A-Za-z]/.test(w) && !/^(of|the|and|for)$/i.test(w))
  return words.slice(0, 3).map(w => w[0].toUpperCase()).join('') || 'N'
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function readMinutes(text: string) {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200))
}

/** True when the card already shows everything the article says. */
function isShortItem(item: NewsItem) {
  const paragraphs = item.body.split('\n\n').filter(p => p.trim())
  return paragraphs.length <= 1 && item.body.trim().length <= SNIPPET_CHARS
}

function SourceChip({ source, size = 36 }: { source: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: C.blue100,
        color: CYAN_DEEP,
        fontSize: size > 30 ? 12 : 10,
        fontWeight: 800,
        letterSpacing: '0.02em',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {sourceInitials(source)}
    </span>
  )
}

function NewsReader({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const { isMobile } = useResponsive()
  const dialogRef = useRef<HTMLDivElement>(null)
  const host = item.url ? hostOf(item.url) : null
  const paragraphs = item.body.split('\n\n').filter(p => p.trim())

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,21,40,0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 32,
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-reader-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: isMobile ? '100%' : 640,
          maxHeight: isMobile ? '88vh' : '85vh',
          borderRadius: isMobile ? '20px 20px 0 0' : 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(8,21,40,0.22)',
          fontFamily: font.family,
          outline: 'none',
        }}
      >
        {isMobile && <div aria-hidden style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: '10px auto 0' }} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '14px 20px 0' : '22px 28px 0' }}>
          <SourceChip source={item.source} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.textSub, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source}</div>
            {formatDate(item.date, { month: 'short', day: 'numeric', year: 'numeric' })} · {readMinutes(item.body)} min read
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close article"
            style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: isMobile ? '16px 20px 24px' : '18px 28px 28px' }}>
          {item.tag && (
            <div style={{ fontSize: 11, fontWeight: 700, color: CYAN_DEEP, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{item.tag}</div>
          )}
          <h2 id="news-reader-title" style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.text, lineHeight: 1.3, letterSpacing: '-0.015em' }}>
            {item.title}
          </h2>
          <div style={{ marginTop: 16, maxWidth: 560 }}>
            {paragraphs.map((para, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : '14px 0 0', fontSize: 15, color: C.text, lineHeight: 1.75 }}>{para}</p>
            ))}
          </div>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 22,
                height: 42,
                padding: '0 16px',
                borderRadius: radius.sm,
                border: '1px solid rgba(11,123,192,0.35)',
                color: CYAN_DEEP,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Read the full article{host ? ` on ${host}` : ''}
              <svg width="12" height="12" viewBox="0 0 11 11" fill="none" aria-hidden><path d="M1.5 9.5L9.5 1.5M9.5 1.5H4M9.5 1.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

interface HealthNewsSectionProps {
  /** Optional pre-fetched articles; falls back to the shared health news feed. */
  articles?: NewsItem[]
}

export function HealthNewsSection({ articles: articlesProp }: HealthNewsSectionProps = {}) {
  const { isMobile, isTablet } = useResponsive()
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const { data: fetchedArticles } = useHealthNews()
  const { articles: sharedArticles = [] } = useNews()
  const articles = articlesProp ?? fetchedArticles ?? sharedArticles
  const visible = articles.slice(0, 3)
  const narrow = isMobile || isTablet
  const closeReader = useCallback(() => setSelectedNews(null), [])

  if (visible.length === 0) {
    return null
  }

  return (
    <>
      {selectedNews && <NewsReader item={selectedNews} onClose={closeReader} />}
      <div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.01em', fontFamily: font.family }}>Health news</div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, fontFamily: font.family }}>From trusted health sources</div>
        </div>
        <div
          className={narrow ? 'hide-scrollbar' : undefined}
          style={
            narrow
              ? { display: 'flex', gap: 16, overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingTop: 4, paddingBottom: 8 }
              : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }
          }
        >
          {visible.map(item => {
            const firstPara = item.body.split('\n\n')[0] ?? ''
            const snippet = firstPara.length > SNIPPET_CHARS ? `${firstPara.slice(0, SNIPPET_CHARS).trimEnd()}…` : firstPara
            const short = isShortItem(item)
            const host = item.url ? hostOf(item.url) : null
            // Short items with a link go straight to the source; everything else opens the reader.
            const mode: 'external' | 'reader' = short && item.url ? 'external' : 'reader'

            const cardStyle: React.CSSProperties = {
              all: 'unset',
              boxSizing: 'border-box',
              background: '#fff',
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              padding: 20,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              boxShadow: '0 2px 10px rgba(9,28,68,0.05)',
              transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
              fontFamily: font.family,
              ...(narrow
                ? { flexShrink: 0, width: isMobile ? 'calc(82vw - 32px)' : 'calc(58vw - 32px)', scrollSnapAlign: 'start' }
                : {}),
            }
            const hover = {
              onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(9,28,68,0.10)'
                e.currentTarget.style.borderColor = C.borderDark
              },
              onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(9,28,68,0.05)'
                e.currentTarget.style.borderColor = C.border
              },
            }

            const content = (
              <>
                {item.tag && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: CYAN_DEEP, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    {item.tag}
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 8 }}>
                  {item.title}
                </div>
                {snippet && (
                  <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, marginBottom: 14 }}>
                    {snippet}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: `1px solid ${C.border}`, marginTop: 'auto' }}>
                  <SourceChip source={item.source} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source}</div>
                    <div style={{ fontSize: 11, color: C.textSub, marginTop: 1 }}>
                      {formatDate(item.date, { month: 'short', day: 'numeric' })}
                      {mode === 'external' && host && <span style={{ color: CYAN_DEEP, fontWeight: 700 }}> · Opens {host} ↗</span>}
                      {mode === 'reader' && <span style={{ color: CYAN_DEEP, fontWeight: 700 }}> · Read · {readMinutes(item.body)} min</span>}
                    </div>
                  </div>
                </div>
              </>
            )

            if (mode === 'external') {
              return (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={cardStyle} {...hover}>
                  {content}
                </a>
              )
            }
            return (
              <button key={item.id} type="button" onClick={() => setSelectedNews(item)} style={cardStyle} {...hover}>
                {content}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
