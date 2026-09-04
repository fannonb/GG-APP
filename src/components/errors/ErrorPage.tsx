import { useState, type ReactNode } from 'react'
import { C, font } from '@/design-system/tokens'
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

export function ErrorPage({
  code,
  title,
  message,
  icon,
  primaryAction,
  secondaryAction,
  details,
}: ErrorPageProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const isNotFound = code === '404'

  const handleCopy = () => {
    if (!details) return
    navigator.clipboard.writeText(details)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#071739',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        fontFamily: font.family,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#091C44',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          boxShadow: '0 16px 40px -12px rgba(0, 0, 0, 0.45)',
          padding: '40px 32px 32px',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand Logo - clean and natural, seamlessly absorbed by the background */}
        <div style={{ marginBottom: '22px', display: 'flex', justifyContent: 'center' }}>
          <img
            src={LOGO}
            alt="GG'APP"
            style={{
              width: 72,
              height: 72,
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {/* Soft, calm status icon */}
        {icon ? (
          <div style={{ marginBottom: '16px' }}>{icon}</div>
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isNotFound ? 'rgba(56, 182, 255, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${isNotFound ? 'rgba(56, 182, 255, 0.22)' : 'rgba(239, 68, 68, 0.22)'}`,
              color: isNotFound ? C.blue400 : '#F87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            {isNotFound ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </div>
        )}

        {/* Status code if available (e.g. 404) */}
        {code && (
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: 'rgba(255, 255, 255, 0.5)',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            Error {code}
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.015em',
            lineHeight: 1.3,
          }}
        >
          {title}
        </h1>

        {/* Message */}
        <p
          style={{
            margin: '12px auto 0',
            maxWidth: '380px',
            fontSize: '14px',
            lineHeight: 1.6,
            color: 'rgba(255, 255, 255, 0.72)',
          }}
        >
          {message}
        </p>

        {/* Action Buttons */}
        {(primaryAction || secondaryAction) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '26px',
            }}
          >
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: font.family,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                }}
              >
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                style={{
                  background: C.blue500,
                  border: 'none',
                  color: '#071739',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: font.family,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                  transition: 'filter 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.filter = 'brightness(1.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.filter = 'none'
                }}
              >
                {primaryAction.label}
              </button>
            )}
          </div>
        )}

        {/* Expandable Diagnostics */}
        {details && (
          <div style={{ marginTop: '22px', textAlign: 'left' }}>
            <button
              type="button"
              onClick={() => setDetailsOpen(open => !open)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                color: 'rgba(255, 255, 255, 0.55)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: font.family,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  transform: detailsOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              >
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {detailsOpen ? 'Hide error details' : 'View error details'}
            </button>

            {detailsOpen && (
              <div
                style={{
                  marginTop: '8px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: font.family,
                    }}
                  >
                    {copied ? 'Copied to clipboard' : 'Copy details'}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '11px',
                    lineHeight: 1.5,
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: font.mono,
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}
                >
                  {details}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Footer Support Contact */}
        <div
          style={{
            marginTop: '26px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '16px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>
            Need assistance? Contact{' '}
            <a
              href="mailto:support@gatewayglobal.africa"
              style={{ color: C.blue400, textDecoration: 'none', fontWeight: 600 }}
            >
              support@gatewayglobal.africa
            </a>
          </span>
        </div>
      </div>
    </div>
  )
}
