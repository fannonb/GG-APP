import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ROUTES } from '@/router/routes'
import { GGCard, GGButton, GGBadge, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { MOCK_SP } from '@/mock/sp.mock'
import { useSPPaymentsStore } from '@/store/sp-payments.store'

const CATEGORIES = [
  { id: 'doctor',     label: 'Doctor' },
  { id: 'pharmacy',   label: 'Pharmacy' },
  { id: 'laboratory', label: 'Laboratory' },
  { id: 'radiology',  label: 'Radiology' },
  { id: 'hospital',   label: 'Hospital' },
  { id: 'clinic',     label: 'Clinic' },
]

export function SPSettingsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile } = useResponsive()

  const initialTab = (location.state as any)?.tab ?? 'profile'
  const [tab, setTab] = useState<'profile' | 'account' | 'notifications' | 'security'>(initialTab)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['clinic', 'doctor'])

  const handleToggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }
  const [saved, setSaved] = useState(false)
  const [about, setAbout] = useState(
    "City Medical Centre is a multi-disciplinary outpatient facility serving Harare since 2009. Our team of experienced GPs, nurses and allied health professionals provides evidence-based primary care for individuals and families in a clean, professional environment."
  )
  const [hours, setHours] = useState([
    { day: 'Monday – Friday', open: '08:00', close: '17:00', closed: false },
    { day: 'Saturday',        open: '08:00', close: '13:00', closed: false },
    { day: 'Sunday',          open: '',      close: '',      closed: true  },
  ])
  const [tags, setTags] = useState(['General Practice', 'Paediatrics', 'Occupational Health', 'Minor Surgery'])
  const [newTag, setNewTag] = useState('')
  const [lang, setLang] = useState(['English', 'Shona'])
  const [availableLangs, setAvailableLangs] = useState<string[]>(['English', 'Shona', 'Ndebele', 'Zulu', 'French', 'Portuguese'])
  const [newLang, setNewLang] = useState('')
  const [notifToggles, setNotifToggles] = useState({
    newAppointmentEmail: true,  newAppointmentSMS: true,
    paymentEmail: true,         paymentSMS: false,
    invoiceEmail: true,         invoiceSMS: false,
    disputeEmail: true,         disputeSMS: true,
    systemEmail: false,         systemSMS: false,
  })

  // Payment Account Store Hooks & States
  const { accounts, addAccount, removeAccount, updateAccount, setDefaultAccount } = useSPPaymentsStore()
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [formMethod, setFormMethod] = useState('Mobile Money (EcoCash)')
  const [formNumber, setFormNumber] = useState('')
  const [formName, setFormName] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)

  const TABS = [
    { id: 'profile'       as const, label: 'Public Profile' },
    { id: 'account'       as const, label: 'Account' },
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'security'      as const, label: 'Security' },
  ]

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000) }

  const toggle = (key: keyof typeof notifToggles) =>
    setNotifToggles(prev => ({ ...prev, [key]: !prev[key] }))

  const ToggleSwitch = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <div onClick={onToggle} style={{ width: 36, height: 20, borderRadius: 10, background: on ? C.success : C.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
    </div>
  )

  return (
    <SPLayout title="Settings" subtitle="Manage your provider profile and account">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {saved && (
          <div style={{ padding: '12px 18px', background: C.successBg, borderRadius: radius.sm, border: `1px solid rgba(34,201,138,0.25)`, fontSize: '14px', color: '#0D7A52', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', fontFamily: font.family }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke={C.success} strokeWidth="2" strokeLinecap="round"/></svg>
            Settings saved successfully.
          </div>
        )}

        {/* Provider identity hero */}
        <div style={{ background: 'linear-gradient(135deg, #091F40 0%, #0D3270 45%, #1059B0 80%, #1A7BD4 100%)', borderRadius: '16px', padding: isMobile ? '24px 20px' : '32px', position: 'relative', overflow: 'hidden', fontFamily: font.family }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', right: -80, top: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: -10, top: -10, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: -50, bottom: -70, width: 260, height: 260, borderRadius: '50%', background: 'rgba(74,173,223,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '40%', top: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
          {/* Shine */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 55%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '24px', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
            {/* Icon */}
            <div style={{ width: 64, height: 64, borderRadius: '16px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="7" width="22" height="18" rx="2" stroke="#fff" strokeWidth="1.6"/><path d="M9 25v-7h10v7" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/><line x1="14" y1="11" x2="14" y2="16" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/><line x1="11.5" y1="13.5" x2="16.5" y2="13.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/><path d="M3 15h22" stroke="#fff" strokeWidth="1.6"/></svg>
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', marginBottom: '4px', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>{MOCK_SP.name}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {MOCK_SP.type} ·
                <img src="https://flagcdn.com/w20/zw.png" srcSet="https://flagcdn.com/w80/zw.png 2x" alt="Zimbabwe" style={{ height: '13px', width: 'auto', borderRadius: '2px' }} />
                {MOCK_SP.country}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: '✓ Verified Provider', color: '#22C98A' },
                  { label: 'Active',               color: C.blue500 },
                ].map(b => (
                  <div key={b.label} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: b.color, fontFamily: font.family }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA button */}
            <button
              style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: font.family, cursor: 'pointer', flexShrink: 0, transition: 'all 0.14s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              View Public Profile →
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, background: '#fff', borderRadius: '12px', padding: '4px', border: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: '9px 8px', borderRadius: '9px', border: 'none', background: tab === t.id ? C.blue500 : 'transparent', color: tab === t.id ? '#fff' : C.textSub, fontSize: isMobile ? '11px' : '13px', fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.14s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Public Profile ── */}
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: '20px', alignItems: 'start' }}>
            {/* Form column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '12px 16px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.2)`, fontSize: '13px', color: '#1A5D8A', lineHeight: 1.6, fontFamily: font.family }}>
                <strong>Public Profile</strong> — Shown to patients browsing providers. Keep it accurate and professional.
              </div>

              <GGCard padding="24px">
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px', fontFamily: font.family }}>About Us</div>
                <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '12px', fontFamily: font.family }}>Short description of your facility — who you are, what you specialise in, what patients can expect.</div>
                <textarea value={about} onChange={e => setAbout(e.target.value)} rows={6} maxLength={500}
                  style={{ width: '100%', padding: '12px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>Shown on your customer-facing profile</span>
                  <span style={{ fontSize: '11px', color: about.length > 450 ? C.warning : C.textLight, fontFamily: font.family }}>{about.length} / 500</span>
                </div>
              </GGCard>

              <GGCard padding="24px">
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px', fontFamily: font.family }}>Services & Specialisations</div>
                <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '12px', fontFamily: font.family }}>Tags shown under your profile name in provider search.</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {tags.map(tag => (
                    <div key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: radius.full, background: C.blue100, border: `1px solid rgba(74,173,223,0.25)`, fontSize: '13px', color: C.blue500, fontFamily: font.family, fontWeight: 600 }}>
                      {tag}
                      <span onClick={() => setTags(prev => prev.filter(t => t !== tag))} style={{ cursor: 'pointer', color: C.textSub, fontWeight: 400, lineHeight: 1, fontSize: '16px', marginLeft: 2 }}>×</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input value={newTag} onChange={e => setNewTag(e.target.value)}
                    placeholder="Add a service or specialisation…"
                    onKeyDown={e => { if (e.key === 'Enter' && newTag.trim()) { setTags(prev => [...prev, newTag.trim()]); setNewTag('') } }}
                    style={{ flex: 1, padding: '10px 14px', fontSize: '13px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none' }} />
                  <GGButton variant="secondary" size="sm" onClick={() => { if (newTag.trim()) { setTags(prev => [...prev, newTag.trim()]); setNewTag('') } }}>Add</GGButton>
                </div>
              </GGCard>

              <GGCard padding="24px">
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px', fontFamily: font.family }}>Languages Spoken</div>
                <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '12px', fontFamily: font.family }}>Select the languages spoken at your facility, or add custom ones.</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {availableLangs.map(l => {
                    const on = lang.includes(l)
                    return (
                      <div key={l} onClick={() => setLang(prev => on ? prev.filter(x => x !== l) : [...prev, l])}
                        style={{ padding: '7px 16px', borderRadius: radius.full, border: `1.5px solid ${on ? C.blue500 : C.border}`, background: on ? C.blue100 : C.bg, color: on ? C.blue500 : C.textSub, fontSize: '13px', fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: font.family, display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.14s' }}>
                        <span>{l}</span>
                        <span onClick={(e) => {
                          e.stopPropagation()
                          setAvailableLangs(prev => prev.filter(x => x !== l))
                          setLang(prev => prev.filter(x => x !== l))
                        }} style={{ cursor: 'pointer', color: on ? C.blue500 : C.textSub, fontWeight: 400, lineHeight: 1, fontSize: '16px', marginLeft: 2, opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>×</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <input value={newLang} onChange={e => setNewLang(e.target.value)}
                    placeholder="Add a language…"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newLang.trim()) {
                        const val = newLang.trim()
                        if (!availableLangs.includes(val)) {
                          setAvailableLangs(prev => [...prev, val])
                        }
                        if (!lang.includes(val)) {
                          setLang(prev => [...prev, val])
                        }
                        setNewLang('')
                      }
                    }}
                    style={{ flex: 1, padding: '10px 14px', fontSize: '13px', fontFamily: font.family, color: C.text, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none' }} />
                  <GGButton variant="secondary" size="sm" onClick={() => {
                    if (newLang.trim()) {
                      const val = newLang.trim()
                      if (!availableLangs.includes(val)) {
                        setAvailableLangs(prev => [...prev, val])
                      }
                      if (!lang.includes(val)) {
                        setLang(prev => [...prev, val])
                      }
                      setNewLang('')
                    }
                  }}>Add</GGButton>
                </div>
              </GGCard>

              <GGCard padding="24px">
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '14px', fontFamily: font.family }}>Operating Hours</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {hours.map((h, i) => (
                    <div key={h.day} style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px', padding: '10px 12px', borderRadius: radius.sm, background: h.closed ? C.bg : C.successBg, border: `1px solid ${h.closed ? C.border : 'rgba(34,201,138,0.2)'}`, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                      <div style={{ width: isMobile ? '100%' : 140, fontSize: '13px', color: C.text, fontWeight: 600, fontFamily: font.family, flexShrink: 0 }}>{h.day}</div>
                      {h.closed ? (
                        <div style={{ flex: 1, fontSize: '13px', color: C.textSub, fontFamily: font.family }}>Closed</div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
                          <input type="time" value={h.open}
                            onChange={e => setHours(prev => prev.map((r, j) => j === i ? { ...r, open: e.target.value } : r))}
                            style={{ padding: '6px 10px', fontSize: '13px', fontFamily: font.family, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', color: C.text, background: '#fff', minWidth: 0 }} />
                          <span style={{ color: C.textSub }}>–</span>
                          <input type="time" value={h.close}
                            onChange={e => setHours(prev => prev.map((r, j) => j === i ? { ...r, close: e.target.value } : r))}
                            style={{ padding: '6px 10px', fontSize: '13px', fontFamily: font.family, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', color: C.text, background: '#fff', minWidth: 0 }} />
                        </div>
                      )}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
                        <input type="checkbox" checked={h.closed}
                          onChange={e => setHours(prev => prev.map((r, j) => j === i ? { ...r, closed: e.target.checked } : r))}
                          style={{ accentColor: C.textSub }} />
                        <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>Closed</span>
                      </label>
                    </div>
                  ))}
                </div>
              </GGCard>

              {/* Save bar */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <GGButton variant="secondary" size="md">Discard Changes</GGButton>
                <GGButton variant="primary" size="md" onClick={handleSave}>Save Public Profile</GGButton>
              </div>
            </div>

            {/* Live preview card — sticky */}
            {!isMobile && (
              <div style={{ position: 'sticky', top: 24 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: font.family }}>Patient View Preview</div>
                <GGCard padding="24px">
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '14px', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="16" rx="2" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"/><path d="M8 22v-6h8v6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinejoin="round"/><line x1="12" y1="10" x2="12" y2="14" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/><line x1="10" y1="12" x2="14" y2="12" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/><path d="M2 13h20" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '2px', fontFamily: font.family }}>{MOCK_SP.name}</div>
                      <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '6px', fontFamily: font.family }}>{MOCK_SP.type}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {tags.slice(0, 3).map(tag => (
                          <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: radius.full, background: C.blue100, color: C.blue500, fontWeight: 600, fontFamily: font.family }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6, marginBottom: '16px', fontFamily: font.family, borderTop: `1px solid ${C.border}`, paddingTop: '14px' }}>
                    {about.slice(0, 160)}{about.length > 160 ? '…' : ''}
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: C.text, marginBottom: '8px', fontFamily: font.family }}>Operating Hours</div>
                    {hours.map(h => (
                      <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', color: C.textSub, fontFamily: font.family }}>
                        <span>{h.day}</span>
                        <span style={{ color: h.closed ? C.error : C.success, fontWeight: 600 }}>
                          {h.closed ? 'Closed' : `${h.open} – ${h.close}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {lang.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: C.text, marginBottom: '6px', fontFamily: font.family }}>Languages</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {lang.map(l => <span key={l} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: radius.full, background: C.bg, color: C.textSub, border: `1px solid ${C.border}`, fontFamily: font.family }}>{l}</span>)}
                      </div>
                    </div>
                  )}
                </GGCard>
              </div>
            )}
          </div>
        )}

        {/* ── Account ── */}
        {tab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GGCard padding="28px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '20px', fontFamily: font.family }}>Facility Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <GGInput label="Facility / Practice Name" value={MOCK_SP.name} />
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family, display: 'block', marginBottom: '8px' }}>
                    Service Categories
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {CATEGORIES.map(cat => {
                      const selected = selectedCategories.includes(cat.id)
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleToggleCategory(cat.id)}
                          type="button"
                          style={{
                            padding: '5px 12px',
                            borderRadius: radius.full,
                            border: `1.5px solid ${selected ? C.blue500 : C.border}`,
                            background: selected ? C.blue100 : '#fff',
                            color: selected ? C.blue500 : C.textSub,
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: font.family,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {selected ? '✓ ' : '+ '}
                          {cat.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <GGInput label="Email Address" type="email" value={MOCK_SP.email} />
                <GGInput label="Phone Number"  type="tel"   value={MOCK_SP.phone} />
                <div>
                  <GGInput label="Medical / Practice Licence" value={MOCK_SP.license} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <GGBadge type="success">✓ Verified</GGBadge>
                    <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>Licence verified by GG'APP</span>
                  </div>
                </div>
                <div>
                  <GGInput label="Country" value={MOCK_SP.country} disabled />
                  <div style={{ fontSize: '11px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>Country cannot be changed</div>
                </div>
              </div>
              <div style={{ marginTop: '16px', padding: '12px 16px', background: C.warningBg, borderRadius: radius.sm, border: `1px solid rgba(245,166,35,0.2)`, fontSize: '12px', color: '#8A4D00', lineHeight: 1.6, fontFamily: font.family }}>
                <strong>Note:</strong> Changes to your licence or facility name require re-verification by GG'APP admin and may temporarily restrict your account.
              </div>
              <div style={{ marginTop: '20px' }}>
                <GGButton variant="primary" size="md" onClick={handleSave}>Save Account Details</GGButton>
              </div>
            </GGCard>

            <GGCard padding="28px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Payment Accounts</div>
                  <div style={{ fontSize: '13px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>How you receive payouts from GG'APP. Add, edit, or remove accounts.</div>
                </div>
                {!isAddingAccount && !editingAccount && (
                  <GGButton variant="primary" size="sm" onClick={() => {
                    setIsAddingAccount(true)
                    setFormMethod('Mobile Money (EcoCash)')
                    setFormNumber('')
                    setFormName('')
                    setFormIsDefault(accounts.length === 0)
                  }}>+ Add Account</GGButton>
                )}
              </div>

              {/* Accounts list */}
              {!isAddingAccount && !editingAccount && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                  {accounts.map(acc => (
                    <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.bg, border: `1.5px solid ${acc.isDefault ? C.blue500 : C.border}`, borderRadius: radius.sm, gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{acc.method}</span>
                          {acc.isDefault && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', background: C.blue500, padding: '2px 8px', borderRadius: radius.full, textTransform: 'uppercase' }}>Default</span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px' }}>
                          Account: <strong>{acc.number}</strong> · Name: <strong>{acc.name}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!acc.isDefault && (
                          <GGButton variant="ghost" size="sm" onClick={() => setDefaultAccount(acc.id)}>Set Default</GGButton>
                        )}
                        <GGButton variant="secondary" size="sm" onClick={() => {
                          setEditingAccount(acc)
                          setFormMethod(acc.method)
                          setFormNumber(acc.number)
                          setFormName(acc.name)
                          setFormIsDefault(acc.isDefault)
                        }}>Edit</GGButton>
                        <GGButton variant="danger" size="sm" disabled={acc.isDefault && accounts.length > 1} onClick={() => removeAccount(acc.id)}>Remove</GGButton>
                      </div>
                    </div>
                  ))}
                  {accounts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0', border: `1.5px dashed ${C.border}`, borderRadius: radius.sm, color: C.textSub, fontSize: '13px' }}>
                      No payment accounts configured. Please add one.
                    </div>
                  )}
                </div>
              )}

              {/* Add / Edit Form */}
              {(isAddingAccount || editingAccount) && (
                <div style={{ border: `1px solid ${C.border}`, padding: '20px', borderRadius: radius.sm, background: C.bg }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '14px' }}>
                    {isAddingAccount ? 'Add New Payment Account' : 'Edit Payment Account'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>Payment Method</label>
                      <select value={formMethod} onChange={e => setFormMethod(e.target.value)}
                        style={{ padding: '10px 14px', fontSize: '13px', fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none' }}>
                        <option>Mobile Money (EcoCash)</option>
                        <option>Bank Transfer</option>
                        <option>M-Pesa Paybill</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>Paybill / Account Number</label>
                      <input value={formNumber} onChange={e => setFormNumber(e.target.value)} placeholder="e.g. 0771234567"
                        style={{ padding: '10px 14px', fontSize: '13px', fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>Account Name</label>
                      <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="As registered with provider"
                        style={{ padding: '10px 14px', fontSize: '13px', fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: isMobile ? '0' : '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={formIsDefault} disabled={editingAccount?.isDefault} onChange={e => setFormIsDefault(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: C.blue500 }} />
                        <span style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>Set as Default Account</span>
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <GGButton variant="secondary" size="sm" onClick={() => {
                      setIsAddingAccount(false)
                      setEditingAccount(null)
                    }}>Cancel</GGButton>
                    <GGButton variant="primary" size="sm" disabled={!formNumber.trim() || !formName.trim()} onClick={() => {
                      if (isAddingAccount) {
                        addAccount({
                          method: formMethod,
                          number: formNumber.trim(),
                          name: formName.trim(),
                          country: 'Zimbabwe',
                          isDefault: formIsDefault
                        })
                      } else if (editingAccount) {
                        updateAccount(editingAccount.id, {
                          method: formMethod,
                          number: formNumber.trim(),
                          name: formName.trim(),
                          isDefault: formIsDefault
                        })
                      }
                      setIsAddingAccount(false)
                      setEditingAccount(null)
                    }}>
                      Save Account
                    </GGButton>
                  </div>
                </div>
              )}
            </GGCard>
          </div>
        )}

        {/* ── Notifications ── */}
        {tab === 'notifications' && (
          <GGCard padding="28px">
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px', fontFamily: font.family }}>Notification Preferences</div>
            <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '20px', fontFamily: font.family }}>Choose how you are notified for each type of event.</div>

            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '10px', paddingBottom: '10px', borderBottom: `1px solid ${C.border}`, marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: font.family }}>Event</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', fontFamily: font.family }}>Email</div>
            </div>

            {[
              { label: 'New Appointment Request', emailKey: 'newAppointmentEmail' as const, desc: 'Patient submits a new booking request' },
              { label: 'Payment Received',        emailKey: 'paymentEmail' as const,        desc: 'GG\'APP confirms payment to your account' },
              { label: 'Invoice Status Update',   emailKey: 'invoiceEmail' as const,        desc: 'Invoice approved, rejected or returned' },
              { label: 'Dispute Raised',          emailKey: 'disputeEmail' as const,        desc: 'Patient disputes an invoice' },
              { label: 'System Updates',          emailKey: 'systemEmail' as const,         desc: 'Platform announcements and maintenance' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '10px', padding: '14px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, fontFamily: font.family }}>{row.label}</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>{row.desc}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ToggleSwitch on={notifToggles[row.emailKey]} onToggle={() => toggle(row.emailKey)} />
                </div>
              </div>
            ))}

            <div style={{ marginTop: '20px', padding: '12px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '12px', color: C.textSub, lineHeight: 1.6, fontFamily: font.family }}>
              Emails go to <strong style={{ color: C.text }}>{MOCK_SP.email}</strong>
            </div>
          </GGCard>
        )}

        {/* ── Security ── */}
        {tab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 2FA with amber badge */}
            <GGCard padding="28px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '4px', fontFamily: font.family }}>Two-Factor Authentication</div>
                  <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5, fontFamily: font.family }}>Add an extra layer of security via SMS or email OTP. Strongly recommended for provider accounts.</div>
                </div>
                <GGBadge type="warning">Not Enabled</GGBadge>
              </div>
              <GGButton variant="primary" size="sm">Enable 2FA</GGButton>
            </GGCard>

            {/* Password change — 2-column */}
            <GGCard padding="28px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px', fontFamily: font.family }}>Change Password</div>
              <div style={{ marginBottom: '14px' }}>
                <GGInput label="Current Password" type="password" placeholder="••••••••" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <GGInput label="New Password"         type="password" placeholder="Minimum 8 characters" />
                <GGInput label="Confirm New Password" type="password" placeholder="Repeat new password" />
              </div>
              <GGButton variant="primary" size="md" style={{ alignSelf: 'flex-start' }} onClick={handleSave}>Update Password</GGButton>
            </GGCard>

            {/* Active sessions as styled cards */}
            <GGCard padding="28px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '4px', fontFamily: font.family }}>Active Sessions</div>
              <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '16px', fontFamily: font.family }}>Devices currently signed in to your provider portal.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { device: 'Chrome · Windows 11', location: 'Harare, ZW', active: true,  time: 'Active now',  mobile: false },
                  { device: 'Safari · iPhone 15',  location: 'Harare, ZW', active: false, time: '2 days ago', mobile: true  },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: radius.sm, background: s.active ? C.successBg : C.bg, border: `1px solid ${s.active ? 'rgba(34,201,138,0.2)' : C.border}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#fff', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.mobile
                        ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="1" width="10" height="16" rx="2" stroke={s.active ? C.success : C.textSub} strokeWidth="1.3"/><circle cx="9" cy="14" r="1" fill={s.active ? C.success : C.textSub}/></svg>
                        : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="3" width="16" height="11" rx="2" stroke={s.active ? C.success : C.textSub} strokeWidth="1.3"/><path d="M6 14h6M9 14v2" stroke={s.active ? C.success : C.textSub} strokeWidth="1.3" strokeLinecap="round"/></svg>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>{s.device}</div>
                      <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{s.location} · {s.time}</div>
                    </div>
                    {s.active  ? <GGBadge type="success">Current</GGBadge>
                               : <GGButton variant="danger" size="sm">Revoke</GGButton>}
                  </div>
                ))}
              </div>
            </GGCard>
          </div>
        )}

        {/* Sign Out Card (Mobile only) */}
        {isMobile && (
          <GGCard padding="20px" style={{ background: '#fff', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Sign Out</div>
              <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>Sign out of your service provider account</div>
            </div>
            <GGButton variant="danger" size="sm" onClick={() => navigate(ROUTES.LOGIN)}>Sign Out</GGButton>
          </GGCard>
        )}
      </div>
    </SPLayout>
  )
}
