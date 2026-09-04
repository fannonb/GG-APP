import { C, font, radius } from '@/design-system/tokens'

type Tab = 'patient' | 'sp'

interface EntityTabBarProps {
  tab: Tab
  setTab: (t: Tab) => void
  /** When true, tabs are replaced by a locked role label + change link. */
  locked?: boolean
  onRequestUnlock?: () => void
}

const LABELS: Record<Tab, string> = {
  patient: "I'm a patient",
  sp: "I'm a provider",
}

export function EntityTabBar({ tab, setTab, locked = false, onRequestUnlock }: EntityTabBarProps) {
  if (locked) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 28,
          padding: '10px 14px',
          background: C.bg,
          borderRadius: radius.sm,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textSub, fontFamily: font.family }}>
            Account type
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: font.family }}>
            {LABELS[tab]}
          </span>
        </div>
        <button
          type="button"
          onClick={onRequestUnlock}
          style={{
            border: 'none',
            background: 'transparent',
            color: C.blue500,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: font.family,
            cursor: 'pointer',
            padding: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Change account type
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        background: C.bg,
        borderRadius: radius.sm,
        padding: '4px',
        marginBottom: '28px',
        border: `1px solid ${C.border}`,
        position: 'relative',
      }}
    >
      <div
        style={{
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
        }}
      />

      {(['patient', 'sp'] as Tab[]).map(t => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          style={{
            flex: 1,
            padding: '9px 6px',
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
          {LABELS[t]}
        </button>
      ))}
    </div>
  )
}
