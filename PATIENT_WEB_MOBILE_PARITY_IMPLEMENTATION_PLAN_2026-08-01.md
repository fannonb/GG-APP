# Patient Web ↔ Mobile Parity and Web Scaffolding Plan

**Date:** 2026-08-01  
**Scope:** Patient-facing functionality in `gg-app` (web) compared with `gg-monorepo/apps/mobile`  
**Shared data rule:** Both clients must continue using the existing NestJS API and shared database. No client should read or write the database directly.

## 1. Executive summary

The web application is already scaffolded beyond a blank shell. It has a React/Vite patient portal, protected routing, responsive layouts, API services, React Query hooks, mock fixtures, and patient screens for the main booking, credit, invoice, prescription, profile, and notification journeys.

The work remaining is primarily **mobile feature parity and contract hardening**, rather than building the web app from zero. The largest confirmed gap is the **Health Ledger**: it is implemented in the web patient portal and backend, but there is no corresponding mobile screen, mobile ledger service, or mobile ledger hooks. The web dashboard also exposes richer event-specific banners than the mobile dashboard.

The recommended implementation sequence is:

1. Establish one authoritative patient API/data contract and verify both clients against the same backend.
2. Port the web-only Health Ledger capability to mobile.
3. Reconcile dashboard notification/banner behavior, including “seen once” persistence.
4. Align provider category CTAs, review eligibility, and pharmacy flows.
5. Close remaining UX, attachment, credit, and verification gaps.

## 2. What was audited

### Web application

- Routes: `gg-app/src/router/AppRouter.tsx`, `gg-app/src/router/PatientRouter.tsx`
- Patient screens: `gg-app/src/features/patient/`
- Patient API layer: `gg-app/src/api/services/patient.service.ts`, `ledger.service.ts`, invoice/provider/review services
- React Query hooks: `gg-app/src/hooks/api/`
- Patient navigation: `gg-app/src/layouts/patient/patientNav.tsx`
- Shared backend: `gg-app/backend/src/modules/patient/`, `providers/`, `ledger/`, `credit/`, and related modules

### Mobile application

- Navigation: `gg-monorepo/apps/mobile/src/navigation/`
- Patient screens: `gg-monorepo/apps/mobile/src/screens/`
- Shared API, hooks, types, stores, and utilities: `gg-monorepo/packages/`
- Mobile patient dashboard, notification, attachment, provider map, review, and credit changes currently in the working tree

### Existing planning documents considered

- `PATIENT_WEB_MOBILE_PARITY_AUDIT_2026-07-24.md`
- `MOBILE_PATIENT_PARITY_EXECUTION_PLAN.md`
- `PATIENT_LEDGER_IMPLEMENTATION_PLAN.md`

The older parity documents are useful history, but this document is the current implementation plan. In particular, the ledger plan still describes the feature as pending even though the backend and web patient UI now contain the ledger implementation.

## 3. Current architecture and shared-database implications

### Web

- React 19 + TypeScript + Vite
- React Router patient portal mounted at `/app/*`
- Axios API client with JWT handling
- TanStack Query for server state
- Zustand for user, auth, notification, and demo state
- Mock mode is enabled by default through `VITE_USE_MOCK_API`
- Live mode uses the configured API base URL and the NestJS backend

### Mobile

- Expo/React Native with React Navigation
- Shared API, hooks, types, stores, and utilities from `gg-monorepo/packages`
- Native attachment, map, secure-storage, and sharing behavior
- Mobile now has several features that were recently hardened independently of the older web implementation, including robust file reading, attachment opening, provider CTAs, review context, and persistent dashboard banners

### Data ownership rules

1. The backend and database remain the source of truth for users, appointments, invoices, credit, prescriptions, notifications, reviews, beneficiaries, and ledger access.
2. Mock data must never be mistaken for parity with live data.
3. Client-only state is appropriate only for presentation concerns such as a locally remembered “banner seen” event. It must not replace backend notification read state.
4. When a feature exists in both clients, request payloads, response fields, status values, and route targets must be compared against the backend DTOs and Prisma models.
5. Sensitive ledger and payment information must remain behind the existing role guards and backend authorization checks.

