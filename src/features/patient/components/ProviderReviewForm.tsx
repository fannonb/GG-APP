import { useState } from 'react'
import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
}

interface ProviderReviewFormProps {
  providerName: string
  isSubmitting?: boolean
  error?: string | null
  onSubmit: (rating: number, comment: string) => void | Promise<void>
  onSkip?: () => void
  compact?: boolean
}

export function ProviderReviewForm({
  providerName,
  isSubmitting = false,
  error = null,
  onSubmit,
  onSkip,
  compact = false,
}: ProviderReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const activeStars = hovered || rating

  return (
    <div style={{ fontFamily: font.family }}>
      <div style={{ fontSize: compact ? '14px' : '15px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>
        Rate Your Experience
      </div>
      <div style={{ fontSize: '13px', color: C.textSub, marginBottom: compact ? '16px' : '22px' }}>
        How was your visit to <strong style={{ color: C.text }}>{providerName}</strong>?
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              fontSize: compact ? '28px' : '36px',
              color: star <= activeStars ? C.warning : C.border,
              transition: 'color 0.1s, transform 0.1s',
              transform: star <= activeStars ? 'scale(1.18)' : 'scale(1)',
              lineHeight: 1,
            }}
          >
            ★
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', height: '20px', marginBottom: compact ? '14px' : '20px' }}>
        {activeStars > 0 && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.blue500 }}>
            {RATING_LABELS[activeStars]}
          </span>
        )}
      </div>

      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Share the details of your experience (optional)..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: radius.sm,
              border: `1.5px solid ${C.border}`,
              fontSize: '13px',
              fontFamily: font.family,
              color: C.text,
              background: C.bg,
              resize: 'none',
              outline: 'none',
              marginBottom: '14px',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = C.blue500)}
            onBlur={e => (e.currentTarget.style.borderColor = C.border)}
          />
          <GGButton
            variant="primary"
            size="md"
            fullWidth
            onClick={() => void onSubmit(rating, comment.trim() || RATING_LABELS[rating])}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Review'}
          </GGButton>
          {error && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: C.error, textAlign: 'center' }}>
              {error}
            </div>
          )}
        </>
      )}

      {onSkip && (
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: C.textLight,
              fontFamily: font.family,
              padding: '4px 8px',
            }}
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  )
}
