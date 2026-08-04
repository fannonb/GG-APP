import type { ReactNode } from 'react'
import { GGButton } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { LOGO } from '@/router/routes'

export interface ErrorPageAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface ErrorPageProps {
  code?: string
  title: string
  message: string
  icon?: ReactNode
  primaryAction?: ErrorPageAction
  secondaryAction?: ErrorPageAction
  details?: string
}

function DefaultErrorIcon({ code }: { code?: string }) {
  const isNotFound = code === '404'

  return (
    <div style={{
      width: 72,
      height: 72,
      borderRadius: radius.lg,
      background: isNotFound ? C.blue100 : 'rgba(229, 71, 77, 0.08)',
      border: `1px solid ${isNotFound ? 'rgba(56,182,255,0.22)' : 'rgba(229,71,77,0.18)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px',
      color: isNotFound ? C.blue500 : C.error,
    }}>
      {isNotFound ? (
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <circle cx="15" cy="15" r="8" stroke="currentColor" strokeWidth="2" />
          <path d="M21.5 21.5L29 29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 15h6M15 12v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
        </svg>
      ) : (
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <path d="M17 8v10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="17" cy="24" r="1.5" fill="currentColor" />
          <path d="M8 28c2.2-4.4 6-7 9-7s6.8 2.6 9 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
        </svg>
      )}
    </div>
  )
}

export function ErrorPage({
  code,
  title,
  message,
  icon,
  primaryAction,
  secondaryAction,
  details,
}: ErrorPageProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${C.bg} 0%, #fff 42%, ${C.blue100} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      fontFamily: font.family,
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: C.surface,
        borderRadius: radius.xl,
        border: `1px solid ${C.border}`,
        boxShadow: shadow.lg,
        padding: '36px 32px 32px',
        textAlign: 'center',
      }}>
        <img
          src={LOGO}
          alt="GG'APP"
          style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: '18px' }}
        />

        {icon ?? <DefaultErrorIcon code={code} />}

        {code && (
          <div style={{
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: code === '404' ? C.blue500 : C.error,
            marginBottom: '10px',
          }}>
            Error {code}
          </div>
        )}

        <h1 style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: 800,
          color: C.text,
          letterSpacing: '-0.03em',
          lineHeight: 1.2,
        }}>
          {title}
        </h1>

        <p style={{
          margin: '12px auto 0',
          maxWidth: '380px',
          fontSize: '14px',
          lineHeight: 1.65,
          color: C.textSub,
        }}>
          {message}
        </p>

        {(primaryAction || secondaryAction) && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '28px',
          }}>
            {secondaryAction && (
              <GGButton
                variant={secondaryAction.variant ?? 'secondary'}
                size="md"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </GGButton>
            )}
            {primaryAction && (
              <GGButton
                variant={primaryAction.variant ?? 'primary'}
                size="md"
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </GGButton>
            )}
          </div>
        )}

        {details && (
          <details style={{
            marginTop: '24px',
            textAlign: 'left',
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: radius.md,
            padding: '12px 14px',
          }}>
            <summary style={{
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              color: C.textSub,
            }}>
              Technical details
            </summary>
            <pre style={{
              margin: '12px 0 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '11px',
              lineHeight: 1.5,
              color: C.textSub,
              fontFamily: font.mono,
            }}>
              {details}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
