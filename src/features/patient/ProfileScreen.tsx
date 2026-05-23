import { useState } from 'react'
import { GGCard, GGButton, GGInput, GGBadge, GGAvatar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { MOCK_USER, MOCK_BENEFICIARIES } from '@/mock/patient.mock'
import type { Beneficiary } from '@/types/user.types'

const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']

const TABS = [
  { id: 'profile',       label: 'Personal Info' },
  { id: 'beneficiaries', label: 'Beneficiaries' },
  { id: 'security',      label: 'Security & PIN' },
]

const stats = [
  { label: 'Member Since', val: 'Aug 2025' },
  { label: 'Total Spent',  val: 'Z$1,330.50' },
  { label: 'Transactions', val: '5' },
  { label: 'Providers Used', val: '4' },
]

export function ProfileScreen() {
  const { isMobile } = useResponsive()
  const u = MOCK_USER

  const [tab, setTab] = useState('profile')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: u.name, email: u.email, phone: u.phone })
  const [saved, setSaved] = useState(false)
  const setF = <K extends keyof typeof form>(k: K, v: string) => setForm(f => ({ ...f, [k]: v }))

  const [bens, setBens] = useState<Beneficiary[]>(MOCK_BENEFICIARIES)
  const [showAddBen, setShowAddBen] = useState(false)
  const [editingBen, setEditingBen] = useState<Beneficiary | null>(null)
  const [benForm, setBenForm] = useState({ name: '', relation: '', dob: '', nationalId: '' })
  const setBen = <K extends keyof typeof benForm>(k: K, v: string) => setBenForm(f => ({ ...f, [k]: v }))
  const [deletingBen, setDeletingBen] = useState<Beneficiary | null>(null)

  const handleSave = () => { setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000) }

  const handleAddBen = () => {
    if (!benForm.name || !benForm.relation) return
    const newBen: Beneficiary = { id: 'BEN-' + Date.now(), name: benForm.name, relation: benForm.relation, dob: benForm.dob, nationalId: benForm.nationalId, age: benForm.dob ? Math.floor((Date.now() - new Date(benForm.dob).getTime()) / 31557600000) : 0 }
    setBens(prev => editingBen ? prev.map(b => b.id === editingBen.id ? { ...b, ...newBen, id: b.id } : b) : [...prev, newBen])
    setBenForm({ name: '', relation: '', dob: '', nationalId: '' })
    setShowAddBen(false)
    setEditingBen(null)
  }

  return (
    <AppLayout title="My Profile" subtitle="Manage your account" notifCount={1}>
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {saved && (
          <div style={{ padding: '12px 18px', background: C.successBg, borderRadius: radius.sm, border: `1px solid rgba(34,201,138,0.25)`, fontSize: '14px', color: '#0D7A52', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke={C.success} strokeWidth="2" strokeLinecap="round"/></svg>
            Profile updated successfully.
          </div>
        )}

        {/* Profile hero — vibrant gradient */}
        <div style={{ background: 'linear-gradient(135deg, #091F40 0%, #0D3270 45%, #1059B0 80%, #1A7BD4 100%)', borderRadius: '16px', padding: isMobile ? '24px 20px' : '32px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', right: -80, top: -80, width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: -20, top: -20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: -40, bottom: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(74,173,223,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '40%', top: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
          {/* Shine strip */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '24px', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: font.family }}>{u.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: '50%', background: '#22C98A', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(34,201,138,0.5)', cursor: 'pointer' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 7l2-2 1.5 1.5L8 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', marginBottom: '4px', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>{u.name}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: font.family }}>
                <img src="https://flagcdn.com/w20/zw.png" srcSet="https://flagcdn.com/w40/zw.png 2x" alt="Zimbabwe" style={{ height: '13px', width: 'auto', borderRadius: '2px' }} />
                {u.nationalId} · {u.country}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2px' }}>
                {/* Frosted-glass badges */}
                {[
                  { label: 'Verified Patient', color: '#22C98A' },
                  { label: 'Credit Active',    color: C.blue500 },
                  { label: `${bens.length} Beneficiar${bens.length === 1 ? 'y' : 'ies'}`, color: 'rgba(255,255,255,0.7)' },
                ].map(b => (
                  <div key={b.label} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.12)', border: `1px solid rgba(255,255,255,0.2)`, backdropFilter: 'blur(4px)', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: b.color, fontFamily: font.family, whiteSpace: 'nowrap' }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setTab('profile')}
              style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: font.family, cursor: 'pointer', flexShrink: 0, transition: 'all 0.14s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Stat tiles row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '12px' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '16px 12px', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '4px' }}>{s.val}</div>
              <div style={{ fontSize: '11px', color: C.textSub }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0', background: '#fff', borderRadius: '12px', padding: '4px', border: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: '9px 10px', borderRadius: '9px', border: 'none', background: tab === t.id ? C.blue500 : 'transparent', color: tab === t.id ? '#fff' : C.textSub, fontSize: '13px', fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.14s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Personal Info */}
        {tab === 'profile' && (
          <GGCard padding="28px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Personal Details</div>
              {!editing
                ? <GGButton variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</GGButton>
                : <div style={{ display: 'flex', gap: '8px' }}>
                    <GGButton variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</GGButton>
                    <GGButton variant="primary" size="sm" onClick={handleSave}>Save Changes</GGButton>
                  </div>}
            </div>
            {editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <GGInput label="Full Name"      value={form.name}  onChange={e => setF('name', e.target.value)}  required />
                <GGInput label="Email Address"  type="email" value={form.email} onChange={e => setF('email', e.target.value)} required />
                <GGInput label="Phone Number"   type="tel"   value={form.phone} onChange={e => setF('phone', e.target.value)} required />
                <div>
                  <GGInput label="Country" value={u.country} disabled />
                  <div style={{ fontSize: '11px', color: C.textSub, marginTop: '4px' }}>Country cannot be changed</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { label: 'Full Name',     val: u.name },
                  { label: 'Email Address', val: u.email },
                  { label: 'Phone Number',  val: u.phone },
                  { label: 'Country',       val: u.country },
                  { label: 'National ID',   val: u.nationalId },
                  { label: 'Member Since',  val: 'August 2025' },
                ].map((f, i) => (
                  <div key={f.label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', padding: '13px 0', borderBottom: i < 5 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSub }}>{f.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{f.val}</div>
                  </div>
                ))}
              </div>
            )}
          </GGCard>
        )}

        {/* Beneficiaries */}
        {tab === 'beneficiaries' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Registered Beneficiaries</div>
                <div style={{ fontSize: '13px', color: C.textSub, marginTop: '2px' }}>Manage the people you can book appointments and pay for.</div>
              </div>
              <GGButton variant="primary" size="sm" onClick={() => { setBenForm({ name: '', relation: '', dob: '', nationalId: '' }); setEditingBen(null); setShowAddBen(true) }}>+ Add Beneficiary</GGButton>
            </div>

            <div style={{ padding: '12px 16px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.2)`, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6 }}>
              Beneficiaries are funded from your credit account. All appointments and invoices remain tied to your account.
            </div>

            {showAddBen && (
              <GGCard padding="24px" style={{ border: `2px solid ${C.blue500}`, background: C.blue100 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>{editingBen ? 'Edit Beneficiary' : 'New Beneficiary'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <GGInput label="Full Name" placeholder="e.g. David Johnson" value={benForm.name} onChange={e => setBen('name', e.target.value)} required />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Relationship <span style={{ color: C.error }}>*</span></label>
                    <select value={benForm.relation} onChange={e => setBen('relation', e.target.value)}
                      style={{ padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: benForm.relation ? C.text : C.textSub, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', appearance: 'none' }}>
                      <option value="">Select relation</option>
                      {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <GGInput label="Date of Birth" type="date" value={benForm.dob} onChange={e => setBen('dob', e.target.value)} />
                  <GGInput label="National ID" placeholder="ZW-XXXXXXXX-X" value={benForm.nationalId} onChange={e => setBen('nationalId', e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <GGButton variant="secondary" size="sm" onClick={() => { setShowAddBen(false); setEditingBen(null) }}>Cancel</GGButton>
                  <GGButton variant="primary" size="sm" onClick={handleAddBen} disabled={!benForm.name || !benForm.relation}>{editingBen ? 'Save Changes' : 'Add Beneficiary'}</GGButton>
                </div>
              </GGCard>
            )}

            {deletingBen && (
              <GGCard padding="20px" style={{ border: `2px solid ${C.error}`, background: C.errorBg }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.error, marginBottom: '8px' }}>Remove {deletingBen.name}?</div>
                <div style={{ fontSize: '13px', color: C.text, marginBottom: '16px' }}>This beneficiary will be removed from your account. Past appointments and invoices won't be affected.</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <GGButton variant="secondary" size="sm" onClick={() => setDeletingBen(null)}>Cancel</GGButton>
                  <GGButton variant="danger" size="sm" onClick={() => { setBens(prev => prev.filter(b => b.id !== deletingBen.id)); setDeletingBen(null) }}>Remove</GGButton>
                </div>
              </GGCard>
            )}

            {bens.length === 0 && (
              <GGCard padding="48px" style={{ textAlign: 'center', border: `2px dashed ${C.border}` }}>
                <div style={{ margin: '0 auto 16px', width: 56, height: 56, borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="10" cy="9" r="4" stroke={C.textSub} strokeWidth="1.5"/><path d="M2 22c0-4 3.6-7 8-7" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round"/><circle cx="19" cy="11" r="4" stroke={C.blue500} strokeWidth="1.5"/><path d="M11 26c0-4 3.6-7 8-7s8 3 8 7" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>No beneficiaries yet</div>
                <div style={{ fontSize: '13px', color: C.textSub }}>Add family members so you can book and pay for their healthcare.</div>
              </GGCard>
            )}

            {bens.map(ben => (
              <GGCard key={ben.id} padding="20px">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <GGAvatar name={ben.name} size={48} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{ben.name}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <GGBadge type="info">{ben.relation}</GGBadge>
                      {ben.age > 0 && <span style={{ fontSize: '12px', color: C.textSub }}>Age {ben.age}</span>}
                      {ben.nationalId && <span style={{ fontSize: '12px', color: C.textSub }}>{ben.nationalId}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <GGButton variant="secondary" size="sm" onClick={() => { setEditingBen(ben); setBenForm({ name: ben.name, relation: ben.relation, dob: ben.dob ?? '', nationalId: ben.nationalId ?? '' }); setShowAddBen(true) }}>Edit</GGButton>
                    <GGButton variant="danger" size="sm" onClick={() => setDeletingBen(ben)}>Remove</GGButton>
                  </div>
                </div>
              </GGCard>
            ))}
          </div>
        )}

        {/* Security & PIN */}
        {tab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Triple-PIN status cards */}
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Triple-PIN Authorization</div>
              <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '16px', lineHeight: 1.5 }}>
                Your 3 PINs are used in sequence to authorize every payment. All three must be set before you can pay any invoice.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'PIN 1', set: true },
                  { label: 'PIN 2', set: true },
                  { label: 'PIN 3', set: false },
                ].map(pin => (
                  <div key={pin.label} style={{ padding: '16px', borderRadius: radius.sm, background: pin.set ? C.successBg : C.warningBg, border: `1px solid ${pin.set ? 'rgba(34,201,138,0.25)' : 'rgba(245,166,35,0.3)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{pin.label}</span>
                      <GGBadge type={pin.set ? 'success' : 'warning'}>{pin.set ? '✓ Set' : '⚠ Not Set'}</GGBadge>
                    </div>
                    <GGButton variant={pin.set ? 'secondary' : 'warning'} size="sm" fullWidth
                      style={pin.set ? {} : { background: C.warning, color: '#fff' }}>
                      {pin.set ? `Reset ${pin.label}` : `Set ${pin.label}`}
                    </GGButton>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '12px', color: C.textSub, lineHeight: 1.6 }}>
                <strong style={{ color: C.text }}>How it works:</strong> When authorizing a payment, you'll be prompted to enter each PIN in sequence — first PIN 1, then PIN 2, then PIN 3. Each PIN must match exactly.
              </div>
            </GGCard>

            {/* 2FA */}
            <GGCard padding="24px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>Two-Factor Authentication</div>
                  <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5 }}>Add an extra layer of security to your account via SMS or email.</div>
                </div>
                <GGBadge type="warning">Not Enabled</GGBadge>
              </div>
              <div style={{ marginTop: '14px' }}>
                <GGButton variant="primary" size="sm">Enable 2FA</GGButton>
              </div>
            </GGCard>

            {/* Password change — 2-column */}
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Change Password</div>
              <div style={{ marginBottom: '14px' }}>
                <GGInput label="Current Password" type="password" placeholder="••••••••" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <GGInput label="New Password"         type="password" placeholder="Minimum 8 characters" />
                <GGInput label="Confirm New Password" type="password" placeholder="Repeat new password" />
              </div>
              <GGButton variant="primary" size="md" style={{ alignSelf: 'flex-start' }}>Update Password</GGButton>
            </GGCard>

          </div>
        )}
      </div>
    </AppLayout>
  )
}
