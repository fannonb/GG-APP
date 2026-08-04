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
      position: 'relative',
    }}>
      {/* Sliding background pill */}
      <div style={{
        position: 'absolute',
        top: '4px',
        bottom: '4px',
        left: '4px',
        width: 'calc(50% - 4px)',
        background: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(9, 28, 68, 0.08)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: `translateX(${tab === 'patient' ? '0' : '100%'})`,
        zIndex: 0,
      }} />

      {(['patient', 'sp'] as Tab[]).map(t => (
        <button
          key={t}
          onClick={() => setTab(t)}
          style={{
            flex: 1,
            padding: '9px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: tab === t ? C.text : C.textSub,
            fontSize: '13px',
            fontWeight: tab === t ? 700 : 500,
            fontFamily: font.family,
            cursor: 'pointer',
            transition: 'color 0.2s ease',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {t === 'patient' ? 'Patient' : 'Service Provider'}
        </button>
      ))}
    </div>
  )
}
