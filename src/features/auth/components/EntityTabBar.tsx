import { C, font, radius } from '@/design-system/tokens'

type Tab = 'patient' | 'sp'

interface EntityTabBarProps {
  tab: Tab
  setTab: (t: Tab) => void
}

export function EntityTabBar({ tab, setTab }: EntityTabBarProps) {
  return (
    <div style={{
      display: 'flex',
      background: C.bg,
      borderRadius: radius.sm,
      padding: '4px',
      marginBottom: '28px',
      border: `1px solid ${C.border}`,
    }}>
      {(['patient', 'sp'] as Tab[]).map(t => (
        <button
          key={t}
          onClick={() => setTab(t)}
          style={{
            flex: 1,
            padding: '9px',
            borderRadius: '8px',
            border: 'none',
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? C.text : C.textSub,
            fontSize: '13px',
            fontWeight: tab === t ? 700 : 500,
            fontFamily: font.family,
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: tab === t ? '0 1px 4px rgba(13,30,66,0.10)' : 'none',
          }}
        >
          {t === 'patient' ? 'Patient' : 'Service Provider'}
        </button>
      ))}
    </div>
  )
}
