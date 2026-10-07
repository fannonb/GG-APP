import { useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useUpdateSPNotificationPrefsMutation } from '@/hooks/api'
import type { ProviderNotificationPreferences } from '@/api/types'

const CYAN_DEEP = '#0B7BC0'

const ITEMS: { key: keyof ProviderNotificationPreferences; label: string; hint: string }[] = [
  { key: 'newAppointmentEmail', label: 'New appointment requests', hint: 'When a patient asks to book a visit' },
  { key: 'invoiceEmail', label: 'Invoice updates', hint: 'When a patient approves or sends back an invoice' },
  { key: 'paymentEmail', label: 'Payments received', hint: 'When money reaches your payout account' },
  { key: 'disputeEmail', label: 'Disputes', hint: 'When an invoice is flagged for review' },
  { key: 'systemEmail', label: "GG'APP news & updates", hint: 'Product changes and occasional announcements' },
]

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        border: 'none',
        padding: 3,
        background: checked ? CYAN_DEEP : '#CBD5E1',
        cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s ease',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          display: 'block',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 0.15s ease',
        }}
      />
    </button>
  )
}

export function NotificationsTab({ initial, onSaved }: { initial: ProviderNotificationPreferences; onSaved: (message: string) => void }) {
  const mutation = useUpdateSPNotificationPrefsMutation()
  const [prefs, setPrefs] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  const update = async (key: keyof ProviderNotificationPreferences, value: boolean) => {
    const previous = prefs
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setError(null)
    try {
      await mutation.mutateAsync(next)
      onSaved('Notification settings saved.')
    } catch (err) {
      setPrefs(previous)
      setError(err instanceof Error ? err.message : 'Could not save that change. Try again.')
    }
  }

  return (
    <section
      aria-label="Email notifications"
      style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: '18px 22px 6px', fontFamily: font.family }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Email notifications</div>
      <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, marginBottom: 8 }}>
        You'll always see these in the app. Choose which ones also come by email.
      </div>
      {error && (
        <div role="alert" style={{ margin: '8px 0', padding: '10px 12px', borderRadius: radius.sm, background: 'rgba(239,68,68,0.10)', color: '#B91C1C', fontSize: 13 }}>
          {error}
        </div>
      )}
      {ITEMS.map(item => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: `1px solid ${C.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.label}</div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{item.hint}</div>
          </div>
          <Toggle
            checked={prefs[item.key]}
            label={item.label}
            disabled={mutation.isPending}
            onChange={value => void update(item.key, value)}
          />
        </div>
      ))}
    </section>
  )
}
