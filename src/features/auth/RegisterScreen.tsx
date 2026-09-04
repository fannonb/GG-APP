import { useCallback, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { ROUTES } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'
import { AccountSwitchModal } from './components/AccountSwitchModal'
import { AuthBrandPanel } from './components/AuthBrandPanel'
import { AuthCompactBrandHeader } from './components/AuthCompactBrandHeader'
import { EntityTabBar } from './components/EntityTabBar'
import { PatientRegisterFlow } from './components/PatientRegisterFlow'
import { SPRegisterFlow } from './components/SPRegisterFlow'

type Tab = 'patient' | 'sp'

export function RegisterScreen() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'patient')
  const [roleLocked, setRoleLocked] = useState(false)
  const [flowKey, setFlowKey] = useState(0)
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const { isDesktop } = useResponsive()
  const compactBrand = !isDesktop

  const markStarted = useCallback(() => {
    setRoleLocked(true)
  }, [])

  const switchTab = (next: Tab) => {
    if (next === tab) return
    setTab(next)
    setRoleLocked(false)
    setFlowKey(k => k + 1)
  }

  const requestUnlock = () => {
    setShowSwitchModal(true)
  }

  const confirmSwitch = (next: Tab) => {
    setShowSwitchModal(false)
    setTab(next)
    setRoleLocked(false)
    setFlowKey(k => k + 1)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: compactBrand ? 'column' : 'row',
        height: compactBrand ? 'auto' : '100vh',
        minHeight: '100vh',
        overflow: compactBrand ? 'visible' : 'hidden',
        fontFamily: font.family,
        background: C.bg,
      }}
    >
      <AuthBrandPanel tab={tab} />
      {compactBrand && <AuthCompactBrandHeader tab={tab} />}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: C.surface,
          position: 'relative',
        }}
      >
        <div
          style={{
            minHeight: compactBrand ? 'auto' : '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: compactBrand ? '12px 12px 24px' : '36px 40px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              padding: compactBrand ? '12px 8px' : '32px 28px',
            }}
          >
            <EntityTabBar
              tab={tab}
              setTab={switchTab}
              locked={roleLocked}
              onRequestUnlock={requestUnlock}
            />

            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: C.text,
                  letterSpacing: '-0.03em',
                  marginBottom: 6,
                }}
              >
                {tab === 'patient' ? 'Create your patient account' : 'Apply as a provider'}
              </div>
              <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.5 }}>
                {tab === 'patient'
                  ? 'Set up access to verified healthcare providers. You’ll verify your email before signing in.'
                  : 'Submit your practice for admin review. Verification typically takes 2–3 business days.'}
              </div>
            </div>

            {tab === 'sp' && !roleLocked && (
              <div
                style={{
                  marginBottom: 18,
                  padding: '12px 14px',
                  background: C.bg,
                  borderRadius: radius.sm,
                  border: `1px solid ${C.border}`,
                  fontSize: 12,
                  color: C.textSub,
                  lineHeight: 1.55,
                }}
              >
                This is an application, not instant access. You’ll receive an email once your
                license and documents are reviewed.
              </div>
            )}

            {tab === 'patient' ? (
              <PatientRegisterFlow key={flowKey} onStarted={markStarted} />
            ) : (
              <SPRegisterFlow key={flowKey} onStarted={markStarted} />
            )}

            <div
              style={{
                textAlign: 'center',
                fontSize: 13,
                color: C.textSub,
                marginTop: 20,
                borderTop: `1px solid ${C.border}`,
                paddingTop: 16,
              }}
            >
              Already have an account?{' '}
              <Link
                to={ROUTES.LOGIN}
                style={{ color: C.blue500, fontWeight: 700, textDecoration: 'none' }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showSwitchModal && (
        <AccountSwitchModal
          currentTab={tab}
          onCancel={() => setShowSwitchModal(false)}
          onConfirm={confirmSwitch}
        />
      )}
    </div>
  )
}
