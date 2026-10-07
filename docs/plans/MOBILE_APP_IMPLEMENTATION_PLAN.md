# GG'APP React Native Mobile App — Implementation Plan

## 1. Context & Overview

GG'APP is a healthcare credit platform with a production web app (React + Vite + TypeScript). A Claude Design bundle contains 35 pixel-perfect Android screen prototypes that define the mobile app's exact UI. The mobile app targets **patient-only** flows and shares the **same backend/database** as the web app.

**Source of truth for UI:** Claude Design bundle at `D:\gg-capture\design-bundle\gg-app\project\`
**Source of truth for data/API:** Web app at `d:\App Projects\GG_APP (4)\GG'APP Local Package\GG'APP\gg-app\`
**Backend:** `http://localhost:3000/api/v1` (production URL TBD)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo (managed workflow) |
| Language | TypeScript |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| State | Zustand (shared with web) |
| Data Fetching | React Query (shared hooks) |
| HTTP | Axios (shared client) |
| Token Storage | expo-secure-store |
| Icons | react-native-svg |
| Font | Plus Jakarta Sans (expo-font) |
| Validation | Zod + React Hook Form |

### Screen Inventory (35 screens)

| Category | Screens | Count |
|----------|---------|-------|
| Auth | Splash, Login, Register (3-step) | 3 |
| Dashboard | Home (returning user) | 1 |
| Services | Find Service, Provider List, Provider Profile, Booking Form, Booking Confirm | 5 |
| Payments | Appointments, Invoice List, Invoice Review, PIN Auth, Payment Success, Transaction History | 6 |
| Credit & Profile | Credit Wallet, Limit Increase, Credit Status, Profile, Beneficiaries, Notifications | 6 |
| Empty States | Dashboard, Appointments, Invoices, Transactions, Wallet, Notifications, Provider List, Credit Status | 8 |
| **Total** | | **29 unique + 6 shared** |

---

## 2. Project Structure — Monorepo

```
gg-monorepo/
├── package.json                    # npm workspaces root
├── tsconfig.base.json
│
├── packages/
│   ├── shared-types/               # TypeScript interfaces (zero deps)
│   │   └── src/
│   │       ├── user.types.ts       # Patient, Beneficiary, UserRole, CreditStatus
│   │       ├── invoice.types.ts    # PatientInvoice, SPInvoice, InvoiceStatus
│   │       ├── appointment.types.ts
│   │       ├── provider.types.ts
│   │       ├── credit.types.ts
│   │       ├── notification.types.ts
│   │       └── api.types.ts        # AuthSession, LoginPayload, etc.
│   │
│   ├── shared-api/                 # Axios client + all service methods
│   │   └── src/
│   │       ├── config.ts           # API_BASE_URL, isMockApi (platform-neutral)
│   │       ├── client.ts           # Axios with token refresh (accepts ITokenStorage)
│   │       ├── token-storage.ts    # ITokenStorage interface only
│   │       ├── api-error.ts        # ApiError class
│   │       └── services/
│   │           ├── auth.service.ts
│   │           ├── patient.service.ts
│   │           ├── providers.service.ts
│   │           ├── invoices.service.ts
│   │           ├── credit.service.ts
│   │           └── reviews.service.ts
│   │
│   ├── shared-stores/              # Zustand stores (framework-agnostic)
│   │   └── src/
│   │       ├── auth.store.ts
│   │       ├── user.store.ts
│   │       ├── notifications.store.ts
│   │       └── credit.store.ts
│   │
│   ├── shared-utils/               # Pure utility functions
│   │   └── src/
│   │       ├── format.ts           # formatCurrency, formatDate, formatTime12h, formatPhone
│   │       ├── appointments.ts     # getAppointmentDisplayStatus, getAppointmentUrgency
│   │       └── credit-threshold.ts # isCreditRunningLow
│   │
│   ├── shared-config/              # Country definitions, constants
│   │   └── src/
│   │       ├── countries.ts        # Kenya, Zimbabwe, Zambia configs
│   │       └── categories.ts      # Service categories
│   │
│   └── shared-hooks/               # React Query hooks
│       └── src/
│           ├── usePatientQueries.ts
│           ├── useCreditQueries.ts
│           ├── usePatientMutations.ts
│           ├── useCreditMutations.ts
│           └── useInvoiceMutations.ts
│
├── apps/
│   ├── web/                        # Existing web app (update imports to shared packages)
│   └── mobile/                     # NEW Expo app
│       ├── app.json
│       ├── App.tsx
│       ├── babel.config.js
│       ├── metro.config.js
│       ├── tsconfig.json
│       ├── assets/
│       │   └── fonts/
│       │       └── PlusJakartaSans-*.ttf
│       └── src/
│           ├── lib/
│           │   └── token-storage.ts    # expo-secure-store implementation
│           ├── theme/
│           │   ├── tokens.ts           # Colors, radii, shadows
│           │   ├── typography.ts       # Font weights, sizes
│           │   └── index.ts
│           ├── icons/                  # SVG icon components (~20 files)
│           ├── components/             # Shared UI components (~18 files)
│           ├── navigation/
│           │   ├── RootNavigator.tsx
│           │   ├── AuthStack.tsx
│           │   ├── AppTabs.tsx
│           │   ├── HomeStack.tsx
│           │   ├── ServicesStack.tsx
│           │   ├── InvoicesStack.tsx
│           │   ├── WalletStack.tsx
│           │   ├── ProfileStack.tsx
│           │   └── types.ts
│           ├── screens/
│           │   ├── auth/
│           │   ├── home/
│           │   ├── services/
│           │   ├── payments/
│           │   ├── credit/
│           │   └── profile/
│           └── providers/
│               ├── AppProviders.tsx
│               └── SessionBootstrap.tsx
```

