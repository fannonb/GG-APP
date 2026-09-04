import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font } from '@/design-system/tokens'
import { useNotificationsStore } from '@/store/notifications.store'
import { NotificationPanel } from '@/components/NotificationPanel'
import { useSPProfile } from '@/hooks/api'
import { ROUTES } from '@/router/routes'

interface SPTopBarProps {
  title: string
  status?: string
  back?: boolean
  backLabel?: string
}

const SP_SEARCH_PAGES = [
  { label: 'Appointments', desc: 'Manage patient bookings', keywords: ['appointment', 'appointments', 'booking', 'bookings', 'schedule'], path: ROUTES.SP_APPOINTMENTS },
  { label: 'Invoices & Billing', desc: 'Create and review claims', keywords: ['invoice', 'invoices', 'bill', 'billing', 'claim', 'claims', 'payment'], path: ROUTES.SP_INVOICES },
  { label: 'Patient Records', desc: 'View patient records and history', keywords: ['patient', 'patients', 'record', 'records', 'client', 'clients', 'ledger'], path: ROUTES.SP_PATIENTS },
  { label: 'Prescriptions', desc: 'Manage pharmacy requests', keywords: ['prescription', 'prescriptions', 'rx', 'medication'], path: ROUTES.SP_PRESCRIPTIONS },
  { label: 'Payments & Payouts', desc: 'Settlements and earnings', keywords: ['payment', 'payments', 'payout', 'earnings', 'revenue'], path: ROUTES.SP_PAYMENTS },
  { label: 'Provider Settings', desc: 'Working hours and profile', keywords: ['setting', 'settings', 'profile', 'hours', 'account'], path: ROUTES.SP_SETTINGS },
]

function getProviderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'SP'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export function SPTopBar({ title, status, back = false, backLabel = 'Back' }: SPTopBarProps) {
  const navigate = useNavigate()
  const { spNotifs, openPanel } = useNotificationsStore()
  const unreadCount = spNotifs.filter(n => !n.read).length
  const { data: profile } = useSPProfile()

  const providerName = profile?.name ?? 'Provider'
  const providerLogoUrl = profile?.logoUrl
  const providerInitials = getProviderInitials(providerName)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const trimmed = searchQuery.trim().toLowerCase()

  const matchedPages = useMemo(() => {
    if (!trimmed) return []
    return SP_SEARCH_PAGES.filter(p =>
      p.label.toLowerCase().includes(trimmed) ||
      p.keywords.some(k => k.includes(trimmed))
    )
  }, [trimmed])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setSearchOpen(false)
    if (matchedPages.length > 0) {
      navigate(matchedPages[0].path)
    } else {
      navigate(`${ROUTES.SP_INVOICES}?q=${encodeURIComponent(q)}`)
    }
  }

  const handleSelectResult = (targetPath: string) => {
    navigate(targetPath)
    setSearchOpen(false)
    setSearchQuery('')
  }

  return (
    <>
      <div
        style={{
          background: 'transparent',
          padding: '14px 20px 18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'nowrap',
        }}
      >
        {/* Left Side: Back button + Page Title + Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          {back && (
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                color: C.textSub,
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: font.family,
                padding: '7px 12px',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {backLabel}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: C.navy800,
                fontFamily: font.family,
                letterSpacing: '-0.035em',
                lineHeight: 1.15,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </h1>

            {status && (
              <span
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: C.blue100,
                  color: C.blue500,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: font.family,
                  letterSpacing: '0.01em',
                }}
              >
                {status}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Search bar, Language, Settings, Bell, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {/* Working Pill Search Bar with Autocomplete Dropdown */}
          <div ref={searchContainerRef} style={{ position: 'relative' }}>
            <form
              onSubmit={handleSearchSubmit}
              style={{
                background: isSearchFocused ? '#FFFFFF' : '#E9EDF5',
                borderRadius: '9999px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px 0 16px',
                gap: '10px',
                width: '280px',
                border: isSearchFocused ? `1.5px solid ${C.blue500}` : '1.5px solid transparent',
                boxShadow: isSearchFocused ? '0 4px 16px rgba(56, 182, 255, 0.16)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isSearchFocused ? C.blue500 : '#64748B'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, transition: 'stroke 0.15s ease' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => {
                  setIsSearchFocused(true)
                  if (searchQuery.trim()) setSearchOpen(true)
                }}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false)
                    searchInputRef.current?.blur()
                  }
                }}
                placeholder="Search appointments, invoices..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  color: C.navy800,
                  width: '100%',
                  fontFamily: font.family,
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchOpen(false)
                    searchInputRef.current?.focus()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#94A3B8',
                    flexShrink: 0,
                  }}
                  title="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </form>

            {/* Dropdown Results */}
            {searchOpen && trimmed.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '320px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  boxShadow: '0 16px 40px rgba(9, 28, 68, 0.14)',
                  border: '1px solid #E2E8F0',
                  zIndex: 50,
                  padding: '8px',
                  fontFamily: font.family,
                  boxSizing: 'border-box',
                }}
              >
                {matchedPages.length > 0 ? (
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: C.textSub, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 10px 4px 10px' }}>
                      Provider Features
                    </div>
                    {matchedPages.map(page => (
                      <button
                        key={page.path}
                        type="button"
                        onClick={() => handleSelectResult(page.path)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontFamily: font.family,
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue500, flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: C.navy800 }}>
                            {page.label}
                          </div>
                          <div style={{ fontSize: '11px', color: C.textSub }}>
                            {page.desc}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: C.blue500, fontWeight: 700 }}>→</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px 12px', textAlign: 'center', color: C.textSub }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Press Enter to search invoices for &ldquo;{searchQuery}&rdquo;</div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '4px', paddingTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: C.blue500,
                      fontSize: '12.5px',
                      fontWeight: 700,
                      fontFamily: font.family,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.blue100)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span>Search invoices for &ldquo;{searchQuery.trim()}&rdquo;</span>
                    <span>↵</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell Icon Button */}
          <button
            type="button"
            onClick={openPanel}
            title="Notifications"
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#F8FAFC'
              e.currentTarget.style.color = C.navy800
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#FFFFFF'
              e.currentTarget.style.color = '#64748B'
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: C.error,
                  color: '#FFFFFF',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  fontFamily: font.family,
                  width: 17,
                  height: 17,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #FFFFFF',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Provider Profile Pill: Avatar + Name + Dropdown Chevron */}
          <div
            onClick={() => navigate(ROUTES.SP_SETTINGS)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '4px 6px 4px 4px',
              borderRadius: '24px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: C.navy800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(9, 28, 68, 0.2)',
              }}
            >
              {providerLogoUrl ? (
                <img src={providerLogoUrl} alt={providerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', fontFamily: font.family }}>
                  {providerInitials}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: C.navy800,
                fontFamily: font.family,
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {providerName}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      <NotificationPanel role="sp" />
    </>
  )
}