### Contract risks that must be handled before parity is declared

- The backend defaults to port `3000`, while the mobile development configuration currently uses port `3001`. Live verification must use an explicit, documented environment value rather than assuming either port.
- Backend Google authentication requires both `code` and `redirectUri`; the mobile shared auth method currently sends only `code`, and the mobile Google button has no completed handler.
- The web calls the prescription quote-review endpoint, but the mobile shared API and hooks do not expose `markPrescriptionQuoteReviewed`. Mobile therefore cannot reliably set `quoteReviewedAt`.
- Backend notification screens use web-style paths such as `/app/credit/status?type=increase`, `/app/invoices/:id/success`, and `/app/ledger/access`. Mobile notification routing does not currently resolve all of these paths, and an invoice-success path can fall through to invoice review.
- Mobile shared prescription types are behind the backend/web contract: `rejected`, `deliveryFee`, and `quoteReviewedAt` are missing or incomplete.
- Mobile provider queries do not pass the patient country filter even though the backend supports it, so mobile can show providers from another market.
- Web and mobile normalize abroad-patient residence/market data differently; this can produce different country, currency, and residence displays.
- Base64 attachments expand request size. Mobile permits multiple files at sizes that can exceed the backend's 25 MB JSON body limit, while the web has no matching cap.
- Mobile refresh interception should exclude public auth calls, especially login, from token-refresh handling.

## 4. Patient functionality already implemented on the web

### Authentication and account entry

Implemented in `gg-app/src/features/auth/` and `gg-app/src/router/AppRouter.tsx`:

- Splash and onboarding
- Patient login
- Registration
- Email verification
- Forgot-password and reset-password flows
- Protected patient routing under `/app/*`
- Terms and privacy routes
- Role-based redirect protection for patient, service provider, and admin portals

The mobile app also has patient splash, login, registration, verification, forgot-password, and reset-password screens. The remaining work here is contract and end-to-end verification, not a new web scaffold.

### Dashboard and new-patient experience

Implemented in:

- `gg-app/src/features/patient/DashboardScreen.tsx`
- `gg-app/src/features/patient/NewUserDashboardScreen.tsx`
- `gg-app/src/components/`
- `gg-app/src/utils/credit-notifications.ts`
- `gg-app/src/utils/prescription-notifications.ts`

The web dashboard includes:

- Returning-patient healthcare overview
- New-user setup journey
- Available credit, approved limit, usage, and transaction summary
- Upcoming appointments and pending invoice prompts
- Find-service/category entry points
- Health news
- Low-balance prompt
- Credit application/increase-under-review state
- Credit approval banners
- Appointment confirmation and provider-cancellation banners
- Prescription quote, ready-for-pickup, and prescription-invoice banners
- Active ledger-access banner
- Persistent local “seen” state for several banner families
- Backend notification read mutations when banners are acted on or dismissed

The mobile dashboard has the main overview and recently added persistent banner state, but it does not yet expose the complete web banner set. This is a parity gap, not a database gap.

### Provider discovery and provider profiles

Implemented in:

- `FindServiceScreen.tsx`
- `ProviderListScreen.tsx`
- `ProviderProfileScreen.tsx`
- `components/ProviderLocationMap.tsx`
- `components/PharmacyPrescriptionUpload.tsx`

The web flow supports:

- Service-category discovery
- Country-aware provider queries
- Provider list and profile detail
- Provider status, phone, distance, services, opening hours, license, languages, and established year
- Provider logo lightbox
- OpenStreetMap iframe preview
- Google Maps directions and map links
- Pharmacy prescription upload
- Standard appointment request CTA
- Provider reviews and review submission
- Pharmacy-specific request content

Important implementation differences:

