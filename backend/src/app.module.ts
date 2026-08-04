import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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
})
export class AppModule {}
