# Theme

## Compact token summary

- Framework/style approach: React inline `style` objects; custom TypeScript tokens; one small global reset in `index.html`; no Tailwind config and no standalone global CSS file.
- Brand darks: `navy900 #050E22`, `navy800 #091C44`, `navy700 #12244F`, `navy600 #1A2F5E`.
- Patient accent: `blue500 #38B6FF`, `blue400 #5EC3FF`, `blue300 #8ADCFF`, `blue100 #E6F5FF`.
- Provider accent used by auth: `#10B981` with darker gradient stop `#059669`.
- Neutrals: app `bg #FAF6F5`, surface `#FFFFFF`, border `#EAE6E5`, dark border `#D5CFCF`.
- Text: primary `#091C44`, secondary `#2E3E5C`, light `#999DAD`.
- Status: error `#E5474D`; success intentionally maps to patient blue.
- Typography: Figtree from Google Fonts, weights 300–900; fallback Helvetica Neue/Arial/sans-serif. Auth headings use 22–32px, weight 800, tracking from -0.03em to -0.04em; body is 13–14.5px.
- Radius: 6, 10, 12, 16, 24px, and pill 9999px.
- Shadows: subtle 1px/4px cards through 20px/50px overlays; brand panels use navy/black atmospheric shadows.
- Spacing: no formal token scale. Common increments are 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, and 40px.
- Breakpoints: mobile ≤639px; tablet 640–1023px; desktop ≥1024px.
- Dark mode: no global dark theme. Dark navy is reserved for brand panels, sidebars, and auth chrome.
- Motion: 150–350ms UI transitions; auth brand float animation is 5s ease-in-out.

## Raw token and global sources

### `src/design-system/tokens.ts`

```ts
export const C = {
  navy900:    '#050E22',
  navy800:    '#091C44', // Core Brand Dark
  navy700:    '#12244F',
  navy600:    '#1A2F5E',
  blue500:    '#38B6FF', // Core Brand Accent
  blue400:    '#5EC3FF',
  blue300:    '#8ADCFF',
  blue100:    '#E6F5FF', // Subtle blue tint
  bg:         '#FAF6F5', // Core Brand Background / Alabaster
  surface:    '#FFFFFF',
  border:     '#EAE6E5', // Warm light neutral border
  borderDark: '#D5CFCF',
  text:       '#091C44', // Text matching brand dark
  textSub:    '#2E3E5C', // Darker, highly legible brand slate-navy
  textLight:  '#999DAD',
  success:    '#38B6FF', // Map success to brand accent
  successBg:  '#E6F5FF',
  warning:    '#091C44', // Map warning to brand dark (minimizing yellow)
  warningBg:  '#FAF6F5',
  error:      '#E5474D', // Vibrant high-contrast alert red
  errorBg:    'rgba(229, 71, 77, 0.1)',
} as const

export const font = {
  family: "'Figtree', 'Helvetica Neue', Arial, sans-serif",
  mono: "'Figtree', 'Courier New', monospace",
} as const

export const radius = {
  xs:   '6px',
  sm:   '10px',
  md:   '12px',
  lg:   '16px',
  xl:   '24px',
  full: '9999px',
} as const

export const shadow = {
  sm: '0 1px 4px rgba(13,30,66,0.07), 0 1px 2px rgba(13,30,66,0.04)',
  md: '0 4px 14px rgba(13,30,66,0.09), 0 2px 4px rgba(13,30,66,0.05)',
  lg: '0 10px 30px rgba(13,30,66,0.11)',
  xl: '0 20px 50px rgba(13,30,66,0.16)',
} as const
```


### `src/hooks/useResponsive.ts`

```ts
import { useMediaQuery } from './useMediaQuery'

export function useResponsive() {
  const isMobile  = useMediaQuery('(max-width: 639px)')
  const isTablet  = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return { isMobile, isTablet, isDesktop }
}
```


### `index.html`
The only global CSS/reset and font loading live inline in this file.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0D1E42" />
    <meta name="description" content="GG'APP — Healthcare Access Platform" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/logo.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="GG'APP" />
    <title>GG'APP — Healthcare Access Platform</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet" />
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { height: 100%; }
      body {
        font-family: 'Figtree', 'Helvetica Neue', Arial, sans-serif;
        background: #EEF4FB;
        -webkit-font-smoothing: antialiased;
      }
      .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      .hide-scrollbar::-webkit-scrollbar { display: none; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function () {
        var bootState = {
          mounted: false,
          errors: [],
        }

        window.__GG_APP_BOOT__ = bootState

        function escapeHtml(value) {
          return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
        }

        function showBootFailure(reason) {
          if (bootState.mounted) return

          var existing = document.getElementById('gg-app-boot-error')
          var details = bootState.errors.length
            ? '<pre style="margin-top:12px;white-space:pre-wrap;font-size:12px;line-height:1.55;color:#2E3E5C;background:#FAF6F5;border:1px solid #EAE6E5;border-radius:10px;padding:12px;max-height:220px;overflow:auto;">' + escapeHtml(bootState.errors.join('\n\n')) + '</pre>'
            : ''

          var markup =
            '<div id="gg-app-boot-error" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#EEF4FB;font-family:Figtree,Helvetica Neue,Arial,sans-serif;">' +
              '<div style="width:min(560px,100%);background:#fff;border:1px solid #EAE6E5;border-radius:20px;box-shadow:0 20px 50px rgba(13,30,66,0.08);padding:24px 22px;">' +
                '<div style="font-size:24px;font-weight:800;letter-spacing:-0.03em;color:#091C44;margin-bottom:10px;">App failed to load</div>' +
                '<div style="font-size:14px;line-height:1.6;color:#2E3E5C;">' + escapeHtml(reason) + '</div>' +
                '<div style="font-size:13px;line-height:1.6;color:#2E3E5C;margin-top:8px;">Try reloading this page after the dev server is running. If it keeps happening, the error details below should help pinpoint the failing script.</div>' +
                details +
                '<button onclick="window.location.reload()" style="margin-top:16px;padding:12px 16px;border:0;border-radius:12px;background:#38B6FF;color:#091C44;font-size:14px;font-weight:700;cursor:pointer;">Reload</button>' +
              '</div>' +
            '</div>'

          if (existing) {
            existing.outerHTML = markup
            return
          }

          var root = document.getElementById('root')
          if (root) {
            root.innerHTML = markup
          } else {
            document.body.insertAdjacentHTML('beforeend', markup)
          }
        }

        window.addEventListener('error', function (event) {
          var message = event && event.message ? event.message : 'Unknown startup error'
          bootState.errors.push('Error: ' + message)
        })

        window.addEventListener('unhandledrejection', function (event) {
          var reason = event && event.reason
          bootState.errors.push('Unhandled rejection: ' + (reason && reason.stack ? reason.stack : String(reason)))
        })

        window.setTimeout(function () {
          if (!bootState.mounted) {
            showBootFailure('The startup bundle did not mount the React app within a few seconds.')
          }
        }, 4000)

        // Service worker lifecycle (registration, dev cleanup) is handled
        // in src/services/pwa.ts once the app mounts.
      })()
    </script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
