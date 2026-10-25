import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import express from 'express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { validateEnv } from './config/env.validation'
import { configuration } from './config/configuration'
import { RedisService } from './redis/redis.service'

async function bootstrap() {
  validateEnv(process.env)
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const config = configuration()

  // Fail fast in production instead of silently falling back to the
  // in-memory store (which breaks refresh tokens, reset tokens, and
  // ledger locks). The in-memory fallback remains for local dev only.
  if (config.app.nodeEnv === 'production') {
    const redisService = app.get(RedisService)
    const pong = await redisService.ping()
    if (!pong || pong.includes('memory')) {
      throw new Error('Redis is unreachable in production; refusing to start.')
    }
  }

  // CORP:same-origin blocks Expo web / some clients from reading API responses.
  // Keep other helmet defaults; loosen only resource policy for local API use.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )
  app.use(
    express.json({
      limit: '25mb',
      // Keep the exact bytes so finance-partner webhooks can be signature-checked.
      verify: (req, _res, buf) => {
        ;(req as express.Request & { rawBody?: Buffer }).rawBody = buf
      },
    }),
  )
  app.use(express.urlencoded({ extended: true, limit: '25mb' }))

  // Behind Railway's edge proxy the socket address is the proxy, not the
  // client: without trusting the forwarded hop, req.ip collapses every real
  // client onto the proxy IP. That silently breaks per-IP rate limiting (the
  // throttler would treat all users as one bucket). TRUST_PROXY controls the
  // number of trusted hops (1 is correct for Railway's single edge hop); it
  // defaults to 1 only in production so local dev keeps raw sockets.
  if (config.app.trustProxy !== '') {
    app.set('trust proxy', config.app.trustProxy as string)
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Mobile clients and same-origin tools often send no Origin header.
      if (!origin) {
        callback(null, true)
        return
      }
      const allowed = config.app.corsOrigins
      // Exact-match allowlist only. A wildcard entry would reflect any
      // request Origin with `credentials: true` (the browser still blocks it,
      // so supporting `*` buys nothing while a mistyped CORS_ORIGIN would
      // silently disable the allowlist).
      if (allowed.includes(origin)) {
        callback(null, true)
        return
      }
      // Local Expo / Vite dev servers on any port — development only. In
      // production these private-network origins are rejected; allowed
      // origins must come from CORS_ORIGIN instead.
      if (
        config.app.nodeEnv !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/i.test(origin)
      ) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    credentials: true,
  })
  app.setGlobalPrefix(config.app.apiPrefix)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  await app.listen(config.app.port)
}

void bootstrap()
