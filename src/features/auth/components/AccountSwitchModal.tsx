import { useEffect } from 'react'
import { GGButton } from '@/design-system'
import { C, font } from '@/design-system/tokens'

type Tab = 'patient' | 'sp'

const LABELS: Record<Tab, string> = {
  patient: 'patient',
  sp: 'provider',
}

interface AccountSwitchModalProps {
  currentTab: Tab
  onCancel: () => void
  onConfirm: (next: Tab) => void
}

/**
 * Confirmation before changing registration account type mid-flow.
 * Switching clears entered details, so keep the ask short and explicit.
 */
export function AccountSwitchModal({ currentTab, onCancel, onConfirm }: AccountSwitchModalProps) {
  const nextTab: Tab = currentTab === 'patient' ? 'sp' : 'patient'

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onCancel])

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        role="presentation"
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(9, 28, 68, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-switch-title"
        aria-describedby="account-switch-desc"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          background: C.surface,
          borderRadius: 16,
          padding: '24px',
          boxShadow: '0 28px 64px rgba(9, 28, 68, 0.28)',
          fontFamily: font.family,
          border: `1px solid ${C.border}`,
        }}
      >
        <h2
          id="account-switch-title"
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: C.text,
            letterSpacing: '-0.03em',
            marginBottom: 8,
          }}
        >
          Switch to {LABELS[nextTab]}?
        </h2>
        <p
          id="account-switch-desc"
          style={{
            margin: 0,
            fontSize: 14,
            color: C.textSub,
            lineHeight: 1.55,
            marginBottom: 22,
          }}
        >
          This will clear the {LABELS[currentTab]} details you’ve entered so far.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <GGButton variant="secondary" size="md" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </GGButton>
          <GGButton
            variant="primary"
            size="md"
            onClick={() => onConfirm(nextTab)}
            style={{ flex: 1 }}
          >
            Switch
          </GGButton>
        </div>
      </div>
    </div>
  )
}