- The web profile currently uses `provider.category === 'pharmacy'` for its pharmacy branch. The mobile profile has newer category helpers for pharmacy-only versus pharmacy-plus-other-category providers.
- The web profile’s review eligibility is based on the latest authorized/paid provider invoice. The mobile implementation is stricter: it requires a completed, appointment-linked visit and displays the service/date/time/beneficiary context.
- The web map is browser iframe-based; mobile uses a native WebView fallback strategy.

### Booking and rebooking

Implemented in:

- `EngageFormScreen.tsx`
- `BookingConfirmScreen.tsx`
- `AppointmentsScreen.tsx`
- `RescheduleReviewScreen.tsx`

The web booking flow supports:

- Provider-aware booking
- Pharmacy-only prescription mode
- Pharmacy-plus-other-category service selector
- Self versus beneficiary booking
- Beneficiary eligibility guidance
- Service selection
- Request description
- Preferred date and time
- Multiple PDF/image attachments
- Drag-and-drop browser upload
- Confirmation screen
- Rebooking from appointment history
- Cancellation and rescheduling review

The mobile app has equivalent booking, confirmation, attachment, cancellation, rescheduling, and rebooking screens. Mobile uses the native document picker and its attachment reader has additional Android URI fallbacks that should not be replaced with browser-only logic.

### Prescription requests

Implemented in:

- `PrescriptionRequestsScreen.tsx`
- `PrescriptionDetailScreen.tsx`
- `PrescriptionConfirmScreen.tsx`
- `components/PharmacyPrescriptionUpload.tsx`
- `api/services/patient.service.ts`

The web patient flow supports:

- Create prescription request
- PDF/image upload
- Pickup or delivery fulfillment
- Delivery address
- Patient notes
- Self/beneficiary selection
- Request status list
- Request detail
- Quote review
- Accept or decline quote
- Link from a prescription request to its invoice

Mobile also has these screens and shared API mutations. The major difference is that mobile has a dedicated upload screen while the web embeds upload in the provider profile and booking flow.

### Credit and wallet

Implemented in:

- `credit/CreditWalletScreen.tsx`
- `credit/CreditDisclaimerScreen.tsx`
- `credit/CreditApplyScreen.tsx`
- `credit/CreditIncreaseScreen.tsx`
- `credit/CreditStatusScreen.tsx`
- credit components and `useCreditQueries.ts`

The web supports:

- Empty wallet state
- Finance partner selection
- Initial credit application
- Consent and employment/income details
- Credit status timeline
- Credit limit increase request
- Approved limit and available balance
- Usage and transactions
- Beneficiary summary
- Low-balance prompt
- Currency and country-aware display

The web credit status screen explicitly has both `requestedAmount` and `approvedAmount`. Any approval banner must distinguish:

- requested increase amount;
- approved increase amount, if different; and
- resulting total credit limit.

The mobile app has equivalent wallet/application/increase/status screens and recently corrected the increase-banner calculation. This distinction should be covered by shared contract tests so the clients do not regress independently.

### Invoices and payments

Implemented in:

- `invoices/InvoiceListScreen.tsx`
- `invoices/InvoiceReviewScreen.tsx`
- `invoices/PINAuthScreen.tsx`
- `invoices/PaymentSuccessScreen.tsx`
- `TransactionHistoryScreen.tsx`

The web supports:

- Invoice list
- Pending authorization prompts
- Invoice detail/review
- Attachment display
- Invoice authorization
- Payment PIN authentication
- Payment success receipt
- Transaction history
- Provider/service/billed-to information
- Prescription invoice linkage

The mobile app has the same main screens. Mobile has more platform-specific attachment handling for Android local/content URIs and richer appointment-context review behavior. The web should remain the reference for browser file input and the mobile implementation should remain native rather than sharing browser `FileReader` code.

### Profile, beneficiaries, security, and notifications

Implemented in:

- `ProfileScreen.tsx`
- `PaymentPinSetupScreen.tsx`
- `NotificationsScreen.tsx`
- `patient.service.ts`
- patient mutation/query hooks

The web supports:

