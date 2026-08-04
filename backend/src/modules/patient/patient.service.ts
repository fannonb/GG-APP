import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import {
  AppointmentStatus,
  CreditApplicationStatus,
  CreditApplicationType,
  CreditStatus,
  InvoiceStatus,
  NewsStatus,
  NotificationType,
  Prisma,
  PrescriptionFulfillmentMode,
  PrescriptionRequestStatus,
  ProviderCategory,
  TransactionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { FieldEncryptionService } from '../../common/services/field-encryption.service'
import { ReferenceService } from '../../common/services/reference.service'
import { parseInvoiceAttachmentMetadata, sanitizeInvoiceAttachmentMetadata } from '../../common/utils/invoice-attachment.util'
import { formatPatientFullName } from '../../common/utils/patient-name.util'
import { RedisService } from '../../redis/redis.service'
import { ProvidersService } from '../providers/providers.service'
import { StorageService } from '../../common/services/storage.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { AuthorizeInvoiceDto } from './dto/authorize-invoice.dto'
import type { CancelAppointmentDto } from './dto/cancel-appointment.dto'
import type { CreateAppointmentDto } from './dto/create-appointment.dto'
import type { SetupPaymentPinDto } from './dto/setup-payment-pin.dto'
import type { ChangePatientPasswordDto } from './dto/change-patient-password.dto'
import type { UpdatePatientProfileDto } from './dto/update-patient-profile.dto'
import type { UpsertBeneficiaryDto } from './dto/upsert-beneficiary.dto'
import type { SetBeneficiariesEnabledDto } from './dto/set-beneficiaries-enabled.dto'
import type { RejectInvoiceDto } from './dto/reject-invoice.dto'
import type { SubmitReviewDto } from './dto/submit-review.dto'
import type { ApplyCreditDto } from './dto/apply-credit.dto'
import type { IncreaseCreditDto } from './dto/increase-credit.dto'
import type { CreatePrescriptionRequestDto } from './dto/create-prescription-request.dto'
import type { DeclinePrescriptionRequestDto } from './dto/decline-prescription-request.dto'

const REVIEW_RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
}

