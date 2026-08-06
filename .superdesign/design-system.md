# GG'APP brand and design system

## Product and brand

GG'APP is a healthcare access platform connecting patients, verified service providers, healthcare credit, and administrators. The brand must feel trustworthy, clinically clear, financially reassuring, accessible, and contemporary—not playful or fintech-aggressive.

- Primary mark: `/gg-logo-v4.png` (also `/logo.png` for PWA contexts).
- Wordmark spelling: `GG'APP` in prose; JSX may use `GG&apos;APP`.
- Platform line: “Gateway Global Healthcare Platform”.
- Patient promise: “Healthcare Access, Simplified.”
- Provider promise: “Grow Your Practice.”
- Browser theme metadata currently uses legacy `#0D1E42`; UI tokens use `#091C44`.

## Core palette

- Brand navy 900: `#050E22` — deepest panels and gradient endpoints.
- Brand navy 800: `#091C44` — principal dark, headings, text, and chrome.
- Navy 700: `#12244F`; navy 600: `#1A2F5E`.
- Patient blue 500: `#38B6FF` — primary patient accent.
- Patient blue 400: `#5EC3FF`; blue 300: `#8ADCFF`; blue 100: `#E6F5FF`.
- Provider green: `#10B981`; provider action gradient ends at `#059669`.
- Warm application background: `#FAF6F5`; white surface: `#FFFFFF`.
- Warm border: `#EAE6E5`; stronger border: `#D5CFCF`.
- Primary text: `#091C44`; secondary text: `#2E3E5C`; muted text: `#999DAD`.
- Error: `#E5474D`, pale background `rgba(229,71,77,0.1)`.

Patient blue and provider green communicate account role, not arbitrary decoration. Navy remains the unifying brand foundation.

## Typography

- Family: Figtree, loaded from Google Fonts at weights 300–900.
- Fallback: Helvetica Neue, Arial, sans-serif.
- Major brand/auth headlines: 22–32px, weight 800, line-height 1.1–1.2, tracking -0.03em to -0.04em.
- Screen headings: typically 24–26px, weight 800.
- Body/support copy: 13–14.5px, weight 400–500, line-height 1.35–1.6.
- Labels/actions: 12–14px, weight 600–700.
- Eyebrows/status labels: 9–11px, weight 700, often uppercase with 0.08em tracking.

## Shape, spacing, and depth

- Radius scale: 6px, 10px, 12px, 16px, 24px, 9999px.
- Prefer 10–16px for fields/cards and 24px only for large containers.
- Common spacing rhythm: 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40px.
- Card shadows are cool/navy and restrained; auth dark panels can use deeper black/navy depth.
- Borders are generally 1–1.5px. Use translucent white borders on navy glass surfaces.

## Responsive system

- Mobile: up to 639px.
- Tablet: 640–1023px.
- Desktop: 1024px and above.
- Auth screens switch at 1024px: desktop uses a 50% full-height `AuthBrandPanel`; mobile/tablet use `AuthCompactBrandHeader` above a single-column form.
- Mobile content must honor narrow 320px-class widths, avoid horizontal scroll, and preserve at least 44px practical touch targets where possible.

## Authentication composition

The authentication family is the highest-priority design context:

1. Desktop left half: navy atmospheric `AuthBrandPanel`, 110px logo, promise headline, role-specific product preview, three benefit cards, and platform footer.
2. Mobile/tablet top: compact navy `AuthCompactBrandHeader`, horizontal logo/wordmark/tagline lockup, two low-opacity radial glows, and a 2px role accent rail.
3. Main form surface: white, subtle role-colored radial backdrop, centered form (440px login / 520px registration maximum), warm neutral borders, no heavy card outline.
4. Role control: warm-neutral segmented control with a white sliding selection surface.
5. Patient actions: blue gradient `#38B6FF → #0091E6`; provider actions: green gradient `#10B981 → #059669`.

### Mobile authentication brand-header guardrails

- Keep the brand lockup horizontal and compact; do not restore stacked logo/pill clusters.
- Current mobile padding: 24px 22px 22px; tablet: 28px 32px 26px.
- Current logo: 64px mobile, 76px tablet; image has a restrained dark drop shadow.
- Header gradient: `#091C44 0% → #050E22 72% → #030915 100%`.
- Wordmark: 22px mobile / 26px tablet, weight 800, white, -0.04em tracking.
- Tagline: 13.5px mobile / 14.5px tablet, weight 500, white at 68% opacity.
- Patient accent: `#38B6FF`, RGB `56,182,255`; provider accent: `#10B981`, RGB `16,185,129`.
- Preserve role recognition through the glow and bottom rail rather than badges or extra text.
- Decorative elements are `aria-hidden`; logo uses empty alt because the adjacent wordmark supplies the accessible brand name.
- Role changes should transition color/background around 300–350ms without layout movement.

## Components and interaction

- Use design-system primitives from `src/design-system` for fields, buttons, cards, badges, avatars, progress, and steps.
- Focus color is role-aware on auth fields. Patient focus shadow uses `rgba(74,173,223,0.12)`; provider uses `rgba(16,185,129,0.12)`.
- Primary actions use clear loading and disabled states. Hover may increase gradient brightness and shadow; pressed state scales to 0.98.
- Secondary/Google actions use white surfaces, warm borders, and high-contrast navy text.
- Errors use `#E5474D`; do not use role accent for failures.

## Accessibility and content

- Maintain readable contrast over navy and white surfaces.
- Do not encode role/status by color alone; pair role color with explicit “Patient” / “Service Provider” labels.
- Labels remain visible; required fields include a text/asterisk indication.
- Keep headings direct, benefit copy short, and healthcare/financial claims concrete.
- Motion should be subtle and nonessential. Avoid adding decorative animation that distracts from authentication.

## Canonical sources

- Tokens: `src/design-system/tokens.ts`
- Global reset/font: `index.html`
- Breakpoints: `src/hooks/useResponsive.ts`
- Mobile/tablet auth brand: `src/features/auth/components/AuthCompactBrandHeader.tsx`
- Desktop auth brand: `src/features/auth/components/AuthBrandPanel.tsx`
- Role switcher: `src/features/auth/components/EntityTabBar.tsx`
- Login composition: `src/features/auth/LoginScreen.tsx`
- Registration composition: `src/features/auth/RegisterScreen.tsx`