- Personal information display/edit
- Residence country and market-country distinction
- Currency display
- Beneficiary enable/disable
- Beneficiary create/edit/delete
- Beneficiary country, relation, DOB, and national ID fields
- Payment PIN status and setup/reset
- Password change
- Notification filtering
- Mark one notification read
- Mark all notifications read
- Notification route resolution from backend-provided screen data

The mobile app has equivalent profile, beneficiary, security PIN, and notifications screens. Its information architecture is split across separate native screens, whereas web consolidates several sections into profile tabs.

## 5. Confirmed parity matrix

| Capability | Web status | Mobile status | Pending action |
|---|---|---|---|
| Auth and protected patient portal | Implemented | Implemented | Verify live backend flows and refresh behavior in both |
| New and returning dashboards | Implemented | Implemented | Align data loading, empty-state rules, and banner inventory |
| Service discovery | Implemented | Implemented | Contract-test filters, country selection, and provider categories |
| Provider profile | Implemented | Implemented | Align pharmacy multi-category CTA logic and profile fields |
| Provider map | Web iframe + external map links | Native WebView + fallback | Verify coordinates, missing-coordinate fallback, and directions on both |
| Provider reviews | Implemented | Implemented | Make web use completed appointment-linked eligibility and context |
| Appointment booking | Implemented | Implemented | Verify attachment payloads and beneficiary linkage |
| Booking attachments | Browser FileReader | Native picker with fallbacks | Keep platform-specific readers; add size/type/encoding tests |
| Appointment list/cancel/rebook/reschedule | Implemented | Implemented | Verify status transitions and notification invalidation |
| Prescription request | Implemented | Implemented | Align entry points and quote/invoice status presentation |
| Invoices and payment | Implemented | Implemented | Verify attachment opening and payment PIN contract |
| Credit application/increase | Implemented | Implemented | Share requested/approved/total calculation rules |
| Credit approval banners | Rich web banner set | Mobile persistent banners, smaller inventory | Align event mapping and seen/read behavior |
| Notifications page | Backend read state + routing | Backend read state + routing | Add cross-client contract tests |
| Beneficiaries | Implemented in profile tabs | Implemented as native screens | Align enable/disable and empty-state wording |
| Password and payment PIN | Implemented | Implemented | Verify reset/setup return navigation |
| Health Ledger | Implemented in web and backend | Missing from mobile | Port to mobile; highest-priority feature gap |
| Ledger access banner | Implemented on web dashboard | Missing | Add mobile dashboard banner and route |
| Ledger API hooks | Web-specific implementation | Mobile query keys exist but hooks/service are absent | Add shared ledger API types/service/hooks |

## 6. Features implemented on web but missing from mobile

### Priority 0 — Health Ledger

Web patient routes:

- `/app/ledger`
- `/app/ledger/pin`
- `/app/ledger/access`

Web files:

- `src/features/patient/ledger/HealthLedgerScreen.tsx`
- `src/features/patient/ledger/LedgerPinSetupScreen.tsx`
- `src/features/patient/ledger/LedgerAccessScreen.tsx`
- `src/api/services/ledger.service.ts`
- `src/hooks/api/useLedgerQueries.ts`
- `src/hooks/api/useLedgerMutations.ts`
- `src/types/ledger.types.ts`

Backend routes already present:

- `POST /patient/ledger/pin`
- `DELETE /patient/ledger/pin`
- `GET /patient/ledger/status`
- `GET /patient/ledger`
- `GET /patient/ledger/access`
- `PATCH /patient/ledger/grants/:id/revoke`

Mobile has no ledger route, screen, service, hook, or ledger type usage. The mobile shared query-key file contains ledger keys, but `packages/shared-hooks/src/index.ts` does not export ledger hooks and the mobile source has no ledger references.

### Priority 0 — Prescription quote-review contract

The web exposes the complete quote lifecycle, including marking a quote as reviewed before accepting or declining it. Mobile can accept or decline a quote but does not currently call:

- `PATCH /patient/prescription-requests/:id/review`

This leaves `quoteReviewedAt` unset and can cause inconsistent dashboard/invoice behavior. Add the shared API method, mutation hook, response fields, and mobile UI state before declaring prescription parity complete.

