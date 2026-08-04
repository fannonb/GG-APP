import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { configuration } from './config/configuration'
import { validateEnv } from './config/env.validation'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { CommonModule } from './common/common.module'
import { HealthModule } from './modules/health/health.module'
import { AdminModule } from './modules/admin/admin.module'
import { AuthModule } from './modules/auth/auth.module'
import { PatientModule } from './modules/patient/patient.module'
import { ProvidersModule } from './modules/providers/providers.module'
import { SpModule } from './modules/sp/sp.module'
import { LedgerModule } from './modules/ledger/ledger.module'
import { NotificationsModule } from './modules/notifications/notifications.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    // Global HTTP rate limit: 120 requests/minute per client IP.
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
