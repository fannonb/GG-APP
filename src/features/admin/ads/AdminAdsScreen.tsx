import { Pager, usePaged } from '@/features/admin/paging'
import { useRef, useState } from 'react'
// useRef is used inside ImageUploadSlot
import type { CSSProperties } from 'react'
import { GGCard, GGButton, GGDatePicker } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminAds, useCreateAdMutation, useDeleteAdMutation, useUpdateAdMutation } from '@/hooks/api/useAds'
import { ApiError } from '@/api/types'
import type { AdminAdPayload } from '@/api/services/ads.service'
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
  dimHint: string   // e.g. "800 × 600 px"
  maxWidth: number  // width cap for the 4:3 preview box
  imageUrl: string
  onUpload: (dataUrl: string) => void
}

function ImageUploadSlot({ label, dimHint, maxWidth, imageUrl, onUpload }: UploadSlotProps) {
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
          width: '100%', maxWidth, aspectRatio: '4 / 3', boxSizing: 'border-box',
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
            <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
            <div style={{ fontSize: 11, color: C.textLight, textAlign: 'center', fontFamily: font.family }}>Recommended: {dimHint}</div>
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

// ─── Editor helpers ──────────────────────────────────────────────────────────

/** A newly picked image is a data URL. Saved images come back as URLs and are never sent back. */
const isNewImage = (url: string) => url.startsWith('data:')

/** Create and update share this shape. Image fields are only present when the admin changed them. */
type AdEditPayload = AdminAdPayload & { removeDesktopImage?: boolean; removeMobileImage?: boolean }

function buildPayload(draft: AdBanner, saved: AdBanner | null): AdEditPayload {
  const payload: AdEditPayload = {
    advertiserName: draft.advertiserName,
    ctaUrl: draft.ctaUrl,
    status: draft.status,
    frequency: draft.frequency,
    startDate: draft.startDate,
    expiresAt: draft.expiresAt,
    countries: draft.countries,
  }
  if (isNewImage(draft.desktopImageUrl)) payload.desktopImageDataUrl = draft.desktopImageUrl
  else if (saved?.desktopImageUrl && !draft.desktopImageUrl) payload.removeDesktopImage = true
  if (isNewImage(draft.mobileImageUrl)) payload.mobileImageDataUrl = draft.mobileImageUrl
  else if (saved?.mobileImageUrl && !draft.mobileImageUrl) payload.removeMobileImage = true
  return payload
}

function blankBanner(): AdBanner {
  const today = new Date().toISOString().split('T')[0]
  const exp   = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]
  return {
    id: '',
    advertiserName: '',
    ctaUrl: '',
    desktopImageUrl: '',
    mobileImageUrl: '',
    status: 'draft',
    frequency: 'always',
    startDate: today,
    expiresAt: exp,
    countries: [],
    impressions: 0,
    clicks: 0,
    updatedAt: '',
  }
}

function errorText(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong. Try again.'
}

// ─── Banner editor ───────────────────────────────────────────────────────────

interface AdEditorProps {
  /** Starting values for the draft. Read once, when the editor opens. */
  seed: AdBanner
  /** The saved copy from the list, or null for a banner that is not saved yet. */
  live: AdBanner | null
  isNew: boolean
  onCreated: (banner: AdBanner) => void
  /** Called with the banner id once it is deleted, or with null when an unsaved draft is discarded. */
  onRemoved: (id: string | null) => void
}

