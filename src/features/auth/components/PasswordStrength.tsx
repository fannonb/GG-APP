import { C, font } from '@/design-system/tokens'

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', C.error, C.warning, C.blue500, C.success]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: '99px',
            background: i <= score ? colors[score] : C.border,
            transition: 'all 0.25s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: '11px', color: colors[score], fontWeight: 600, fontFamily: font.family }}>
        {labels[score]}
      </div>
    </div>
  )
}