---

## 3. Design System — Tokens & Components

### 3.1 Design Tokens

Source: `android-screens-shared.jsx` lines 4-16

```typescript
// apps/mobile/src/theme/tokens.ts
export const colors = {
  // Brand navy
  navy:    '#0D1E42',
  navy2:   '#152B55',
  navy3:   '#1C3670',

  // Primary blue
  blue:    '#4AADDF',
  blue2:   '#6BBFE8',
  blue3:   '#DCF1FC',

  // Status
  success:   '#22C98A',  successBg: '#E3F9F0',
  warning:   '#F5A623',  warningBg: '#FFF8E6',
  error:     '#E5474D',  errorBg:   '#FDECEA',

  // Text
  text:      '#0D1E42',
  textSub:   '#55769A',
  textLight: '#A0B3CC',

  // Surface
  bg:     '#EEF4FB',
  card:   '#FFFFFF',
  border: '#E2EBF5',

  // Accent
  purple:   '#6366F1',  purpleBg: '#EEF2FF',
  teal:     '#0EA5A0',  tealBg:   '#E6F7F7',
};

export const radii = { default: 12, large: 16, full: 9999 };
export const fontFamily = 'PlusJakartaSans';
```

> **NOTE:** The web app uses *different* tokens (Figtree font, `#38B6FF` blue, `#FAF6F5` bg). The mobile app must use the design bundle tokens above, NOT the web tokens.

### 3.2 Component Inventory

Each component maps 1:1 to the design bundle's shared JSX:

| Component | File | Design Ref | Purpose |
|-----------|------|-----------|---------|
| `GGPill` | `components/GGPill.tsx` | shared:27 | Status badges — 11 variants (success, warning, error, info, open, closed, purple, pending, authorized, teal, default) |
| `MBtn` | `components/MBtn.tsx` | shared:43 | Button — 8 variants (primary, success, warning, danger, outline, ghost, secondary, dark). Pressable with `sm`, `fullWidth`, `disabled` props |
| `MCard` | `components/MCard.tsx` | shared:55 | Elevated card with shadow, border, borderRadius. `Platform.select` for iOS shadow vs Android elevation |
| `MAvatar` | `components/MAvatar.tsx` | shared:64 | Circular avatar showing initials. Props: `name`, `size`, `bg` |
| `Stars` | `components/Stars.tsx` | shared:74 | Star rating display (1-5) using SVG. Props: `rating`, `count` |
| `MProgress` | `components/MProgress.tsx` | shared:89 | Horizontal progress bar. Props: `value`, `max`, `color`, `height` |
| `Screen` | `components/Screen.tsx` | shared:118 | SafeAreaView + StatusBar wrapper |
| `AppBar` | `components/AppBar.tsx` | shared:123 | Custom header: back button, title, subtitle, right action. Integrates with `useNavigation()` |
| `ScrollArea` | `components/ScrollArea.tsx` | shared:140 | ScrollView with consistent padding and gap |
| `Field` | `components/Field.tsx` | auth:46 | TextInput with label, focus border (blue glow), error state, placeholder |
| `EmptyIllustration` | `components/EmptyIllustration.tsx` | empty:5 | Centered empty state: icon circle + title + subtitle + CTA button |
| `NotifBanner` | `components/NotifBanner.tsx` | home:26 | Dismissable notification banner with icon, title, body, CTA |
| `CategoryCard` | `components/CategoryCard.tsx` | services | Service category grid item with icon, label, description, count |
| `ProviderCard` | `components/ProviderCard.tsx` | services | Provider list row: avatar, name, address, rating, status, distance |
| `FilterChips` | `components/FilterChips.tsx` | payments | Horizontal scrollable pill filters with active state |
| `SegmentedTabs` | `components/SegmentedTabs.tsx` | payments | Segmented tab control (Upcoming/Past/All, Personal Info/Beneficiaries/Security) |
| `KeyPad` | `components/KeyPad.tsx` | payments:276 | Triple-PIN numeric keypad (3×4 grid with backspace + confirm) |
| `TimelineStep` | `components/TimelineStep.tsx` | credit | Credit status timeline step with dot, line, label, sublabel |

### 3.3 Icon System

~20 SVG icon components in `src/icons/` using `react-native-svg`. Each accepts `size` and `color` props:

**Bottom nav icons** (5): HomeIcon, SearchIcon, InvoiceIcon, WalletIcon, ProfileIcon — with active/inactive variants (fill vs stroke)
**Category icons** (7): PharmacyIcon, LaboratoryIcon, DoctorIcon, RadiologyIcon, HospitalIcon, ClinicIcon, GlobeIcon
**Notification type icons** (5): CreditIcon, AppointmentIcon, PaymentIcon, InvoiceNotifIcon, SystemIcon
**Action icons** (~5): BellIcon, BackArrowIcon, CheckIcon, LockIcon, CalendarIcon

---

## 4. Navigation Architecture

### 4.1 Navigator Hierarchy

```
RootNavigator (checks auth state)
├── AuthStack (Stack Navigator)
│   ├── Splash
│   ├── Login
│   ├── Register
│   └── EmailVerify
│
└── AppTabs (Bottom Tab Navigator)
    ├── HomeStack
    │   ├── Dashboard
    │   └── Appointments
    │
    ├── ServicesStack
    │   ├── FindService
    │   ├── ProviderList          params: { category: string }
    │   ├── ProviderProfile       params: { providerId: string }
    │   ├── BookingForm           params: { providerId: string }
    │   └── BookingConfirm        params: { result: object }
    │
    ├── InvoicesStack
    │   ├── InvoiceList
    │   ├── InvoiceReview         params: { invoiceId: string }
    │   ├── PINAuth               params: { invoiceId: string, amount: number, provider: string }
    │   └── PaymentSuccess        params: { invoiceId: string }
    │
    ├── WalletStack
    │   ├── CreditWallet
    │   ├── CreditApply (Limit Increase)
    │   ├── CreditStatus
    │   └── TransactionHistory
    │
    └── ProfileStack
        ├── Profile
        ├── Beneficiaries
        ├── Notifications
        └── SecurityPIN
```

### 4.2 Bottom Tab Config

| Tab | Icon | Active Color | Stack |
|-----|------|-------------|-------|
| Home | House | `#4AADDF` | HomeStack |
| Services | Search | `#4AADDF` | ServicesStack |
| Invoices | Document | `#4AADDF` | InvoicesStack |
| Wallet | Wallet | `#4AADDF` | WalletStack |
| Profile | Person | `#4AADDF` | ProfileStack |

Tab bar: white bg, `#E2EBF5` top border, 60px height, inactive color `#A0B3CC`, 10px label size.

---

## 5. Shared Code Reuse Strategy

### 5.1 Directly Reusable (copy to shared packages)

