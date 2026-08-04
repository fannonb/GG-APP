import { useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { formatDate } from '@/utils/format'
import { useHealthNews } from '@/hooks/api'
import { useNews } from '@/providers/NewsProvider'
import type { NewsItem } from '@/types/user.types'

function NewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const { isMobile } = useResponsive()
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,21,40,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px' : '32px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(8,21,40,0.25)' }}
      >
        <div style={{ background: C.navy800, padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(74,173,223,0.06)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', position: 'relative' }}>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: '#fff', lineHeight: 1.35, letterSpacing: '-0.03em', fontFamily: font.family }}>{item.title}</div>
        </div>
        <div style={{ padding: '14px 28px', background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', background: C.navy800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={C.blue500} strokeWidth="1.3"/><path d="M7 4v3.5l2 1.5" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family, marginBottom: '2px' }}>Source</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{item.source}</div>
            <div style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family, marginTop: '1px' }}>{formatDate(item.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: C.navy800, border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family, textDecoration: 'none', flexShrink: 0 }}>
              Visit Source
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 9.5L9.5 1.5M9.5 1.5H4M9.5 1.5V7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          )}
        </div>
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {item.body.split('\n\n').map((para, i) => (
            <p key={i} style={{ fontSize: '14px', color: C.text, lineHeight: 1.75, marginBottom: i < item.body.split('\n\n').length - 1 ? '16px' : 0, fontFamily: font.family }}>{para}</p>
          ))}
        </div>
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: radius.sm, background: C.navy800, border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}>Close</button>
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

  if (visible.length === 0) {
    return null
  }

  return (
    <>
      {selectedNews && <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>Health News</div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: C.blue500, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: font.family }}>Live Feed</span>
        </div>
        <div
          className={(isMobile || isTablet) ? 'hide-scrollbar' : undefined}
          style={
            (isMobile || isTablet)
              ? { display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }
              : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }
          }
        >
          {visible.map((item, index) => {
            const isFirst = index === 0
            const snippet = item.body.split('\n\n')[0]?.slice(0, 110).trimEnd()
            const snippetText = snippet && snippet.length >= 100 ? `${snippet}…` : snippet
            const cardStyles = [
              {
                bg: 'linear-gradient(150deg, #0B1F45 0%, #0E2E6B 60%, #123580 100%)',
                border: 'rgba(56,182,255,0.18)',
                titleColor: '#fff',
                snippetColor: 'rgba(255,255,255,0.62)',
                sourceLabelColor: 'rgba(255,255,255,0.38)',
                sourceColor: 'rgba(255,255,255,0.85)',
                dateBg: 'rgba(56,182,255,0.18)',
                dateColor: C.blue300,
                divider: 'rgba(255,255,255,0.10)',
                arrowColor: C.blue300,
                hoverShadow: '0 14px 36px rgba(18,53,128,0.35)',
                hoverBorder: C.blue500,
              },
              {
                bg: '#fff',
                border: C.border,
                titleColor: C.text,
                snippetColor: C.textSub,
                sourceLabelColor: C.textLight,
                sourceColor: C.text,
                dateBg: C.blue100,
                dateColor: C.blue500,
                divider: C.border,
                arrowColor: C.blue500,
                hoverShadow: '0 10px 28px rgba(56,182,255,0.13)',
                hoverBorder: C.blue500,
              },
              {
                bg: `linear-gradient(150deg, ${C.blue100} 0%, #fff 100%)`,
                border: 'rgba(56,182,255,0.20)',
                titleColor: C.text,
                snippetColor: C.textSub,
                sourceLabelColor: C.textLight,
                sourceColor: C.text,
                dateBg: 'rgba(56,182,255,0.12)',
                dateColor: C.blue500,
                divider: 'rgba(56,182,255,0.14)',
                arrowColor: C.blue500,
                hoverShadow: '0 10px 28px rgba(56,182,255,0.14)',
                hoverBorder: C.blue500,
              },
            ]
            const s = cardStyles[index] ?? cardStyles[2]
            return (
              <div
                key={item.id}
                onClick={() => setSelectedNews(item)}
                style={{
                  background: s.bg,
                  borderRadius: '16px',
                  border: `1px solid ${s.border}`,
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 10px rgba(9,28,68,0.05)',
                  transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
                  fontFamily: font.family,
                  ...(isMobile || isTablet
                    ? {
                        flexShrink: 0,
                        width: isMobile ? 'calc(82vw - 32px)' : 'calc(58vw - 32px)',
                        scrollSnapAlign: 'start',
                      }
                    : {}),
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = s.hoverShadow
                  e.currentTarget.style.borderColor = s.hoverBorder
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(9,28,68,0.05)'
                  e.currentTarget.style.borderColor = s.border
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.65 }}>
                    <path d="M2 12L12 2M12 2H5M12 2v7" stroke={s.arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{
                  fontSize: isFirst ? '15px' : '13px',
                  fontWeight: 700,
                  color: s.titleColor,
                  lineHeight: 1.45,
                  letterSpacing: '-0.01em',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '10px',
                }}>
                  {item.title}
                </div>
                {snippetText && (
                  <div style={{
                    fontSize: '12px',
                    color: s.snippetColor,
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: isFirst ? 3 : 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    flex: 1,
                    marginBottom: '16px',
                  }}>
                    {snippetText}
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: `1px solid ${s.divider}`,
                  marginTop: 'auto',
                  gap: '8px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: s.sourceLabelColor,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      marginBottom: '2px',
                    }}>
                      Verified Source
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: s.sourceColor,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.source}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: s.dateColor,
                    background: s.dateBg,
                    padding: '3px 9px',
                    borderRadius: '6px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {formatDate(item.date, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
