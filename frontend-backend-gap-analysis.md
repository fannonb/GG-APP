# GG'APP Frontend ↔ Backend Gap Analysis

This document captures the current frontend/backend alignment and lists the frontend work needed to support the backend plan in `backend.md`.

## Current state

### Already aligned

- Auth service layer exists for:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/google`
  - `POST /auth/register/patient`
  - `POST /auth/register/sp`
- API client already handles:
  - bearer token injection
  - automatic refresh on `401`
  - token persistence in local storage
- Backend-aligned query hooks already exist for:
  - patient profile/dashboard/appointments/transactions/notifications/news
  - providers list/category/detail
  - patient invoice list/detail
  - patient payment authorization
  - SP dashboard/appointment/patient/invoice reads
  - admin dashboard/applications/disputes/invoices reads

### Still mock-driven or incomplete

- Email verification is still local-only.
- Patient booking flow does not call backend appointment creation yet.
- Patient credit journey is still a timed mock flow.
- SP onboarding/register flow does not post the application payload.
- SP visit recording and invoice upload are not connected to backend writes.
- Admin review screens are local state only.
- Push notification subscribe/unsubscribe is not exposed in a user flow.
- Several patient/SP screens still render mock data directly instead of using API-backed query hooks.

---

## Missing frontend work

### Authentication and onboarding

- Replace the fake email verification step in `src/features/auth/EmailVerifyScreen.tsx` with a real backend-backed verification flow, or add the missing backend endpoints and wire them in.
- Wire `src/features/auth/components/SPRegisterFlow.tsx` to `POST /auth/register/sp` instead of navigating directly to `/sp/pending`.
- Confirm patient registration success state uses the backend response message and follows the real verification path.
- Add admin login support if admins are expected to sign in from the app, since the current login UI only offers patient and SP tabs.

### Patient portal

- Wire provider browsing screens to API-backed provider queries:
  - `src/features/patient/FindServiceScreen.tsx`
  - `src/features/patient/ProviderListScreen.tsx`
  - `src/features/patient/ProviderProfileScreen.tsx`
- Implement booking creation against `POST /patient/appointments`.
- Replace mock appointment history, transaction history, notifications, and news with API-backed data everywhere:
  - `src/features/patient/AppointmentsScreen.tsx`
  - `src/features/patient/TransactionHistoryScreen.tsx`
  - `src/features/patient/NotificationsScreen.tsx`
  - `src/features/patient/DashboardScreen.tsx`
  - `src/features/patient/NewUserDashboardScreen.tsx`
- Replace direct mock data in patient profile and beneficiaries screens with `GET /patient/profile`.
- Ensure invoice list/review/success screens use live API data and state transitions.

### Payment authorization

- Keep the triple-PIN UI in sync with backend responses from `POST /patient/invoices/:id/authorize`.
- Use backend values for:
  - `attemptsRemaining`
  - `lockedUntil`
  - `complete`
  - any returned message
- Remove local PIN retry logic where it duplicates backend state.

### Patient credit

- Wire the credit journey to backend routes:
  - `GET /patient/credit/wallet`
  - `POST /patient/credit/apply`
  - `POST /patient/credit/increase`
  - `GET /patient/credit/status`
- Replace timed navigation in:
  - `src/features/patient/credit/CreditApplyScreen.tsx`
  - `src/features/patient/credit/CreditIncreaseScreen.tsx`
- Make the credit wallet, status, and increase views render backend status values and partner data.

### Service provider portal

- Connect appointment views to the backend SP routes instead of only using mock state:
  - `GET /sp/dashboard`
  - `GET /sp/appointments/:id`
  - `GET /sp/patients/:id`
  - `GET /sp/invoices/:id`
- Wire visit recording to `POST /sp/visits/record`.
- Wire invoice upload/resubmission to `POST /sp/invoices/upload`.
- Replace local mock data in:
  - `src/features/service-provider/dashboard/*`
  - `src/features/service-provider/appointments/*`
  - `src/features/service-provider/patients/*`
  - `src/features/service-provider/invoices/*`
  - `src/features/service-provider/payments/*`
  - `src/features/service-provider/settings/*`

### Admin portal

- Replace local state mutations with backend updates for:
  - `PATCH /admin/applications/:id`
  - `PATCH /admin/disputes/:id`
  - `PATCH /admin/invoices/:id`
- Keep the admin list screens in sync with backend reads:
  - `GET /admin/dashboard`
  - `GET /admin/applications`
  - `GET /admin/disputes`
  - `GET /admin/invoices`

### Notifications and platform services

- Surface push notification subscribe/unsubscribe in the UI, and wire it to:
  - `POST /notifications/push/subscribe`
  - `POST /notifications/push/unsubscribe`
- Make sure any notification badges and in-app lists are backed by API data, not only local stores.
- Confirm PWA registration and permission prompts follow a visible user flow.

---

## Priority checklist

### P0 — must finish before disabling mock API

1. Wire login, refresh, logout, and role/session handling end-to-end.
2. Replace fake email verification with a real verification flow.
3. Wire patient invoice payment authorization to backend state and lockout responses.
4. Wire SP invoice upload and visit recording to backend write endpoints.
5. Wire patient and SP dashboards to live backend data.
6. Connect patient booking creation to `POST /patient/appointments`.
7. Replace local admin approve/reject actions with backend `PATCH` calls.

### P1 — needed for full portal parity

1. Replace all patient mock lists with API-backed queries.
2. Replace all SP mock lists with API-backed queries.
3. Wire patient credit apply/increase/status flows to backend endpoints.
4. Wire provider search/category/profile views to backend provider endpoints.
5. Add push notification subscribe/unsubscribe UX.
6. Ensure all screen-level loading and error states use `ApiError.message`.

### P2 — polish and resilience

1. Remove duplicate local mock logic once API data is stable.
2. Normalize backend-driven status labels across patient, SP, and admin screens.
3. Add empty states and retry states for all query-backed pages.
4. Verify route protection and redirect behavior for unauthenticated users.
5. Confirm admin access path and user role selection are consistent.

---

## Suggested implementation order

1. Auth and session handling
2. Payment authorization flow
3. SP invoice/visit write flows
4. Patient booking and provider browsing
5. Patient credit journey
6. Admin actions
7. Notifications and push setup
8. Replace remaining mock reads

---

## Notes for implementation

- Use backend response shapes as the source of truth, especially for:
  - `AuthSession.expiresAt`
  - `AuthorizePaymentResult.lockedUntil`
  - status enums for invoices, credit, disputes, and SP applications
- Keep `ApiError.message` as the visible error surface in UI.
- Prefer small API-backed hooks per screen rather than fetching in component-local state.
- Remove `setTimeout`-only success flows once backend endpoints exist.