@Injectable()
export class PatientService {
  private readonly prisma: PrismaService
  private readonly fieldEncryption: FieldEncryptionService
  private readonly redis: RedisService
  private readonly providersService: ProvidersService
  private readonly referenceService: ReferenceService
  private readonly storage: StorageService
  private readonly notifications: NotificationsService

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(FieldEncryptionService) fieldEncryption: FieldEncryptionService,
    @Inject(RedisService) redis: RedisService,
    @Inject(ProvidersService) providersService: ProvidersService,
    @Inject(ReferenceService) referenceService: ReferenceService,
    @Inject(StorageService) storage: StorageService,
    @Inject(NotificationsService) notifications: NotificationsService,
  ) {
    this.prisma = prisma
    this.fieldEncryption = fieldEncryption
    this.redis = redis
    this.providersService = providersService
    this.referenceService = referenceService
    this.storage = storage
    this.notifications = notifications
  }

  private async resolvePrescriptionAttachment(raw: Prisma.JsonValue | null | undefined) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return raw
    }
    const metadata = raw as { storageKey?: string; dataUrl?: string; originalName?: string }
    if (!metadata.storageKey && !metadata.dataUrl) {
      return raw
    }
    const resolved = await this.storage.resolveAttachmentUrl(
      metadata,
      metadata.originalName ?? 'prescription.pdf',
    )
    if (!resolved) return raw
    return { ...metadata, url: resolved.url }
  }

  async getProfile(userId: string) {
    let profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        beneficiaries: true,
      },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    // Existing beneficiaries unlock the section — keep the flag in sync.
    if (!profile.beneficiariesEnabled && profile.beneficiaries.length > 0) {
      profile = await this.prisma.patientProfile.update({
        where: { userId },
        data: { beneficiariesEnabled: true },
        include: {
          user: true,
          beneficiaries: true,
        },
      })
    }

    return this.buildProfileResponse(profile)
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        beneficiaries: true,
      },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    const email = dto.email.toLowerCase().trim()
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    })

    if (existingEmail && existingEmail.id !== userId) {
      throw new BadRequestException('An account already exists for that email address')
    }

    const { firstName, lastName } = this.splitName(dto.name)
    const operatingNames: Record<string, string> = {
      KE: 'Kenya',
      ZW: 'Zimbabwe',
      ZM: 'Zambia',
    }
    const residenceCode = dto.residenceCountryCode?.trim().toUpperCase()
    const residenceNameFromDto = dto.residenceCountryName?.trim()
    const isOperating = residenceCode === 'KE' || residenceCode === 'ZW' || residenceCode === 'ZM'
    const residenceCountry = isOperating
      ? operatingNames[residenceCode!]
      : (residenceNameFromDto || dto.residenceCountryCode?.trim())
    const updateResidence = Boolean(residenceCountry)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email,
          phone: dto.phone.trim(),
          ...(updateResidence ? { country: residenceCountry } : {}),
        },
      }),
      this.prisma.patientProfile.update({
        where: { userId },
        data: {
          firstName,
          lastName,
          ...(dto.beneficiariesEnabled !== undefined
            ? { beneficiariesEnabled: dto.beneficiariesEnabled }
            : {}),
          ...(updateResidence
            ? {
                residenceCountry,
                residesAbroad: !isOperating,
                ...(isOperating ? { countryCode: residenceCode! } : {}),
              }
            : {}),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.profile.updated',
          entityType: 'User',
          entityId: userId,
          metadata: {
            email,
            name: dto.name.trim(),
            ...(dto.beneficiariesEnabled !== undefined
              ? { beneficiariesEnabled: dto.beneficiariesEnabled }
              : {}),
            ...(updateResidence
              ? {
                  residenceCountry,
                  residesAbroad: !isOperating,
                  residenceCountryCode: residenceCode,
                }
              : {}),
          } as Prisma.JsonObject,
        },
      }),
    ])

    return this.getProfile(userId)
  }

  async setBeneficiariesEnabled(userId: string, dto: SetBeneficiariesEnabledDto) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: { beneficiaries: { select: { id: true }, take: 1 } },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    if (!dto.enabled && profile.beneficiaries.length > 0) {
      throw new BadRequestException(
        'Remove all beneficiaries before disabling this section',
      )
    }

    await this.prisma.$transaction([
      this.prisma.patientProfile.update({
        where: { userId },
        data: { beneficiariesEnabled: dto.enabled },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.beneficiaries.enabled_updated',
          entityType: 'PatientProfile',
          entityId: userId,
          metadata: { beneficiariesEnabled: dto.enabled } as Prisma.JsonObject,
        },
      }),
    ])

    return this.getProfile(userId)
  }

  async createBeneficiary(userId: string, dto: UpsertBeneficiaryDto) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: { beneficiaries: true },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    if (!profile.beneficiariesEnabled && profile.beneficiaries.length === 0) {
      throw new BadRequestException(
        'Enable beneficiaries on your profile before adding someone',
      )
    }

    await this.prisma.$transaction(async tx => {
      const created = await tx.beneficiary.create({
        data: {
          patientUserId: userId,
          name: dto.name.trim(),
          relation: dto.relation.trim(),
          dateOfBirth: new Date(dto.dob),
          countryCode: dto.countryCode,
          nationalIdEncrypted: dto.nationalId?.trim()
            ? this.fieldEncryption.encrypt(dto.nationalId.trim())
            : null,
          nationalIdLast4: dto.nationalId?.trim()
            ? dto.nationalId.trim().slice(-4)
            : null,
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.beneficiary.created',
          entityType: 'Beneficiary',
          entityId: created.id,
          metadata: {
            name: dto.name.trim(),
            relation: dto.relation.trim(),
            countryCode: dto.countryCode,
          } as Prisma.JsonObject,
        },
      })
    })

    return this.getProfile(userId)
  }

  async updateBeneficiary(userId: string, beneficiaryId: string, dto: UpsertBeneficiaryDto) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: {
        id: beneficiaryId,
        patientUserId: userId,
      },
    })

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found')
    }

    await this.prisma.$transaction([
      this.prisma.beneficiary.update({
        where: { id: beneficiaryId },
        data: {
          name: dto.name.trim(),
          relation: dto.relation.trim(),
          dateOfBirth: new Date(dto.dob),
          countryCode: dto.countryCode,
          nationalIdEncrypted: dto.nationalId?.trim()
            ? this.fieldEncryption.encrypt(dto.nationalId.trim())
            : null,
          nationalIdLast4: dto.nationalId?.trim()
            ? dto.nationalId.trim().slice(-4)
            : null,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.beneficiary.updated',
          entityType: 'Beneficiary',
          entityId: beneficiaryId,
          metadata: {
            name: dto.name.trim(),
            relation: dto.relation.trim(),
          } as Prisma.JsonObject,
        },
      }),
    ])

    return this.getProfile(userId)
  }

  async deleteBeneficiary(userId: string, beneficiaryId: string) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: {
        id: beneficiaryId,
        patientUserId: userId,
      },
    })

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found')
    }

    await this.prisma.$transaction([
      this.prisma.beneficiary.delete({
        where: { id: beneficiaryId },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.beneficiary.deleted',
          entityType: 'Beneficiary',
          entityId: beneficiaryId,
          metadata: {
            name: beneficiary.name,
            relation: beneficiary.relation,
          } as Prisma.JsonObject,
        },
      }),
    ])

    return this.getProfile(userId)
  }

  private buildProfileResponse(profile: {
    user: {
      email: string
      phone: string | null
      country: string | null
      paymentPinHash: string | null
    }
    firstName: string
    lastName: string
    dateOfBirth: Date
    countryCode: string
    residenceCountry: string | null
    residesAbroad: boolean
    nationalIdEncrypted: string
    creditLimit: Prisma.Decimal
    creditUsed: Prisma.Decimal
    creditAvailable: Prisma.Decimal
    creditStatus: CreditStatus
    memberSince: Date
    financePartnerId: string | null
    creditAccountRef: string | null
    beneficiariesEnabled: boolean
    beneficiaries: Array<{
      id: string
      name: string
      relation: string
      dateOfBirth: Date
      countryCode: string
      nationalIdLast4: string | null
    }>
  }) {
    return {
      user: {
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        email: profile.user.email,
        phone: profile.user.phone ?? '',
        nationalId: this.fieldEncryption.decrypt(profile.nationalIdEncrypted),
        dateOfBirth: profile.dateOfBirth.toISOString(),
        country: profile.user.country ?? profile.countryCode,
        countryCode: profile.countryCode,
        residenceCountry:
          profile.residenceCountry
          ?? profile.user.country
          ?? profile.countryCode,
        residesAbroad: profile.residesAbroad,
        creditLimit: this.toNumber(profile.creditLimit),
        creditUsed: this.toNumber(profile.creditUsed),
        creditAvailable: this.toNumber(profile.creditAvailable),
        creditStatus: this.mapCreditStatus(profile.creditStatus),
        memberSince: profile.memberSince.toISOString(),
        financePartnerId: profile.financePartnerId?.toLowerCase(),
        creditAccountRef: profile.creditAccountRef ?? undefined,
        hasPaymentPin: !!profile.user.paymentPinHash,
        beneficiariesEnabled:
          profile.beneficiariesEnabled || profile.beneficiaries.length > 0,
      },
      beneficiaries: profile.beneficiaries.map(beneficiary => this.mapBeneficiary(beneficiary)),
    }
  }

  private mapBeneficiary(beneficiary: {
    id: string
    name: string
    relation: string
    dateOfBirth: Date
    countryCode: string
    nationalIdLast4: string | null
  }) {
    return {
      id: beneficiary.id,
      name: beneficiary.name,
      relation: beneficiary.relation,
      dob: beneficiary.dateOfBirth.toISOString(),
      countryCode: beneficiary.countryCode,
      nationalId: beneficiary.nationalIdLast4 ? `****${beneficiary.nationalIdLast4}` : '',
      age: this.getAge(beneficiary.dateOfBirth),
    }
  }

  private resolveResidenceUpdate(
    dto: {
      residenceCountryCode?: string
      residenceCountryName?: string
    },
    fallbackMarketCountry?: string | null,
  ) {
    // The mobile app historically didn't send residenceCountryCode; fall back to
    // the patient's registered market country so the request still succeeds.
    const code =
      dto.residenceCountryCode?.trim().toUpperCase() ||
      this.toMarketCode(fallbackMarketCountry) ||
      'KE'
    const marketNames: Record<string, string> = {
      KE: 'Kenya',
      ZW: 'Zimbabwe',
      ZM: 'Zambia',
    }

    if (code === 'KE' || code === 'ZW' || code === 'ZM') {
      return {
        residesAbroad: false,
        residenceCountry: marketNames[code],
        countryCode: code,
        userCountry: marketNames[code],
      }
    }

    // Legacy ABROAD token or any non-operating ISO code
    const name = dto.residenceCountryName?.trim()
      || (code === 'ABROAD' ? '' : code)
    if (!name || name.toUpperCase() === 'ABROAD') {
      throw new BadRequestException('Enter your country of residence')
    }
    return {
      residesAbroad: true,
      residenceCountry: name,
      countryCode: null as string | null,
      userCountry: name,
    }
  }

  /** Maps a stored market country (code like "KE" or name like "Kenya") to its ISO code. */
  private toMarketCode(value?: string | null): string {
    const v = value?.trim()
    if (!v) return ''
    const upper = v.toUpperCase()
    if (upper === 'KE' || upper === 'ZW' || upper === 'ZM') return upper
    const marketNames: Record<string, string> = {
      KE: 'Kenya',
      ZW: 'Zimbabwe',
      ZM: 'Zambia',
    }
    const entry = Object.entries(marketNames).find(
      ([, name]) => name.toUpperCase() === upper,
    )
    return entry ? entry[0] : ''
  }

  private splitName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)

    if (parts.length === 0) {
      throw new BadRequestException('Name is required')
    }

    const [firstName, ...rest] = parts
    return {
      firstName,
      lastName: rest.join(' ') || firstName,
    }
  }

  async setupPaymentPin(userId: string, dto: SetupPaymentPinDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (dto.pin !== dto.confirmPin) {
      throw new BadRequestException('PIN confirmation does not match')
    }

    const isReset = !!user.paymentPinHash
    if (isReset) {
      if (!dto.currentPin) {
        throw new BadRequestException('Current PIN is required to reset your payment PIN')
      }

      const validCurrentPin = await bcrypt.compare(dto.currentPin, user.paymentPinHash)
      if (!validCurrentPin) {
        throw new UnauthorizedException('Current PIN is incorrect')
      }
    }

    const paymentPinHash = await bcrypt.hash(dto.pin, 12)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { paymentPinHash },
      }),
      this.prisma.notification.create({
        data: {
          userId,
          type: NotificationType.SYSTEM,
          title: isReset ? 'Payment PIN Updated' : 'Payment PIN Created',
          body: isReset
            ? 'Your payment PIN has been updated successfully.'
            : 'Your payment PIN is ready. You can now authorize payments.',
          screen: '/app/profile',
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: isReset ? 'patient.payment_pin.reset' : 'patient.payment_pin.created',
          entityType: 'User',
          entityId: userId,
          metadata: {
            reset: isReset,
          } as Prisma.JsonObject,
        },
      }),
    ])

    return {
      configured: true,
      message: isReset
        ? 'Payment PIN updated successfully.'
        : 'Payment PIN created successfully.',
    }
  }

  async changePassword(userId: string, dto: ChangePatientPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password confirmation does not match')
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('New password must be different from your current password')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash)
    if (!matches) {
      throw new ForbiddenException('Current password is incorrect')
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.notification.create({
        data: {
          userId,
          type: NotificationType.SYSTEM,
          title: 'Password Updated',
          body: 'Your account password was changed successfully.',
          screen: '/app/profile',
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.password.changed',
          entityType: 'User',
          entityId: userId,
        },
      }),
    ])

    return {
      message: 'Password updated successfully.',
    }
  }

  async getDashboard(userId: string) {
    const [profile, transactions, appointments, news] = await Promise.all([
      this.getProfile(userId),
      this.getTransactions(userId),
      this.getAppointments(userId),
      this.getNews(),
    ])

    return {
      user: profile.user,
      transactions,
      news,
      appointments: appointments.upcoming,
    }
  }

  async getAppointments(userId: string) {
    await this.syncCompletedAppointments({
      patientUserId: userId,
    })

    const appointments = await this.prisma.appointment.findMany({
      where: { patientUserId: userId },
      include: {
        provider: {
          select: {
            name: true,
            category: true,
          },
        },
        beneficiary: true,
        invoices: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    const now = new Date()
    const mapped = appointments.map(appointment => ({
      id: appointment.reference,
      providerId: appointment.providerId,
      provider: appointment.provider.name,
      category: this.mapCategory(appointment.provider.category),
      date: appointment.date.toISOString(),
      time: appointment.timeLabel,
      status: this.mapAppointmentStatus(
        appointment.invoices.length > 0 ? AppointmentStatus.COMPLETED : appointment.status,
      ),
      hasInvoice: appointment.invoices.length > 0,
      forSelf: appointment.forSelf,
      beneficiaryId: appointment.beneficiaryId ?? undefined,
      for: appointment.forSelf ? 'Self' : appointment.beneficiary?.name ?? 'Beneficiary',
      service: appointment.service,
      rescheduledAt: appointment.rescheduledAt?.toISOString() ?? null,
    }))

    const isPastAppointment = (appointment: (typeof mapped)[number]) =>
      appointment.status === 'completed' ||
      appointment.status === 'cancelled' ||
      new Date(appointment.date) < now

    return {
      upcoming: mapped.filter(appointment => !isPastAppointment(appointment)),
      past: mapped.filter(isPastAppointment),
    }
  }

  async getRebookContext(userId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        patientUserId: userId,
        OR: [{ id: appointmentId }, { reference: appointmentId }],
      },
    })

    if (!appointment) {
      throw new NotFoundException('Appointment not found')
    }

    const provider = await this.providersService.getById(appointment.providerId)

    return {
      appointmentId: appointment.reference,
      provider,
      service: appointment.service,
      forSelf: appointment.forSelf,
      beneficiaryId: appointment.beneficiaryId ?? undefined,
      description: appointment.description,
    }
  }

  private async syncCompletedAppointments(where: Prisma.AppointmentWhereInput) {
    const completedAppointmentIds = await this.prisma.appointment.findMany({
      where: {
        ...where,
        status: {
          in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED],
        },
        AND: [
          {
            OR: [{ visits: { some: {} } }, { invoices: { some: {} } }],
          },
        ],
      },
      select: {
        id: true,
      },
    })

    if (completedAppointmentIds.length === 0) {
      return
    }

    await this.prisma.appointment.updateMany({
      where: {
        id: {
          in: completedAppointmentIds.map(appointment => appointment.id),
        },
      },
      data: {
        status: AppointmentStatus.COMPLETED,
      },
    })
  }

  async createAppointment(userId: string, dto: CreateAppointmentDto) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: { beneficiaries: true },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id: dto.providerId },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    if (!dto.forSelf && !profile.beneficiariesEnabled && profile.beneficiaries.length === 0) {
      throw new BadRequestException(
        'Beneficiaries are not enabled on your account. Enable them in Profile to book for someone else.',
      )
    }

    const beneficiary =
      dto.forSelf || !dto.beneficiaryId
        ? null
        : profile.beneficiaries.find(item => item.id === dto.beneficiaryId)

    if (!dto.forSelf && !beneficiary) {
      throw new NotFoundException('Beneficiary not found')
    }

    const primaryService = dto.selectedServices?.[0]?.trim() || 'General Consultation'
    const appointmentDate = new Date(dto.date)
    const attachments = dto.attachments ?? []
    const patientName = `${profile.firstName} ${profile.lastName}`.trim()

    const appointment = await this.prisma.$transaction(async tx => {
      const reference = await this.referenceService.next('APT', tx)

      return tx.appointment.create({
        data: {
          reference,
          patientUserId: userId,
          providerId: dto.providerId,
          beneficiaryId: beneficiary?.id,
          service: primaryService,
          description: dto.description,
          date: appointmentDate,
          timeLabel: dto.time,
          status: AppointmentStatus.REQUESTED,
          forSelf: dto.forSelf,
          address: dto.address ?? provider.address,
          attachments: attachments as unknown as Prisma.InputJsonValue,
          medicalHistory: [],
          allergies: [],
        },
      })
    })

    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.APPOINTMENT,
        title: 'Appointment Request Sent',
        body: `Your request to ${provider.name} has been submitted.`,
        screen: '/app/appointments',
      },
    })

    if (provider.authUserId) {
      await this.prisma.notification.create({
        data: {
          userId: provider.authUserId,
          type: NotificationType.APPOINTMENT,
          title: 'New Appointment Request',
          body: attachments.length > 0
            ? `${patientName} sent a new appointment request with ${attachments.length} attachment${attachments.length === 1 ? '' : 's'}.`
            : `${patientName} sent a new appointment request.`,
          screen: '/sp/appointments',
        },
      })
      await this.notifications.sendPushToUser(provider.authUserId, {
        title: 'New Appointment Request',
        body: attachments.length > 0
          ? `${patientName} sent a new appointment request with ${attachments.length} attachment${attachments.length === 1 ? '' : 's'}.`
          : `${patientName} sent a new appointment request.`,
        data: { screen: '/sp/appointments' },
      })
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'patient.appointment.created',
        entityType: 'Appointment',
        entityId: appointment.id,
        metadata: {
          reference: appointment.reference,
          providerId: dto.providerId,
          attachmentCount: attachments.length,
        } as Prisma.JsonObject,
      },
    })

    return {
      id: appointment.reference,
      provider: provider.name,
      status: 'pending',
      date: appointment.date.toISOString(),
      time: appointment.timeLabel,
      service: appointment.service,
      for: appointment.forSelf ? 'Self' : beneficiary?.name ?? 'Beneficiary',
      message: 'Appointment request created successfully.',
    }
  }

  async cancelAppointment(userId: string, appointmentId: string, dto: CancelAppointmentDto) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        patientUserId: userId,
        OR: [{ id: appointmentId }, { reference: appointmentId }],
      },
      include: {
        provider: true,
        beneficiary: true,
      },
    })

    if (!appointment) {
      throw new NotFoundException('Appointment not found')
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled')
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Completed appointments cannot be cancelled')
    }

    const cancelledAppointment = await this.prisma.$transaction(async tx => {
      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: dto.reason,
          cancellationNote: dto.note ?? null,
        },
        include: {
          provider: {
            select: {
              name: true,
              category: true,
            },
          },
          beneficiary: true,
        },
      })

      const notifications: Prisma.NotificationCreateManyInput[] = [
        {
          userId,
          type: NotificationType.APPOINTMENT,
          title: 'Appointment Cancelled',
          body: `Your appointment with ${appointment.provider.name} has been cancelled.`,
          screen: '/app/appointments',
        },
      ]

      if (appointment.provider.authUserId) {
        notifications.push({
          userId: appointment.provider.authUserId,
          type: NotificationType.APPOINTMENT,
          title: 'Patient Cancelled Appointment',
          body: `${appointment.forSelf ? 'A patient' : appointment.beneficiary?.name ?? 'A beneficiary'} cancelled the ${appointment.service} appointment scheduled for ${appointment.timeLabel}. Reason: ${dto.reason}.${dto.note ? ` Note: ${dto.note}` : ''}`,
          screen: '/sp/appointments',
        })
      }

      await tx.notification.createMany({
        data: notifications,
      })

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.appointment.cancelled',
          entityType: 'Appointment',
          entityId: appointment.id,
          metadata: {
            reference: appointment.reference,
            reason: dto.reason,
            note: dto.note ?? null,
            providerId: appointment.providerId,
          } as Prisma.JsonObject,
        },
      })

      return updated
    })

    return {
      id: cancelledAppointment.id,
      provider: cancelledAppointment.provider.name,
      category: this.mapCategory(cancelledAppointment.provider.category),
      date: cancelledAppointment.date.toISOString(),
      time: cancelledAppointment.timeLabel,
      status: this.mapAppointmentStatus(cancelledAppointment.status),
      for: cancelledAppointment.forSelf
        ? 'Self'
        : cancelledAppointment.beneficiary?.name ?? 'Beneficiary',
      service: cancelledAppointment.service,
      rescheduledAt: null,
      message: 'Appointment cancelled successfully.',
    }
  }

  async confirmRescheduledAppointment(userId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        patientUserId: userId,
        OR: [{ id: appointmentId }, { reference: appointmentId }],
      },
      include: {
        provider: {
          select: { name: true, category: true, authUserId: true },
        },
        beneficiary: true,
      },
    })

    if (!appointment) {
      throw new NotFoundException('Appointment not found')
    }

    if (appointment.status !== AppointmentStatus.REQUESTED || !appointment.rescheduledAt) {
      throw new BadRequestException('No pending reschedule found for this appointment')
    }

    const confirmed = await this.prisma.$transaction(async tx => {
      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.CONFIRMED,
          rescheduledAt: null,
        },
        include: {
          provider: {
            select: { name: true, category: true, authUserId: true },
          },
          beneficiary: true,
        },
      })

      if (appointment.provider.authUserId) {
        const formattedDate = updated.date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        await tx.notification.create({
          data: {
            userId: appointment.provider.authUserId,
            type: NotificationType.APPOINTMENT,
            title: 'Reschedule Accepted',
            body: `Patient confirmed the rescheduled ${appointment.service} appointment on ${formattedDate} at ${updated.timeLabel}.`,
            screen: `/sp/appointments/${appointment.reference}`,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.appointment.reschedule-confirmed',
          entityType: 'Appointment',
          entityId: appointment.id,
          metadata: {
            reference: appointment.reference,
            providerId: appointment.providerId,
          } as Prisma.JsonObject,
        },
      })

      return updated
    })

    return {
      id: confirmed.id,
      provider: confirmed.provider.name,
      category: this.mapCategory(confirmed.provider.category),
      date: confirmed.date.toISOString(),
      time: confirmed.timeLabel,
      status: this.mapAppointmentStatus(confirmed.status),
      for: confirmed.forSelf ? 'Self' : confirmed.beneficiary?.name ?? 'Beneficiary',
      service: confirmed.service,
      rescheduledAt: null,
      message: 'Reschedule confirmed successfully.',
    }
  }

  async getTransactions(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { patientUserId: userId },
      include: {
        invoice: {
          select: {
            reference: true,
            status: true,
          },
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
    })

    return transactions.map(transaction => ({
      id: transaction.reference ?? transaction.id,
      provider: transaction.providerNameSnapshot ?? 'GG Provider',
      amount: this.toNumber(transaction.amount),
      date: transaction.occurredAt.toISOString(),
      status: this.mapTransactionClientStatus(transaction.status, transaction.invoice?.status),
      service: transaction.service,
      invoiceId: transaction.invoice?.reference,
    }))
  }

  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return notifications.map(notification => ({
      id: notification.id,
      type: this.mapNotificationType(notification.type),
      title: notification.title,
      body: notification.body,
      time: notification.createdAt.toISOString(),
      read: !!notification.readAt,
      screen: notification.screen,
    }))
  }

  async markNotificationRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        readAt: new Date(),
      },
    })

    return { success: true }
  }

  async getNews() {
    const items = await this.prisma.newsArticle.findMany({
      where: { status: NewsStatus.PUBLISHED },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 10,
    })

    return items.map(item => ({
      id: item.id,
      title: item.title,
      source: item.source,
      date: item.publishedAt.toISOString(),
      tag: item.tag,
      body: item.body,
      url: item.url ?? undefined,
    }))
  }

  async getInvoices(userId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { patientUserId: userId },
      omit: { attachmentMetadata: true },
      include: {
        provider: true,
        lineItems: true,
        appointment: {
          select: {
            reference: true,
            date: true,
            timeLabel: true,
            service: true,
          },
        },
        prescriptionRequest: { select: { fulfillmentMode: true, quoteReviewedAt: true } },
        reviews: {
          select: { id: true },
          take: 1,
        },
      },
      orderBy: {
        issueDate: 'desc',
      },
    })

    return invoices.map(invoice => this.mapInvoice(invoice))
  }

  async getInvoice(userId: string, invoiceReference: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        patientUserId: userId,
        reference: invoiceReference,
      },
      omit: { attachmentMetadata: true },
      include: {
        provider: true,
        lineItems: true,
        appointment: {
          select: {
            reference: true,
            date: true,
            timeLabel: true,
            service: true,
          },
        },
        prescriptionRequest: { select: { fulfillmentMode: true, quoteReviewedAt: true } },
        reviews: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!invoice) {
      throw new NotFoundException('Invoice not found')
    }

    return this.mapInvoice(invoice)
  }

  async getInvoiceAttachment(userId: string, invoiceReference: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        patientUserId: userId,
        reference: invoiceReference,
      },
      select: {
        attachment: true,
        attachmentMetadata: true,
      },
    })

    if (!invoice) {
      throw new NotFoundException('Invoice not found')
    }

    const attachment = await this.storage.resolveAttachmentUrl(
      parseInvoiceAttachmentMetadata(invoice.attachmentMetadata),
      invoice.attachment ?? 'invoice.pdf',
    )
    if (!attachment) {
      throw new NotFoundException('Invoice document is not available')
    }

    return attachment
  }

  async rejectInvoice(
    userId: string,
    invoiceReference: string,
    dto: RejectInvoiceDto,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        patientUserId: userId,
        reference: invoiceReference,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            authUserId: true,
          },
        },
      },
    })

    if (!invoice) {
      throw new NotFoundException('Invoice not found')
    }

    if (invoice.status !== InvoiceStatus.PENDING_AUTH) {
      throw new BadRequestException('Only pending invoices can be rejected')
    }

    const updated = await this.prisma.$transaction(async tx => {
      const rejected = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.REJECTED,
          rejectionReason: dto.reason.trim(),
        },
        include: {
          provider: true,
          lineItems: true,
        },
      })

      if (invoice.provider.authUserId) {
        await tx.notification.create({
          data: {
            userId: invoice.provider.authUserId,
            type: NotificationType.INVOICE,
            title: 'Invoice Rejected',
            body: `Invoice ${invoice.reference} was rejected by the patient. You can edit and resubmit a corrected invoice.`,
            screen: `/sp/invoices/${invoice.reference}`,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.invoice.rejected',
          entityType: 'Invoice',
          entityId: invoice.id,
          metadata: {
            reference: invoice.reference,
            reason: dto.reason.trim(),
          } as Prisma.JsonObject,
        },
      })

      return rejected
    })

    return this.mapInvoice(updated)
  }

  async submitReview(userId: string, dto: SubmitReviewDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        patientUserId: userId,
        reference: dto.invoiceId,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            authUserId: true,
          },
        },
      },
    })

    if (!invoice) {
      throw new NotFoundException('Invoice not found')
    }

    if (invoice.providerId !== dto.providerId) {
      throw new BadRequestException('Provider does not match this invoice')
    }

    if (
      invoice.status !== InvoiceStatus.AUTHORIZED &&
      invoice.status !== InvoiceStatus.PAID
    ) {
      throw new BadRequestException('You can only review visits after payment authorization')
    }

    const existingReview = await this.prisma.providerReview.findUnique({
      where: {
        patientUserId_invoiceId: {
          patientUserId: userId,
          invoiceId: invoice.id,
        },
      },
    })

    if (existingReview) {
      throw new ConflictException('You have already reviewed this visit')
    }

    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      select: {
        firstName: true,
        lastName: true,
      },
    })

    const reviewText =
      dto.text?.trim() || REVIEW_RATING_LABELS[dto.rating] || 'No comment'
    const reviewerName = formatPatientFullName(profile)

    const review = await this.prisma.$transaction(async tx => {
      const reviewReference = await this.referenceService.next('REV', tx)

      const created = await tx.providerReview.create({
        data: {
          reference: reviewReference,
          providerId: dto.providerId,
          patientUserId: userId,
          invoiceId: invoice.id,
          rating: dto.rating,
          text: reviewText,
        },
      })

      await this.providersService.recalculateRating(dto.providerId, tx)

      if (invoice.provider.authUserId) {
        await tx.notification.create({
          data: {
            userId: invoice.provider.authUserId,
            type: NotificationType.INVOICE,
            title: 'New Patient Review',
            body: `${reviewerName} left a ${dto.rating}-star review on invoice ${invoice.reference}.`,
            screen: `/sp/invoices/${invoice.reference}`,
          },
        })
      }

      const admins = await tx.user.findMany({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
        select: { id: true },
      })

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            type: NotificationType.SYSTEM,
            title: 'New Provider Review',
            body: `${reviewerName} reviewed ${invoice.provider.name} (${dto.rating} stars) on invoice ${invoice.reference}.`,
            screen: '/admin/providers',
          })),
        })
      }

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'patient.review.submitted',
          entityType: 'ProviderReview',
          entityId: created.id,
          metadata: {
            reference: reviewReference,
            invoiceReference: invoice.reference,
            providerId: dto.providerId,
            rating: dto.rating,
          } as Prisma.JsonObject,
        },
      })

      return created
    })

    return {
      id: review.reference,
      providerId: review.providerId,
      name: reviewerName,
      date: review.createdAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      rating: review.rating,
      text: review.text,
    }
  }

  async authorizeInvoice(
    userId: string,
    invoiceReference: string,
    dto: AuthorizeInvoiceDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        patientUserId: userId,
        reference: invoiceReference,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            authUserId: true,
          },
        },
        lineItems: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!invoice) {
      throw new NotFoundException('Invoice not found')
    }

    if (invoice.status === InvoiceStatus.AUTHORIZED || invoice.status === InvoiceStatus.PAID) {
      return {
        success: true,
        complete: true,
        message: 'Payment authorization confirmed',
      }
    }

    if (
      invoice.status === InvoiceStatus.REJECTED ||
      invoice.status === InvoiceStatus.DISPUTED
    ) {
      throw new BadRequestException('This invoice was rejected and cannot be authorized until the provider resubmits a corrected version')
    }

    if (!user.paymentPinHash) {
      throw new NotFoundException('Payment PIN is not configured for this account')
    }

    if (dto.step < 1 || dto.step > 3) {
      throw new BadRequestException('PIN confirmation step must be 1, 2, or 3')
    }

    const progressKey = this.getInvoicePinProgressKey(userId, invoiceReference)
    const key = this.getInvoicePinKey(userId, invoiceReference, dto.step)
    const lockKey = `${key}:lock`
    const attemptKey = `${key}:attempts`

    const lockedUntil = await this.redis.get(lockKey)
    if (lockedUntil) {
      return {
        success: false,
        complete: false,
        lockedUntil: Number(lockedUntil),
        message: 'Too many attempts. Account locked for 30 minutes.',
      }
    }

    if (dto.step > 1) {
      const confirmedThrough = Number((await this.redis.get(progressKey)) ?? '0')
      if (confirmedThrough < dto.step - 1) {
        throw new BadRequestException(
          'Complete the previous PIN confirmation before continuing',
        )
      }
    }

    const validPin = await bcrypt.compare(dto.pin, user.paymentPinHash)
    if (!validPin) {
      const nextAttempts = Number((await this.redis.get(attemptKey)) ?? '0') + 1
      if (nextAttempts >= 3) {
        const expiry = Date.now() + 30 * 60 * 1000
        await this.redis.set(lockKey, String(expiry), 30 * 60)
        await this.redis.del(attemptKey)
        await this.prisma.auditLog.create({
          data: {
            actorUserId: userId,
            action: 'patient.invoice.pin_locked',
            entityType: 'Invoice',
            entityId: invoice.id,
            metadata: {
              reference: invoiceReference,
              step: dto.step,
            } as Prisma.JsonObject,
          },
        })
        return {
          success: false,
          complete: false,
          lockedUntil: expiry,
          message: 'Too many attempts. Account locked for 30 minutes.',
        }
      }

      await this.redis.set(attemptKey, String(nextAttempts), 30 * 60)
      return {
        success: false,
        complete: false,
        attemptsRemaining: 3 - nextAttempts,
        message: 'Incorrect PIN. Please try again.',
      }
    }

    await this.redis.del(attemptKey)
    await this.redis.set(progressKey, String(dto.step), 30 * 60)

    if (dto.step >= 3) {
      const serviceLabel = invoice.lineItems[0]?.name ?? 'Invoice Authorization'
      const invoiceAmount = this.toNumber(invoice.amount)
      let walletDebit = 0
      let offAppDue = 0

      await this.prisma.$transaction(async tx => {
        const profile = await tx.patientProfile.findUnique({
          where: { userId },
        })

        if (!profile) {
          throw new NotFoundException('Patient profile not found')
        }

        if (profile.creditStatus !== CreditStatus.APPROVED) {
          throw new BadRequestException('Approved healthcare credit is required to authorize this payment')
        }

        const available = this.toNumber(profile.creditAvailable)
        walletDebit = Math.min(available, invoiceAmount)
        if (walletDebit <= 0) {
          throw new BadRequestException('No wallet balance available for this invoice')
        }
        offAppDue = Number((invoiceAmount - walletDebit).toFixed(2))

        const paymentReference = await this.referenceService.next('AUTH', tx)
        const transactionReference = await this.referenceService.next('TXN', tx)

        await tx.patientProfile.update({
          where: { userId },
          data: {
            creditUsed: { increment: walletDebit },
            creditAvailable: { decrement: walletDebit },
          },
        })

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.AUTHORIZED,
            paymentAuthorizedAt: new Date(),
            paymentRef: paymentReference,
            walletAmountPaid: walletDebit,
            offAppAmountDue: offAppDue,
            paidAt: null,
          },
        })

        if (invoice.prescriptionRequestId) {
          const rx = await tx.prescriptionRequest.findUnique({
            where: { id: invoice.prescriptionRequestId },
            select: { id: true, status: true, fulfillmentMode: true, reference: true },
          })
          if (
            rx &&
            (rx.status === PrescriptionRequestStatus.QUOTED ||
              rx.status === PrescriptionRequestStatus.SUBMITTED)
          ) {
            await tx.prescriptionRequest.update({
              where: { id: rx.id },
              data: {
                status: PrescriptionRequestStatus.ACCEPTED,
                acceptedAt: new Date(),
              },
            })

            if (invoice.provider.authUserId) {
              const approvalLabel =
                rx.fulfillmentMode === 'DELIVERY'
                  ? 'approved delivery'
                  : 'approved preparation'
              await tx.notification.create({
                data: {
                  userId: invoice.provider.authUserId,
                  type: NotificationType.PRESCRIPTION,
                  title: 'Patient Approved Order',
                  body: `${invoice.billedToName} ${approvalLabel} for ${rx.reference}. You can now prepare the medication.`,
                  screen: `/sp/prescriptions/${rx.reference}`,
                },
              })
            }
          }
        }

        await tx.transaction.upsert({
          where: { invoiceId: invoice.id },
          create: {
            reference: transactionReference,
            invoiceId: invoice.id,
            patientUserId: userId,
            providerId: invoice.providerId,
            amount: walletDebit,
            status: TransactionStatus.AUTHORIZED,
            service: serviceLabel,
            providerNameSnapshot: invoice.provider.name,
          },
          update: {
            reference: transactionReference,
            patientUserId: userId,
            providerId: invoice.providerId,
            amount: walletDebit,
            status: TransactionStatus.AUTHORIZED,
            service: serviceLabel,
            providerNameSnapshot: invoice.provider.name,
          },
        })

        const patientPaymentBody =
          offAppDue > 0
            ? `Invoice ${invoiceReference}: ${walletDebit} paid from your GG'APP allocation. Please settle the remaining ${offAppDue} directly with your provider.`
            : `Invoice ${invoiceReference} is fully paid from your GG'APP allocation. Your service provider has been notified.`

        await tx.notification.create({
          data: {
            userId,
            type: NotificationType.PAYMENT,
            title: offAppDue > 0 ? 'Partial Payment Authorized' : 'Payment Authorized',
            body: patientPaymentBody,
            screen: `/app/invoices/${invoiceReference}/success`,
          },
        })

        if (invoice.provider.authUserId) {
          const providerBody =
            offAppDue > 0
              ? `${invoice.billedToName} paid ${walletDebit} via GG'APP for invoice ${invoiceReference}. Collect the remaining ${offAppDue} off-app.`
              : `${invoice.billedToName} authorized full payment for invoice ${invoiceReference} (${invoiceAmount}) via GG'APP.`
          await tx.notification.create({
            data: {
              userId: invoice.provider.authUserId,
              type: NotificationType.PAYMENT,
              title: offAppDue > 0 ? 'Partial Wallet Payment Received' : 'Payment Authorized by Patient',
              body: providerBody,
              screen: `/sp/invoices/${invoiceReference}`,
            },
          })
        }

        const admins = await tx.user.findMany({
          where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
          select: { id: true },
        })

        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map(admin => ({
              userId: admin.id,
              type: NotificationType.PAYMENT,
              title: 'Patient Payment Authorized',
              body:
                offAppDue > 0
                  ? `${invoice.billedToName} paid ${walletDebit} via GG'APP to ${invoice.provider.name} for invoice ${invoiceReference}; ${offAppDue} remains off-app.`
                  : `${invoice.billedToName} authorized full payment to ${invoice.provider.name} for invoice ${invoiceReference} (${invoiceAmount}).`,
              screen: '/admin/payments',
            })),
          })
        }

        await tx.auditLog.create({
          data: {
            actorUserId: userId,
            action: 'patient.invoice.authorized',
            entityType: 'Invoice',
            entityId: invoice.id,
            metadata: {
              reference: invoiceReference,
              step: dto.step,
              paymentReference,
              walletAmountPaid: walletDebit,
              offAppAmountDue: offAppDue,
              invoiceAmount,
            } as Prisma.JsonObject,
          },
        })
      })

      await this.redis.del(progressKey)

      return {
        success: true,
        complete: true,
        message:
          offAppDue > 0
            ? `Paid ${walletDebit} from your allocation. Settle ${offAppDue} directly with your provider.`
            : 'Payment authorization confirmed',
        walletAmountPaid: walletDebit,
        offAppAmountDue: offAppDue,
        invoiceAmount,
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'patient.invoice.pin_confirmed',
        entityType: 'Invoice',
        entityId: invoice.id,
        metadata: {
          reference: invoiceReference,
          step: dto.step,
        } as Prisma.JsonObject,
      },
    })

    return {
      success: true,
      complete: false,
      message: `PIN confirmation ${dto.step} of 3 accepted`,
    }
  }

  async applyCredit(userId: string, dto: ApplyCreditDto) {
    if (!dto.consent) {
      throw new BadRequestException('Credit bureau consent is required')
    }

    const includeBeneficiaries = dto.coverageType === 'self_and_beneficiaries'
    const beneficiaries = dto.beneficiaries ?? []

    if (includeBeneficiaries && beneficiaries.length === 0) {
      throw new BadRequestException(
        'Add at least one beneficiary when selecting Self + beneficiaries',
      )
    }

    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { country: true } },
      },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    if (profile.creditStatus === CreditStatus.PENDING) {
      throw new BadRequestException('You already have a pending credit application')
    }

    if (profile.creditStatus === CreditStatus.APPROVED) {
      throw new BadRequestException('You already have approved credit. Request a limit increase instead.')
    }

    const pendingApplication = await this.prisma.creditApplication.findFirst({
      where: {
        patientUserId: userId,
        status: CreditApplicationStatus.SUBMITTED,
      },
    })

    if (pendingApplication) {
      throw new BadRequestException('You already have a pending credit application')
    }

    const reference = await this.referenceService.next('GGA')
    const residence = this.resolveResidenceUpdate(dto, profile.user.country)

    const application = await this.prisma.$transaction(async tx => {
      const created = await tx.creditApplication.create({
        data: {
          reference,
          patientUserId: userId,
          type: CreditApplicationType.INITIAL,
          financePartnerId: dto.financePartnerId,
          employment: dto.employment,
          monthlyIncome: dto.monthlyIncome,
          requestedAmount: dto.requestedAmount,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          country: residence.userCountry,
        },
      })

      await tx.patientProfile.update({
        where: { userId },
        data: {
          creditStatus: CreditStatus.PENDING,
          financePartnerId: dto.financePartnerId,
          residesAbroad: residence.residesAbroad,
          residenceCountry: residence.residenceCountry,
          ...(residence.countryCode ? { countryCode: residence.countryCode } : {}),
          ...(includeBeneficiaries ? { beneficiariesEnabled: true } : {}),
        },
      })

      if (includeBeneficiaries) {
        for (const beneficiary of beneficiaries) {
          await tx.beneficiary.create({
            data: {
              patientUserId: userId,
              name: beneficiary.name.trim(),
              relation: beneficiary.relation.trim(),
              dateOfBirth: new Date(beneficiary.dob),
              countryCode: beneficiary.countryCode,
              nationalIdEncrypted: beneficiary.nationalId?.trim()
                ? this.fieldEncryption.encrypt(beneficiary.nationalId.trim())
                : null,
              nationalIdLast4: beneficiary.nationalId?.trim()
                ? beneficiary.nationalId.trim().slice(-4)
                : null,
            },
          })
        }
      }

      const admins = await tx.user.findMany({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
        select: { id: true },
      })

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            type: NotificationType.CREDIT,
            title: 'New Credit Application',
            body: `${profile.firstName} ${profile.lastName} submitted credit application ${reference} for ${dto.requestedAmount}.`,
            screen: '/admin/credit-applications',
          })),
        })
      }

      await tx.notification.create({
        data: {
          userId,
          type: NotificationType.CREDIT,
          title: 'Credit Application Submitted',
          body: `Your application ${reference} was sent to the ${this.formatFinancePartnerName(dto.financePartnerId)} team for review.`,
          screen: '/app/credit/status',
        },
      })

      return created
    })

    return this.mapCreditApplication(application)
  }

  async increaseCredit(userId: string, dto: IncreaseCreditDto) {
    if (!dto.consent) {
      throw new BadRequestException('Consent is required to submit this request')
    }

    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    if (profile.creditStatus !== CreditStatus.APPROVED) {
      throw new BadRequestException('Approved credit is required before requesting an increase')
    }

    if (!profile.financePartnerId) {
      throw new BadRequestException('Finance partner is not configured on your account')
    }

    const pendingApplication = await this.prisma.creditApplication.findFirst({
      where: {
        patientUserId: userId,
        status: CreditApplicationStatus.SUBMITTED,
      },
    })

    if (pendingApplication) {
      throw new BadRequestException('You already have a pending credit request')
    }

    const currentLimit = this.toNumber(profile.creditLimit)
    if (currentLimit + dto.increaseAmount > 50000) {
      throw new BadRequestException('Requested total limit cannot exceed 50,000')
    }

    const reference = await this.referenceService.next('GGA')

    const application = await this.prisma.$transaction(async tx => {
      const created = await tx.creditApplication.create({
        data: {
          reference,
          patientUserId: userId,
          type: CreditApplicationType.INCREASE,
          financePartnerId: profile.financePartnerId!,
          employment: 'existing-customer',
          monthlyIncome: dto.monthlyIncome,
          requestedAmount: dto.increaseAmount,
          reason: dto.reason,
          notes: dto.notes,
        },
      })

      await tx.patientProfile.update({
        where: { userId },
        data: { creditStatus: CreditStatus.PENDING },
      })

      const admins = await tx.user.findMany({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
        select: { id: true },
      })

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            type: NotificationType.CREDIT,
            title: 'Credit Limit Increase Request',
            body: `${profile.firstName} ${profile.lastName} requested a limit increase of ${dto.increaseAmount} (${reference}).`,
            screen: '/admin/credit-applications',
          })),
        })
      }

      await tx.notification.create({
        data: {
          userId,
          type: NotificationType.CREDIT,
          title: 'Increase Request Submitted',
          body: `Your request ${reference} was sent to the ${this.formatFinancePartnerName(profile.financePartnerId!)} team for review.`,
          screen: '/app/credit/status?type=increase',
        },
      })

      return created
    })

    return this.mapCreditApplication(application)
  }

  async getCreditStatus(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    const application = await this.prisma.creditApplication.findFirst({
      where: { patientUserId: userId },
      orderBy: { submittedAt: 'desc' },
    })

    return {
      creditStatus: this.mapCreditStatus(profile.creditStatus),
      creditLimit: this.toNumber(profile.creditLimit),
      creditUsed: this.toNumber(profile.creditUsed),
      creditAvailable: this.toNumber(profile.creditAvailable),
      financePartnerId: profile.financePartnerId?.toLowerCase() ?? undefined,
      creditAccountRef: profile.creditAccountRef ?? undefined,
      application: application ? this.mapCreditApplication(application) : null,
    }
  }

  private mapCreditApplication(application: {
    id: string
    reference: string
    type: CreditApplicationType
    status: CreditApplicationStatus
    financePartnerId: string
    employment: string
    monthlyIncome: Prisma.Decimal
    requestedAmount: Prisma.Decimal
    approvedAmount: Prisma.Decimal | null
    reason: string | null
    notes: string | null
    declineReason: string | null
    submittedAt: Date
    reviewedAt: Date | null
  }) {
    return {
      id: application.id,
      reference: application.reference,
      type: application.type.toLowerCase() as 'initial' | 'increase',
      status: application.status.toLowerCase() as 'submitted' | 'approved' | 'rejected',
      financePartnerId: application.financePartnerId.toLowerCase(),
      employment: application.employment,
      monthlyIncome: this.toNumber(application.monthlyIncome),
      requestedAmount: this.toNumber(application.requestedAmount),
      approvedAmount: application.approvedAmount != null
        ? this.toNumber(application.approvedAmount)
        : undefined,
      reason: application.reason ?? undefined,
      notes: application.notes ?? undefined,
      declineReason: application.declineReason ?? undefined,
      submittedAt: application.submittedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString(),
    }
  }

  private mapCreditStatus(status: CreditStatus) {
    return status.toLowerCase() as 'approved' | 'pending' | 'rejected' | 'not_applied'
  }

  private formatFinancePartnerName(partnerId: string) {
    switch (partnerId.toLowerCase()) {
      case 'moneymart':
        return 'Moneymart Finance'
      case 'equity':
        return 'Equity Bank'
      default:
        return partnerId
    }
  }

  private mapCategory(category: ProviderCategory) {
    return category.toLowerCase() as
      | 'doctor'
      | 'pharmacy'
      | 'laboratory'
      | 'radiology'
      | 'hospital'
      | 'clinic'
  }

  private mapAppointmentStatus(status: AppointmentStatus) {
    if (status === AppointmentStatus.REQUESTED) return 'pending'
    return status.toLowerCase() as 'confirmed' | 'pending' | 'cancelled' | 'completed'
  }

  private mapTransactionClientStatus(
    status: TransactionStatus,
    invoiceStatus?: InvoiceStatus | null,
  ): 'authorized' | 'completed' | 'pending' | 'failed' {
    if (status === TransactionStatus.FAILED) {
      return 'failed'
    }
    if (status === TransactionStatus.PENDING) {
      return 'pending'
    }
    if (status === TransactionStatus.COMPLETED || invoiceStatus === InvoiceStatus.PAID) {
      return 'completed'
    }
    return 'authorized'
  }

  private mapNotificationType(type: NotificationType) {
    return type.toLowerCase() as 'payment' | 'invoice' | 'appointment' | 'credit' | 'system' | 'prescription'
  }

  private mapInvoice(invoice: {
    id: string
    reference: string
    status: InvoiceStatus
    issueDate: Date
    dueDate: Date
    amount: Prisma.Decimal
    walletAmountPaid?: Prisma.Decimal | null
    offAppAmountDue?: Prisma.Decimal | null
    billedToName: string
    billedToNationalId: string
    serviceForType: 'SELF' | 'BENEFICIARY'
    serviceForName: string
    serviceForRelation: string | null
    serviceForAge: number | null
    provider: {
      id: number
      name: string
      license: string | null
      phone: string
      address: string
    }
    lineItems: Array<{
      name: string
      amount: Prisma.Decimal
    }>
    appointment?: {
      reference?: string
      date?: Date
      timeLabel?: string
      service: string
    } | null
    attachment: string | null
    attachmentMetadata?: Prisma.JsonValue | null
    rejectionReason?: string | null
    paymentRef?: string | null
    prescriptionRequestId?: string | null
    prescriptionRequest?: {
      fulfillmentMode: PrescriptionFulfillmentMode
      quoteReviewedAt?: Date | null
    } | null
    reviews?: Array<{ id: string }>
  }) {
    const metadata = sanitizeInvoiceAttachmentMetadata(invoice.attachmentMetadata)
    const status =
      invoice.status === InvoiceStatus.PENDING_AUTH
        ? 'pending_auth'
        : invoice.status === InvoiceStatus.DISPUTED
          ? 'rejected'
          : invoice.status.toLowerCase()

    const lineItems =
      invoice.lineItems.length > 0
        ? invoice.lineItems.map(item => ({
            name: item.name,
            amount: Number(item.amount),
          }))
        : [
            {
              name: invoice.appointment?.service?.trim() || 'Service',
              amount: Number(invoice.amount),
            },
          ]

    return {
      id: invoice.reference,
      providerId: invoice.provider.id,
      isPrescription: invoice.prescriptionRequestId != null,
      fulfillmentMode: invoice.prescriptionRequest?.fulfillmentMode
        ? invoice.prescriptionRequest.fulfillmentMode.toLowerCase()
        : undefined,
      prescriptionQuoteReviewed: invoice.prescriptionRequest?.quoteReviewedAt != null,
      reviewSubmitted: (invoice.reviews?.length ?? 0) > 0,
      paymentRef: invoice.paymentRef ?? undefined,
      status,
      provider: {
        name: invoice.provider.name,
        license: invoice.provider.license ?? 'N/A',
        phone: invoice.provider.phone,
        address: invoice.provider.address,
      },
      date: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      amount: Number(invoice.amount),
      walletAmountPaid: invoice.walletAmountPaid != null ? Number(invoice.walletAmountPaid) : undefined,
      offAppAmountDue: invoice.offAppAmountDue != null ? Number(invoice.offAppAmountDue) : undefined,
      billedTo: {
        name: invoice.billedToName,
        nationalId: invoice.billedToNationalId,
      },
      serviceFor: {
        type: invoice.serviceForType === 'SELF' ? 'self' : 'beneficiary',
        name: invoice.serviceForName,
        relation: invoice.serviceForRelation ?? undefined,
        age: invoice.serviceForAge ?? undefined,
      },
      services: lineItems,
      appointmentId: invoice.appointment?.reference ?? undefined,
      appointmentDate: invoice.appointment?.date?.toISOString() ?? undefined,
      appointmentTime: invoice.appointment?.timeLabel ?? undefined,
      appointmentService: invoice.appointment?.service ?? undefined,
      attachmentFileName: metadata?.originalName ?? invoice.attachment ?? undefined,
      hasAttachment: Boolean(invoice.attachment || metadata),
      // PDF bytes are loaded via GET /patient/invoices/:id/attachment
      attachmentUrl: undefined,
      rejectionReason: invoice.rejectionReason ?? undefined,
    }
  }

  private toNumber(value: Prisma.Decimal | number | null) {
    if (value === null) return 0
    return Number(value)
  }

  private getAge(dateOfBirth: Date) {
    const today = new Date()
    let age = today.getFullYear() - dateOfBirth.getFullYear()
    const monthDiff = today.getMonth() - dateOfBirth.getMonth()
    const dayDiff = today.getDate() - dateOfBirth.getDate()

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1
    }

    return age
  }

  private getInvoicePinKey(userId: string, invoiceReference: string, step: number) {
    return `invoice-pin:${userId}:${invoiceReference}:${step}`
  }

  private getInvoicePinProgressKey(userId: string, invoiceReference: string) {
    return `invoice-pin-progress:${userId}:${invoiceReference}`
  }

  async createPrescriptionRequest(userId: string, dto: CreatePrescriptionRequestDto) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: { beneficiaries: true },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id: dto.providerId },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    const isPharmacy =
      provider.category === ProviderCategory.PHARMACY ||
      provider.categories.includes(ProviderCategory.PHARMACY)

    if (!isPharmacy) {
      throw new BadRequestException('Prescription requests are only supported for pharmacies')
    }

    if (!dto.forSelf && !profile.beneficiariesEnabled && profile.beneficiaries.length === 0) {
      throw new BadRequestException(
        'Beneficiaries are not enabled on your account. Enable them in Profile to request for someone else.',
      )
    }

    const beneficiary =
      dto.forSelf || !dto.beneficiaryId
        ? null
        : profile.beneficiaries.find(item => item.id === dto.beneficiaryId)

    if (!dto.forSelf && !beneficiary) {
      throw new NotFoundException('Beneficiary not found')
    }

    if (dto.fulfillmentMode === 'delivery' && !dto.deliveryAddress?.trim()) {
      throw new BadRequestException('Delivery address is required for delivery orders')
    }

    const patientName = `${profile.firstName} ${profile.lastName}`.trim()
    const fulfillmentMode =
      dto.fulfillmentMode === 'delivery'
        ? PrescriptionFulfillmentMode.DELIVERY
        : PrescriptionFulfillmentMode.PICKUP

    const request = await this.prisma.$transaction(async tx => {
      const reference = await this.referenceService.next('RX', tx)

      return tx.prescriptionRequest.create({
        data: {
          reference,
          patientUserId: userId,
          providerId: dto.providerId,
          beneficiaryId: beneficiary?.id,
          sourceAppointmentId: dto.sourceAppointmentId,
          status: PrescriptionRequestStatus.SUBMITTED,
          fulfillmentMode,
          deliveryAddress: dto.deliveryAddress?.trim() || null,
          patientNotes: dto.patientNotes?.trim() || null,
          prescriptionAttachment: (this.storage.isEnabled
            ? {
                ...(await this.storage.storeAttachment({
                  dataUrl: dto.attachment.dataUrl,
                  originalName: dto.attachment.name,
                  mimeType: dto.attachment.mimeType,
                  sizeBytes: dto.attachment.sizeBytes,
                  displaySize: dto.attachment.size,
                  prefix: 'prescriptions',
                })),
                type: dto.attachment.type,
              }
            : dto.attachment) as unknown as Prisma.InputJsonValue,
          forSelf: dto.forSelf,
        },
        include: {
          provider: true,
          beneficiary: true,
        },
      })
    })

    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.PRESCRIPTION,
        title: 'Prescription Submitted',
        body: `Your prescription was sent to ${provider.name}. They will confirm availability and pricing.`,
        screen: `/app/prescriptions/${request.reference}`,
      },
    })

    if (provider.authUserId) {
      await this.prisma.notification.create({
        data: {
          userId: provider.authUserId,
          type: NotificationType.PRESCRIPTION,
          title: 'New Prescription Upload',
          body: `${patientName} uploaded a prescription for review.`,
          screen: `/sp/prescriptions/${request.reference}`,
        },
      })
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'patient.prescription.created',
        entityType: 'PrescriptionRequest',
        entityId: request.id,
        metadata: {
          reference: request.reference,
          providerId: dto.providerId,
        } as Prisma.JsonObject,
      },
    })

    return this.mapPrescriptionRequest(request)
  }

  async getPrescriptionRequests(userId: string) {
    const requests = await this.prisma.prescriptionRequest.findMany({
      where: { patientUserId: userId },
      include: {
        provider: true,
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return Promise.all(requests.map(request => this.mapPrescriptionRequest(request)))
  }

  async markPrescriptionQuoteReviewed(userId: string, requestReference: string) {
    const request = await this.prisma.prescriptionRequest.findFirst({
      where: {
        patientUserId: userId,
        OR: [{ id: requestReference }, { reference: requestReference }],
      },
      include: {
        provider: true,
        beneficiary: true,
        invoice: { select: { id: true, reference: true, status: true } },
      },
    })

    if (!request) {
      throw new NotFoundException('Prescription request not found')
    }

    if (!request.quotedAt && request.quotedAmount == null) {
      throw new BadRequestException('This prescription has no quote to review yet')
    }

    if (request.quoteReviewedAt) {
      return this.mapPrescriptionRequest(request)
    }

    const updated = await this.prisma.prescriptionRequest.update({
      where: { id: request.id },
      data: { quoteReviewedAt: new Date() },
      include: {
        provider: true,
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
    })

    return this.mapPrescriptionRequest(updated)
  }

  async acceptPrescriptionQuote(userId: string, requestReference: string) {
    const request = await this.prisma.prescriptionRequest.findFirst({
      where: {
        patientUserId: userId,
        OR: [{ id: requestReference }, { reference: requestReference }],
      },
      include: { provider: true },
    })

    if (!request) {
      throw new NotFoundException('Prescription request not found')
    }

    if (request.status !== PrescriptionRequestStatus.QUOTED) {
      throw new BadRequestException('Only quoted requests can be accepted')
    }

    const updated = await this.prisma.prescriptionRequest.update({
      where: { id: request.id },
      data: {
        status: PrescriptionRequestStatus.ACCEPTED,
        acceptedAt: new Date(),
        quoteReviewedAt: request.quoteReviewedAt ?? new Date(),
      },
      include: {
        provider: true,
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
    })

    if (request.provider.authUserId) {
      await this.prisma.notification.create({
        data: {
          userId: request.provider.authUserId,
          type: NotificationType.PRESCRIPTION,
          title: 'Quote Accepted',
          body: `Patient accepted the quote for ${request.reference}. Upload the invoice so they can approve payment.`,
          screen: `/sp/prescriptions/${request.reference}`,
        },
      })
    }

    return this.mapPrescriptionRequest(updated)
  }

  async declinePrescriptionQuote(
    userId: string,
    requestReference: string,
    dto: DeclinePrescriptionRequestDto,
  ) {
    const request = await this.prisma.prescriptionRequest.findFirst({
      where: {
        patientUserId: userId,
        OR: [{ id: requestReference }, { reference: requestReference }],
      },
      include: { provider: true },
    })

    if (!request) {
      throw new NotFoundException('Prescription request not found')
    }

    if (
      request.status !== PrescriptionRequestStatus.QUOTED &&
      request.status !== PrescriptionRequestStatus.ACCEPTED
    ) {
      throw new BadRequestException('Only quoted or accepted requests can be declined')
    }

    const reason = dto.reason?.trim() || null

    const updated = await this.prisma.prescriptionRequest.update({
      where: { id: request.id },
      data: {
        status: PrescriptionRequestStatus.CANCELLED,
        declinedAt: new Date(),
        declineReason: reason,
      },
      include: {
        provider: true,
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
    })

    if (request.provider.authUserId) {
      await this.prisma.notification.create({
        data: {
          userId: request.provider.authUserId,
          type: NotificationType.PRESCRIPTION,
          title: 'Quote Declined',
          body: reason
            ? `Patient declined the quote for ${request.reference}: ${reason}`
            : `Patient declined the quote for ${request.reference}.`,
          screen: `/sp/prescriptions/${request.reference}`,
        },
      })
    }

    return this.mapPrescriptionRequest(updated)
  }

  private async mapPrescriptionRequest(
    request: {
      id: string
      reference: string
      status: PrescriptionRequestStatus
      fulfillmentMode: PrescriptionFulfillmentMode
      deliveryAddress: string | null
      patientNotes: string | null
      pharmacyNotes: string | null
      prescriptionAttachment: Prisma.JsonValue
      quotedItems: Prisma.JsonValue | null
      quotedAmount: Prisma.Decimal | null
      deliveryFee?: Prisma.Decimal | null
      quotedAt: Date | null
      quoteReviewedAt?: Date | null
      acceptedAt: Date | null
      declinedAt: Date | null
      declineReason: string | null
      readyAt: Date | null
      fulfilledAt: Date | null
      forSelf: boolean
      createdAt: Date
      provider: { id: number; name: string; category: ProviderCategory }
      beneficiary: { name: string } | null
      invoice?: { reference: string; status: InvoiceStatus } | null
    },
  ) {
    return {
      id: request.reference,
      providerId: request.provider.id,
      provider: request.provider.name,
      category: 'pharmacy' as const,
      status: request.status.toLowerCase(),
      fulfillmentMode: request.fulfillmentMode.toLowerCase(),
      deliveryAddress: request.deliveryAddress ?? undefined,
      patientNotes: request.patientNotes ?? undefined,
      pharmacyNotes: request.pharmacyNotes ?? undefined,
      attachment: await this.resolvePrescriptionAttachment(request.prescriptionAttachment),
      quotedItems: request.quotedItems ?? undefined,
      quotedAmount: request.quotedAmount ? Number(request.quotedAmount) : undefined,
      deliveryFee: request.deliveryFee != null ? Number(request.deliveryFee) : undefined,
      quotedAt: request.quotedAt?.toISOString(),
      quoteReviewedAt: request.quoteReviewedAt?.toISOString(),
      acceptedAt: request.acceptedAt?.toISOString(),
      declinedAt: request.declinedAt?.toISOString(),
      declineReason: request.declineReason ?? undefined,
      readyAt: request.readyAt?.toISOString(),
      fulfilledAt: request.fulfilledAt?.toISOString(),
      forSelf: request.forSelf,
      for: request.forSelf ? 'Self' : request.beneficiary?.name ?? 'Beneficiary',
      submittedAt: request.createdAt.toISOString(),
      invoiceId: request.invoice?.reference,
      invoiceStatus: request.invoice?.status.toLowerCase(),
    }
  }
}
