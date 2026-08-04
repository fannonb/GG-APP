import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import express from 'express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { validateEnv } from './config/env.validation'
import { configuration } from './config/configuration'

async function bootstrap() {
  validateEnv(process.env)
  const app = await NestFactory.create(AppModule)
  const config = configuration()

  // CORP:same-origin blocks Expo web / some clients from reading API responses.
  // Keep other helmet defaults; loosen only resource policy for local API use.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )
  app.use(express.json({ limit: '25mb' }))
  app.use(express.urlencoded({ extended: true, limit: '25mb' }))
  app.enableCors({
    origin: (origin, callback) => {
      // Mobile clients and same-origin tools often send no Origin header.
      if (!origin) {
        callback(null, true)
        return
      }
      const allowed = config.app.corsOrigins
      if (allowed.includes(origin) || allowed.includes('*')) {
        callback(null, true)
        return
      }
      // Local Expo / Vite dev servers on any port.
      if (
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