| Web Source | Shared Package | Notes |
|-----------|---------------|-------|
| `src/types/*.ts` | `shared-types/` | 100% reusable, zero changes |
| `src/api/services/*.ts` | `shared-api/services/` | All 6 service files, no DOM deps |
| `src/utils/format.ts` | `shared-utils/format.ts` | formatCurrency, formatDate, formatTime12h, formatPhone |
| `src/utils/appointments.ts` | `shared-utils/appointments.ts` | Status derivation logic |
| `src/utils/credit-threshold.ts` | `shared-utils/credit-threshold.ts` | Balance warning thresholds |
| `src/config/countries.ts` | `shared-config/countries.ts` | Kenya, Zimbabwe, Zambia definitions |
| `src/store/*.ts` | `shared-stores/` | Zustand stores — framework-agnostic |
| `src/hooks/api/*.ts` | `shared-hooks/` | React Query hooks work in RN |

### 5.2 Needs Adaptation

| Web Source | Mobile Adaptation | Change Required |
|-----------|------------------|----------------|
| `src/api/client.ts` | `shared-api/client.ts` | Accept `ITokenStorage` via DI instead of importing concrete localStorage impl |
| `src/api/config.ts` | `shared-api/config.ts` | Replace `import.meta.env.VITE_*` with `configure()` function |
| `src/lib/token-storage.ts` | `mobile/src/lib/token-storage.ts` | Replace `localStorage` with `expo-secure-store` |
| `src/api/services/invoices.service.ts` | Same file | Replace `crypto.subtle.digest` with `expo-crypto` for PIN hashing |

### 5.3 Cannot Reuse (mobile-specific)

- All React DOM components → React Native `View`, `Text`, `Pressable`, etc.
- Inline CSS styles → `StyleSheet.create()`
- `react-router-dom` → React Navigation
- `window.localStorage` → `expo-secure-store`
- HTML elements (div, span, input) → RN equivalents

---

## 6. API Endpoints Used by Mobile App

The mobile app (patient-only) uses these endpoints from the shared backend:

### Authentication (6 endpoints)
```
POST /auth/login                    # Email + password login
POST /auth/google                   # Google OAuth
POST /auth/register/patient         # Patient registration
POST /auth/verify-email             # Email verification
POST /auth/forgot-password          # Password reset request
POST /auth/refresh                  # Token refresh
```

### Patient Data (12 endpoints)
```
GET  /patient/profile               # User profile + beneficiaries
GET  /patient/dashboard             # Dashboard aggregate data
GET  /patient/appointments          # All appointments
POST /patient/appointments          # Create appointment
PATCH /patient/appointments/:id/cancel
GET  /patient/transactions          # Transaction history
GET  /patient/notifications         # Notification list
POST /patient/notifications/:id/read
GET  /patient/news                  # Health news feed
POST /patient/beneficiaries         # Add beneficiary
PATCH /patient/beneficiaries/:id    # Update beneficiary
DELETE /patient/beneficiaries/:id   # Remove beneficiary
```

### Invoices & Payments (5 endpoints)
```
GET  /patient/invoices              # Invoice list
GET  /patient/invoices/:id          # Invoice detail
POST /patient/invoices/:id/authorize  # Triple-PIN payment authorization
POST /patient/invoices/:id/reject   # Reject invoice
POST /patient/security/payment-pin  # Setup/change payment PIN
```

### Credit (3 endpoints)
```
GET  /patient/credit/status         # Credit status + application info
POST /patient/credit/apply          # Initial credit application
POST /patient/credit/increase       # Request limit increase
```

### Providers (4 endpoints)
```
GET  /providers                     # All providers
GET  /providers/category/:cat       # Providers by category
GET  /providers/:id                 # Provider detail
GET  /providers/:id/reviews         # Provider reviews
```

**Total: 30 patient-facing endpoints**

---

## 7. Implementation Phases

### Phase 0: Project Setup (2-3 days)

**Tasks:**
1. Create monorepo root with `npm workspaces`
2. Extract shared packages from web app source
3. Create `ITokenStorage` interface in `shared-api`
4. Modify `shared-api/client.ts` to accept storage adapter via DI
5. Replace `import.meta.env.VITE_*` with `configure()` in `shared-api/config.ts`
6. Initialize Expo app: `npx create-expo-app@latest mobile --template blank-typescript`
7. Configure `metro.config.js` for workspace package resolution
8. Install all Expo dependencies
9. Configure `app.json` (name: "GG'APP", slug: "gg-app", android.package: "com.gatewayglobal.ggapp")
10. Update web app imports to use shared packages
11. Verify both apps boot without errors

