import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { AdminSidebar } from './AdminSidebar'

const ACCENT = '#F5A623'

interface AdminLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  back?: boolean
}

export function AdminLayout({ children, title, subtitle, back = false }: AdminLayoutProps) {
  const { isDesktop } = useResponsive()
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg }}>
      {isDesktop && <AdminSidebar />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: '#fff',
          borderBottom: `1px solid ${C.border}`,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: shadow.sm,
        }}>
          {back && (
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, padding: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, fontFamily: font.family, letterSpacing: '-0.03em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>{subtitle}</div>}
          </div>

          {/* Admin badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#FFF8E6', border: `1px solid ${ACCENT}33`, borderRadius: '20px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: ACCENT, fontFamily: font.family }}>Admin</span>
          </div>
        </div>

        <main style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
