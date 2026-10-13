import { useState } from 'react'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { apiClient } from '@/api/client'
import { isMockApi } from '@/api/config'

const LABELS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent']

/**
 * A quick rating of GG'APP itself (not the provider), shown after paying.
 * Feeds the "App satisfaction" card in the admin insights.
 */
export function AppRatingCard({ context = 'payment' }: { context?: 'payment' }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'dismissed'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (state === 'dismissed') return null

  if (state === 'sent') {
    return (
      <GGCard padding="20px 24px" style={{ marginTop: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: font.family }}>Thanks for rating GG’APP</div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, fontFamily: font.family }}>Your feedback helps us improve the app.</div>
      </GGCard>
    )
  }

  const send = async () => {
    setState('sending')
    setError(null)
    try {
      if (!isMockApi) {
        await apiClient.post('/feedback', { rating, comment: comment.trim() || undefined, context, platform: 'web' })
      }
      setState('sent')
    } catch {
      setError('We couldn’t send that. Please try again.')
      setState('idle')
    }
  }

  const shown = hover || rating

  return (
    <GGCard padding="22px 24px" style={{ marginTop: '16px' }}>
      <div style={{ fontFamily: font.family }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>How easy was it to pay with GG’APP?</div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>Rate the app itself, not the provider.</div>

        <div role="radiogroup" aria-label="Rate GG’APP" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? '' : 's'}: ${LABELS[n]}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', fontSize: 30, lineHeight: 1, color: n <= shown ? '#F59E0B' : C.border }}
            >
              ★
            </button>
          ))}
          {shown > 0 && <span style={{ fontSize: 13, color: C.textSub, marginLeft: 6 }}>{LABELS[shown]}</span>}
        </div>

        {rating > 0 && (
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 1000))}
            placeholder={rating <= 3 ? 'What could we do better? (optional)' : 'Anything you’d like to add? (optional)'}
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 14, padding: '10px 12px', fontSize: 14, fontFamily: font.family, color: C.text, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, resize: 'vertical' }}
          />
        )}

        {error && <div role="alert" style={{ fontSize: 13, color: C.error, marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <GGButton variant="secondary" size="sm" onClick={() => setState('dismissed')}>Not now</GGButton>
          <GGButton variant="primary" size="sm" disabled={rating === 0 || state === 'sending'} onClick={() => void send()}>
            {state === 'sending' ? 'Sending…' : 'Send rating'}
          </GGButton>
        </div>
      </div>
    </GGCard>
  )
}