function AdEditor({ seed, live, isNew, onCreated, onRemoved }: AdEditorProps) {
  const { isMobile } = useResponsive()
  const createAd = useCreateAdMutation()
  const updateAd = useUpdateAdMutation()
  const deleteAd = useDeleteAdMutation()

  const [draft, setDraft]                 = useState<AdBanner>(seed)
  const [saved, setSaved]                 = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  const busy = createAd.isPending || updateAd.isPending || deleteAd.isPending
  // Views and CTR come from the saved banner; a banner not saved yet has none.
  const stats = live ?? draft

  const field = <K extends keyof AdBanner>(key: K, val: AdBanner[K]) =>
    setDraft(d => ({ ...d, [key]: val }))

  const save = async (next: AdBanner) => {
    setError(null)
    try {
      const payload = buildPayload(next, live)
      if (isNew) {
        const created = await createAd.mutateAsync(payload)
        onCreated(created)
        return
      }
      const updated = await updateAd.mutateAsync({ id: next.id, payload })
      setDraft(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(errorText(e))
    }
  }

  const saveChanges = () => {
    // Auto-activate a draft that now has at least one image — the admin
    // uploaded an image and hit Save, they clearly want it visible.
    const hasImage = !!(draft.desktopImageUrl || draft.mobileImageUrl)
    void save(hasImage && draft.status === 'draft' ? { ...draft, status: 'active' } : draft)
  }

  // Pausing or activating saves the whole draft with the new status.
  const toggleStatus = () => {
    void save({ ...draft, status: draft.status === 'active' ? 'paused' : 'active' })
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    if (isNew) {
      onRemoved(null)
      return
    }
    setError(null)
    try {
      await deleteAd.mutateAsync(draft.id)
      onRemoved(draft.id)
    } catch (e) {
      setError(errorText(e))
      setConfirmDelete(false)
    }
  }

  const toggleCountry = (name: string) => {
    const has = draft.countries.includes(name)
    field('countries', has ? draft.countries.filter(c => c !== name) : [...draft.countries, name])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Image uploads */}
      <GGCard padding="22px">
        <SectionLabel>Banner Images</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ImageUploadSlot
            label="Desktop ad"
            dimHint="800 × 600 px"
            maxWidth={360}
            imageUrl={draft.desktopImageUrl}
            onUpload={url => field('desktopImageUrl', url)}
          />
          <ImageUploadSlot
            label="Mobile ad"
            dimHint="800 × 600 px (optional)"
            maxWidth={240}
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
            { label: 'Impressions', val: stats.impressions.toLocaleString() },
            { label: 'Clicks',      val: stats.clicks.toLocaleString() },
            { label: 'CTR',         val: ctr(stats.impressions, stats.clicks) },
            { label: 'Days Left',   val: daysLeft(stats.expiresAt) > 0 ? daysLeft(stats.expiresAt).toString() : 'Expired' },
          ].map(s => (
            <div key={s.label} style={{ padding: '10px 12px', background: C.bg, borderRadius: radius.xs, border: `1px solid ${C.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.navy800, letterSpacing: '-0.015em', lineHeight: 1 }}>{s.val}</div>
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
        <GGButton variant="primary" size="sm" onClick={saveChanges} disabled={saved} loading={busy}>
          {busy ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
        </GGButton>
        {(draft.status === 'active' || draft.status === 'paused' || draft.status === 'draft' || draft.status === 'scheduled') && (
          <GGButton variant="secondary" size="sm" onClick={toggleStatus} disabled={busy}>
            {draft.status === 'active' ? 'Pause Banner' : 'Activate Banner'}
          </GGButton>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <GGButton variant="danger" size="sm" onClick={() => void handleDelete()} disabled={busy}>
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </GGButton>
        </div>
      </div>
      {error && (
        <div role="alert" style={{ fontSize: 12, color: C.error, fontWeight: 600 }}>
          {error}
        </div>
      )}
      {confirmDelete && (
        <div style={{ fontSize: 12, color: C.error, fontWeight: 600 }}>
          Click "Confirm Delete" again to permanently remove this banner.
        </div>
      )}

    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AdminAdsScreen() {
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet

  const adsQuery = useAdminAds()
  const banners = adsQuery.data ?? []

  const [selectedId, setSelectedId] = useState<string | null>(null)
  // An unsaved new banner open in the editor. It is saved only when the admin presses Save.
  const [newDraft, setNewDraft]     = useState<{ key: number; banner: AdBanner } | null>(null)

  // Until the admin picks a banner, the first one in the list opens.
  const selected = newDraft === null
    ? banners.find(b => b.id === (selectedId ?? banners[0]?.id)) ?? null
    : null

  const selectBanner = (b: AdBanner) => {
    setNewDraft(null)
    setSelectedId(b.id)
  }

  const openNewBanner = () => setNewDraft({ key: Date.now(), banner: blankBanner() })

  const handleCreated = (banner: AdBanner) => {
    setNewDraft(null)
    setSelectedId(banner.id)
  }

  const sorted = [...banners].sort((a, b) => {
    const o: Record<AdBannerStatus, number> = { active: 0, scheduled: 1, paused: 2, draft: 3, expired: 4 }
    return o[a.status] - o[b.status]
  })

  const handleRemoved = (id: string | null) => {
    setNewDraft(null)
    if (id) setSelectedId(sorted.find(b => b.id !== id)?.id ?? null)
  }

  const { pageItems, pager } = usePaged(sorted)

  return (
    <AdminLayout title="Advertising">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: font.family }}>

        {/* Dimension guide */}
        <div style={{ padding: '12px 18px', background: C.blue100, borderRadius: radius.sm, border: `1px solid ${C.blue500}33`, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: C.navy800, borderRadius: radius.xs, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3.75" width="14" height="10.5" rx="1.5" stroke={C.blue500} strokeWidth="1.3"/><path d="M5 9h8" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy800 }}>Desktop ad</div>
              <div style={{ fontSize: 11, color: C.textSub }}>800 × 600 px · 4:3 · PNG / JPG / WebP, under 300 KB</div>
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: C.blue500, opacity: 0.2 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: C.navy800, borderRadius: radius.xs, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="5.25" width="10" height="7.5" rx="1.5" stroke={C.blue500} strokeWidth="1.3"/><path d="M6.5 9h3" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy800 }}>Mobile ad</div>
              <div style={{ fontSize: 11, color: C.textSub }}>800 × 600 px · 4:3 · optional</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: C.textSub }}>
            Keep text and logos inside the middle 80%. Several active ads rotate every 6 seconds.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '300px 1fr', gap: 20, alignItems: 'flex-start' }}>

          {/* ── Banner list ──────────────────────────────────────────── */}
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
              <GGButton variant="primary" size="sm" onClick={openNewBanner} fullWidth>
                + New Banner
              </GGButton>
            </div>

            {adsQuery.isPending && (
              <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: C.textSub }}>Loading banners…</div>
            )}

            {adsQuery.isError && (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: C.error }}>
                Could not load banners.{' '}
                <button
                  onClick={() => void adsQuery.refetch()}
                  style={{ background: 'none', border: 'none', padding: 0, color: C.navy800, fontWeight: 700, fontSize: 13, textDecoration: 'underline', cursor: 'pointer', fontFamily: font.family }}>
                  Try again
                </button>
              </div>
            )}

            {!adsQuery.isPending && !adsQuery.isError && sorted.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: C.textSub }}>No banners yet</div>
            )}

            {pageItems.map((b, i) => (
              <div key={b.id} onClick={() => selectBanner(b)}
                style={{
                  padding: '13px 16px',
                  borderBottom: i < pageItems.length - 1 ? `1px solid ${C.border}` : 'none',
                  cursor: 'pointer',
                  background: selected?.id === b.id ? C.blue100 : '#fff',
                  borderLeft: selected?.id === b.id ? `3px solid ${C.blue500}` : '3px solid transparent',
                  transition: 'all 0.12s',
                }}>
                {/* 4:3 thumbnail + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 48, height: 36, borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: C.bg, border: `1px solid ${C.border}` }}>
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
            <div style={{ padding: '0 12px 12px' }}><Pager {...pager} /></div>
          </GGCard>

          {/* ── Detail / edit panel ──────────────────────────────────── */}
          {newDraft !== null ? (
            <AdEditor
              key={`new-${newDraft.key}`}
              seed={newDraft.banner}
              live={null}
              isNew
              onCreated={handleCreated}
              onRemoved={handleRemoved}
            />
          ) : selected ? (
            <AdEditor
              key={selected.id}
              seed={selected}
              live={selected}
              isNew={false}
              onCreated={handleCreated}
              onRemoved={handleRemoved}
            />
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: C.textSub, fontSize: 13, background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
              {adsQuery.isPending ? 'Loading banners…' : 'Select a banner or create a new one.'}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
