# Patient Ledger — Implementation Plan

**Date:** 2026-07-28
**Status:** Approved direction, pending implementation
**Requested by:** Service providers — a patient-consented, cross-provider view of treatment & diagnosis history

---

## 1. Feature overview

A **Patient Ledger** is a unified, chronological view of a patient's clinical history across **all** service providers on the platform: which provider/entity delivered the treatment, vitals, diagnosis, treatment, follow-up, services rendered, and dispensed medication.

**Consent model:** The patient generates a **Ledger PIN** in their dashboard. Sharing that PIN with a service provider constitutes consent. The provider enters the patient's identifier + PIN to **unlock** the ledger. Access is granted as a time-boxed, auditable, revocable **grant**.

### Locked decisions

| Decision | Choice |
|---|---|
| Access duration after unlock | **24 hours** (sliding window per grant) |
| PIN model | **One PIN per patient** — any provider holding it can unlock; each unlock creates its own grant |
| Record scope | **Patient's own records + all beneficiary records** under that patient account |
| Internal notes | **Never shared** — `internalNote` stays provider-private |

---

## 2. Current-state findings (why we build it this way)

### What already works

- `ProviderVisit` (Prisma) already stores the right clinical payload: `diagnosis`, `treatment`, `followUp`, `services` (Json), `vitals` (Json), linked to `providerId` + `patientUserId`, optional `appointmentId`.
- `POST /sp/visits` + `SPRecordVisitScreen` already capture this data.
- Payment PIN pattern exists: 4-digit PIN → bcrypt on `User.paymentPinHash`, Redis attempt/lockout keys, `PINAuthScreen` keypad + `PaymentPinSetupScreen` — directly reusable patterns.
- `SPPatientDetailScreen` has a polished visit-timeline UI — reusable for ledger display.
- `Notification` model exists for patient alerts.

### Gaps this plan fixes

| Gap | Problem | Fix |
|---|---|---|
| `ProviderVisit` is write-only | No list/read endpoint; data never surfaces | New read endpoints (Phases 1 & 3) |
| `mapPatient` fakes clinical data | `sp.service.ts` builds visit history from **invoices** with hardcoded empty vitals/conditions/allergies | Phase 1 refactor to read `ProviderVisit` |
| Clinical fields duplicated on `Invoice` | Same diagnosis/treatment stored in two places, can drift | Deprecate invoice clinical writes after Phase 1 |
| No beneficiary link on visits | `ProviderVisit` has no `beneficiaryId` — can't attribute beneficiary treatment | Schema addition (Phase 0) |
| No consent/audit model | Nothing gates or records cross-provider access | `LedgerPin`, `LedgerAccessGrant`, `LedgerAccessAudit` (Phase 2–3) |
| Clinical data stored in plaintext | Diagnosis/treatment are as sensitive as national IDs | Optional at-rest encryption (Phase 4) |

---

## 3. Data model

### 3.1 New models (Prisma)

```prisma
model LedgerPin {
  id            String    @id @default(cuid())
  patientUserId String    @unique
  pinHash       String
  status        LedgerPinStatus @default(ACTIVE)
  expiresAt     DateTime? // optional patient-set expiry; null = no expiry
  createdAt     DateTime  @default(now())
  rotatedAt     DateTime?
  revokedAt     DateTime?
  patient       User      @relation("LedgerPinPatient", fields: [patientUserId], references: [id])
}

enum LedgerPinStatus {
  ACTIVE
  REVOKED
}

model LedgerAccessGrant {
  id            String    @id @default(cuid())
  patientUserId String
  providerId    Int
  unlockedAt    DateTime  @default(now())
  expiresAt     DateTime  // unlockedAt + 24h
  revokedAt     DateTime?
  patient       User      @relation("LedgerGrantPatient", fields: [patientUserId], references: [id])
  provider      Provider  @relation(fields: [providerId], references: [id])
  @@index([patientUserId, providerId])
  @@index([expiresAt])
}

model LedgerAccessAudit {
  id            String   @id @default(cuid())
  patientUserId String
  providerId    Int?
  action        LedgerAuditAction
  metadata      Json?    // e.g. { failedAttempts: 3 } or { grantId }
  createdAt     DateTime @default(now())
  patient       User     @relation("LedgerAuditPatient", fields: [patientUserId], references: [id])
  provider      Provider? @relation(fields: [providerId], references: [id])
  @@index([patientUserId, createdAt])
}

enum LedgerAuditAction {
  PIN_CREATED
  PIN_ROTATED
  PIN_REVOKED
  UNLOCK_SUCCESS
  UNLOCK_FAILED
  LEDGER_VIEWED
  GRANT_REVOKED
  GRANT_EXPIRED
}
```

