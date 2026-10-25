import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule, getStorageToken } from '@nestjs/throttler'
import { configuration } from './config/configuration'
import { validateEnv } from './config/env.validation'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { CommonModule } from './common/common.module'
import { RedisThrottlerStorage } from './common/throttler-redis.storage'
import { HealthModule } from './modules/health/health.module'
import { AdminModule } from './modules/admin/admin.module'
import { AuthModule } from './modules/auth/auth.module'
import { PatientModule } from './modules/patient/patient.module'
import { ProvidersModule } from './modules/providers/providers.module'
import { SpModule } from './modules/sp/sp.module'
import { LedgerModule } from './modules/ledger/ledger.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { FeedbackModule } from './modules/feedback/feedback.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    // Global HTTP rate limit: 120 requests/minute per client IP.
    // Counters live in Redis (RedisThrottlerStorage below), so the budget is
    // shared across replicas and survives restarts instead of resetting.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    CommonModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    AdminModule,
    AuthModule,
    PatientModule,
    ProvidersModule,
    SpModule,
    LedgerModule,
    NotificationsModule,
    FeedbackModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Replace the per-process default store with the shared Redis counter.
    {
      provide: getStorageToken(),
      useClass: RedisThrottlerStorage,
    },
  ],
})
export class AppModule {}
