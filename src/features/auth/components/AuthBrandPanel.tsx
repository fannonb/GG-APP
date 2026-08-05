import { C, font } from '@/design-system/tokens'
import { LOGO } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'
import type { ReactNode } from 'react'

type Tab = 'patient' | 'sp'

interface AuthBrandPanelProps {
  tab: Tab
}

const PROVIDER_GREEN = '#10B981'

interface Bullet {
  title: string
  body: string
  icon: (color: string) => ReactNode
}

interface BrandContent {
  headline: string
  sub: string
  bullets: Bullet[]
  accent: string
}

const CONTENT: Record<Tab, BrandContent> = {
  patient: {
    headline: 'Healthcare Access, Simplified.',
    sub: 'Get the care you need today. Pay later through our approved credit facility.',
    bullets: [
      { 
        title: 'Zero Upfront', 
        body: 'Credit covers visit', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><rect x="1" y="3.5" width="14" height="9" rx="1.5"/><path d="M1 6.5h14"/></svg> 
      },
      { 
        title: 'Vetted network', 
        body: '100% verified doctors', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><path d="M8 1L2 3v4.5C2 11.5 8 15 8 15s6-3.5 6-7.5V3l-6-2z"/><path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg> 
      },
      { 
        title: 'Secure PIN', 
        body: 'End-to-end safety', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="6" width="10" height="8" rx="2"/><path d="M5 6V4a3 3 0 016 0v2" strokeLinecap="round" strokeLinejoin="round"/></svg> 
      },
    ],
    accent: C.blue500,
  },
  sp: {
    headline: 'Grow Your Practice.',
    sub: 'Reach more patients and receive instant, guaranteed payments directly to your account.',
    bullets: [
      { 
        title: 'Instant Pay', 
        body: 'Guaranteed funds', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><path d="M8.5 1.5L2 9h5v5.5L14 7H9z" strokeLinejoin="round"/></svg> 
      },
      { 
        title: 'KYC Verified', 
        body: 'Pre-approved patients', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 8l1.5 1.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/></svg> 
      },
      { 
        title: 'Easy Admin', 
        body: 'Manage billing & calendar', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="9.5" y="1.5" width="5" height="5" rx="1"/><rect x="1.5" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/></svg> 
      },
    ],
    accent: PROVIDER_GREEN,
  },
}

export function AuthBrandPanel({ tab }: AuthBrandPanelProps) {
  const { isDesktop } = useResponsive()
  // Mobile/tablet use AuthCompactBrandHeader instead of this full side panel.
  if (!isDesktop) return null

  const c = CONTENT[tab]
  const panelWidth = '50%'
  const rgb = tab === 'patient' ? '56, 182, 255' : '16, 185, 129'

  return (
    <div style={{
      width: panelWidth,
      flexShrink: 0,
      margin: '0',
      borderRadius: '0',
      background: 'linear-gradient(135deg, #091C44 0%, #050E22 100%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px 36px',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '100vh',
      boxShadow: '0 20px 40px rgba(5, 14, 34, 0.3)',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
    }}>
      {/* CSS Keyframe Animation Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}} />

      {/* Decorative rings */}
      {[220, 380, 540].map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: r, height: r,
          borderRadius: '50%',
          border: `1px solid rgba(${rgb}, ${0.05 - i * 0.01})`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }} />
      ))}

      {/* Radial glow background */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '70%',
        height: '60%',
        background: `radial-gradient(circle, rgba(${rgb}, 0.12) 0%, rgba(${rgb}, 0) 70%)`,
        pointerEvents: 'none',
        filter: 'blur(30px)',
        transition: 'all 0.3s ease',
      }} />

      {/* Logo Container (Sizeable & Visible) */}
      <div style={{ 
        marginBottom: '24px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        <img src={LOGO} alt="GG'APP" width={110} height={110} style={{ objectFit: 'contain', display: 'block' }} />
      </div>

      {/* Content wrapper */}
      <div style={{ flex: 1, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Headline & Subtitle */}
        <div>
          <div style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            marginBottom: '10px',
            fontFamily: font.family,
          }}>
            {c.headline}
          </div>
          <div style={{ 
            fontSize: '13.5px', 
            color: 'rgba(255,255,255,0.7)', 
            lineHeight: 1.5, 
            marginBottom: '24px', 
            fontFamily: font.family,
            fontWeight: 400,
          }}>
            {c.sub}
          </div>
        </div>

        {/* Hero Interactive Widget */}
        <div style={{
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          animation: 'float 5s ease-in-out infinite',
          fontFamily: font.family,
          transition: 'all 0.3s ease',
        }}>
          {tab === 'patient' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Health Credit Limit</span>
                <span style={{ fontSize: '10px', background: 'rgba(56, 182, 255, 0.15)', color: '#38B6FF', padding: '2px 8px', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(56, 182, 255, 0.3)' }}>Active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>$1,200.00</span>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>available</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ width: '75%', height: '100%', background: 'linear-gradient(90deg, #38B6FF, #0091E6)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
                <span>Used: $400.00</span>
                <span>Partner: CapiMed</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Practice Summary</span>
                <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: PROVIDER_GREEN, padding: '2px 8px', borderRadius: '20px', fontWeight: 700, border: `1px solid rgba(16, 185, 129, 0.3)` }}>Live</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Instant</span>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>disbursements</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  <span>Verified Patient Bookings</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>Speedy KYC verification</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  <span>Payment Status</span>
                  <span style={{ fontWeight: 700, color: PROVIDER_GREEN }}>Guaranteed 100%</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Features Columns Row */}
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'space-between',
          marginTop: '28px',
        }}>
          {c.bullets.map((b, i) => (
            <div key={i} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '6px',
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '12px',
              padding: '12px 10px',
              boxSizing: 'border-box',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '6px',
                background: `${c.accent}12`,
                border: `1px solid ${c.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.accent,
                flexShrink: 0,
              }}>
                {b.icon(c.accent)}
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: font.family, marginBottom: '2px', lineHeight: 1.2 }}>
                  {b.title}
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, fontFamily: font.family }}>
                  {b.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer tag */}
        <div style={{ marginTop: '28px', fontSize: '10.5px', color: 'rgba(255,255,255,0.25)', fontFamily: font.family, zIndex: 1 }}>
          GG'APP · Gateway Global Healthcare Platform
        </div>
      </div>
    </div>
  )
}
