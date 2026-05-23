import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, type UserMode } from '@/store/auth.store'
import { PORTAL_HOME } from '@/router/routes'

const CC = {
  border: '#E2EBF5',
  text:   '#0D1E42',
  sub:    '#55769A',
  bg:     '#EEF4FB',
  blue:   '#4AADDF',
}

export function TweaksPanel() {
  const [visible, setVisible] = useState(true)
  const navigate = useNavigate()
  const { userMode, setUserMode } = useAuthStore()

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        title="Screen Options"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 40, height: 40, borderRadius: '50%',
          background: '#0D1E42', border: 'none',
          color: '#fff', fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(13,30,66,0.35)',
        }}>
        ⚙
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      width: 292, background: '#fff',
      borderRadius: 16,
      boxShadow: '0 20px 60px rgba(13,30,66,0.18)',
      border: `1px solid ${CC.border}`,
      zIndex: 9999,
      fontFamily: "'Outfit', 'Inter', sans-serif",
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ padding: '16px 18px 14px', background: 'linear-gradient(135deg, #0D1E42, #152B55)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Screen Options</div>
        <button onClick={() => setVisible(false)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ✕
        </button>
      </div>

      <div style={{ padding: '16px 18px' }}>

        {/* Dashboard View */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: CC.sub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Dashboard View</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {([['existing', 'Existing User'], ['new', 'New User']] as [UserMode, string][]).map(([val, lbl]) => (
              <button key={val} onClick={() => { setUserMode(val); navigate(PORTAL_HOME.patient) }}
                style={{ flex: 1, padding: '9px 6px', borderRadius: 8, border: `1.5px solid ${userMode === val ? CC.blue : CC.border}`, background: userMode === val ? '#DCF1FC' : '#fff', color: userMode === val ? '#1A5D8A' : CC.sub, fontSize: '12px', fontWeight: userMode === val ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s' }}>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: CC.sub, marginTop: '6px', lineHeight: 1.5 }}>
            {userMode === 'new'
              ? 'Onboarding journey — new account, no credit yet.'
              : 'Active dashboard — existing user with credit & history.'}
          </div>
        </div>
      </div>
    </div>
  )
}
