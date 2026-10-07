# GG'APP Tech Stack

## 7.2 Frontend Technologies

GG'APP leverages modern frontend technologies to deliver a responsive and performant user experience.

| Category | Technology | Key Features & Benefits |
|---|---|---|
| **Core Framework** | React 18, TypeScript, Vite + vite-plugin-pwa | Component-based UI, strict typing, fast development/builds, PWA installability & offline support. |
| **Routing & State** | React Router v6, TanStack Query v5, Zustand | Declarative client-side routing, efficient API data fetching/caching, lightweight global UI state management. |
| **UI, Styling & Forms** | Tailwind CSS v3, shadcn/ui, React Hook Form, Zod | Utility-first styling, accessible component primitives, performant form state management, shared schema validation. |
| **Networking & Offline** | Axios, Workbox, Web Push API, date-fns | Robust HTTP client, app shell precaching, browser-native push notifications, locale-aware date utilities. |

---

## 7.3 Native Android Application

The native Android application, built with React Native, maximizes code reuse from the PWA while offering a fully native Android experience, including deep OS integration and access to device-level capabilities.

| Category | Technology | Key Features & Benefits |
|---|---|---|
| **Core Framework** | React Native (Bare Workflow), TypeScript, Metro Bundler, Hermes Engine | Cross-platform mobile framework, full access to native APIs, optimized startup performance, reduced memory footprint. |
| **Navigation & State** | React Navigation v6, TanStack Query v5, Zustand | Standard navigation library, shared server/client state management with PWA for consistency. |
| **Native Capabilities** | Firebase Cloud Messaging (FCM), React Native Biometrics, Document Picker, Camera/Image Picker, Geolocation, Keychain, NetInfo | Native push notifications, fingerprint/face unlock, file uploads, image capture, accurate GPS, secure credential storage, network monitoring. |
| **Build & Distribution** | Google Play Store, App Signing by Google Play, Fastlane (CI/CD) | Staged rollouts, managed signing keys, automated build/upload pipelines, Android 7.0+ compatibility. |

---

## 7.4 Backend Technologies

The backend is built on Node.js LTS (v20+) using the NestJS framework, ensuring a scalable and maintainable API for all platform functionalities.

| Category | Technology | Key Features & Benefits |
|---|---|---|
| **Core Framework** | Node.js LTS v20+, NestJS v10, TypeScript | Non-blocking I/O, modular architecture, dependency injection, strict typing, shared DTOs with frontend. |
| **API, Validation & ORM** | NestJS REST API, class-validator + class-transformer, Prisma ORM | Versioned RESTful API, DTO validation, type-safe database interactions, SQL injection prevention, schema migrations. |
| **Auth & Security** | Passport.js, jsonwebtoken, bcrypt, Helmet.js, @nestjs/throttler, cors | JWT-based auth, Google OAuth2, password/PIN hashing, HTTP security headers, rate limiting, CORS protection. |
| **Background Jobs & Notifications** | BullMQ + @nestjs/bull, Nodemailer + Brevo, web-push, Firebase Admin SDK | Redis-backed job queue for async tasks (emails, push notifications, webhooks), reliable email delivery, multi-channel push dispatch. |
| **Logging & Utilities** | Winston, Multer | Structured logging for all events and errors, multipart form handling for secure file uploads. |

---

## 7.5 Database Architecture

GG'APP employs a two-database strategy for optimal performance and data integrity.

### 7.5.1 PostgreSQL 15 (Primary Database)

PostgreSQL serves as the primary relational database and the single source of truth for all persistent business data. It stores critical information across the following domains:

- **Users** — Patient profiles, hashed passwords/PINs, encrypted National IDs, KYC status, roles, push subscription endpoints.
- **Service Providers** — Practice details, service types, operating hours, license documents, payment account details, approval status.
- **Appointments** — Engagement requests, status lifecycle, patient–SP associations, consultation notes, feedback records.
- **Invoices** — Amounts, service line items, PDF references, admin approval, dispute status, patient authorization status.
- **Transactions** — Completed payment records, finance partner transaction IDs, disbursement timestamps.
- **Credit Applications** — Form data, status, finance partner reference, approval/decline status, cached repayment schedules.
- **Notifications** — Log of all dispatched push notifications and emails with delivery status.
- **Audit Log** — Immutable record of all security events, logins, PIN attempts, payment authorizations, and admin actions.

### 7.5.2 Redis 7 (In-Memory Store)

Redis acts as a high-speed, in-memory store for ephemeral operations, significantly enhancing platform responsiveness and efficiency:

- **Refresh Token Store** — JWT refresh tokens with a 30-day TTL, enabling immediate session invalidation on logout or account lock.
- **Rate Limiting** — Tracks request counts per IP/user across distributed instances to prevent abuse.
- **BullMQ Job Queues** — Persistence layer for all asynchronous background jobs (email sending, push notification dispatch, payment API retries, webhook processing).
- **Idempotency Key Cache** — Stores payment authorization idempotency keys with a 5-minute TTL to prevent duplicate disbursements.
- **Wallet Balance Cache** — Caches patient credit wallet balances (fetched from finance partner API) with a short TTL (60 seconds) to reduce API call volume and provide near real-time display.