### Priority 1 — Dashboard event-specific banners

Web has separate handling for:

- credit approvals;
- confirmed appointments;
- provider-cancelled appointments;
- prescription quotes;
- prescriptions ready for pickup/delivery;
- prescription-linked invoices; and
- active ledger access.

Mobile has general notifications and some dashboard banners, including recently persisted “viewed” state, but not the full web inventory. Add the missing event-specific flows without duplicating server notification state.

### Priority 1 — Web’s ledger-aware dashboard state

The web dashboard calls `useLedgerStatus()` and surfaces active provider access. Mobile should do the same after the ledger foundation is added.

### Priority 2 — Web-specific review and provider behavior

The mobile implementation is currently more correct for the user requirement: only show review after a completed appointment and identify the appointment. Bring that logic to the web instead of porting the older web “latest paid invoice” shortcut into mobile.

### Priority 2 — Web/provider category branch consistency

The web provider profile and pharmacy upload branch should use one shared category helper:

- pharmacy only → upload prescription only;
- pharmacy plus another category → upload prescription and book appointment;
- non-pharmacy → book appointment.

The same helper should be used by provider profile, booking mode selection, dashboard/service entry points, and tests.

### Priority 2 — Authentication and routing gaps

The web supports Google OAuth with `code` and `redirectUri`, while mobile has only a partial shared method and no working login button handler. Mobile also needs:

- backend-compatible Google OAuth payload and callback handling;
- verification/resend behavior backed by the API;
- reset-password/deep-link handling;
- notification route resolution for web-style backend screens;
- explicit handling for invoice-success, credit-increase, and ledger destinations.

### Priority 2 — Mobile-only limitations to resolve during parity work

These are not web-only features, but they can make a mobile implementation appear complete while behaving differently:

- Provider discovery must pass the patient country to avoid cross-market results.
- Mobile booking needs provider availability or an explicit product decision that fixed time slots are acceptable.
- Booking confirmation must preserve beneficiary display information.
- Mobile mock state should simulate quote review and status progression or clearly label those flows as mock-only.
- Mobile wallet should use live partner/account values everywhere instead of hardcoded demo values.
- Mobile appointment, prescription, and invoice types should match backend statuses and fields.
- Mobile should add dedicated not-found/error states for missing invoices and unavailable attachments.
- Root navigation should validate the stored role instead of entering the patient shell for any logged-in session.

## 7. Recommended implementation plan

### Phase 0 — Baseline and contract verification

**Deliverables**

- Confirm the live API base URL for web and mobile.
- Confirm both clients point to the same backend environment and database.
- Confirm auth roles and token refresh behavior.
- Run web and mobile type checks/builds independently and record pre-existing failures.
- Add a small endpoint/contract checklist for patient flows.
- Decide and document the canonical development API port; do not silently assume mobile `3001` when the backend default is `3000`.
- Verify Google OAuth payloads, notification route paths, prescription quote-review behavior, country filters, and abroad-patient normalization.
- Establish a shared attachment-size budget that accounts for base64 expansion and the backend JSON body limit.

**Files/areas**

- `gg-app/.env.example` and API config
- `gg-app/src/api/client.ts`
- mobile API configuration and `packages/shared-api/src/client.ts`
- backend controllers and DTOs

**Acceptance criteria**

- A patient created or updated through web is visible in mobile.
- An appointment, invoice, credit status, notification, beneficiary, or prescription created through one client is visible in the other after query invalidation/refetch.
- No client has a patient-only mock fallback enabled when live verification is being performed.
- A failed login does not trigger token refresh using a stale session.
- A backend notification route resolves to the correct mobile destination, including payment success and ledger screens.

### Phase 1 — Make the shared contract authoritative

**Deliverables**

