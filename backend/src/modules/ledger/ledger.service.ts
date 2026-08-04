import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common'
import {
  LedgerAuditAction,
  LedgerPinStatus,
  NotificationType,
  Prisma,
  PrescriptionRequestStatus,
  ProviderLifecycleStatus,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { FieldEncryptionService } from '../../common/services/field-encryption.service'
import { decryptClinicalField } from '../../common/utils/clinical-field.util'
import { formatPatientFullName } from '../../common/utils/patient-name.util'
import type { SetupLedgerPinDto } from './dto/setup-ledger-pin.dto'
import type { UnlockLedgerDto } from './dto/unlock-ledger.dto'
import type { GetAdminLedgerAccessQueryDto } from './dto/ledger-query.dto'

const GRANT_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const UNLOCK_MAX_ATTEMPTS = 5
const UNLOCK_LOCKOUT_SECONDS = 30 * 60 // 30 minutes
const UNLOCK_DAILY_LIMIT = 10
const UNLOCK_DAILY_WINDOW_SECONDS = 24 * 60 * 60
const GRANT_EXPIRY_SWEEP_MS = 15 * 60 * 1000 // every 15 minutes

const GENERIC_UNLOCK_ERROR =
  'Unable to unlock the ledger. Check the Ledger PIN, then try again.'

type LedgerProviderRef = {
  id: number
  name: string
  category: string
}

@Injectable()
export class LedgerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LedgerService.name)
  private readonly prisma: PrismaService
  private readonly redis: RedisService
  private readonly fieldEncryption: FieldEncryptionService
  private expirySweepTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(RedisService) redis: RedisService,
    @Inject(FieldEncryptionService) fieldEncryption: FieldEncryptionService,
  ) {
    this.prisma = prisma
    this.redis = redis
    this.fieldEncryption = fieldEncryption
  }

  onModuleInit() {
    void this.expireStaleGrants()
    this.expirySweepTimer = setInterval(() => {
      void this.expireStaleGrants()
    }, GRANT_EXPIRY_SWEEP_MS)
    // Allow Node to exit without waiting for the interval
    if (typeof this.expirySweepTimer.unref === 'function') {
      this.expirySweepTimer.unref()
    }
  }

  onModuleDestroy() {
    if (this.expirySweepTimer) {
      clearInterval(this.expirySweepTimer)
      this.expirySweepTimer = null
    }
  }

  // ---------------------------------------------------------------------------
  // Patient side
  // ---------------------------------------------------------------------------

  async setupPin(userId: string, dto: SetupLedgerPinDto) {
    if (dto.pin !== dto.confirmPin) {
      throw new BadRequestException('PIN confirmation does not match')
    }

    const existing = await this.prisma.ledgerPin.findUnique({
      where: { patientUserId: userId },
    })

    const isRotation = !!existing && existing.status === LedgerPinStatus.ACTIVE
    if (isRotation) {
      if (!dto.currentPin) {
        throw new BadRequestException('Current PIN is required to change your ledger PIN')
      }
      const validCurrentPin = await bcrypt.compare(dto.currentPin, existing.pinHash)
      if (!validCurrentPin) {
        throw new UnauthorizedException('Current PIN is incorrect')
      }
    }

    const pinHash = await bcrypt.hash(dto.pin, 12)
    const now = new Date()
    const pinExpiresAt =
      dto.expiresInDays != null
        ? new Date(now.getTime() + dto.expiresInDays * 24 * 60 * 60 * 1000)
        : null

    await this.prisma.$transaction(async tx => {
      if (existing) {
        await tx.ledgerPin.update({
          where: { id: existing.id },
          data: {
            pinHash,
            status: LedgerPinStatus.ACTIVE,
            rotatedAt: now,
            revokedAt: null,
            expiresAt: pinExpiresAt,
          },
        })
      } else {
        await tx.ledgerPin.create({
          data: {
            patientUserId: userId,
            pinHash,
            expiresAt: pinExpiresAt,
          },
        })
      }

      // Rotating (or re-creating after revoke) invalidates every active grant
      await tx.ledgerAccessGrant.updateMany({
        where: {
          patientUserId: userId,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      })

      await tx.ledgerAccessAudit.create({
        data: {
          patientUserId: userId,
          action: isRotation ? LedgerAuditAction.PIN_ROTATED : LedgerAuditAction.PIN_CREATED,
        },
      })

      await tx.notification.create({
        data: {
          userId,
          type: NotificationType.LEDGER,
          title: isRotation ? 'Ledger PIN Updated' : 'Ledger PIN Created',
          body: isRotation
            ? 'Your health ledger PIN was changed. Any providers who previously had access must re-unlock with the new PIN.'
            : 'Your health ledger PIN is ready. Share it only with providers you want to view your treatment history.',
          screen: '/app/ledger',
        },
      })
    })

    return {
      configured: true,
      message: isRotation
        ? 'Ledger PIN updated. Existing provider access has been revoked.'
        : 'Ledger PIN created successfully.',
    }
  }

  async revokePin(userId: string) {
    const existing = await this.prisma.ledgerPin.findUnique({
      where: { patientUserId: userId },
    })

    if (!existing || existing.status !== LedgerPinStatus.ACTIVE) {
      throw new NotFoundException('No active ledger PIN found')
    }

    const now = new Date()

    await this.prisma.$transaction(async tx => {
      await tx.ledgerPin.update({
        where: { id: existing.id },
        data: { status: LedgerPinStatus.REVOKED, revokedAt: now },
      })

      await tx.ledgerAccessGrant.updateMany({
        where: {
          patientUserId: userId,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      })

      await tx.ledgerAccessAudit.create({
        data: {
          patientUserId: userId,
          action: LedgerAuditAction.PIN_REVOKED,
        },
      })
    })

    return {
      configured: false,
      message: 'Ledger PIN revoked. All provider access has been removed.',
    }
  }

  async getStatus(userId: string) {
    const pin = await this.prisma.ledgerPin.findUnique({
      where: { patientUserId: userId },
    })

    const hasPin = !!pin && pin.status === LedgerPinStatus.ACTIVE
    const now = new Date()

    const activeGrants = hasPin
      ? await this.prisma.ledgerAccessGrant.findMany({
          where: {
            patientUserId: userId,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          include: { provider: { select: { id: true, name: true, category: true } } },
          orderBy: { unlockedAt: 'desc' },
        })
      : []

    return {
      hasPin,
      pinCreatedAt: hasPin ? pin.createdAt.toISOString() : null,
      pinExpiresAt: hasPin && pin.expiresAt ? pin.expiresAt.toISOString() : null,
      activeGrants: activeGrants.map(grant => ({
        id: grant.id,
        provider: this.mapProviderRef(grant.provider),
        unlockedAt: grant.unlockedAt.toISOString(),
        expiresAt: grant.expiresAt.toISOString(),
      })),
    }
  }

  async getOwnLedger(userId: string, beneficiaryId?: string) {
    const patient = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: {
          include: { beneficiaries: true },
        },
      },
    })

    if (!patient?.patientProfile) {
      throw new NotFoundException('Patient not found')
    }

    this.assertBeneficiaryBelongsToPatient(
      patient.patientProfile.beneficiaries,
      beneficiaryId,
    )

    return {
      patient: {
        id: patient.id,
        name: formatPatientFullName(patient.patientProfile),
        beneficiaries: patient.patientProfile.beneficiaries.map(beneficiary => ({
          id: beneficiary.id,
          name: beneficiary.name,
          relation: beneficiary.relation,
        })),
      },
      grant: null,
      filter: beneficiaryId
        ? { beneficiaryId, scope: 'beneficiary' as const }
        : { beneficiaryId: null, scope: 'all' as const },
      entries: await this.buildLedgerEntries(patient.id, beneficiaryId),
    }
  }

  async getAccessLog(userId: string) {
    const now = new Date()
    const [grants, audits] = await Promise.all([
      this.prisma.ledgerAccessGrant.findMany({
        where: { patientUserId: userId },
        include: { provider: { select: { id: true, name: true, category: true } } },
        orderBy: { unlockedAt: 'desc' },
        take: 100,
      }),
      this.prisma.ledgerAccessAudit.findMany({
        where: { patientUserId: userId },
        include: { provider: { select: { id: true, name: true, category: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])

    return {
      grants: grants.map(grant => ({
        id: grant.id,
        provider: this.mapProviderRef(grant.provider),
        unlockedAt: grant.unlockedAt.toISOString(),
        expiresAt: grant.expiresAt.toISOString(),
        status: grant.revokedAt
          ? 'revoked'
          : grant.expiresAt > now
            ? 'active'
            : 'expired',
      })),
      events: audits.map(audit => ({
        id: audit.id,
        action: audit.action,
        provider: audit.provider ? this.mapProviderRef(audit.provider) : null,
        createdAt: audit.createdAt.toISOString(),
      })),
    }
  }

  async revokeGrant(userId: string, grantId: string) {
    const grant = await this.prisma.ledgerAccessGrant.findFirst({
      where: { id: grantId, patientUserId: userId },
    })

    if (!grant) {
      throw new NotFoundException('Access grant not found')
    }

    if (!grant.revokedAt) {
      await this.prisma.$transaction(async tx => {
        await tx.ledgerAccessGrant.update({
          where: { id: grant.id },
          data: { revokedAt: new Date() },
        })
        await tx.ledgerAccessAudit.create({
          data: {
            patientUserId: userId,
            providerId: grant.providerId,
            action: LedgerAuditAction.GRANT_REVOKED,
            metadata: { grantId: grant.id } as Prisma.JsonObject,
          },
        })
      })
    }

    return { revoked: true }
  }

  // ---------------------------------------------------------------------------
  // Service provider side
  // ---------------------------------------------------------------------------

  async unlock(spUserId: string, dto: UnlockLedgerDto) {
    const provider = await this.resolveProvider(spUserId)
    const scopeKey = dto.patientId?.trim() || 'pin'
    const lockKey = `ledger:unlock:lock:${provider.id}:${scopeKey}`
    const attemptsKey = `ledger:unlock:attempts:${provider.id}:${scopeKey}`
    const dailyKey = `ledger:unlock:daily:${provider.id}`

    if (await this.redis.get(lockKey)) {
      throw new ForbiddenException(
        'Too many failed attempts. Please wait 30 minutes before trying again.',
      )
    }

    const dailyCount = Number((await this.redis.get(dailyKey)) ?? '0')
    if (dailyCount >= UNLOCK_DAILY_LIMIT) {
      throw new ForbiddenException(
        'Daily unlock attempt limit reached. Please try again tomorrow.',
      )
    }

    const patient = await this.resolvePatientForUnlock(dto)
    const pinRecord =
      patient?.ledgerPin?.status === LedgerPinStatus.ACTIVE ? patient.ledgerPin : null
    const pinExpired = !!pinRecord?.expiresAt && pinRecord.expiresAt.getTime() <= Date.now()
    const pinMatches =
      pinRecord && !pinExpired ? await bcrypt.compare(dto.pin, pinRecord.pinHash) : false

    if (!patient?.patientProfile || !pinRecord || pinExpired || !pinMatches) {
      const attempts = Number((await this.redis.get(attemptsKey)) ?? '0') + 1
      await this.redis.set(attemptsKey, String(attempts), UNLOCK_LOCKOUT_SECONDS)
      await this.redis.set(dailyKey, String(dailyCount + 1), UNLOCK_DAILY_WINDOW_SECONDS)

      if (patient) {
        await this.prisma.ledgerAccessAudit.create({
          data: {
            patientUserId: patient.id,
            providerId: provider.id,
            action: LedgerAuditAction.UNLOCK_FAILED,
            metadata: {
              attempt: attempts,
              pinExpired: pinExpired || undefined,
            } as Prisma.JsonObject,
          },
        })
      }

      if (attempts >= UNLOCK_MAX_ATTEMPTS) {
        await this.redis.set(lockKey, '1', UNLOCK_LOCKOUT_SECONDS)
        await this.redis.del(attemptsKey)
        if (patient) {
          await this.prisma.notification.create({
            data: {
              userId: patient.id,
              type: NotificationType.LEDGER,
              title: 'Failed Ledger Access Attempts',
              body: `${provider.name} made several unsuccessful attempts to unlock your health ledger. If this wasn't you sharing your PIN, consider changing it.`,
              screen: '/app/ledger',
            },
          })
        }
        throw new ForbiddenException(
          'Too many failed attempts. Please wait 30 minutes before trying again.',
        )
      }

      throw new UnauthorizedException(GENERIC_UNLOCK_ERROR)
    }

    await Promise.all([this.redis.del(attemptsKey), this.redis.del(lockKey)])

    const now = new Date()
    const expiresAt = new Date(now.getTime() + GRANT_DURATION_MS)

    const grant = await this.prisma.$transaction(async tx => {
      const created = await tx.ledgerAccessGrant.create({
        data: {
          patientUserId: patient.id,
          providerId: provider.id,
          expiresAt,
        },
      })

      await tx.ledgerAccessAudit.create({
        data: {
          patientUserId: patient.id,
          providerId: provider.id,
          action: LedgerAuditAction.UNLOCK_SUCCESS,
          metadata: { grantId: created.id } as Prisma.JsonObject,
        },
      })

      await tx.notification.create({
        data: {
          userId: patient.id,
          type: NotificationType.LEDGER,
          title: 'Health Ledger Accessed',
          body: `${provider.name} unlocked your health ledger with your PIN. They can view your treatment history for the next 24 hours.`,
          screen: '/app/ledger/access',
        },
      })

      return created
    })

    return {
      grantId: grant.id,
      patientId: patient.id,
      patientName: formatPatientFullName(patient.patientProfile),
      unlockedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }
  }

  private async resolvePatientForUnlock(dto: UnlockLedgerDto) {
    const include = {
      patientProfile: true,
      ledgerPin: true,
    } as const

    if (dto.patientId?.trim()) {
      return this.prisma.user.findFirst({
        where: { id: dto.patientId.trim(), role: 'PATIENT' },
        include,
      })
    }

    // PIN-only unlock: scan active pins. Rare collisions require opening unlock from the patient record.
    const candidates = await this.prisma.user.findMany({
      where: {
        role: 'PATIENT',
        ledgerPin: { status: LedgerPinStatus.ACTIVE },
      },
      include,
      take: 500,
    })

    const now = Date.now()
    const matches: typeof candidates = []
    for (const candidate of candidates) {
      const pin = candidate.ledgerPin
      if (!pin) continue
      if (pin.expiresAt && pin.expiresAt.getTime() <= now) continue
      if (await bcrypt.compare(dto.pin, pin.pinHash)) {
        matches.push(candidate)
      }
    }

    if (matches.length > 1) {
      throw new BadRequestException(
        'More than one patient matches this PIN. Open Unlock Ledger from that patient\'s record, or ask the patient to change their PIN.',
      )
    }

    return matches[0] ?? null
  }

  async getLedger(spUserId: string, patientUserId: string, beneficiaryId?: string) {
    const provider = await this.resolveProvider(spUserId)
    const grant = await this.findActiveGrant(patientUserId, provider.id)

    if (!grant) {
      throw new ForbiddenException({
        code: 'LEDGER_ACCESS_REQUIRED',
        message:
          'You need the patient\'s ledger PIN to view their treatment history. Ask the patient to share it, then unlock the ledger.',
      })
    }

    const patient = await this.prisma.user.findUnique({
      where: { id: patientUserId },
      include: {
        patientProfile: { include: { beneficiaries: true } },
      },
    })

    if (!patient?.patientProfile) {
      throw new NotFoundException('Patient not found')
    }

    this.assertBeneficiaryBelongsToPatient(
      patient.patientProfile.beneficiaries,
      beneficiaryId,
    )

    await this.prisma.ledgerAccessAudit.create({
      data: {
        patientUserId,
        providerId: provider.id,
        action: LedgerAuditAction.LEDGER_VIEWED,
        metadata: {
          grantId: grant.id,
          beneficiaryId: beneficiaryId ?? null,
        } as Prisma.JsonObject,
      },
    })

    return {
      patient: {
        id: patient.id,
        name: formatPatientFullName(patient.patientProfile),
        dob: patient.patientProfile.dateOfBirth.toISOString(),
        beneficiaries: patient.patientProfile.beneficiaries.map(beneficiary => ({
          id: beneficiary.id,
          name: beneficiary.name,
          relation: beneficiary.relation,
        })),
      },
      grant: {
        id: grant.id,
        unlockedAt: grant.unlockedAt.toISOString(),
        expiresAt: grant.expiresAt.toISOString(),
      },
      filter: beneficiaryId
        ? { beneficiaryId, scope: 'beneficiary' as const }
        : { beneficiaryId: null, scope: 'all' as const },
      entries: await this.buildLedgerEntries(patientUserId, beneficiaryId),
    }
  }

  // ---------------------------------------------------------------------------
  // Admin + maintenance
  // ---------------------------------------------------------------------------

  async getAdminAccessLog(query: GetAdminLedgerAccessQueryDto) {
    const limit = query.limit ?? 50
    const where: Prisma.LedgerAccessAuditWhereInput = {}
    if (query.patientUserId) {
      where.patientUserId = query.patientUserId
    }
    if (query.providerId) {
      where.providerId = query.providerId
    }

    const events = await this.prisma.ledgerAccessAudit.findMany({
      where,
      include: {
        provider: { select: { id: true, name: true, category: true } },
        patient: {
          select: {
            id: true,
            email: true,
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return events.map(event => ({
      id: event.id,
      action: event.action,
      createdAt: event.createdAt.toISOString(),
      provider: event.provider ? this.mapProviderRef(event.provider) : null,
      patient: {
        id: event.patient.id,
        email: event.patient.email,
        name: formatPatientFullName(event.patient.patientProfile),
      },
      metadata: event.metadata,
    }))
  }

  async expireStaleGrants() {
    const now = new Date()
    try {
      const expired = await this.prisma.ledgerAccessGrant.findMany({
        where: {
          revokedAt: null,
          expiresAt: { lte: now },
        },
        select: { id: true, patientUserId: true, providerId: true },
        take: 500,
      })

      if (expired.length === 0) {
        return { expired: 0 }
      }

      const lookback = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const recentExpiryAudits = await this.prisma.ledgerAccessAudit.findMany({
        where: {
          action: LedgerAuditAction.GRANT_EXPIRED,
          createdAt: { gte: lookback },
        },
        select: { metadata: true },
        take: 2000,
      })
      const auditedGrantIds = new Set(
        recentExpiryAudits
          .map(row => {
            const meta = row.metadata as { grantId?: string } | null
            return meta?.grantId
          })
          .filter((id): id is string => !!id),
      )

      const toAudit = expired.filter(grant => !auditedGrantIds.has(grant.id))
      if (toAudit.length === 0) {
        return { expired: 0 }
      }

      await this.prisma.ledgerAccessAudit.createMany({
        data: toAudit.map(grant => ({
          patientUserId: grant.patientUserId,
          providerId: grant.providerId,
          action: LedgerAuditAction.GRANT_EXPIRED,
          metadata: { grantId: grant.id } as Prisma.JsonObject,
        })),
      })

      this.logger.log(`Recorded ${toAudit.length} expired ledger grant(s)`)
      return { expired: toAudit.length }
    } catch (error) {
      this.logger.warn(
        `Ledger grant expiry sweep failed: ${(error as Error).message}`,
      )
      return { expired: 0 }
    }
  }

  private assertBeneficiaryBelongsToPatient(
    beneficiaries: Array<{ id: string }>,
    beneficiaryId?: string,
  ) {
    if (!beneficiaryId || beneficiaryId === 'self') return

    const ownsBeneficiary = beneficiaries.some(beneficiary => beneficiary.id === beneficiaryId)
    if (!ownsBeneficiary) {
      throw new BadRequestException('Beneficiary does not belong to this patient')
    }
  }

  // ---------------------------------------------------------------------------
  // Shared ledger assembly
  // ---------------------------------------------------------------------------

  private async buildLedgerEntries(patientUserId: string, beneficiaryId?: string) {
    // beneficiaryId:
    // - undefined → all (self + beneficiaries)
    // - 'self' → patient-only visits (beneficiaryId IS NULL)
    // - cuid → that beneficiary only
    const visitWhere: Prisma.ProviderVisitWhereInput = {
      patientUserId,
      ...(beneficiaryId === 'self'
        ? { beneficiaryId: null }
        : beneficiaryId
          ? { beneficiaryId }
          : {}),
    }
    const prescriptionWhere: Prisma.PrescriptionRequestWhereInput = {
      patientUserId,
      status: PrescriptionRequestStatus.FULFILLED,
      ...(beneficiaryId === 'self'
        ? { beneficiaryId: null }
        : beneficiaryId
          ? { beneficiaryId }
          : {}),
    }

    const [visits, fulfilledPrescriptions] = await Promise.all([
      this.prisma.providerVisit.findMany({
        where: visitWhere,
        include: {
          provider: { select: { id: true, name: true, category: true } },
          beneficiary: { select: { name: true } },
          appointment: { select: { reference: true, service: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.prescriptionRequest.findMany({
        where: prescriptionWhere,
        include: {
          provider: { select: { id: true, name: true, category: true } },
          beneficiary: { select: { name: true } },
        },
        orderBy: { fulfilledAt: 'desc' },
        take: 200,
      }),
    ])

    const visitEntries = visits.map(visit => ({
      kind: 'visit' as const,
      id: visit.id,
      date: visit.createdAt.toISOString(),
      provider: this.mapProviderRef(visit.provider),
      beneficiaryName: visit.beneficiary?.name ?? null,
      appointmentRef: visit.appointment?.reference ?? null,
      service: visit.appointment?.service ?? null,
      diagnosis: decryptClinicalField(this.fieldEncryption, visit.diagnosis),
      treatment: decryptClinicalField(this.fieldEncryption, visit.treatment),
      followUp: decryptClinicalField(this.fieldEncryption, visit.followUp),
      services: Array.isArray(visit.services) ? (visit.services as string[]) : [],
      vitals: this.normalizeVitals(visit.vitals),
    }))

    const prescriptionEntries = fulfilledPrescriptions.map(request => ({
      kind: 'prescription' as const,
      id: request.id,
      date: (request.fulfilledAt ?? request.updatedAt).toISOString(),
      provider: this.mapProviderRef(request.provider),
      beneficiaryName: request.beneficiary?.name ?? null,
      reference: request.reference,
      fulfillmentMode: request.fulfillmentMode,
      items: this.normalizeQuotedItems(request.quotedItems),
      amount: request.quotedAmount != null ? Number(request.quotedAmount) : null,
    }))

    return [...visitEntries, ...prescriptionEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  }

  private normalizeVitals(vitals: Prisma.JsonValue): Record<string, string> {
    if (!vitals || typeof vitals !== 'object' || Array.isArray(vitals)) {
      return {}
    }
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(vitals as Record<string, unknown>)) {
      if (value != null) {
        result[key] = String(value)
      }
    }
    return result
  }

  private normalizeQuotedItems(items: Prisma.JsonValue) {
    if (!Array.isArray(items)) {
      return []
    }
    return items
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const record = item as Record<string, unknown>
        return {
          name: String(record.name ?? 'Item'),
          quantity: record.quantity != null ? String(record.quantity) : null,
          unitPrice: record.unitPrice != null ? Number(record.unitPrice) : null,
        }
      })
  }

  private async findActiveGrant(patientUserId: string, providerId: number) {
    return this.prisma.ledgerAccessGrant.findFirst({
      where: {
        patientUserId,
        providerId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { unlockedAt: 'desc' },
    })
  }

  private async resolveProvider(spUserId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { authUserId: spUserId },
      select: { id: true, name: true, lifecycleStatus: true },
    })

    if (!provider) {
      throw new NotFoundException('Provider profile not found')
    }

    if (provider.lifecycleStatus !== ProviderLifecycleStatus.ACTIVE) {
      throw new ForbiddenException('Provider account is not active')
    }

    return provider
  }

  private mapProviderRef(provider: {
    id: number
    name: string
    category: string
  }): LedgerProviderRef {
    return {
      id: provider.id,
      name: provider.name,
      category: provider.category.toLowerCase(),
    }
  }
}