### 3.2 Amendments to existing models

```prisma
model ProviderVisit {
  // ... existing fields ...
  beneficiaryId String?       // NEW — attribute visits to a beneficiary
  beneficiary   Beneficiary?  @relation(fields: [beneficiaryId], references: [id])
}
```

- `User` gains relations: `ledgerPin LedgerPin?`, `ledgerGrants LedgerAccessGrant[]`, `ledgerAudits LedgerAccessAudit[]`.
- `Provider` gains: `ledgerGrants LedgerAccessGrant[]`, `ledgerAudits LedgerAccessAudit[]`.
- `Beneficiary` gains: `visits ProviderVisit[]`.
- One migration: `YYYYMMDDHHMMSS_add_patient_ledger`.

### 3.3 Design rules

1. **PIN identifies consent; grant scopes access.** One PIN, many per-provider grants, each 24h.
2. **Rotating or revoking the PIN invalidates ALL active grants** (revoke sets `revokedAt` on every unexpired grant) — a leaked PIN can be killed instantly.
3. **Re-unlock refreshes.** If a provider already has an unexpired grant, re-entering the PIN extends a new 24h window (new grant row; audit `UNLOCK_SUCCESS`).
4. **Grant validity check (single source of truth):** `revokedAt IS NULL AND expiresAt > now()`.
5. **Beneficiary inclusion:** ledger queries cover `patientUserId` (self + all beneficiary-linked visits/prescriptions, since beneficiary activity is recorded under the patient's user account with `beneficiaryId` attribution).

---

## 4. Backend implementation

### 4.1 New module: `backend/src/modules/ledger/`

Files: `ledger.module.ts`, and feature logic split between patient-side and SP-side controllers (reuse existing module structure rather than a standalone module — see routing below). All endpoints JWT-guarded with existing `JwtAuthGuard` + `RolesGuard`.

### 4.2 Patient endpoints (`/patient/ledger/*`, role `PATIENT`)

| Method | Route | Description |
|---|---|---|
| POST | `/patient/ledger/pin` | Create or rotate PIN. Body: `{ pin, confirmPin, currentPin? }` (currentPin required on rotation). bcrypt hash, Redis attempt keys. Rotating revokes all active grants. Audit: `PIN_CREATED` / `PIN_ROTATED`. |
| DELETE | `/patient/ledger/pin` | Revoke PIN + all active grants. Audit: `PIN_REVOKED`. |
| GET | `/patient/ledger/status` | `{ hasPin, activeGrants: [...], expiresAt }` — for dashboard UI. |
| GET | `/patient/ledger` | Patient's own unified ledger (same payload SP sees, incl. beneficiaries). |
| GET | `/patient/ledger/access` | Access log: grants + audit entries with provider names ("City Hospital viewed your ledger on …"). |
| PATCH | `/patient/ledger/grants/:id/revoke` | Revoke one provider's grant. Audit: `GRANT_REVOKED`. |

### 4.3 SP endpoints (`/sp/ledger/*`, role `SP`)

| Method | Route | Description |
|---|---|---|
| POST | `/sp/ledger/unlock` | Body: `{ patientIdentifier, pin }`. `patientIdentifier` = phone **or** email (exact match, case-insensitive). Validates PIN against `LedgerPin.pinHash`. On success: creates 24h grant + `UNLOCK_SUCCESS` audit + patient notification. On failure: `UNLOCK_FAILED` audit; **5 failures → 30 min Redis lockout** per (provider, patient) pair; patient notified on lockout. |
| GET | `/sp/ledger/:patientUserId` | Returns the cross-provider ledger **iff** a valid grant exists (else `403 LEDGER_ACCESS_REQUIRED`). Audit: `LEDGER_VIEWED`. |

**Unlock security rules:**
- Constant-time compare via bcrypt; never reveal whether the patient exists vs. PIN wrong (single generic error).
- Rate-limit: 5 attempts/30 min per provider+patient; 10/day per provider account (anti-enumeration).
- SP must be `ACTIVE` provider in good standing (reuse `assertLoginAccess` checks).

### 4.4 Ledger payload shape

```ts
type LedgerEntry =
  | {
      kind: 'VISIT';
      id: string;
      date: string;                    // ProviderVisit.createdAt
      provider: { id: number; name: string; category: ProviderCategory };
      patient: { name: string; beneficiaryName?: string }; // beneficiary attribution
      diagnosis?: string;
      treatment?: string;
      followUp?: string;
      services?: string[];
      vitals?: Record<string, string>;
      // internalNote EXCLUDED
    }
  | {
      kind: 'PRESCRIPTION';
      id: string;
      date: string;                    // fulfilledAt
      provider: { id: number; name: string; category: ProviderCategory };
      patient: { name: string; beneficiaryName?: string };
      items: Array<{ name: string; quantity?: string; unitPrice?: number }>;
      fulfillmentMode: 'PICKUP' | 'DELIVERY';
    };
```

- Source: `ProviderVisit` (all providers, `patientUserId` = patient) + `PrescriptionRequest` where status = `FULFILLED`.
- Sorted descending by date. Cursor pagination (`?cursor=&limit=20`).
- Beneficiary name resolved via `beneficiaryId` → `Beneficiary.name`.

### 4.5 Phase 1 refactor: fix existing SP patient views (prerequisite)

1. Add `GET /sp/visits?patientId=` (list own-provider visits).
2. Rewrite `mapPatient` in `sp.service.ts` to build `visitHistory` from `ProviderVisit` (real vitals/services), not invoices. Remove hardcoded `conditions: []`, `allergies: []`, fake `vitals` — populate from visit data or omit.
3. Stop writing `diagnosis`/`treatment`/`followUp`/`internalNote` on `Invoice` creation (keep columns for historical data; backfill historical invoices → `ProviderVisit` in a data migration where an appointment link exists).
4. `CreateProviderVisitDto`: add optional `beneficiaryId` (validate beneficiary belongs to patient).

### 4.6 Notifications

- New `NotificationType`: add `LEDGER` to the enum (migration).
- Events: unlock success ("{Provider} accessed your health ledger"), lockout ("Someone made multiple failed attempts…"), grant revoked, PIN rotated.

---

## 5. Frontend implementation

### 5.1 API layer

- `src/api/services/ledger.service.ts` (patient side): `setupPin`, `revokePin`, `getStatus`, `getLedger`, `getAccessLog`, `revokeGrant` — mirroring `patient.service.ts` mock/real split; add mock fixtures since `VITE_USE_MOCK_API` defaults on.
- Extend `src/api/services/sp.service.ts`: `unlockLedger`, `getLedger`.
- React Query hooks in `src/hooks/api/` (e.g. `useLedgerStatusQuery`, `useUnlockLedgerMutation`); add query keys to `src/api/query-keys.ts`.
- Types in `src/api/types.ts`: `LedgerEntry`, `LedgerGrant`, `LedgerAccessEvent`.

### 5.2 Patient UI (`/app/*`)

| Screen | Route | Notes |
|---|---|---|
| Health Ledger hub | `/app/ledger` | New route + nav entry ("Health Ledger" in `patientNav.tsx`). Sections: PIN status, share instructions, my ledger timeline, who has access. |
| Ledger PIN setup/rotate | `/app/ledger/pin` | Reuse `PaymentPinSetupScreen` pattern (4-digit + confirm; current PIN on rotate). |
| Access log | `/app/ledger/access` | List of grants/audit entries with provider name + timestamp + per-grant **Revoke** button. |

Also surface on Dashboard: banner when a provider has active access ("City Hospital can view your ledger until …").

### 5.3 SP UI (`/sp/*`)

| Screen | Route | Notes |
|---|---|---|
| Unlock modal/screen | `/sp/ledger/unlock` | Patient identifier + 4-digit PIN keypad (reuse `PINAuthScreen` components). Entry points: `SPPatientHistoryScreen` ("Unlock Patient Ledger" button), appointment detail, record-visit flow. |
| Patient ledger view | `/sp/patients/:id/ledger` | Reuse `SPPatientDetailScreen` visit-timeline styling; entries grouped by date, each showing **provider name + category badge**, vitals grid, services chips, diagnosis/treatment/follow-up, prescription entries. Header shows grant expiry countdown. |

- Register both routes in `src/router/routes.ts` (note: `/sp/visits/record` is currently hardcoded — add it too while there).
- On 403 `LEDGER_ACCESS_REQUIRED`, redirect to unlock screen with the patient preselected.

### 5.4 Design system

No new primitives needed — `GGCard`, `GGBadge`, `GGButton`, `GGInput`, `StepIndicator` cover everything. Use `C.blue500` accent for ledger/consent states, `C.warning` for expiring grants, `C.error` for revoked.

---

## 6. Phased delivery plan

| Phase | Scope | Deliverables | Depends on |
|---|---|---|---|
| **0** | Schema foundation | Migration: `LedgerPin`, `LedgerAccessGrant`, `LedgerAccessAudit`, `ProviderVisit.beneficiaryId`, `NotificationType.LEDGER` | — |
| **1** | Fix visit reads | `GET /sp/visits`; `mapPatient` uses `ProviderVisit`; stop invoice clinical writes; backfill migration; DTO `beneficiaryId` | 0 |
| **2** | Patient consent surface | Patient PIN endpoints + lockout; `GET /patient/ledger` (own records); ledger hub, PIN setup, access-log UI | 0 |
| **3** | SP unlock + cross-provider ledger | Unlock endpoint + rate limits + notifications; `GET /sp/ledger/:id`; SP unlock screen + ledger timeline UI | 2 |
| **4** | Hardening & polish | Dashboard banners, admin audit view, grant-expiry sweep (cron marking `GRANT_EXPIRED`), at-rest encryption of `diagnosis`/`treatment` via `FieldEncryptionService`, beneficiary filtering polish | 3 ✅ shipped |

Phase 1 ships value independently (fixes fake vitals + data duplication). Phases 2–3 are the feature proper.

---

## 7. Security & compliance checklist

- [x] PIN stored only as bcrypt hash (never reuse `paymentPinHash` — separate credential, separate purpose).
- [x] Unlock attempts rate-limited (5/30 min per pair, 10/day per provider) with Redis keys.
- [x] Generic error responses on unlock (no patient-existence enumeration).
- [x] Every unlock/view/revoke audited in `LedgerAccessAudit` and visible to the patient.
- [x] Patient notification on unlock, lockout, revoke.
- [x] `internalNote` excluded from all ledger responses (unit-tested).
- [x] Grant expiry enforced server-side only (never trust client countdown).
- [x] National ID never included in ledger payloads.
- [x] Phase 4: encrypt clinical free-text at rest (AES-256-GCM, existing service).
- [x] Admin can view ledger-access audits for dispute resolution.

---

## 8. Open items (non-blocking)

1. **Structured medications table** — meds currently live in `treatment` free-text + `PrescriptionRequest.quotedItems`. Ledger uses fulfilled prescriptions for now; a dedicated `Medication` entity is a future improvement.
2. **Structured diagnoses (ICD-10)** — free text today; consider coding later for analytics.
3. **Allergies/conditions** — appointment stubs are empty today; once captured, fold them into a ledger "summary" header.
4. **Patient-set PIN expiry** — model supports `expiresAt`; UI can expose it in Phase 4.
5. **Provider-side re-consent prompt** — e.g. warn SP when recording a visit without an active grant ("patient history unavailable").
