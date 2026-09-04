import { C, font, radius } from '@/design-system/tokens'
import { SETTINGS_TABS, type SettingsTabId } from '../settings.helpers'

export function SettingsTabBar({
  tab,
  onChange,
}: {
  tab: SettingsTabId
  onChange: (next: SettingsTabId) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        padding: 4,
        background: C.bg,
        borderRadius: radius.md,
        border: `1px solid ${C.border}`,
      }}
    >
      {SETTINGS_TABS.map(item => {
        const active = tab === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={{
              flex: '1 0 auto',
              minWidth: 120,
              padding: '10px 14px',
              borderRadius: radius.sm,
              border: 'none',
              cursor: 'pointer',
              background: active ? C.blue100 : 'transparent',
              color: active ? C.blue500 : C.textSub,
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              fontFamily: font.family,
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