**Verification:**
- `npx expo start` runs clean
- Web app still works with updated imports
- `console.log(API_BASE_URL)` prints correct URL in both apps

**Web comparison:** Both `apps/web/src/main.tsx` and `apps/mobile/App.tsx` bootstrap the same QueryClient, Zustand stores, and API config.

---

### Phase 1: Design System (3-4 days)

**Tasks:**
1. Create `theme/tokens.ts` from design bundle's `G` object
2. Download and configure Plus Jakarta Sans font files (400, 500, 600, 700, 800)
3. Build all 18 shared components listed in Section 3.2
4. Build all ~20 icon SVG components listed in Section 3.3
5. Create a component demo/storybook screen for visual testing

**Key implementation notes:**
- `MCard` shadow: use `Platform.select({ ios: { shadowColor, shadowOffset, shadowOpacity, shadowRadius }, android: { elevation } })`
- `MBtn` uses `Pressable` with `android_ripple` for feedback
- `Field` uses `TextInput` with `onFocus`/`onBlur` for border animation
- `BottomNav` is handled by React Navigation tab config, not a custom component

**Verification:**
- Render every component on a test screen
- Compare side-by-side with design bundle screenshots
- Verify font loads on Android emulator
- Verify all icon SVGs render at multiple sizes

---

### Phase 2: Auth Flow (2-3 days)

**Tasks:**
1. Implement `mobile/src/lib/token-storage.ts` using `expo-secure-store` with in-memory cache
2. Create `SessionBootstrap.tsx` — loads stored session, holds splash screen
3. Create `AppProviders.tsx` — QueryClient + Zustand + Navigation container
4. Build `RootNavigator.tsx` — checks `useAuthStore().loggedIn`
5. Build `AuthStack.tsx` with 4 routes
6. Build `SplashScreen` — navy gradient, logo, animated dots, copyright
7. Build `LoginScreen` — hero header, Patient/SP toggle, form fields, Google button
8. Build `RegisterScreen` — 3-step form with Zod validation per step

**Design references:**
- Splash: `android-screens-auth.jsx` lines 4-22
- Login: `android-screens-auth.jsx` lines 59-101
- Register: `android-screens-auth.jsx` lines 105-173

**Verification:**
- Splash displays correctly with gradient and logo
- Login submits via `authService.login()`, stores tokens, navigates to Dashboard
- Register validates each step with Zod, submits via `authService.registerPatient()`
- Token persists in SecureStore, survives app restart
- Logout clears SecureStore, returns to Login

---

### Phase 3: Dashboard + Navigation (3-4 days)

**Tasks:**
1. Build `AppTabs.tsx` — 5-tab bottom navigator with custom icons
2. Create all 5 Stack navigators (stubs for unbuilt screens)
3. Build `DashboardScreen` with all 8 sections:
   - Navy gradient header (greeting, flag, date, status pill, notification bell)
   - Notification banners (credit approved, appointment confirmed — dismissable)
   - Stats row (Available Balance + Next Appointment)
   - Spent This Month (total + authorized/settled breakdown)
   - Pending appointment banner
   - Find a Service grid (6 categories + Global Specialists)
   - Appointments section (next appointment card)
   - Health News (dark hero card + white card)
4. Build `EmptyDashboardScreen` — onboarding checklist + apply-for-credit CTA

**Design references:**
- Dashboard: `android-screens-home.jsx` (full file)
- Empty Dashboard: `android-screens-empty-states.jsx` lines 17-106
- Bottom Nav: `android-screens-shared.jsx` lines 96-115

**Data hooks:** `usePatientDashboard()`, `usePatientInvoices()`, `useCreditStatus()`, `usePatientNotifications()`

**Verification:**
- Bottom tabs render with correct icons, colors, and active states
- Dashboard loads real data from API
- All 8 dashboard sections render matching the design
- Empty Dashboard shows for new users (creditStatus === 'not_applied')
- Pull-to-refresh works
- Notification banners dismiss correctly

**Web comparison:** Same `patientService.getDashboard()` call, same data shape, compare section by section.

---

### Phase 4: Services Flow (3-4 days)

> Can run in parallel with Phase 5 and 6 after Phase 3 is complete.

