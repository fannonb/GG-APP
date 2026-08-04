# GG'APP Backend

This package contains the Railway-ready NestJS backend for GG'APP.

## Stack

- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- JWT auth

## Implemented foundation

- App bootstrap with config validation
- Health and readiness endpoints
- Prisma and Redis modules
- Customer auth scaffold
- Customer profile, dashboard, and provider read scaffold
- Prisma schema for customer-first backend development

## Local setup

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run db:seed
npm run start:dev
```

## Planned first production slice

- `POST /api/v1/auth/register/patient`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/patient/profile`
- `GET /api/v1/patient/dashboard`
- `GET /api/v1/patient/appointments`
- `POST /api/v1/patient/appointments`
- `GET /api/v1/patient/transactions`
- `GET /api/v1/patient/notifications`
- `GET /api/v1/patient/news`
- `GET /api/v1/patient/invoices`
- `GET /api/v1/patient/invoices/:id`
- `POST /api/v1/patient/invoices/:id/authorize`
- `GET /api/v1/providers`
- `GET /api/v1/providers/category/:category`
- `GET /api/v1/providers/:id`

## Railway notes

- Attach Railway PostgreSQL and Redis services
- Set `DATABASE_URL` and `REDIS_URL` from Railway variables
- Keep the service healthcheck at `/api/v1/health`
- The service must listen on Railway's injected `PORT`
