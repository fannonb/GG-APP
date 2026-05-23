import { C, font } from './tokens'

interface StarRatingProps {
  rating: number
  count?: number
}

export function StarRating({ rating, count }: StarRatingProps) {
  const full = Math.floor(rating)
  const empty = 5 - full

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: C.warning, fontSize: '14px', letterSpacing: '1px' }}>
        {'★'.repeat(full)}{'☆'.repeat(empty)}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>
          ({count})
        </span>
      )}
    </div>
  )
}