- Compare web-local types with `packages/shared-types`.
- Promote missing patient response fields into the shared contract where safe.
- Align enum/status names for appointments, invoices, prescriptions, notifications, and credit.
- Add missing mobile prescription fields and statuses, including `rejected`, `deliveryFee`, and `quoteReviewedAt`.
- Define one `PatientInvoice` appointment-context shape for review eligibility.
- Define one `CreditApplication` shape containing requested and approved amounts.
- Add shared category helpers for provider categories.
- Normalize patient residence/market/currency behavior for patients living abroad.
- Add a canonical notification route resolver that supports web backend paths and native mobile destinations.

**Important rule**

Do not force the web app to import the mobile monorepo packages unless workspace ownership is intentionally changed. Prefer a clear shared contract package or synchronized API types, then make both clients consume the same definitions.

### Phase 2 — Port Health Ledger to mobile

**Deliverables**

1. Add shared ledger types:
   - `LedgerEntry`
   - `LedgerGrant`
   - `LedgerStatusResponse`
   - `LedgerAccessLogResponse`
   - `SetupLedgerPinPayload`
2. Add ledger methods to the shared API service:
   - setup/rotate PIN;
   - revoke PIN;
   - get status;
   - get own ledger, including beneficiary filter;
   - get access log;
   - revoke one grant.
3. Add shared React Query hooks and exports.
4. Add mobile navigation:
   - Ledger hub;
   - Ledger PIN setup/rotation;
   - Ledger access log.
5. Reuse the mobile keypad/PIN patterns, but keep ledger PIN separate from payment PIN.
6. Add a dashboard entry point and active-grant banner.
7. Add refresh/invalidation after setup, rotation, revoke, and grant revoke.

**Security requirements**

- Never store the ledger PIN in plaintext.
- Do not reuse the payment PIN credential.
- Treat backend grant validity as authoritative; client countdowns are presentation only.
- Do not display provider-private `internalNote`.
- Do not include national ID in ledger payloads.
- Revoke active grants when the PIN is rotated or revoked, as enforced by backend behavior.

**Acceptance criteria**

- Patient can create, rotate, and revoke a ledger PIN in mobile.
- Patient sees own and beneficiary treatment history.
- Patient can filter the ledger by self, all, or beneficiary.
- Patient sees active provider grants and can revoke one.
- Patient sees an auditable access history.
- A provider unlock notification routes to the ledger/access screen.
- Web and mobile show the same ledger records for the same patient.

### Phase 3 — Reconcile dashboard notifications and seen state

**Deliverables**

- Create a shared notification-to-dashboard-event mapping.
- Add mobile handling for the web-only event-specific banner families.
- Keep backend `read` state authoritative for the notifications page.
- Keep client-local “seen on dashboard” state separate from backend read state.
- Scope local seen keys by patient account and event ID.
- Ensure a banner is marked seen only after it is actually rendered/visible.
- Ensure action and dismiss both mark the event consistently.
- Add ledger-access banner handling after Phase 2.
- Add mobile prescription quote-reviewed mutation and invalidate prescription/invoice/dashboard queries after it succeeds.

**Acceptance criteria**

- A banner does not reappear after navigation or app restart for the same account and event.
- A new event with a new notification ID still appears.
- Marking a dashboard banner seen does not incorrectly mark unrelated notifications read.
- Opening the notification page reflects the backend read state on both clients.

### Phase 4 — Provider, review, and prescription parity

**Deliverables**

- Apply one pharmacy/category helper to web and mobile.
- Fix web provider profile CTA branches.
- Require completed appointment plus appointment-linked invoice for web review prompts.
- Show review context: provider, service, date, time, and self/beneficiary.
- Keep review submission tied to the specific invoice/appointment.
- Align prescription upload entry points and quote/invoice states.
- Verify provider location data and graceful fallback when coordinates are missing.
- Add an explicit reviewed-quote state before pharmacy invoice authorization.

**Acceptance criteria**

- Pharmacy-only providers show upload prescription only.
- Pharmacy-plus-other-category providers show upload prescription and book appointment.
- Other providers show book appointment.
- Review UI is absent before a completed appointment.
- Review UI identifies the completed appointment and disappears after successful submission.

### Phase 5 — Attachments, payments, and credit hardening