**Tasks:**
1. Build `FindServiceScreen` — search bar, 2×3 category grid, Global Specialists, nearby providers
2. Build `ProviderListScreen` — location warning, filter chips, provider cards
3. Build `ProviderProfileScreen` — header card, stats row, services, hours, reviews, sticky CTA
4. Build `BookingFormScreen` — Myself/Beneficiary toggle, service type, date/time picker, notes
5. Build `BookingConfirmScreen` — success checkmark, booking details card
6. Build `EmptyProviderListScreen` — "No Providers Found"
7. Wire `ServicesStack` navigation with params

**Design references:**
- `android-screens-services.jsx` (full file, 4 screens)
- `android-screens-empty-states.jsx` lines 248-278

**Data hooks:** `useProviders()`, `useProvidersByCategory(category)`, `useProvider(id)`, `useProviderReviews(id)`, `useCreateAppointmentMutation()`

**Platform-specific:** Date/time picker uses `@react-native-community/datetimepicker` wrapped in `Field`

**Verification:**
- Category tap navigates to filtered Provider List
- Provider profile shows all sections from design
- Booking form validates and submits appointment
- Booking confirm shows correct result data
- Empty state renders for categories with 0 providers

---

### Phase 5: Payments Flow (4-5 days)

> Can run in parallel with Phase 4 and 6 after Phase 3 is complete.

**Tasks:**
1. Build `AppointmentsScreen` — 3 stat tiles, tab bar, "Next Up" card, appointment cards
2. Build `InvoiceListScreen` — filter chips, invoice cards with status pills
3. Build `InvoiceReviewScreen` — invoice details, total amount, authorize button
4. Build `PINAuthScreen` — **critical**: 3-step indicator, amount display, 4 PIN dots, 3×4 numpad
5. Build `PaymentSuccessScreen` — green checkmark, receipt card
6. Build `TransactionHistoryScreen` — 2×2 summary grid, filter chips, transaction rows
7. Build empty states: EmptyAppointments, EmptyInvoices, EmptyTransactions
8. Wire `InvoicesStack` and add Appointments to `HomeStack`

**Design references:**
- `android-screens-payments.jsx` (full file, 6 screens)
- `android-screens-empty-states.jsx` lines 109-171

**PIN Auth implementation (most complex interactive screen):**
```
State: currentStep (1|2|3), pin (string), error, isLocked
Each step: user enters 4-digit PIN → calls authorizePayment({ invoiceId, pin, step })
  - Success + complete=false → advance to next step
  - Success + complete=true → navigate to PaymentSuccess
  - Failure → show error, decrement attempts
  - 3 failures → lock for specified duration
PIN hashing: use expo-crypto (Crypto.digestStringAsync) — replaces crypto.subtle
```

**Data hooks:** `usePatientAppointments()`, `usePatientInvoices()`, `usePatientTransactions()`, `useAuthorizePaymentMutation()`

**Verification:**
- Invoice list loads and filters work
- PIN Auth 3-step flow works end-to-end
- PIN lockout after 3 failed attempts per step
- Payment success shows correct receipt data
- Transaction history totals match

---

### Phase 6: Credit & Profile (3-4 days)

> Can run in parallel with Phase 4 and 5 after Phase 3 is complete.

**Tasks:**
1. Build `CreditWalletScreen` — status pills, balance, progress bar, partner card, transactions, beneficiaries
2. Build `CreditApplyScreen` — partner info, current credit grid, increase form, consent checkbox
3. Build `CreditStatusScreen` — approved banner, 4-step timeline
4. Build `ProfileScreen` — navy hero header, stats grid, 3-tab interface, personal details
5. Build `BeneficiariesScreen` — info notice, beneficiary cards, add CTA
6. Build `NotificationsScreen` — filter chips, notification cards with unread dots
7. Build empty states: EmptyWallet, EmptyNotifications, EmptyCreditStatus
8. Wire `WalletStack` and `ProfileStack`

**Design references:**
- `android-screens-credit-profile.jsx` (full file, 6 screens)
- `android-screens-empty-states.jsx` lines 174-291

**Data hooks:** `useCreditStatus()`, `useIncreaseCreditMutation()`, `usePatientProfile()`, beneficiary CRUD mutations, `usePatientNotifications()`

