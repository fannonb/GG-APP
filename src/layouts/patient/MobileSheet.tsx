import type { ReactNode } from 'react'
import { C, font, radius, shadow } from '@/design-system/tokens'

interface MobileSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  fullHeight?: boolean
}

export function MobileSheet({ isOpen, onClose, title, children, fullHeight = false }: MobileSheetProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(8,21,40,0.55)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 50,
        background: '#fff',
        borderRadius: `${radius.xl} ${radius.xl} 0 0`,
        boxShadow: shadow.xl,
        maxHeight: fullHeight ? '92vh' : '70vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.22s ease',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: radius.full, background: C.border }} />
        </div>

        {title && (
          <div style={{
            padding: '8px 20px 14px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: C.text, fontFamily: font.family }}>
              {title}
            </span>
            <button
              onClick={onClose}
              style={{ background: C.bg, border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {children}
        </div>
      </div>

      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </>
  )
}
