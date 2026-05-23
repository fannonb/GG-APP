# GG'APP — Healthcare Access Platform

A React prototype for **GG'APP**, a healthcare access platform connecting patients, service providers, and administrators. The app uses mock data and simulated auth — no backend is required to explore the UI.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check and production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Portals

The app has three role-based portals, each with its own layout and routes:

| Portal | Base path | Description |
|--------|-----------|-------------|
| **Patient** | `/app/*` | Find providers, book services, credit wallet, pay invoices |
| **Service Provider** | `/sp/*` | Appointments, patients, invoice upload, payments |
| **Admin** | `/admin/*` | SP applications, disputes, invoice review |

Public routes: `/` (splash), `/login`, `/register`, `/verify`, `/onboarding`.

## Demo mode

- **Screen Options panel** — floating gear icon (bottom-right) switches between Patient / Provider / Admin portals and toggles new vs existing patient dashboard views.
- **Auth is mocked** — `auth.store` defaults to logged-in patient; login forms simulate a delay then navigate.
- **Demo PIN** — use `1234` on the triple-PIN payment authorization screen.

## Project structure

```
src/
├── features/       # Screens grouped by role (auth, patient, service-provider, admin)
├── layouts/        # Portal shells (sidebar, top bar, mobile nav)
├── router/         # AppRouter, sub-routers, ROUTES constants
├── design-system/  # GG* components and design tokens
├── store/          # Zustand stores (auth, user)
├── mock/           # Fixture data
├── types/          # Domain TypeScript types
├── utils/          # Formatting and status helpers
└── hooks/          # Responsive breakpoints
```

Route paths are centralized in `src/router/routes.ts`. Import `ROUTES`, `route`, `PORTAL_HOME`, or `LOGO` from there instead of hardcoding paths.

## Tech stack

- React 19 + TypeScript
- Vite 8
- React Router 7
- Zustand (state)
- Inline styles with shared tokens (`src/design-system/tokens.ts`)

## Assets

The app logo lives at `public/logo.png`. To regenerate it from the parent package source:

```bash
node scripts/extract-logo.mjs
```

## Status

This is a **UI prototype**. There is no API layer, real authentication, or test suite yet. Data comes from files in `src/mock/`.