**Deliverables**

- Test browser file input and native document-picker payloads against the same backend DTO.
- Keep mobile’s content URI/cache/base64 fallback logic.
- Keep web’s FileReader logic browser-specific.
- Test PDF/image attachment opening on Android, iOS, and browser.
- Enforce a shared attachment count/size budget after base64 expansion, or move large files to a dedicated upload endpoint.
- Verify invoice appointment context and prescription invoice links.
- Add credit calculation tests for:
  - initial approval;
  - increase request;
  - approved increase;
  - changed approved amount;
  - resulting total limit.
- Ensure banners display requested increase and total limit as separate values.

### Phase 6 — UX and release verification

**Deliverables**

- Align web/mobile wording, empty states, status labels, and loading/error states.
- Add responsive web checks for mobile-width browser layouts.
- Add Android/iOS checks for native-only flows.
- Add live-backend parity checklist to release process.
- Document API environment setup for both clients.

## 8. Proposed test matrix

### Account and profile

- Register, verify, login, logout, token refresh
- Edit profile and residence country
- Enable beneficiaries
- Add, edit, and remove beneficiary
- Book for self and beneficiary
- Change password
- Create/reset payment PIN

### Services and booking

- Browse categories
- Filter providers by country/category
- Open provider profile with and without coordinates
- Verify pharmacy-only, pharmacy-plus-category, and non-pharmacy CTAs
- Submit appointment with no attachment
- Submit appointment with one image/PDF
- Submit appointment with multiple attachments
- Rebook completed/cancelled appointment
- Cancel and reschedule appointment

### Prescriptions

- Submit pickup prescription
- Submit delivery prescription
- Submit for self and beneficiary
- Review, accept, and decline quote
- Follow prescription-linked invoice
- Open attached prescription document

### Invoices and credit

- View pending invoice
- Open image/PDF attachment
- Set payment PIN when missing
- Authorize invoice
- View success receipt and transaction
- Apply for initial credit
- Request credit increase
- Verify requested amount versus approved amount versus total limit
- Verify approval banners are seen once

### Notifications and ledger

- Mark one notification read
- Mark all notifications read
- Route each notification type to its backend-provided screen
- View dashboard event banner
- Dismiss or act on banner
- Restart app/browser and verify seen state
- Create/rotate/revoke ledger PIN
- Filter ledger by self/beneficiary
- Revoke active provider grant
- View access log

## 9. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Web and mobile use separate local type definitions | Silent payload/response drift | Establish shared contract/types and contract tests |
| Mock mode hides live API gaps | False parity confidence | Run a live-backend smoke suite before marking features complete |
| Notification read and banner-seen state are conflated | Banners recur or notifications disappear incorrectly | Keep server read state and account-scoped local seen state separate |
| Provider categories are represented differently across responses | Wrong CTA shown | Normalize categories once and test all three category cases |
| Review eligibility is inferred from payment only | Users review before a completed visit | Require completed appointment plus linked invoice |
| Native and browser attachment URIs differ | Upload/open failures on mobile | Keep platform-specific adapters with shared payload tests |
| Ledger contains sensitive clinical data | Privacy/security exposure | Reuse backend guards, grants, audit trail, and field exclusion tests |
| Existing build errors obscure new regressions | Verification becomes unreliable | Record baseline failures and require changed-file checks plus targeted builds |

## 10. Definition of done

The web/mobile patient parity effort is complete when:

1. Both clients use the same live backend and database without client-specific data fabrication in live mode.
2. The mobile patient app exposes the web Health Ledger feature with the same authorization and data semantics.
3. Dashboard event banners are functionally aligned and do not recur after being viewed for the same account/event.
4. Provider category CTAs and review eligibility match the agreed business rules.
5. Attachments work through browser and native picker paths.
6. Credit approval messaging clearly distinguishes requested increase, approved amount, and total limit.
7. Cross-client smoke tests prove that changes made in web are visible in mobile and vice versa.
8. Remaining build/lint failures are either fixed or documented as pre-existing with ownership and follow-up.

