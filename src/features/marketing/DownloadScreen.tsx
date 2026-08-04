import { Link } from 'react-router-dom'
import { C, font, radius, shadow } from '@/design-system'
import { LOGO, ROUTES } from '@/router/routes'

/** Installable Android APK, served from the web app's public/downloads/. */
export const APK_DOWNLOAD_PATH = '/downloads/ggapp.apk'

function StoreBadge({ label, sub }: { label: string; sub: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderRadius: radius.sm,
        border: `1px dashed ${C.borderDark}`,
        color: C.textSub,
        fontFamily: font.family,
        background: C.surface,
        opacity: 0.7,
        cursor: 'not-allowed',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z"
          stroke={C.textSub}
          strokeWidth="1.6"
        />
        <path d="M9 8v8M9 12h6M12 8v8" stroke={C.textSub} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{sub}</div>
      </div>
    </div>
  )
}

export function DownloadScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: `radial-gradient(1200px 600px at 50% -10%, ${C.navy700} 0%, ${C.navy900} 55%)`,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: C.surface,
          borderRadius: radius.xl,
          boxShadow: shadow.xl,
          padding: '40px 36px',
          textAlign: 'center',
          fontFamily: font.family,
        }}
      >
        <img
          src={LOGO}
          alt="GG'APP"
          width={92}
          height={92}
          style={{ objectFit: 'contain', display: 'block', margin: '0 auto 18px' }}
        />

        <h1 style={{ margin: 0, color: C.text, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Get the GG&apos;APP mobile app
        </h1>
        <p style={{ margin: '10px 0 26px', color: C.textSub, fontSize: 15, lineHeight: 1.55 }}>
          Book healthcare services, track your ledger and invoices, and manage credit — right from your phone.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
          <a
            href={APK_DOWNLOAD_PATH}
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              height: 54,
              borderRadius: radius.md,
              background: C.blue500,
              color: '#fff',
              fontWeight: 700,
              fontSize: 17,
              textDecoration: 'none',
              transition: 'background 0.16s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3B9FD4')}
            onMouseLeave={e => (e.currentTarget.style.background = C.blue500)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download for Android (APK)
          </a>
          <p style={{ margin: 0, fontSize: 12.5, color: C.textLight }}>
            Android 8.0+ · ~50 MB · sideloading must be enabled on your device
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 26 }}>
          <StoreBadge label="Google Play" sub="Coming soon" />
          <StoreBadge label="App Store" sub="Coming soon" />
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
          <Link
            to={ROUTES.LOGIN}
            style={{ color: C.blue500, fontWeight: 600, fontSize: 14.5, textDecoration: 'none' }}
          >
            Continue to the web portal →
          </Link>
        </div>
      </div>
    </div>
  )
}
