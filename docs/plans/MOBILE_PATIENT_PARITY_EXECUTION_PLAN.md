# Mobile Patient Parity Execution Plan

## Goal
Bring the mobile patient app onto the same backend and data contract as the web patient portal, with email and Gmail integration deferred until the final phase.

## Phase 1: Foundation and Contract Alignment
- [x] Align patient appointment payloads with the backend contract.
- [x] Align payment PIN setup payloads with the backend contract.
- [x] Align invoice authorization payloads with the backend contract.
- [x] Restore prescription request support in the shared mobile API and hooks.
- [x] Move the mobile app from hardcoded mock-first bootstrapping to environment-driven API configuration.
- [x] Fix the mobile registration payload to match backend field names and country codes.

## Phase 2: Mobile Screen Wiring
- [x] Update the mobile booking form to send backend-compatible appointment payloads.
- [x] Update the mobile payment PIN screen to use one reusable payment PIN with confirmation.
- [x] Update mobile notification reads to persist through the backend API instead of local state only.
- [x] Add a patient-facing prescription request flow in mobile for pharmacy uploads and status viewing.
- [x] Add attachment support to the mobile booking and prescription flows where the backend already supports it.

## Phase 3: Dashboard and UX Parity
- [x] Reconcile dashboard parity for ad banners and any patient-facing promo inventory.
- [x] Improve payment success receipts to use richer invoice/payment data from the backend.
- [x] Improve invoice attachment handling for PDFs and non-image documents on mobile.
- [x] Reconcile remaining wording and state differences between web and mobile patient flows.

## Phase 4: Verification and Hardening
- [ ] Run an end-to-end parity sweep across new user and returning user states.
- [ ] Verify appointment, invoice, credit, notification, beneficiary, and profile flows against live backend data.
- [x] Clean up the remaining pre-existing TypeScript issues in the mobile monorepo.

## Final Phase
- [ ] Implement email and Gmail integration.