**Verification:**
- Wallet balance and progress bar match calculations
- Limit increase form validates and submits
- Credit status timeline renders all steps correctly
- Profile displays all user fields
- Beneficiary add/edit/delete works
- Notifications filter by type, unread highlighted
- All empty states render correctly

---

### Phase 7: Empty States + Polish (2-3 days)

**Tasks:**
1. Audit all 8 empty states render correctly with proper conditions
2. Add `ActivityIndicator` / skeleton loading for all data screens
3. Add `RefreshControl` (pull-to-refresh) on all ScrollView screens
4. Add `KeyboardAvoidingView` on Login, Register, Booking Form, Credit Apply
5. Add haptic feedback (`expo-haptics`) on button presses and PIN entry
6. Configure StatusBar: light content on navy headers, dark on light screens
7. Configure screen transitions: slide-from-right for stacks
8. Set up app icon and splash screen from GG'APP logo assets
9. Configure `app.json` splash and icon fields

**Verification:**
- Toggle between existing/new user to verify empty states
- No layout jumps when data loads
- Pull-to-refresh works on all list screens
- Keyboard doesn't obscure form fields
- App icon and splash display correctly

---

### Phase 8: Testing & Verification (3-4 days)

**Tasks:**
1. Component unit tests — Jest + React Native Testing Library for all 18 components
2. Screen snapshot tests — all 35 screens in populated + empty states
3. Navigation flow tests — auth → dashboard, booking flow, payment flow
4. API parity tests — verify web and mobile produce identical API calls
5. Design comparison — screenshot each screen on Pixel 7 emulator, compare with design bundle

**Critical cross-platform checks:**

| Check | Web | Mobile | Must Match |
|-------|-----|--------|------------|
| Login API call | `authService.login()` | Same shared function | Identical payload |
| Token refresh | `client.ts` interceptor | Same shared interceptor | Same behavior |
| PIN hashing | `crypto.subtle.digest` | `expo-crypto` | Same SHA-256 output |
| Currency format | `formatCurrency(8000, 'Ksh.')` | Same shared function | `Ksh.8,000.00` |
| Date format | `formatDate(...)` | Same shared function | `Jun 14, 2026` |

---

## 8. Sequencing & Timeline

```
Week 1:  Phase 0 (Setup) + Phase 1 (Design System)
Week 2:  Phase 2 (Auth) + Phase 3 (Dashboard + Nav)
Week 3:  Phase 4 (Services) ─┐
         Phase 5 (Payments) ──┼── parallel
         Phase 6 (Credit)  ──┘
Week 4:  Phase 5 continued + Phase 7 (Polish)
Week 5:  Phase 8 (Testing)
```

**Total estimated: 25-34 working days** for a single developer.
Phases 4, 5, 6 are independent feature branches that can be parallelized.

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `crypto.subtle` unavailable in RN | PIN auth breaks | Use `expo-crypto` (`Crypto.digestStringAsync`) — only affects `invoices.service.ts` |
| Metro workspace resolution | Build fails | Configure `metro.config.js` with `watchFolders` for monorepo packages |
| Zustand async hydration | Flash of auth screen | Use `zustand/middleware` with `createJSONStorage(AsyncStorage)`, hold splash until hydrated |
| SVG icon performance | Slow renders | Memo all icon components, pre-render as PNG if needed |
| Date picker platform differences | Inconsistent UX | Use `@react-native-community/datetimepicker` wrapped in custom Field |
| `window.location` in shared code | Runtime error | Remove from shared package; mobile uses Expo Linking for deep links |

---

## 10. Files Summary

| Category | File Count | Examples |
|----------|-----------|---------|
| Shared packages | ~30 files | types, services, stores, hooks, utils, config |
| Mobile theme | 3 files | tokens.ts, typography.ts, index.ts |
| Mobile components | ~18 files | GGPill, MBtn, MCard, Field, KeyPad, etc. |
| Mobile icons | ~20 files | SVG icon components |
| Mobile navigation | 9 files | Root, Auth, AppTabs, 5 stacks, types |
| Mobile screens | ~25 files | 29 unique screens across 6 categories |
| Mobile screen components | ~20 files | DashboardHeader, StatsGrid, ReviewCard, etc. |
| Mobile providers/lib | 4 files | AppProviders, SessionBootstrap, token-storage, query-client |
| Tests | ~15 files | Component, screen, navigation, e2e |
| **Total new files** | **~145 files** | |
