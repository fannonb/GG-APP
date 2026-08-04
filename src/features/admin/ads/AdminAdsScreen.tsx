import { useRef, useState } from 'react'
// useRef is used inside ImageUploadSlot
import type { CSSProperties } from 'react'
import { GGCard, GGButton, GGDatePicker } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdsStore } from '@/store/ads.store'
import { generateRef } from '@/utils/refgen'
import type { AdBanner, AdBannerStatus, AdFrequency } from '@/types/admin.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
}

function ctr(impressions: number, clicks: number): string {
  if (!impressions) return '—'
  return `${((clicks / impressions) * 100).toFixed(1)}%`
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<AdBannerStatus, { bg: string; color: string; dot: string; label: string }> = {
  draft:     { bg: C.bg,      color: C.textSub, dot: C.textLight, label: 'Draft'     },
  scheduled: { bg: C.blue100, color: C.navy800, dot: C.blue500,   label: 'Scheduled' },
  active:    { bg: C.blue100, color: C.navy800, dot: C.blue500,   label: 'Active'    },
  paused:    { bg: C.bg,      color: C.textSub, dot: C.textSub,   label: 'Paused'    },
  expired:   { bg: C.errorBg, color: C.error,   dot: C.error,     label: 'Expired'   },
}

function StatusBadge({ status }: { status: AdBannerStatus }) {
  const s = STATUS_MAP[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: radius.full, background: s.bg, border: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: s.color, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

// ─── Shared form atoms ───────────────────────────────────────────────────────

const INPUT: CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  fontFamily: font.family, color: C.text,
  background: C.bg, border: `1.5px solid ${C.border}`,
  borderRadius: radius.sm, outline: 'none', boxSizing: 'border-box',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  )
}

// ─── Image upload slot ────────────────────────────────────────────────────────

interface UploadSlotProps {
  label: string
  dimHint: string   // e.g. "1200 × 90 px"
  previewHeight: number
  imageUrl: string
  onUpload: (dataUrl: string) => void
}

function ImageUploadSlot({ label, dimHint, previewHeight, imageUrl, onUpload }: UploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = (file: File) => {
    setLoading(true)
    const reader = new FileReader()
    reader.onload = e => {
      const result = e.target?.result
      if (typeof result === 'string') onUpload(result)
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Label>{label}</Label>
        <span style={{ fontSize: 10, color: C.textLight, fontFamily: font.family }}>{dimHint} · PNG / JPG / WebP</span>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%', height: previewHeight,
          borderRadius: radius.sm, overflow: 'hidden',
          border: `1.5px dashed ${imageUrl ? C.blue500 : C.border}`,
          background: imageUrl ? 'transparent' : C.bg,
          cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={e => { if (!imageUrl) e.currentTarget.style.borderColor = C.blue500 }}
        onMouseLeave={e => { if (!imageUrl) e.currentTarget.style.borderColor = C.border }}
      >
        {loading ? (
          <div style={{ fontSize: 13, color: C.textSub, fontFamily: font.family }}>Loading…</div>
        ) : imageUrl ? (
          <>
            <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {/* Replace overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'flex-end', transition: 'background 0.14s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
              <div style={{ width: '100%', padding: '4px 8px', textAlign: 'center', fontSize: 11, color: '#fff', fontFamily: font.family, fontWeight: 600, background: 'rgba(0,0,0,0.4)' }}>
                Click to replace
              </div>
            </div>
            {/* Remove button */}
            <button
              onClick={e => { e.stopPropagation(); onUpload('') }}
              style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: radius.xs, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 2, padding: 0 }}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: radius.sm, background: C.blue100, border: `1px solid ${C.blue500}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2v10M9 2L5.5 5.5M9 2l3.5 3.5" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 13.5v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub, textAlign: 'center', fontFamily: font.family }}>
              Click to upload
            </div>
            <div style={{ fontSize: 11, color: C.textLight, textAlign: 'center', fontFamily: font.family }}>{dimHint} recommended</div>
          </div>
        )}
      </div>

      <input
        ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FREQ_OPTIONS: { id: AdFrequency; label: string; sub: string }[] = [
  { id: 'always',      label: 'Every visit',     sub: 'Shown each time the patient opens their dashboard' },
  { id: 'every_other', label: 'Every 2nd visit',  sub: 'Shown on visits 1, 3, 5 … (alternating)'         },
  { id: 'every_third', label: 'Every 3rd visit',  sub: 'Shown on visits 1, 4, 7 … (every third)'         },
]

const COUNTRIES = ['Zimbabwe', 'Kenya', 'Zambia']

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AdminAdsScreen() {
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet

  // Shared store — changes here are immediately visible on the patient dashboard
  const { banners, updateBanner, addBanner, deleteBanner } = useAdsStore()

  const [selected, setSelected]           = useState<AdBanner | null>(banners[0] ?? null)
  const [draft, setDraft]                 = useState<AdBanner | null>(banners[0] ?? null)
  const [saved, setSaved]                 = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const selectBanner = (b: AdBanner) => {
    setSelected(b); setDraft({ ...b }); setSaved(false); setConfirmDelete(false)
  }

  const field = <K extends keyof AdBanner>(key: K, val: AdBanner[K]) =>
    setDraft(d => d ? { ...d, [key]: val } : d)

  const saveChanges = () => {
    if (!draft) return
    // Auto-activate a draft that now has at least one image — the admin
    // uploaded an image and hit Save, they clearly want it visible.
    const hasImage = !!(draft.desktopImageUrl || draft.mobileImageUrl)
    const toSave = hasImage && draft.status === 'draft'
      ? { ...draft, status: 'active' as AdBannerStatus }
      : draft
    updateBanner(toSave)          // ← stamps updatedAt and pushes to shared store
    setSelected({ ...toSave })
    setDraft({ ...toSave })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const toggleStatus = () => {
    if (!draft) return
    const next: AdBannerStatus = draft.status === 'active' ? 'paused' : 'active'
    const updated = { ...draft, status: next }
    setDraft(updated)
    updateBanner(updated)         // ← live update visible on patient dashboard instantly
    setSelected(updated)
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    deleteBanner(selected!.id)    // ← removes from shared store
    const remaining = banners.filter(b => b.id !== selected!.id)
    const fallback  = remaining[0] ?? null
    setSelected(fallback); setDraft(fallback ? { ...fallback } : null)
    setConfirmDelete(false)
  }

  const createBanner = () => {
    const today = new Date().toISOString().split('T')[0]
    const exp   = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]
    const b: AdBanner = {
      id: generateRef('ADB'),
      advertiserName: '',
      ctaUrl: '',
      desktopImageUrl: '',
      mobileImageUrl: '',
      status: 'draft',
      frequency: 'always',
      startDate: today, expiresAt: exp,
      countries: [], impressions: 0, clicks: 0,
      updatedAt: new Date().toISOString(),
    }
    addBanner(b)                  // ← adds to shared store
    setSelected(b); setDraft({ ...b }); setSaved(false)
  }

  const toggleCountry = (name: string) => {
    if (!draft) return
    const has = draft.countries.includes(name)
    field('countries', has ? draft.countries.filter(c => c !== name) : [...draft.countries, name])
  }

  const sorted = [...banners].sort((a, b) => {
    const o: Record<AdBannerStatus, number> = { active: 0, scheduled: 1, paused: 2, draft: 3, expired: 4 }
    return o[a.status] - o[b.status]
  })

  return (
    <AdminLayout title="Advertising" subtitle="Upload and manage patient-facing banner ads">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: font.family }}>

        {/* Dimension guide */}
        <div style={{ padding: '12px 18px', background: C.blue100, borderRadius: radius.sm, border: `1px solid ${C.blue500}33`, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: C.navy800, borderRadius: radius.xs, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="6" width="14" height="6" rx="1.5" stroke={C.blue500} strokeWidth="1.3"/><path d="M5 4h8" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy800 }}>Desktop banner</div>
              <div style={{ fontSize: 11, color: C.textSub }}>1200 × 90 px · PNG / JPG / WebP</div>
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: C.blue500, opacity: 0.2 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: C.navy800, borderRadius: radius.xs, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="5" y="2" width="8" height="14" rx="1.5" stroke={C.blue500} strokeWidth="1.3"/><path d="M8 13h2" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy800 }}>Mobile banner</div>
              <div style={{ fontSize: 11, color: C.textSub }}>750 × 150 px · PNG / JPG / WebP</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: C.textSub }}>
            Design at 2× for retina displays, export at 1×.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '300px 1fr', gap: 20, alignItems: 'flex-start' }}>

          {/* ── Banner list ──────────────────────────────────────────── */}
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
              <GGButton variant="primary" size="sm" onClick={createBanner} fullWidth>
                + New Banner
              </GGButton>
            </div>

            {sorted.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: C.textSub }}>No banners yet</div>
            )}

            {sorted.map((b, i) => (
              <div key={b.id} onClick={() => selectBanner(b)}
                style={{
                  padding: '13px 16px',
                  borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : 'none',
                  cursor: 'pointer',
                  background: selected?.id === b.id ? C.blue100 : '#fff',
                  borderLeft: selected?.id === b.id ? `3px solid ${C.blue500}` : '3px solid transparent',
                  transition: 'all 0.12s',
                }}>
                {/* Thumbnail strip + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 56, height: 18, borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: C.bg, border: `1px solid ${C.border}` }}>
                    {b.desktopImageUrl ? (
                      <img src={b.desktopImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 7, color: C.textLight, fontFamily: font.family }}>No image</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.advertiserName || 'Untitled'}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                {/* Stats row */}
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: C.textLight, flexWrap: 'wrap' }}>
                  <span>{b.impressions.toLocaleString()} views</span>
                  <span>·</span>
                  <span>{ctr(b.impressions, b.clicks)} CTR</span>
                  {(b.status === 'active' || b.status === 'scheduled') && (
                    <>
                      <span>·</span>
                      <span style={{ color: daysLeft(b.expiresAt) < 7 ? C.error : C.textLight, fontWeight: daysLeft(b.expiresAt) < 7 ? 700 : 400 }}>
                        {daysLeft(b.expiresAt)}d left
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span style={{ color: b.desktopImageUrl ? C.navy800 : C.textLight, fontWeight: b.desktopImageUrl ? 600 : 400 }}>
                    {[b.desktopImageUrl && 'Desktop', b.mobileImageUrl && 'Mobile'].filter(Boolean).join(' + ') || 'No images'}
                  </span>
                </div>
              </div>
            ))}
          </GGCard>

          {/* ── Detail / edit panel ──────────────────────────────────── */}
          {selected && draft ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Image uploads */}
              <GGCard padding="22px">
                <SectionLabel>Banner Images</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <ImageUploadSlot
                    label="Desktop Banner"
                    dimHint="1200 × 90 px"
                    previewHeight={72}
                    imageUrl={draft.desktopImageUrl}
                    onUpload={url => field('desktopImageUrl', url)}
                  />
                  <ImageUploadSlot
                    label="Mobile Banner"
                    dimHint="750 × 150 px"
                    previewHeight={100}
                    imageUrl={draft.mobileImageUrl}
                    onUpload={url => field('mobileImageUrl', url)}
                  />
                </div>
                {draft.desktopImageUrl && !draft.mobileImageUrl && (
                  <div style={{ marginTop: 12, padding: '9px 12px', background: C.warningBg, border: `1px solid ${C.warning}33`, borderRadius: radius.xs, fontSize: 12, color: C.textSub, fontFamily: font.family }}>
                    No mobile image uploaded — the desktop image will be used on mobile as a fallback.
                  </div>
                )}
              </GGCard>

              {/* Metadata */}
              <GGCard padding="22px">
                <SectionLabel>Details</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <Label>Advertiser Name (internal reference)</Label>
                    <input value={draft.advertiserName} onChange={e => field('advertiserName', e.target.value)} style={INPUT} placeholder="e.g. HealthShield Medical Aid" />
                  </div>
                  <div>
                    <Label>Click-through URL</Label>
                    <input value={draft.ctaUrl} onChange={e => field('ctaUrl', e.target.value)} style={INPUT} placeholder="https://advertiser.com" />
                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 5 }}>Where patients are taken when they click the banner.</div>
                  </div>
                </div>
              </GGCard>

              {/* Scheduling */}
              <GGCard padding="22px">
                <SectionLabel>Scheduling &amp; Targeting</SectionLabel>

                <Label>Display Frequency</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {FREQ_OPTIONS.map(opt => {
                    const on = draft.frequency === opt.id
                    return (
                      <button key={opt.id} onClick={() => field('frequency', opt.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: on ? C.blue100 + '88' : C.bg, border: `1px solid ${on ? C.blue500 + '55' : C.border}`, borderRadius: radius.sm, cursor: 'pointer', fontFamily: font.family, textAlign: 'left', transition: 'all 0.12s' }}>
                        <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: '50%', border: `1.5px solid ${on ? C.blue500 : C.borderDark}`, background: on ? C.blue500 : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {on && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: C.textSub, marginTop: 1 }}>{opt.sub}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div>
                    <Label>Start Date</Label>
                    <GGDatePicker value={draft.startDate} onChange={value => field('startDate', value)} />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <GGDatePicker value={draft.expiresAt} onChange={value => field('expiresAt', value)} min={draft.startDate || undefined} />
                    {daysLeft(draft.expiresAt) < 7 && daysLeft(draft.expiresAt) > 0 && (
                      <div style={{ fontSize: 11, color: C.error, fontWeight: 600, marginTop: 5 }}>
                        Expires in {daysLeft(draft.expiresAt)} day{daysLeft(draft.expiresAt) !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                <Label>Country Targeting</Label>
                <div style={{ fontSize: 11, color: C.textSub, marginBottom: 8 }}>Leave all unselected to show in every market.</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COUNTRIES.map(c => {
                    const on = draft.countries.includes(c)
                    return (
                      <button key={c} onClick={() => toggleCountry(c)}
                        style={{ padding: '6px 14px', borderRadius: radius.full, border: `1.5px solid ${on ? C.navy800 : C.border}`, background: on ? C.navy800 : '#fff', color: on ? '#fff' : C.textSub, fontSize: 12, fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.12s' }}>
                        {c}
                      </button>
                    )
                  })}
                </div>
                {draft.countries.length === 0 && (
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 6 }}>Targeting all countries</div>
                )}
              </GGCard>

              {/* Stats */}
              <GGCard padding="22px">
                <SectionLabel>Performance</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Impressions', val: selected.impressions.toLocaleString() },
                    { label: 'Clicks',      val: selected.clicks.toLocaleString() },
                    { label: 'CTR',         val: ctr(selected.impressions, selected.clicks) },
                    { label: 'Days Left',   val: daysLeft(selected.expiresAt) > 0 ? daysLeft(selected.expiresAt).toString() : 'Expired' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.xs, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.navy800, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </GGCard>

              {/* Live status indicator */}
              {(() => {
                const today2 = new Date().toISOString().split('T')[0]
                const hasImage = !!(draft.desktopImageUrl || draft.mobileImageUrl)
                const isLive = draft.status === 'active' && hasImage &&
                  draft.startDate <= today2 && draft.expiresAt >= today2
                const reason = !hasImage ? 'No image uploaded'
                  : draft.status !== 'active' ? `Status is ${draft.status}`
                  : draft.startDate > today2 ? 'Not started yet'
                  : draft.expiresAt < today2 ? 'Expired'
                  : null
                return (
                  <div style={{ padding: '10px 14px', borderRadius: radius.sm, background: isLive ? '#f0fdf4' : C.bg, border: `1px solid ${isLive ? '#86efac' : C.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: isLive ? '#22c55e' : C.textLight, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: isLive ? '#15803d' : C.textSub, fontFamily: font.family }}>
                      {isLive ? 'Live on patient dashboard' : `Not visible to patients${reason ? ` — ${reason}` : ''}`}
                    </span>
                  </div>
                )
              })()}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <GGButton variant="primary" size="sm" onClick={saveChanges} disabled={saved}>
                  {saved ? 'Saved ✓' : 'Save Changes'}
                </GGButton>
                {(draft.status === 'active' || draft.status === 'paused' || draft.status === 'draft' || draft.status === 'scheduled') && (
                  <GGButton variant="secondary" size="sm" onClick={toggleStatus}>
                    {draft.status === 'active' ? 'Pause Banner' : 'Activate Banner'}
                  </GGButton>
                )}
                <div style={{ marginLeft: 'auto' }}>
                  <GGButton variant="danger" size="sm" onClick={handleDelete}>
                    {confirmDelete ? 'Confirm Delete' : 'Delete'}
                  </GGButton>
                </div>
              </div>
              {confirmDelete && (
                <div style={{ fontSize: 12, color: C.error, fontWeight: 600 }}>
                  Click "Confirm Delete" again to permanently remove this banner.
                </div>
              )}

            </div>
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: C.textSub, fontSize: 13, background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
              Select a banner or create a new one.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
