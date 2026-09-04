import { GGButton, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'

export function ChipEditor({
  items,
  editing,
  value,
  onChange,
  onAdd,
  onRemove,
  placeholder,
  tone = 'blue',
}: {
  items: string[]
  editing: boolean
  value: string
  onChange: (value: string) => void
  onAdd: () => void
  onRemove: (item: string) => void
  placeholder: string
  tone?: 'blue' | 'green'
}) {
  const bg = tone === 'green' ? C.successBg : C.blue100
  const border = tone === 'green' ? `${C.success}33` : `${C.blue500}33`
  const color = tone === 'green' ? '#0D6B47' : C.blue500

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: items.length || editing ? 12 : 0 }}>
        {items.length === 0 && !editing && (
          <span style={{ fontSize: 13, color: C.textSub, fontFamily: font.family }}>None added yet.</span>
        )}
        {items.map(item => (
          <span
            key={item}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: editing ? '6px 8px 6px 12px' : '6px 12px',
              borderRadius: radius.full,
              background: bg,
              border: `1px solid ${border}`,
              color,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: font.family,
            }}
          >
            {item}
            {editing && (
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onRemove(item)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,0.08)',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {editing && (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <GGInput
              value={value}
              onChange={event => onChange(event.target.value)}
              placeholder={placeholder}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onAdd()
                }
              }}
            />
          </div>
          <GGButton variant="secondary" size="sm" onClick={onAdd} disabled={!value.trim()}>
            Add
          </GGButton>
        </div>
      )}
    </div>
  )
}
