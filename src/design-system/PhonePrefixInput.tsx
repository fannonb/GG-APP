import { useState, useRef, useEffect, useMemo, type ChangeEvent } from 'react'
import { C, font, radius } from './tokens'
import { FlagImg } from '@/components/FlagImg'
import {
  COUNTRIES,
  WORLD_COUNTRIES,
  getCountryDial,
  getCountryPhonePlaceholder,
} from '@/config/countries'

export interface PhonePrefixInputProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  countryCode: string
  onCountryChange?: (code: string) => void
  digits: string
  onDigitsChange: (digits: string) => void
  disabled?: boolean
  name?: string
  placeholder?: string
  id?: string
  allowCountrySelect?: boolean
  dropdownPlacement?: 'top' | 'bottom' | 'auto'
}

export function PhonePrefixInput({
  label,
  required = false,
  error,
  hint,
  countryCode,
  onCountryChange,
  digits,
  onDigitsChange,
  disabled = false,
  name,
  placeholder,
  id,
  allowCountrySelect = true,
  dropdownPlacement = 'auto',
}: PhonePrefixInputProps) {
  const [focused, setFocused] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [openUpwards, setOpenUpwards] = useState(dropdownPlacement === 'top')
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeDial = getCountryDial(countryCode)
  const defaultPlaceholder = getCountryPhonePlaceholder(countryCode)

  useEffect(() => {
    if (!dropdownOpen) return

    if (dropdownPlacement === 'top') {
      setOpenUpwards(true)
    } else if (dropdownPlacement === 'bottom') {
      setOpenUpwards(false)
    } else if (triggerButtonRef.current) {
      const rect = triggerButtonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setOpenUpwards(spaceBelow < 290 || spaceAbove > spaceBelow)
    }

    function isScrollbarClick(e: MouseEvent): boolean {
      // Main browser/window scrollbar click
      if (e.clientX >= document.documentElement.clientWidth) return true
      // Any scrollable element scrollbar click on the page
      const target = e.target as HTMLElement | null
      if (target && target.scrollHeight > target.clientHeight) {
        const rect = target.getBoundingClientRect()
        if (e.clientX >= rect.right - 24) return true
      }
      return false
    }

    function onOutside(e: MouseEvent) {
      if (isScrollbarClick(e)) return
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [dropdownOpen, dropdownPlacement])

  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [dropdownOpen])

  const handleDigitsChange = (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    const dialDigits = activeDial.replace(/\D/g, '')
    if (val.startsWith(dialDigits) && val.length > dialDigits.length) {
      val = val.slice(dialDigits.length)
    }
    // Strip leading zero(s) since international dialing prefix is displayed
    val = val.replace(/^0+/, '')
    onDigitsChange(val)
  }

  const filteredOperating = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    )
  }, [search])

  const filteredWorld = useMemo(() => {
    const q = search.trim().toLowerCase()
    const nonOperating = WORLD_COUNTRIES.filter(
      w => w.code !== 'KE' && w.code !== 'ZW' && w.code !== 'ZM',
    )
    if (!q) return nonOperating
    return nonOperating.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    )
  }, [search])

  const handleSelectCountry = (code: string) => {
    onCountryChange?.(code)
    setDropdownOpen(false)
    setSearch('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} ref={dropdownRef}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: C.text,
            letterSpacing: '-0.01em',
            fontFamily: font.family,
          }}
        >
          {label}
          {required && <span style={{ color: C.error }}> *</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            border: `1.5px solid ${error ? C.error : focused ? C.blue500 : C.border}`,
            borderRadius: radius.sm,
            background: focused ? '#fff' : C.bg,
            boxShadow: focused
              ? `0 0 0 3px ${error ? 'rgba(229,71,77,0.1)' : 'rgba(74,173,223,0.12)'}`
              : 'none',
            transition: 'all 0.15s ease',
            opacity: disabled ? 0.6 : 1,
            overflow: 'hidden',
          }}
        >
          {/* Prefix Badge & Country Trigger */}
          <button
            ref={triggerButtonRef}
            type="button"
            disabled={disabled || !allowCountrySelect}
            onClick={() => setDropdownOpen(o => !o)}
            title="Country calling code"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: dropdownOpen ? 'rgba(74, 173, 223, 0.08)' : 'rgba(240, 244, 248, 0.5)',
              border: 'none',
              borderRight: `1.5px solid ${C.border}`,
              borderRadius: `${radius.sm} 0 0 ${radius.sm}`,
              cursor: disabled || !allowCountrySelect ? 'default' : 'pointer',
              outline: 'none',
              flexShrink: 0,
              userSelect: 'none',
              transition: 'background 0.15s ease',
            }}
          >
            <FlagImg code={countryCode || 'ZW'} size={20} />
            <span
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: C.text,
                fontFamily: font.family,
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}
            >
              {activeDial}
            </span>
            {allowCountrySelect && !disabled && (
              <svg
                width="9"
                height="6"
                viewBox="0 0 10 6"
                fill="none"
                style={{
                  flexShrink: 0,
                  transition: 'transform 0.15s ease',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                  marginLeft: '2px',
                }}
              >
                <path
                  d="M1 1l4 4 4-4"
                  stroke={C.textSub}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          {/* Local Phone Digits Input */}
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="tel"
            inputMode="numeric"
            value={digits}
            placeholder={placeholder ?? defaultPlaceholder}
            onChange={handleDigitsChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '10px 14px',
              fontSize: '14px',
              fontFamily: font.family,
              fontWeight: 500,
              color: C.text,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Country Selector Dropdown Menu */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: openUpwards ? 'calc(100% + 6px)' : undefined,
              top: openUpwards ? undefined : 'calc(100% + 6px)',
              left: 0,
              width: '300px',
              maxWidth: '92vw',
              maxHeight: '280px',
              background: '#fff',
              border: `1.5px solid ${C.border}`,
              borderRadius: radius.sm,
              boxShadow: openUpwards
                ? '0 -12px 32px rgba(9, 28, 68, 0.18)'
                : '0 12px 32px rgba(9, 28, 68, 0.18)',
              zIndex: 500,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Search Filter */}
            <div style={{ padding: '8px', borderBottom: `1px solid ${C.border}`, background: '#FAFBFD' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country or code…"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '12.5px',
                  fontFamily: font.family,
                  color: C.text,
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  borderRadius: radius.xs,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
              {filteredOperating.length > 0 && (
                <>
                  <div
                    style={{
                      padding: '6px 12px 3px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: C.textLight,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Operating Markets
                  </div>
                  {filteredOperating.map(c => {
                    const isSelected = (countryCode || '').toUpperCase() === c.code
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c.code)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '7px 12px',
                          background: isSelected ? 'rgba(74, 173, 223, 0.12)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: font.family,
                          textAlign: 'left',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <FlagImg code={c.code} size={20} />
                        <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: C.text, flex: 1 }}>
                          {c.name}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: C.blue500 }}>
                          {c.dial}
                        </span>
                      </button>
                    )
                  })}
                </>
              )}

              {filteredWorld.length > 0 && (
                <>
                  <div
                    style={{
                      padding: '8px 12px 3px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: C.textLight,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      borderTop: filteredOperating.length > 0 ? `1px solid ${C.border}` : 'none',
                      marginTop: filteredOperating.length > 0 ? '4px' : 0,
                    }}
                  >
                    Other Countries
                  </div>
                  {filteredWorld.map(w => {
                    const isSelected = (countryCode || '').toUpperCase() === w.code
                    return (
                      <button
                        key={w.code}
                        type="button"
                        onClick={() => handleSelectCountry(w.code)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '7px 12px',
                          background: isSelected ? 'rgba(74, 173, 223, 0.12)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: font.family,
                          textAlign: 'left',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <FlagImg code={w.code} size={20} />
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: isSelected ? 700 : 400,
                            color: C.text,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {w.name}
                        </span>
                        <span style={{ fontSize: '12px', color: C.textSub }}>
                          {w.dial}
                        </span>
                      </button>
                    )
                  })}
                </>
              )}

              {filteredOperating.length === 0 && filteredWorld.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: C.textSub }}>
                  No countries found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, fontFamily: font.family }}>
          {error}
        </span>
      ) : hint ? (
        <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>
          {hint}
        </span>
      ) : (
        <span style={{ fontSize: '11px', color: C.textSub, lineHeight: 1.4, fontFamily: font.family }}>
          Dialing code <strong style={{ color: C.text }}>{activeDial}</strong> is applied automatically. Fill in the remaining digits.
        </span>
      )}
    </div>
  )
}
