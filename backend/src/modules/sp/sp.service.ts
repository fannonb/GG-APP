import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  AppointmentMode,
  AppointmentStatus,
  InvoiceStatus,
  NotificationType,
  Prisma,
  PrescriptionRequestStatus,
  PrescriptionFulfillmentMode,
  ProviderCategory,
  ProviderLifecycleStatus,
  ProviderOpenStatus,
  ProviderPayoutMethod,
  ProviderPayoutAccountStatus,
  ServiceForType,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { FieldEncryptionService } from '../../common/services/field-encryption.service'
import {
  decryptClinicalField,
  encryptClinicalField,
} from '../../common/utils/clinical-field.util'
import type { CreateProviderVisitDto } from './dto/create-provider-visit.dto'
import type { UpsertProviderPayoutAccountDto } from './dto/provider-payout-account.dto'
import type { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto'
import type { UpdateProviderProfileDto } from './dto/provider-profile.dto'
import type { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto'
import type {
  ChangeProviderPasswordDto,
  UpdateProviderNotificationPrefsDto,
} from './dto/provider-settings.dto'
import type { UpsertInvoiceDto } from './dto/upsert-invoice.dto'
import type { QuotePrescriptionRequestDto } from './dto/quote-prescription-request.dto'
import type { RejectPrescriptionRequestDto } from './dto/reject-prescription-request.dto'
import { computeSpOnboardingProgress } from '../../common/utils/sp-onboarding.util'
import { parseInvoiceAttachmentMetadata, sanitizeInvoiceAttachmentMetadata } from '../../common/utils/invoice-attachment.util'
import { ReferenceService } from '../../common/services/reference.service'
import { StorageService } from '../../common/services/storage.service'
import { formatPatientFullName } from '../../common/utils/patient-name.util'

@Injectable()
export class SpService {
  private readonly prisma: PrismaService
  private readonly redis: RedisService
  private readonly referenceService: ReferenceService
  private readonly fieldEncryption: FieldEncryptionService
  private readonly storage: StorageService

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(RedisService) redis: RedisService,
    @Inject(ReferenceService) referenceService: ReferenceService,
    @Inject(FieldEncryptionService) fieldEncryption: FieldEncryptionService,
    @Inject(StorageService) storage: StorageService,
  ) {
    this.prisma = prisma
    this.redis = redis
    this.referenceService = referenceService
    this.fieldEncryption = fieldEncryption
    this.storage = storage
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

  async getDashboard(userId: string) {
    const provider = await this.resolveProvider(userId)

    const [appointments, invoices, notifications, prescriptionRequests] = await Promise.all([
      this.getAppointmentRecords(provider.id),
      this.getInvoiceRecords(provider.id),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.getPrescriptionRequestRecords(provider.id),
    ])

    const patients = await this.getPatientsFromRecords(provider.id)
    const isPharmacy = this.isPharmacyProvider(provider)
    const isPharmacyOnly = this.isPharmacyOnlyProvider(provider)

    const onboarding = computeSpOnboardingProgress({
      provider,
      appointmentCount: isPharmacyOnly ? prescriptionRequests.length : appointments.length,
      invoiceCount: invoices.length,
    })

    return {
      sp: this.mapDashboardProfile(
        provider,
        invoices,
        appointments,
        patients.length,
        prescriptionRequests,
      ),
      isPharmacy,
      isPharmacyOnly,
      appointments: appointments.map(appointment => this.mapAppointment(appointment)),
      prescriptionRequests: await Promise.all(
        prescriptionRequests.map(request => this.mapPrescriptionRequest(request)),
      ),
      patients,
      payments: invoices
        .filter(
          invoice =>
            invoice.status === InvoiceStatus.AUTHORIZED ||
            invoice.status === InvoiceStatus.PAID,
        )
        .map(invoice => this.mapPayment(invoice)),
      invoices: invoices.map(invoice => this.mapSpInvoice(invoice)),
      notifications: notifications.map(notification => ({
        id: notification.id,
        type: notification.type.toLowerCase(),
        title: notification.title,
        body: notification.body,
        time: notification.createdAt.toISOString(),
        read: !!notification.readAt,
        screen: notification.screen,
      })),
      onboarding,
    }
  }

  async getPrescriptionRequests(userId: string) {
    const provider = await this.resolveProvider(userId)
    const requests = await this.getPrescriptionRequestRecords(provider.id)
    return Promise.all(requests.map(request => this.mapPrescriptionRequest(request)))
  }

  async getPrescriptionRequest(userId: string, requestReference: string) {
    const provider = await this.resolveProvider(userId)
    const request = await this.prisma.prescriptionRequest.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: requestReference }, { reference: requestReference }],
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
    })

    if (!request) {
      throw new NotFoundException('Prescription request not found')
    }

    return this.mapPrescriptionRequest(request)
  }

  async quotePrescriptionRequest(
    userId: string,
    requestReference: string,
    dto: QuotePrescriptionRequestDto,
  ) {
    const provider = await this.resolveProvider(userId)

    if (!this.isPharmacyProvider(provider)) {
      throw new BadRequestException('Only pharmacies can quote prescription requests')
    }

    const request = await this.prisma.prescriptionRequest.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: requestReference }, { reference: requestReference }],
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
      },
    })

    if (!request) {
      throw new NotFoundException('Prescription request not found')
    }

    if (
      request.status !== PrescriptionRequestStatus.SUBMITTED &&
      request.status !== PrescriptionRequestStatus.QUOTED
    ) {
      throw new BadRequestException('This prescription request can no longer be accepted')
    }

    const deliveryFee = Number(dto.deliveryFee ?? 0)
    if (request.fulfillmentMode === PrescriptionFulfillmentMode.DELIVERY && deliveryFee < 0) {
      throw new BadRequestException('Delivery fee cannot be negative')
    }
    if (request.fulfillmentMode === PrescriptionFulfillmentMode.DELIVERY && !(deliveryFee > 0)) {
      throw new BadRequestException('Delivery fee is required for delivery orders')
    }

    const updated = await this.prisma.prescriptionRequest.update({
      where: { id: request.id },
      data: {
        status: PrescriptionRequestStatus.QUOTED,
        quotedItems: dto.items as unknown as Prisma.InputJsonValue,
        quotedAmount: dto.amount,
        deliveryFee:
          request.fulfillmentMode === PrescriptionFulfillmentMode.DELIVERY ? deliveryFee : null,
        pharmacyNotes: dto.pharmacyNotes?.trim() || null,
        quotedAt: new Date(),
        quoteReviewedAt: null,
        declinedAt: null,
        declineReason: null,
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
    })

    await this.prisma.notification.create({
      data: {
        userId: request.patientUserId,
        type: NotificationType.PRESCRIPTION,
        title: 'Quote Ready',
        body: `${provider.name} sent pricing for your prescription. Review and accept or decline the quote to continue.`,
        screen: `/app/prescriptions/${updated.reference}`,
      },
    })

    return this.mapPrescriptionRequest(updated)
  }

  async rejectPrescriptionRequest(
    userId: string,
    requestReference: string,
    dto: RejectPrescriptionRequestDto,
  ) {
    const provider = await this.resolveProvider(userId)

    if (!this.isPharmacyProvider(provider)) {
      throw new BadRequestException('Only pharmacies can reject prescription requests')
    }

    const request = await this.prisma.prescriptionRequest.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: requestReference }, { reference: requestReference }],
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
    })

    if (!request) {
      throw new NotFoundException('Prescription request not found')
    }

    if (
      request.status !== PrescriptionRequestStatus.SUBMITTED &&
      request.status !== PrescriptionRequestStatus.QUOTED
    ) {
      throw new BadRequestException('This prescription request can no longer be rejected')
    }

    if (request.invoice) {
      throw new BadRequestException('This prescription already has an invoice and cannot be rejected')
    }

    const reason = dto.reason.trim()
    const updated = await this.prisma.prescriptionRequest.update({
      where: { id: request.id },
      data: {
        status: PrescriptionRequestStatus.REJECTED,
        declinedAt: new Date(),
        declineReason: reason,
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
    })

    await this.prisma.notification.create({
      data: {
        userId: request.patientUserId,
        type: NotificationType.PRESCRIPTION,
        title: 'Prescription Declined',
        body: `${provider.name} could not fulfil your prescription: ${reason}`,
        screen: `/app/prescriptions/${updated.reference}`,
      },
    })

    return this.mapPrescriptionRequest(updated)
  }

  async markPrescriptionReady(userId: string, requestReference: string) {
    const provider = await this.resolveProvider(userId)
    const request = await this.resolvePharmacyPrescriptionRequest(provider, requestReference)

    if (
      request.status !== PrescriptionRequestStatus.ACCEPTED &&
      request.status !== PrescriptionRequestStatus.PREPARING
    ) {
      throw new BadRequestException(
        request.status === PrescriptionRequestStatus.QUOTED
          ? 'Wait for the patient to approve preparation or delivery first'
          : 'Only patient-approved requests can be marked ready',
      )
    }

    const updated = await this.prisma.prescriptionRequest.update({
      where: { id: request.id },
      data: {
        status: PrescriptionRequestStatus.READY,
        readyAt: new Date(),
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
    })

    const fulfillmentLabel =
      updated.fulfillmentMode === 'DELIVERY' ? 'out for delivery' : 'ready for pickup'

    await this.prisma.notification.create({
      data: {
        userId: updated.patientUserId,
        type: NotificationType.PRESCRIPTION,
        title: 'Medication Ready',
        body: `Your order from ${provider.name} is ${fulfillmentLabel}.`,
        screen: `/app/prescriptions/${updated.reference}`,
      },
    })

    return this.mapPrescriptionRequest(updated)
  }

  async fulfillPrescriptionRequest(userId: string, requestReference: string) {
    const provider = await this.resolveProvider(userId)
    const request = await this.resolvePharmacyPrescriptionRequest(provider, requestReference)

    if (request.status !== PrescriptionRequestStatus.READY) {
      throw new BadRequestException('Only ready orders can be marked as fulfilled')
    }

    if (!request.quotedAmount || !request.quotedItems) {
      throw new BadRequestException('A quote is required before fulfillment')
    }

    const patientProfile = request.patient.patientProfile
    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found')
    }

    const fulfillmentLabel = request.fulfillmentMode === 'DELIVERY' ? 'delivered' : 'collected'

    const updated = await this.prisma.$transaction(async tx => {
      const result = await tx.prescriptionRequest.update({
        where: { id: request.id },
        data: {
          status: PrescriptionRequestStatus.FULFILLED,
          fulfilledAt: new Date(),
        },
      })

      await tx.notification.create({
        data: {
          userId: request.patientUserId,
          type: NotificationType.PRESCRIPTION,
          title: 'Medication Collected',
          body: `Your order from ${provider.name} has been ${fulfillmentLabel}.`,
          screen: `/app/prescriptions/${request.reference}`,
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'sp.prescription.fulfilled',
          entityType: 'PrescriptionRequest',
          entityId: request.id,
          metadata: {
            reference: request.reference,
          } as Prisma.JsonObject,
        },
      })

      return result
    })

    const refreshed = await this.prisma.prescriptionRequest.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
    })

    return this.mapPrescriptionRequest(refreshed)
  }

  async getAppointments(userId: string) {
    const provider = await this.resolveProvider(userId)
    const appointments = await this.getAppointmentRecords(provider.id)
    return appointments.map(appointment => this.mapAppointment(appointment))
  }

  async getAppointment(userId: string, appointmentId: string) {
    const provider = await this.resolveProvider(userId)
    await this.syncCompletedAppointments({
      providerId: provider.id,
      OR: [{ id: appointmentId }, { reference: appointmentId }],
    })
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: appointmentId }, { reference: appointmentId }],
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
        invoices: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!appointment) {
      throw new NotFoundException('Appointment not found')
    }

    return this.mapAppointment(appointment)
  }

  async updateAppointmentStatus(
    userId: string,
    appointmentId: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    const provider = await this.resolveProvider(userId)
    await this.syncCompletedAppointments({
      providerId: provider.id,
      OR: [{ id: appointmentId }, { reference: appointmentId }],
    })
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: appointmentId }, { reference: appointmentId }],
      },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        beneficiary: true,
        invoices: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!appointment) {
      throw new NotFoundException('Appointment not found')
    }

    const nextStatus =
      dto.status === 'confirmed'
        ? AppointmentStatus.CONFIRMED
        : AppointmentStatus.CANCELLED

    if (appointment.status === nextStatus) {
      return this.mapAppointment(appointment)
    }

    if (
      appointment.status !== AppointmentStatus.REQUESTED &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException('This appointment can no longer be updated')
    }

    const patientName = appointment.patient.patientProfile
      ? `${appointment.patient.patientProfile.firstName} ${appointment.patient.patientProfile.lastName}`.trim()
      : 'your account'
    const subjectName = appointment.forSelf
      ? patientName
      : appointment.beneficiary?.name ?? 'your beneficiary'
    const actionLabel = dto.status === 'confirmed' ? 'confirmed' : 'cancelled'

    const [updatedAppointment] = await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: nextStatus },
        include: {
          patient: {
            include: {
              patientProfile: true,
            },
          },
          beneficiary: true,
          invoices: {
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: appointment.patientUserId,
          type: NotificationType.APPOINTMENT,
          title:
            dto.status === 'confirmed'
              ? 'Appointment Confirmed'
              : 'Appointment Cancelled by Provider',
          body:
            dto.status === 'confirmed'
              ? `${provider.name} confirmed your appointment for ${subjectName} on ${appointment.timeLabel}.`
              : `${provider.name} cancelled your appointment for ${subjectName}.`,
          screen: '/app/appointments',
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: `sp.appointment.${actionLabel}`,
          entityType: 'Appointment',
          entityId: appointment.id,
          metadata: {
            reference: appointment.reference,
            patientUserId: appointment.patientUserId,
            status: dto.status,
          } as Prisma.JsonObject,
        },
      }),
    ])

    return this.mapAppointment(updatedAppointment)
  }

  async rescheduleAppointment(
    userId: string,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ) {
    const provider = await this.resolveProvider(userId)
    await this.syncCompletedAppointments({
      providerId: provider.id,
      OR: [{ id: appointmentId }, { reference: appointmentId }],
    })
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: appointmentId }, { reference: appointmentId }],
      },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        beneficiary: true,
      },
    })

    if (!appointment) {
      throw new NotFoundException('Appointment not found')
    }

    if (
      appointment.status !== AppointmentStatus.REQUESTED &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException('This appointment can no longer be rescheduled')
    }

    const nextDate = new Date(dto.date)
    if (Number.isNaN(nextDate.getTime())) {
      throw new BadRequestException('Invalid appointment date')
    }

    const patientName = appointment.patient.patientProfile
      ? `${appointment.patient.patientProfile.firstName} ${appointment.patient.patientProfile.lastName}`.trim()
      : 'your account'
    const subjectName = appointment.forSelf
      ? patientName
      : appointment.beneficiary?.name ?? 'your beneficiary'
    const formattedDate = nextDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const noteSuffix = dto.note ? ` Note: ${dto.note}` : ''

    const [updatedAppointment] = await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          date: nextDate,
          timeLabel: dto.time,
          status: AppointmentStatus.REQUESTED,
          rescheduledAt: new Date(),
        },
        include: {
          patient: {
            include: {
              patientProfile: true,
            },
          },
          beneficiary: true,
          invoices: {
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: appointment.patientUserId,
          type: NotificationType.APPOINTMENT,
          title: 'Reschedule Proposed',
          body: `${provider.name} proposed a new time for ${subjectName}: ${formattedDate} at ${dto.time}.${noteSuffix}`,
          screen: `/app/appointments/${appointment.id}/reschedule`,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'sp.appointment.rescheduled',
          entityType: 'Appointment',
          entityId: appointment.id,
          metadata: {
            reference: appointment.reference,
            patientUserId: appointment.patientUserId,
            date: dto.date,
            time: dto.time,
            note: dto.note ?? null,
          } as Prisma.JsonObject,
        },
      }),
    ])

    return this.mapAppointment(updatedAppointment)
  }

  async getPatients(userId: string) {
    const provider = await this.resolveProvider(userId)
    return this.getPatientsFromRecords(provider.id)
  }

  async getPatient(userId: string, patientId: string) {
    const provider = await this.resolveProvider(userId)
    const patient = await this.prisma.user.findFirst({
      where: {
        id: patientId,
        appointments: {
          some: {
            providerId: provider.id,
          },
        },
      },
      include: {
        patientProfile: {
          include: {
            beneficiaries: true,
          },
        },
        appointments: {
          where: { providerId: provider.id },
          orderBy: { date: 'desc' },
        },
        providerVisits: {
          where: { providerId: provider.id },
          include: {
            beneficiary: { select: { name: true } },
            appointment: { select: { id: true, reference: true, service: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          where: { providerId: provider.id },
          include: { lineItems: true },
          orderBy: { issueDate: 'desc' },
        },
      },
    })

    if (!patient || !patient.patientProfile) {
      throw new NotFoundException('Patient not found')
    }

    return this.mapPatient(patient)
  }

  async createVisit(userId: string, dto: CreateProviderVisitDto) {
    const provider = await this.resolveProvider(userId)
    let linkedAppointmentId: string | null = null
    let linkedAppointmentPatientId: string | null = null
    let linkedAppointmentBeneficiaryId: string | null = null

    if (dto.appointmentId) {
      const appointment = await this.resolveProviderAppointment(provider.id, dto.appointmentId)
      linkedAppointmentId = appointment.id
      linkedAppointmentPatientId = appointment.patientUserId
      linkedAppointmentBeneficiaryId = appointment.beneficiaryId ?? null
    }

    const effectivePatientId = linkedAppointmentPatientId ?? dto.patientId
    const patient = await this.prisma.user.findFirst({
      where: linkedAppointmentPatientId
        ? {
            id: effectivePatientId,
          }
        : {
            id: effectivePatientId,
            appointments: {
              some: {
                providerId: provider.id,
              },
            },
          },
    })

    if (!patient) {
      throw new NotFoundException('Patient not found for this provider')
    }

    const effectiveBeneficiaryId = dto.beneficiaryId ?? linkedAppointmentBeneficiaryId
    if (effectiveBeneficiaryId) {
      const beneficiary = await this.prisma.beneficiary.findFirst({
        where: { id: effectiveBeneficiaryId, patientUserId: effectivePatientId },
        select: { id: true },
      })
      if (!beneficiary) {
        throw new BadRequestException('Beneficiary does not belong to this patient')
      }
    }

    const visit = await this.prisma.$transaction(async tx => {
      const clinical = this.encryptClinicalFields(dto)
      const createdVisit = await tx.providerVisit.create({
        data: {
          providerId: provider.id,
          patientUserId: effectivePatientId,
          appointmentId: linkedAppointmentId,
          beneficiaryId: effectiveBeneficiaryId,
          diagnosis: clinical.diagnosis,
          treatment: clinical.treatment,
          followUp: clinical.followUp,
          internalNote: clinical.internalNote,
          services: dto.services ?? [],
          vitals: {
            bp: dto.vitals.bp,
            temp: dto.vitals.temp,
            glucose: dto.vitals.glucose,
            sats: dto.vitals.sats,
          } as Prisma.InputJsonValue,
        },
      })

      if (linkedAppointmentId) {
        await tx.appointment.update({
          where: { id: linkedAppointmentId },
          data: {
            status: AppointmentStatus.COMPLETED,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'sp.visit.created',
          entityType: 'ProviderVisit',
          entityId: createdVisit.id,
          metadata: {
            patientId: dto.patientId,
            appointmentId: linkedAppointmentId,
          } as Prisma.JsonObject,
        },
      })

      return createdVisit
    })

    return {
      id: visit.id,
      patientId: visit.patientUserId,
      appointmentId: linkedAppointmentId ?? visit.appointmentId,
      beneficiaryId: visit.beneficiaryId,
      diagnosis: this.decryptClinical(visit.diagnosis),
      treatment: this.decryptClinical(visit.treatment),
      followUp: this.decryptClinical(visit.followUp),
      internalNote: this.decryptClinical(visit.internalNote),
      services: Array.isArray(visit.services) ? visit.services : [],
      vitals: visit.vitals ?? {},
      createdAt: visit.createdAt.toISOString(),
    }
  }

  async getVisits(userId: string, patientId?: string) {
    const provider = await this.resolveProvider(userId)
    const visits = await this.prisma.providerVisit.findMany({
      where: {
        providerId: provider.id,
        ...(patientId ? { patientUserId: patientId } : {}),
      },
      include: {
        beneficiary: true,
        appointment: { select: { reference: true, service: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return visits.map(visit => this.mapVisit(visit))
  }

  private mapVisit(visit: {
    id: string
    patientUserId: string
    appointmentId: string | null
    beneficiaryId: string | null
    diagnosis: string | null
    treatment: string | null
    followUp: string | null
    internalNote: string | null
    services: Prisma.JsonValue
    vitals: Prisma.JsonValue
    createdAt: Date
    beneficiary?: { name: string } | null
    appointment?: { reference: string; service: string } | null
  }) {
    return {
      id: visit.id,
      patientId: visit.patientUserId,
      appointmentId: visit.appointment?.reference ?? visit.appointmentId ?? undefined,
      beneficiaryId: visit.beneficiaryId,
      forBeneficiary: visit.beneficiary?.name ?? null,
      service: visit.appointment?.service ?? 'Consultation',
      diagnosis: this.decryptClinical(visit.diagnosis) ?? '',
      treatment: this.decryptClinical(visit.treatment) ?? '',
      followUp: this.decryptClinical(visit.followUp) ?? '',
      internalNote: this.decryptClinical(visit.internalNote) ?? '',
      services: Array.isArray(visit.services) ? (visit.services as string[]) : [],
      vitals: this.mapVitals(visit.vitals),
      createdAt: visit.createdAt.toISOString(),
    }
  }

  private encryptClinicalFields(dto: {
    diagnosis?: string
    treatment?: string
    followUp?: string
    internalNote?: string
  }) {
    return {
      diagnosis: encryptClinicalField(this.fieldEncryption, dto.diagnosis),
      treatment: encryptClinicalField(this.fieldEncryption, dto.treatment),
      followUp: encryptClinicalField(this.fieldEncryption, dto.followUp),
      internalNote: encryptClinicalField(this.fieldEncryption, dto.internalNote),
    }
  }

  private decryptClinical(value: string | null | undefined) {
    return decryptClinicalField(this.fieldEncryption, value)
  }

  private mapVitals(vitals: Prisma.JsonValue): Record<string, string> {
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

  async getInvoices(userId: string) {
    const provider = await this.resolveProvider(userId)
    const invoices = await this.getInvoiceRecords(provider.id)
    return invoices.map(invoice => this.mapSpInvoice(invoice))
  }

  async getNextInvoiceReference(userId: string) {
    await this.resolveProvider(userId)
    const reference = await this.referenceService.preview('INV')
    return { reference }
  }

  async getInvoice(userId: string, invoiceReference: string) {
    const provider = await this.resolveProvider(userId)
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: invoiceReference }, { reference: invoiceReference }],
      },
      omit: { attachmentMetadata: true },
      include: {
        patient: { include: { patientProfile: true } },
        lineItems: true,
        appointment: true,
        reviews: {
          include: {
            patient: {
              include: {
                patientProfile: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!invoice) {
      throw new NotFoundException('Invoice not found')
    }

    return this.mapSpInvoice(invoice)
  }

  async getInvoiceAttachment(userId: string, invoiceReference: string) {
    const provider = await this.resolveProvider(userId)
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: invoiceReference }, { reference: invoiceReference }],
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

  async createInvoice(userId: string, dto: UpsertInvoiceDto) {
    const provider = await this.resolveProvider(userId)

    if (dto.prescriptionRequestId) {
      return this.createInvoiceFromPrescription(userId, provider, dto)
    }

    if (!dto.appointmentId) {
      throw new BadRequestException('Appointment is required to create an invoice')
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: dto.appointmentId }, { reference: dto.appointmentId }],
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
      },
    })

    if (!appointment || !appointment.patient.patientProfile) {
      throw new NotFoundException('Appointment not found')
    }

    if (
      appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException('Only confirmed or completed appointments can be invoiced')
    }

    const existingForAppointment = await this.prisma.invoice.findFirst({
      where: {
        appointmentId: appointment.id,
        status: { notIn: [InvoiceStatus.REJECTED, InvoiceStatus.DISPUTED] },
      },
    })

    if (existingForAppointment) {
      throw new BadRequestException('This appointment already has an invoice')
    }

    this.ensureAttachmentContent(dto)

    const patientProfile = appointment.patient.patientProfile
    const reference = dto.invoiceNumber.trim()
    if (!reference) {
      throw new BadRequestException('Invoice number is required')
    }

    const duplicateReference = await this.prisma.invoice.findFirst({
      where: { reference },
      select: { id: true },
    })
    if (duplicateReference) {
      throw new BadRequestException('That invoice number is already in use. Choose a different one.')
    }

    const serviceNames =
      dto.services?.length > 0
        ? dto.services
        : [appointment.service?.trim() || 'Consultation']

    const invoice = await this.prisma.$transaction(async tx => {
      await this.referenceService.syncFromReference('INV', reference, tx)

      const createdInvoice = await tx.invoice.create({
        data: {
          reference,
          patientUserId: appointment.patientUserId,
          providerId: provider.id,
          appointmentId: appointment.id,
          status: InvoiceStatus.PENDING_AUTH,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          amount: dto.amount,
          billedToName: `${patientProfile.firstName} ${patientProfile.lastName}`.trim(),
          billedToNationalId: patientProfile.nationalIdLast4
            ? `****${patientProfile.nationalIdLast4}`
            : '****',
          serviceForType: appointment.forSelf ? ServiceForType.SELF : ServiceForType.BENEFICIARY,
          serviceForName: appointment.forSelf
            ? `${patientProfile.firstName} ${patientProfile.lastName}`.trim()
            : appointment.beneficiary?.name ?? 'Beneficiary',
          serviceForRelation: appointment.beneficiary?.relation ?? null,
          serviceForAge: appointment.beneficiary ? this.getAge(appointment.beneficiary.dateOfBirth) : null,
          submittedAt: new Date(),
          attachment: dto.attachment?.originalName ?? null,
          attachmentMetadata: dto.attachment
            ? ((this.storage.isEnabled
                ? await this.storage.storeAttachment({
                    ...dto.attachment,
                    prefix: 'invoices',
                  })
                : dto.attachment) as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          lineItems: {
            create: this.resolveLineItems(dto, serviceNames),
          },
        },
        include: {
          patient: { include: { patientProfile: true } },
          lineItems: true,
          appointment: true,
        },
      })

      const hasClinicalPayload =
        !!(dto.diagnosis || dto.treatment || dto.followUp || dto.internalNote)
      if (hasClinicalPayload) {
        const existingVisit = await tx.providerVisit.findFirst({
          where: { appointmentId: appointment.id },
          select: { id: true },
        })
        if (!existingVisit) {
          const clinical = this.encryptClinicalFields(dto)
          await tx.providerVisit.create({
            data: {
              providerId: provider.id,
              patientUserId: appointment.patientUserId,
              appointmentId: appointment.id,
              beneficiaryId: appointment.beneficiaryId ?? null,
              diagnosis: clinical.diagnosis,
              treatment: clinical.treatment,
              followUp: clinical.followUp,
              internalNote: clinical.internalNote,
              services: dto.services ?? [],
              vitals: {},
            },
          })
        }
      }

      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.COMPLETED,
        },
      })

      await tx.notification.create({
        data: {
          userId: appointment.patientUserId,
          type: NotificationType.INVOICE,
          title: 'New Invoice Available',
          body: `A new invoice from ${provider.name} is awaiting your authorization.`,
          screen: `/app/invoices/${createdInvoice.reference}`,
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'sp.invoice.created',
          entityType: 'Invoice',
          entityId: createdInvoice.id,
          metadata: {
            reference: createdInvoice.reference,
            appointmentId: appointment.id,
          } as Prisma.JsonObject,
        },
      })

      return createdInvoice
    })

    return this.mapSpInvoice(invoice)
  }

  private async createInvoiceFromPrescription(
    userId: string,
    provider: { id: number; name: string },
    dto: UpsertInvoiceDto,
  ) {
    const request = await this.prisma.prescriptionRequest.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: dto.prescriptionRequestId }, { reference: dto.prescriptionRequestId }],
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
      },
    })

    if (!request || !request.patient.patientProfile) {
      throw new NotFoundException('Prescription request not found')
    }

    if (request.status !== PrescriptionRequestStatus.ACCEPTED) {
      throw new BadRequestException(
        'Wait for the patient to accept the quote before uploading an invoice',
      )
    }

    if (!request.quotedAmount || !request.quotedItems) {
      throw new BadRequestException('Item pricing is required before invoicing')
    }

    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        prescriptionRequestId: request.id,
        status: { notIn: [InvoiceStatus.REJECTED, InvoiceStatus.DISPUTED] },
      },
    })

    if (existingInvoice) {
      throw new BadRequestException('This prescription request already has an invoice')
    }

    this.ensureAttachmentContent(dto)

    const patientProfile = request.patient.patientProfile
    const reference = dto.invoiceNumber.trim()
    if (!reference) {
      throw new BadRequestException('Invoice number is required')
    }

    const duplicateReference = await this.prisma.invoice.findFirst({
      where: { reference },
      select: { id: true },
    })
    if (duplicateReference) {
      throw new BadRequestException('That invoice number is already in use. Choose a different one.')
    }

    const quotedItems = Array.isArray(request.quotedItems)
      ? (request.quotedItems as Array<{ name: string; quantity?: string; unitPrice?: number }>)
      : []
    const itemsSubtotal = Number(request.quotedAmount)
    const deliveryFee = request.deliveryFee != null ? Number(request.deliveryFee) : 0
    if (
      request.fulfillmentMode === PrescriptionFulfillmentMode.DELIVERY &&
      !(deliveryFee > 0)
    ) {
      throw new BadRequestException('Delivery fee must be set before invoicing a delivery order')
    }
    const amount = Number((itemsSubtotal + deliveryFee).toFixed(2))

    const invoice = await this.prisma.$transaction(async tx => {
      await this.referenceService.syncFromReference('INV', reference, tx)

      const lineItems = [
        ...quotedItems.map(item => {
          const qty = Number.parseFloat(item.quantity || '1') || 1
          const unit = item.unitPrice ?? 0
          return {
            name: `${item.name}${qty !== 1 ? ` × ${qty}` : ''}`,
            amount: Number((unit * qty).toFixed(2)),
          }
        }),
        ...(deliveryFee > 0
          ? [{ name: 'Delivery fee', amount: Number(deliveryFee.toFixed(2)) }]
          : []),
      ]

      // Ensure line items sum to invoice amount (adjust first line if rounding drift)
      const lineSum = lineItems.reduce((sum, item) => sum + item.amount, 0)
      if (lineItems.length > 0 && Math.abs(lineSum - amount) >= 0.01) {
        lineItems[0].amount = Number((lineItems[0].amount + (amount - lineSum)).toFixed(2))
      }

      const createdInvoice = await tx.invoice.create({
        data: {
          reference,
          patientUserId: request.patientUserId,
          providerId: provider.id,
          prescriptionRequestId: request.id,
          status: InvoiceStatus.PENDING_AUTH,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          amount,
          billedToName: `${patientProfile.firstName} ${patientProfile.lastName}`.trim(),
          billedToNationalId: patientProfile.nationalIdLast4
            ? `****${patientProfile.nationalIdLast4}`
            : '****',
          serviceForType: request.forSelf ? ServiceForType.SELF : ServiceForType.BENEFICIARY,
          serviceForName: request.forSelf
            ? `${patientProfile.firstName} ${patientProfile.lastName}`.trim()
            : request.beneficiary?.name ?? 'Beneficiary',
          serviceForRelation: request.beneficiary?.relation ?? null,
          serviceForAge: request.beneficiary ? this.getAge(request.beneficiary.dateOfBirth) : null,
          submittedAt: new Date(),
          treatment: quotedItems.map(item => item.name).join(', ') || 'Prescription fulfillment',
          internalNote: request.pharmacyNotes,
          attachment: dto.attachment?.originalName ?? null,
          attachmentMetadata: dto.attachment
            ? ((this.storage.isEnabled
                ? await this.storage.storeAttachment({
                    ...dto.attachment,
                    prefix: 'invoices',
                  })
                : dto.attachment) as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          lineItems: {
            create: lineItems.length > 0 ? lineItems : [{ name: 'Prescription fulfillment', amount }],
          },
        },
        include: {
          patient: { include: { patientProfile: true } },
          lineItems: true,
        },
      })

      // Patient must accept the quote before invoicing; notify them to authorize payment.
      await tx.notification.create({
        data: {
          userId: request.patientUserId,
          type: NotificationType.INVOICE,
          title: 'Invoice Ready for Payment',
          body: `Your medication invoice from ${provider.name} is ready. Review and ${request.fulfillmentMode === 'DELIVERY' ? 'approve delivery' : 'approve preparation'} to proceed.`,
          screen: `/app/invoices/${createdInvoice.reference}`,
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'sp.invoice.created',
          entityType: 'Invoice',
          entityId: createdInvoice.id,
          metadata: {
            reference: createdInvoice.reference,
            prescriptionRequestId: request.id,
          } as Prisma.JsonObject,
        },
      })

      return createdInvoice
    })

    return this.mapSpInvoice(invoice)
  }

  async updateInvoice(userId: string, invoiceReference: string, dto: UpsertInvoiceDto) {
    const provider = await this.resolveProvider(userId)
    const existing = await this.prisma.invoice.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: invoiceReference }, { reference: invoiceReference }],
      },
      include: {
        patient: { include: { patientProfile: true } },
        appointment: true,
      },
    })

    if (!existing || !existing.patient.patientProfile) {
      throw new NotFoundException('Invoice not found')
    }

    if (
      existing.status !== InvoiceStatus.REJECTED &&
      existing.status !== InvoiceStatus.DISPUTED
    ) {
      throw new BadRequestException('Only rejected invoices can be edited and resubmitted')
    }

    if (dto.attachment) {
      this.ensureAttachmentContent(dto)
    } else {
      const existingAttachment = await this.storage.resolveAttachmentUrl(
        parseInvoiceAttachmentMetadata(existing.attachmentMetadata),
        existing.attachment ?? 'invoice.pdf',
      )
      if (!existingAttachment) {
        throw new BadRequestException('Invoice PDF must be re-uploaded')
      }
    }

    let appointmentId = existing.appointmentId
    if (dto.appointmentId) {
      const appointment = await this.resolveProviderAppointment(provider.id, dto.appointmentId)
      appointmentId = appointment.id
    }

    const isPrescriptionInvoice = !!existing.prescriptionRequestId
    if (!appointmentId && !isPrescriptionInvoice) {
      throw new BadRequestException('Invoice must be linked to an appointment')
    }

    const serviceNames =
      dto.services?.length > 0
        ? dto.services
        : [
            existing.appointment?.service?.trim() ||
              (isPrescriptionInvoice ? 'Prescription fulfillment' : 'Consultation'),
          ]

    const invoice = await this.prisma.$transaction(async tx => {
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: existing.id },
      })

      const updatedInvoice = await tx.invoice.update({
        where: { id: existing.id },
        data: {
          reference: dto.invoiceNumber,
          appointmentId: appointmentId ?? null,
          status: InvoiceStatus.PENDING_AUTH,
          amount: dto.amount,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          submittedAt: new Date(),
          paidAt: null,
          paymentRef: null,
          attachment: dto.attachment?.originalName ?? existing.attachment,
          attachmentMetadata: dto.attachment
            ? ((this.storage.isEnabled
                ? await this.storage.storeAttachment({
                    ...dto.attachment,
                    prefix: 'invoices',
                  })
                : dto.attachment) as unknown as Prisma.InputJsonValue)
            : existing.attachmentMetadata ?? Prisma.JsonNull,
          rejectionReason: null,
          lineItems: {
            create: this.resolveLineItems(dto, serviceNames),
          },
        },
        include: {
          patient: { include: { patientProfile: true } },
          lineItems: true,
          appointment: true,
        },
      })

      const hasClinicalPayload =
        !!(dto.diagnosis || dto.treatment || dto.followUp || dto.internalNote)
      if (hasClinicalPayload && appointmentId) {
        const existingVisit = await tx.providerVisit.findFirst({
          where: { appointmentId },
          select: { id: true },
        })
        const clinical = this.encryptClinicalFields(dto)
        if (existingVisit) {
          await tx.providerVisit.update({
            where: { id: existingVisit.id },
            data: {
              diagnosis: clinical.diagnosis,
              treatment: clinical.treatment,
              followUp: clinical.followUp,
              internalNote: clinical.internalNote,
            },
          })
        } else {
          await tx.providerVisit.create({
            data: {
              providerId: provider.id,
              patientUserId: existing.patientUserId,
              appointmentId,
              beneficiaryId: existing.appointment?.beneficiaryId ?? null,
              diagnosis: clinical.diagnosis,
              treatment: clinical.treatment,
              followUp: clinical.followUp,
              internalNote: clinical.internalNote,
              services: dto.services ?? [],
              vitals: {},
            },
          })
        }
      }

      if (appointmentId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: AppointmentStatus.COMPLETED,
          },
        })
      }

      await tx.notification.create({
        data: {
          userId: existing.patientUserId,
          type: NotificationType.INVOICE,
          title: 'Invoice Resubmitted',
          body: `Invoice ${updatedInvoice.reference} from ${provider.name} has been corrected and resubmitted for your review.`,
          screen: `/app/invoices/${updatedInvoice.reference}`,
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'sp.invoice.updated',
          entityType: 'Invoice',
          entityId: updatedInvoice.id,
          metadata: {
            previousReference: invoiceReference,
            reference: updatedInvoice.reference,
          } as Prisma.JsonObject,
        },
      })

      return updatedInvoice
    })

    return this.mapSpInvoice(invoice)
  }

  async getPayments(userId: string) {
    const provider = await this.resolveProvider(userId)
    const invoices = await this.getInvoiceRecords(provider.id)
    return invoices
      .filter(
        invoice =>
          invoice.status === InvoiceStatus.AUTHORIZED ||
          invoice.status === InvoiceStatus.PAID,
      )
      .map(invoice => this.mapPayment(invoice))
  }

  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return notifications.map(notification => ({
      id: notification.id,
      type: notification.type.toLowerCase(),
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

  async getProfile(userId: string) {
    const provider = await this.resolveProvider(userId)
    return this.mapProviderProfile(provider)
  }

  async updateProfile(userId: string, dto: UpdateProviderProfileDto) {
    const provider = await this.resolveProvider(userId)
    const serviceNames = dto.tags === undefined ? null : this.normalizeServiceNames(dto.tags)
    const providerCategories =
      dto.category === undefined ? null : this.mapProviderCategories(dto.category)

    const updated = await this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        about: dto.about ?? undefined,
        description: dto.about ?? undefined,
        address: dto.address ?? undefined,
        phone: dto.phone ?? undefined,
        country: dto.country ?? undefined,
        tags: serviceNames ?? undefined,
        languages: dto.languages ?? undefined,
        establishedYear: dto.establishedYear ?? undefined,
        lat: dto.lat ?? undefined,
        lng: dto.lng ?? undefined,
        category: providerCategories?.[0] ?? undefined,
        categories: providerCategories ?? undefined,
        status:
          dto.status === undefined
            ? undefined
            : dto.status === 'open'
              ? ProviderOpenStatus.OPEN
              : ProviderOpenStatus.CLOSED,
        hoursJson: dto.openingHours ?? undefined,
        hours: dto.openingHours ? this.summarizeHours(dto.openingHours) : undefined,
        logoUrl: dto.logoUrl ?? undefined,
        services:
          serviceNames === null
            ? undefined
            : {
                deleteMany: {},
                create: serviceNames.map(name => ({ name })),
              },
      },
      include: {
        authUser: true,
        services: true,
      },
    })

    return this.mapProviderProfile(updated)
  }

  async getSettings(userId: string) {
    const provider = await this.resolveProvider(userId)
    const [preferences, sessions] = await Promise.all([
      this.getOrCreateNotificationPreferences(provider.id),
      this.getSessions(userId),
    ])

    return {
      profile: this.mapProviderProfile(provider),
      notificationPreferences: this.mapNotificationPreferences(preferences),
      payoutAccounts: provider.payoutAccounts.map(account => this.mapPayoutAccount(account)),
      sessions,
    }
  }

  async updateNotificationPreferences(
    userId: string,
    dto: UpdateProviderNotificationPrefsDto,
  ) {
    const provider = await this.resolveProvider(userId)
    const preferences = await this.prisma.providerNotificationPreference.upsert({
      where: { providerId: provider.id },
      update: dto,
      create: {
        providerId: provider.id,
        ...dto,
      },
    })

    return this.mapNotificationPreferences(preferences)
  }

  async changePassword(userId: string, dto: ChangeProviderPasswordDto) {
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

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'sp.password.changed',
        entityType: 'User',
        entityId: userId,
      },
    })

    return {
      message: 'Password updated successfully.',
    }
  }

  async getSessions(userId: string) {
    const sessions = await this.prisma.providerSessionAudit.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: { lastSeenAt: 'desc' },
    })

    return sessions.map((session, index) => ({
      id: session.id,
      sessionId: session.sessionId,
      device: session.deviceLabel,
      location: session.locationLabel ?? 'Unknown location',
      active: index === 0,
      time: index === 0 ? 'Active now' : session.lastSeenAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
    }))
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.providerSessionAudit.findFirst({
      where: {
        userId,
        OR: [{ id: sessionId }, { sessionId }],
      },
    })

    if (!session) {
      throw new NotFoundException('Session not found')
    }

    await this.redis.del(`refresh-token:${session.sessionId}`)
    await this.prisma.providerSessionAudit.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    })

    return {
      message: 'Session revoked successfully.',
    }
  }

  async getPayoutAccounts(userId: string) {
    const provider = await this.resolveProvider(userId)
    return provider.payoutAccounts.map(account => this.mapPayoutAccount(account))
  }

  async createPayoutAccount(userId: string, dto: UpsertProviderPayoutAccountDto) {
    const provider = await this.resolveProvider(userId)
    const accounts = provider.payoutAccounts
    const shouldBeDefault = dto.isDefault ?? accounts.length === 0

    if (shouldBeDefault) {
      await this.clearDefaultPayoutAccounts(provider.id)
    }

    const account = await this.prisma.providerPayoutAccount.create({
      data: {
        providerId: provider.id,
        method: this.mapPayoutMethod(dto.method),
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        country: dto.country,
        isDefault: shouldBeDefault,
        status: ProviderPayoutAccountStatus.ACTIVE,
      },
    })

    return this.mapPayoutAccount(account)
  }

  async updatePayoutAccount(
    userId: string,
    payoutAccountId: string,
    dto: UpsertProviderPayoutAccountDto,
  ) {
    const provider = await this.resolveProvider(userId)
    const account = await this.prisma.providerPayoutAccount.findFirst({
      where: {
        id: payoutAccountId,
        providerId: provider.id,
      },
    })

    if (!account) {
      throw new NotFoundException('Payout account not found')
    }

    if (dto.isDefault) {
      await this.clearDefaultPayoutAccounts(provider.id)
    }

    const updated = await this.prisma.providerPayoutAccount.update({
      where: { id: account.id },
      data: {
        method: this.mapPayoutMethod(dto.method),
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        country: dto.country,
        isDefault: dto.isDefault ?? account.isDefault,
      },
    })

    return this.mapPayoutAccount(updated)
  }

  async setDefaultPayoutAccount(userId: string, payoutAccountId: string) {
    const provider = await this.resolveProvider(userId)
    const account = await this.prisma.providerPayoutAccount.findFirst({
      where: {
        id: payoutAccountId,
        providerId: provider.id,
      },
    })

    if (!account) {
      throw new NotFoundException('Payout account not found')
    }

    await this.clearDefaultPayoutAccounts(provider.id)
    const updated = await this.prisma.providerPayoutAccount.update({
      where: { id: account.id },
      data: { isDefault: true },
    })

    return this.mapPayoutAccount(updated)
  }

  async deletePayoutAccount(userId: string, payoutAccountId: string) {
    const provider = await this.resolveProvider(userId)
    const account = await this.prisma.providerPayoutAccount.findFirst({
      where: {
        id: payoutAccountId,
        providerId: provider.id,
      },
    })

    if (!account) {
      throw new NotFoundException('Payout account not found')
    }

    const remainingAccounts = await this.prisma.providerPayoutAccount.findMany({
      where: {
        providerId: provider.id,
        id: { not: payoutAccountId },
      },
      orderBy: { createdAt: 'asc' },
    })

    await this.prisma.providerPayoutAccount.delete({
      where: { id: payoutAccountId },
    })

    if (account.isDefault && remainingAccounts[0]) {
      await this.prisma.providerPayoutAccount.update({
        where: { id: remainingAccounts[0].id },
        data: { isDefault: true },
      })
    }

    return {
      message: 'Payout account removed successfully.',
    }
  }

  private async resolveProvider(userId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { authUserId: userId },
      include: {
        authUser: true,
        services: true,
        payoutAccounts: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (!provider) {
      throw new NotFoundException('Provider profile not found for this account')
    }

    if (provider.lifecycleStatus === ProviderLifecycleStatus.SUSPENDED) {
      throw new ForbiddenException('Your provider account is suspended.')
    }

    return provider
  }

  private isPharmacyProvider(provider: { category: ProviderCategory; categories: string[] }) {
    return (
      provider.category === ProviderCategory.PHARMACY ||
      provider.categories.includes(ProviderCategory.PHARMACY)
    )
  }

  /** True only when pharmacy is the provider's sole category — not just one of several. */
  private isPharmacyOnlyProvider(provider: { category: ProviderCategory; categories: string[] }) {
    if (provider.category !== ProviderCategory.PHARMACY) return false
    const extras = provider.categories.filter(category => category !== ProviderCategory.PHARMACY)
    return extras.length === 0
  }

  private async resolveProviderAppointment<
    TInclude extends Prisma.AppointmentInclude | undefined = undefined,
  >(providerId: number, appointmentId: string, include?: TInclude) {
    await this.syncCompletedAppointments({
      providerId,
      OR: [{ id: appointmentId }, { reference: appointmentId }],
    })

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        providerId,
        OR: [{ id: appointmentId }, { reference: appointmentId }],
      },
      include,
    })

    if (!appointment) {
      throw new NotFoundException('Appointment not found')
    }

    return appointment
  }

  private async getAppointmentRecords(providerId: number) {
    await this.syncCompletedAppointments({
      providerId,
    })

    return this.prisma.appointment.findMany({
      where: { providerId },
      include: {
        patient: { include: { patientProfile: { include: { beneficiaries: true } } } },
        beneficiary: true,
        invoices: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    })
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

  private async getInvoiceRecords(providerId: number) {
    return this.prisma.invoice.findMany({
      where: { providerId },
      omit: { attachmentMetadata: true },
      include: {
        patient: { include: { patientProfile: { include: { beneficiaries: true } } } },
        lineItems: true,
        appointment: true,
        reviews: {
          include: {
            patient: {
              include: {
                patientProfile: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { issueDate: 'desc' },
    })
  }

  private async getPatientsFromRecords(providerId: number) {
    const patients = await this.prisma.user.findMany({
      where: {
        OR: [
          {
            appointments: {
              some: {
                providerId,
              },
            },
          },
          {
            invoices: {
              some: {
                providerId,
              },
            },
          },
          {
            prescriptionRequests: {
              some: {
                providerId,
              },
            },
          },
        ],
      },
      include: {
        patientProfile: {
          include: {
            beneficiaries: true,
          },
        },
        appointments: {
          where: { providerId },
          orderBy: { date: 'desc' },
        },
        providerVisits: {
          where: { providerId },
          include: {
            beneficiary: { select: { name: true } },
            appointment: { select: { id: true, reference: true, service: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          where: { providerId },
          omit: { attachmentMetadata: true },
          include: { lineItems: true, appointment: true },
          orderBy: { issueDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return patients
      .filter(patient => !!patient.patientProfile)
      .map(patient => this.mapPatient(patient))
  }

  private async getOrCreateNotificationPreferences(providerId: number) {
    return this.prisma.providerNotificationPreference.upsert({
      where: { providerId },
      update: {},
      create: { providerId },
    })
  }

  private mapDashboardProfile(
    provider: {
      name: string
      category: ProviderCategory
      categories: string[]
      phone: string
      license: string | null
      country: string | null
    },
    invoices: Array<{
      amount: Prisma.Decimal
      status: InvoiceStatus
      paidAt: Date | null
      paymentAuthorizedAt?: Date | null
      walletAmountPaid?: Prisma.Decimal | null
    }>,
    appointments: Array<{ status: AppointmentStatus }>,
    uniquePatients: number,
    prescriptionRequests: Array<{ status: PrescriptionRequestStatus }> = [],
  ) {
    const now = new Date()
    const earnedInvoices = invoices.filter(
      invoice =>
        invoice.status === InvoiceStatus.PAID ||
        invoice.status === InvoiceStatus.AUTHORIZED,
    )

    const earnedAmount = (invoice: (typeof invoices)[number]) =>
      invoice.walletAmountPaid != null
        ? Number(invoice.walletAmountPaid)
        : Number(invoice.amount)

    const earnedAt = (invoice: (typeof invoices)[number]) =>
      invoice.paidAt ?? invoice.paymentAuthorizedAt ?? null

    const totalEarnings = earnedInvoices.reduce(
      (sum, invoice) => sum + earnedAmount(invoice),
      0,
    )

    const monthlyEarnings = earnedInvoices
      .filter(invoice => {
        const at = earnedAt(invoice)
        return (
          !!at &&
          at.getMonth() === now.getMonth() &&
          at.getFullYear() === now.getFullYear()
        )
      })
      .reduce((sum, invoice) => sum + earnedAmount(invoice), 0)

    const pendingPayments = invoices
      .filter(invoice => invoice.status === InvoiceStatus.PENDING_AUTH)
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0)

    const categoryList = Array.from(
      new Set(
        provider.categories.length > 0
          ? provider.categories.map(value => this.titleCase(value))
          : [this.titleCase(provider.category)],
      ),
    )

    return {
      name: provider.name,
      type: this.titleCase(provider.category),
      categories: categoryList,
      category: provider.category.toLowerCase(),
      isPharmacy: this.isPharmacyProvider(provider),
      email: '',
      phone: provider.phone,
      license: provider.license ?? 'N/A',
      country: provider.country ?? 'Zimbabwe',
      status: 'active' as const,
      totalEarnings,
      monthlyEarnings,
      pendingPayments,
      totalPatients: uniquePatients,
      pendingAppointments: appointments.filter(
        appointment => appointment.status === AppointmentStatus.REQUESTED,
      ).length,
      pendingPrescriptionRequests: prescriptionRequests.filter(
        request =>
          request.status === PrescriptionRequestStatus.SUBMITTED ||
          request.status === PrescriptionRequestStatus.QUOTED ||
          request.status === PrescriptionRequestStatus.READY,
      ).length,
    }
  }

  private mapProviderProfile(provider: {
    id: number
    name: string
    category: ProviderCategory
    categories?: string[]
    description: string | null
    about: string | null
    address: string
    phone: string
    country: string | null
    status: ProviderOpenStatus
    languages: Prisma.JsonValue | null
    tags: Prisma.JsonValue | null
    establishedYear: number | null
    lat: Prisma.Decimal | null
    lng: Prisma.Decimal | null
    hoursJson?: Prisma.JsonValue | null
    authUser?: { email: string } | null
    license: string | null
    logoUrl?: string | null
    services?: Array<{ name: string }>
  }) {
    return {
      id: provider.id,
      name: provider.name,
      email: provider.authUser?.email ?? '',
      phone: provider.phone,
      category: this.formatProviderCategories(provider.categories, provider.category),
      isPharmacyOnly: this.isPharmacyOnlyProvider({
        category: provider.category,
        categories: provider.categories ?? [],
      }),
      about: provider.about ?? provider.description ?? '',
      address: provider.address,
      country: provider.country ?? '',
      status: provider.status === ProviderOpenStatus.OPEN ? 'open' : 'closed',
      languages: Array.isArray(provider.languages) ? provider.languages : [],
      tags: Array.isArray(provider.tags)
        ? provider.tags
        : (provider.services ?? []).map(service => service.name),
      establishedYear: provider.establishedYear ?? null,
      lat: provider.lat ? Number(provider.lat) : null,
      lng: provider.lng ? Number(provider.lng) : null,
      openingHours: this.normalizeHours(provider.hoursJson),
      license: provider.license ?? '',
      logoUrl: provider.logoUrl ?? undefined,
    }
  }

  private mapNotificationPreferences(preferences: {
    newAppointmentEmail: boolean
    paymentEmail: boolean
    invoiceEmail: boolean
    disputeEmail: boolean
    systemEmail: boolean
  }) {
    return {
      newAppointmentEmail: preferences.newAppointmentEmail,
      paymentEmail: preferences.paymentEmail,
      invoiceEmail: preferences.invoiceEmail,
      disputeEmail: preferences.disputeEmail,
      systemEmail: preferences.systemEmail,
    }
  }

  private mapPayoutAccount(account: {
    id: string
    method: ProviderPayoutMethod
    accountNumber: string
    accountName: string
    country: string
    isDefault: boolean
    status: ProviderPayoutAccountStatus
  }) {
    return {
      id: account.id,
      method: this.mapPayoutMethodToClient(account.method),
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      country: account.country,
      isDefault: account.isDefault,
      status: account.status === ProviderPayoutAccountStatus.ACTIVE ? 'active' : 'inactive',
    }
  }

  private mapAppointment(appointment: {
    id: string
    reference: string
    service: string
    description: string
    date: Date
    timeLabel: string
    status: AppointmentStatus
    attachments: Prisma.JsonValue | null
    forSelf: boolean
    requestedAt: Date
    mode: AppointmentMode
    address: string | null
    duration: string | null
    cancellationReason?: string | null
    cancellationNote?: string | null
    medicalHistory: Prisma.JsonValue | null
    allergies: Prisma.JsonValue | null
    patient: {
      id: string
      phone: string | null
      patientProfile: {
        firstName: string
        lastName: string
        countryCode?: string | null
      } | null
    }
    beneficiary: {
      name: string
      relation: string
      dateOfBirth: Date
    } | null
    invoices: Array<{
      id: string
    }>
  }) {
    const patientName = appointment.patient.patientProfile
      ? `${appointment.patient.patientProfile.firstName} ${appointment.patient.patientProfile.lastName}`.trim()
      : 'Patient'
    const effectiveStatus = appointment.invoices.length > 0
      ? AppointmentStatus.COMPLETED
      : appointment.status

    return {
      id: appointment.reference,
      patientId: appointment.patient.id,
      patient: patientName,
      phone: appointment.patient.phone ?? '',
      countryCode: appointment.patient.patientProfile?.countryCode ?? '',
      service: appointment.service,
      description: appointment.description,
      date: appointment.date.toISOString(),
      time: appointment.timeLabel,
      status: this.mapSpAppointmentStatus(effectiveStatus),
      attachments: Array.isArray(appointment.attachments) ? appointment.attachments : [],
      hasInvoice: appointment.invoices.length > 0,
      forSelf: appointment.forSelf,
      beneficiary: appointment.beneficiary
        ? {
            name: appointment.beneficiary.name,
            relation: appointment.beneficiary.relation,
            age: this.getAge(appointment.beneficiary.dateOfBirth),
          }
        : null,
      medicalHistory: Array.isArray(appointment.medicalHistory)
        ? (appointment.medicalHistory as string[])
        : [],
      allergies: Array.isArray(appointment.allergies) ? (appointment.allergies as string[]) : [],
      requestedAt: appointment.requestedAt.toISOString(),
      mode: this.mapMode(appointment.mode),
      address: appointment.address ?? '',
      duration: appointment.duration ?? '',
      cancellationReason: appointment.cancellationReason ?? null,
      cancellationNote: appointment.cancellationNote ?? null,
    }
  }

  private mapPatient(patient: {
    id: string
    email: string
    phone: string | null
    patientProfile: {
      firstName: string
      lastName: string
      dateOfBirth: Date
      countryCode?: string | null
      beneficiaries: Array<{
        name: string
        relation: string
        dateOfBirth: Date
      }>
    } | null
    appointments: Array<{
      reference: string
      date: Date
      service: string
      forSelf: boolean
      description: string
      duration: string | null
    }>
    providerVisits: Array<{
      id: string
      appointmentId: string | null
      diagnosis: string | null
      treatment: string | null
      followUp: string | null
      internalNote: string | null
      services: Prisma.JsonValue
      vitals: Prisma.JsonValue
      createdAt: Date
      beneficiary: { name: string } | null
      appointment: { id: string; reference: string; service: string } | null
    }>
    invoices: Array<{
      reference: string
      appointmentId?: string | null
      appointment?: {
        reference: string
      } | null
      issueDate: Date
      amount: Prisma.Decimal
      status: InvoiceStatus
      diagnosis: string | null
      treatment: string | null
      followUp: string | null
      internalNote: string | null
      lineItems: Array<{ name: string }>
    }>
  }) {
    if (!patient.patientProfile) {
      throw new NotFoundException('Patient profile not found')
    }

    const name = `${patient.patientProfile.firstName} ${patient.patientProfile.lastName}`.trim()
    const billedInvoices = patient.invoices.filter(
      invoice =>
        invoice.status === InvoiceStatus.AUTHORIZED ||
        invoice.status === InvoiceStatus.PAID,
    )

    const invoiceByAppointmentId = new Map(
      patient.invoices
        .filter(invoice => invoice.appointmentId)
        .map(invoice => [invoice.appointmentId as string, invoice]),
    )

    const visitEntries = patient.providerVisits.map(visit => {
      const linkedInvoice = visit.appointmentId
        ? invoiceByAppointmentId.get(visit.appointmentId)
        : undefined

      return {
        id: visit.id,
        date: visit.createdAt.toISOString(),
        appointmentId: visit.appointment?.reference ?? undefined,
        service: visit.appointment?.service ?? 'Consultation',
        forBeneficiary: visit.beneficiary?.name ?? null,
        diagnosis: this.decryptClinical(visit.diagnosis) ?? '',
        treatment: this.decryptClinical(visit.treatment) ?? '',
        followUp: this.decryptClinical(visit.followUp) ?? '',
        internalNote: this.decryptClinical(visit.internalNote) ?? '',
        services: Array.isArray(visit.services) ? (visit.services as string[]) : [],
        amount: linkedInvoice ? Number(linkedInvoice.amount) : 0,
        invoiceRef: linkedInvoice?.reference ?? '',
        status: linkedInvoice ? this.mapVisitHistoryStatus(linkedInvoice.status) : 'completed',
        vitals: this.mapVitals(visit.vitals),
      }
    })

    const appointmentIdsWithVisits = new Set(
      patient.providerVisits.map(visit => visit.appointmentId).filter(Boolean),
    )
    const legacyInvoiceEntries = patient.invoices
      .filter(
        invoice =>
          !invoice.appointmentId || !appointmentIdsWithVisits.has(invoice.appointmentId),
      )
      .filter(
        invoice =>
          invoice.diagnosis || invoice.treatment || invoice.followUp || invoice.internalNote,
      )
      .map(invoice => ({
        id: invoice.reference,
        date: invoice.issueDate.toISOString(),
        appointmentId: invoice.appointment?.reference ?? undefined,
        service: invoice.lineItems[0]?.name ?? 'Consultation',
        forBeneficiary: null,
        diagnosis: invoice.diagnosis ?? '',
        treatment: invoice.treatment ?? '',
        followUp: invoice.followUp ?? '',
        internalNote: invoice.internalNote ?? '',
        services: invoice.lineItems.map(item => item.name),
        amount: Number(invoice.amount),
        invoiceRef: invoice.reference,
        status: this.mapVisitHistoryStatus(invoice.status),
        vitals: {},
      }))

    const visitHistory = [...visitEntries, ...legacyInvoiceEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    return {
      id: patient.id,
      name,
      phone: patient.phone ?? '',
      countryCode: patient.patientProfile.countryCode ?? '',
      email: patient.email,
      dob: patient.patientProfile.dateOfBirth.toISOString(),
      gender: 'Not specified',
      address: '',
      bloodType: 'Unknown',
      lastVisit: patient.appointments[0]?.date.toISOString() ?? new Date().toISOString(),
      visits: patient.appointments.length,
      totalSpent: billedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
      conditions: [],
      allergies: [],
      currentMedications: [],
      beneficiaries: patient.patientProfile.beneficiaries.map(beneficiary => ({
        name: beneficiary.name,
        relation: beneficiary.relation,
        age: this.getAge(beneficiary.dateOfBirth),
      })),
      visitHistory,
    }
  }

  private mapPayment(invoice: {
    reference: string
    billedToName: string
    amount: Prisma.Decimal
    issueDate: Date
    status: InvoiceStatus
    paymentRef: string | null
    paymentAuthorizedAt?: Date | null
    paidAt?: Date | null
    walletAmountPaid?: Prisma.Decimal | null
    prescriptionRequestId?: string | null
  }) {
    const status = 'authorized' as const

    const paymentDate =
      invoice.paidAt ??
      invoice.paymentAuthorizedAt ??
      invoice.issueDate

    const amount =
      invoice.walletAmountPaid != null
        ? Number(invoice.walletAmountPaid)
        : Number(invoice.amount)

    return {
      id: invoice.paymentRef ?? `PAY-${invoice.reference}`,
      patient: invoice.billedToName,
      amount,
      date: paymentDate.toISOString(),
      status,
      ref: invoice.paymentRef ?? invoice.reference,
      invoiceId: invoice.reference,
      isPrescription: invoice.prescriptionRequestId != null,
    }
  }

  private mapInvoiceReview(
    review?: {
      reference: string
      rating: number
      text: string
      createdAt: Date
      patient?: {
        patientProfile?: {
          firstName: string
          lastName: string
        } | null
      } | null
    } | null,
  ) {
    if (!review) return undefined

    return {
      id: review.reference,
      rating: review.rating,
      text: review.text,
      patientName: formatPatientFullName(review.patient?.patientProfile),
      date: review.createdAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    }
  }

  private mapSpInvoice(invoice: {
    id: string
    reference: string
    patientUserId: string
    appointment?: {
      reference: string
      service?: string | null
    } | null
    prescriptionRequestId?: string | null
    issueDate: Date
    amount: Prisma.Decimal
    walletAmountPaid?: Prisma.Decimal | null
    offAppAmountDue?: Prisma.Decimal | null
    status: InvoiceStatus
    submittedAt: Date
    paidAt: Date | null
    paymentRef: string | null
    attachment: string | null
    attachmentMetadata?: Prisma.JsonValue | null
    diagnosis: string | null
    treatment: string | null
    followUp: string | null
    internalNote: string | null
    adminApprovedAt?: Date | null
    rejectionReason?: string | null
    billedToName: string
    serviceForType?: 'SELF' | 'BENEFICIARY'
    serviceForName?: string
    serviceForRelation?: string | null
    serviceForAge?: number | null
    patient?: {
      phone: string | null
      email: string
      patientProfile?: {
        countryCode?: string | null
      } | null
    }
    lineItems?: Array<{ name: string; amount?: Prisma.Decimal | number }>
    reviews?: Array<{
      reference: string
      rating: number
      text: string
      createdAt: Date
      patient?: {
        patientProfile?: {
          firstName: string
          lastName: string
        } | null
      } | null
    }>
  }) {
    const isBeneficiary = invoice.serviceForType === 'BENEFICIARY'
    // List/detail payloads stay lean; PDFs are fetched via /sp/invoices/:id/attachment.
    const attachmentMetadata = sanitizeInvoiceAttachmentMetadata(invoice.attachmentMetadata)

    const rawLines = (invoice.lineItems ?? []).map(item => ({
      name: item.name,
      amount: item.amount != null ? Number(item.amount) : 0,
    }))

    const lineItems =
      rawLines.length > 0
        ? rawLines.some(item => item.amount > 0)
          ? rawLines
          : rawLines.map((item, index) =>
              index === 0 ? { ...item, amount: Number(invoice.amount) } : item,
            )
        : [
            {
              name: invoice.appointment?.service?.trim() || 'Service',
              amount: Number(invoice.amount),
            },
          ]

    return {
      id: invoice.reference,
      appointmentId: invoice.appointment?.reference ?? undefined,
      isPrescription: invoice.prescriptionRequestId != null,
      patient: isBeneficiary
        ? `${invoice.billedToName} (for ${invoice.serviceForName})`
        : invoice.billedToName,
      patientId: invoice.patientUserId,
      phone: invoice.patient?.phone ?? '',
      countryCode: invoice.patient?.patientProfile?.countryCode ?? '',
      email: invoice.patient?.email ?? '',
      beneficiary: isBeneficiary
        ? {
            name: invoice.serviceForName ?? 'Beneficiary',
            relation: invoice.serviceForRelation ?? 'Beneficiary',
            age: invoice.serviceForAge ?? 0,
          }
        : undefined,
      services: lineItems,
      issueDate: invoice.issueDate.toISOString(),
      amount: Number(invoice.amount),
      walletAmountPaid: invoice.walletAmountPaid != null ? Number(invoice.walletAmountPaid) : undefined,
      offAppAmountDue: invoice.offAppAmountDue != null ? Number(invoice.offAppAmountDue) : undefined,
      status: this.mapSpInvoiceStatus(invoice.status),
      submittedAt: invoice.submittedAt.toISOString(),
      adminApprovedAt: invoice.adminApprovedAt?.toISOString(),
      paidAt: invoice.paidAt?.toISOString(),
      paymentRef: invoice.paymentRef ?? undefined,
      attachment: invoice.attachment ?? `${invoice.reference}.pdf`,
      attachmentBlobUrl: undefined,
      attachmentMetadata,
      diagnosis: invoice.diagnosis ?? '',
      treatment: invoice.treatment ?? '',
      followUp: invoice.followUp ?? '',
      internalNote: invoice.internalNote ?? '',
      rejectionReason: invoice.rejectionReason ?? undefined,
      patientReview: this.mapInvoiceReview(invoice.reviews?.[0]),
    }
  }

  private buildLineItems(services: string[], amount: number) {
    const items = services.length > 0 ? services : ['Consultation']
    const base = Number((amount / items.length).toFixed(2))
    const remainder = Number((amount - base * items.length).toFixed(2))

    return items.map((service, index) => ({
      name: service,
      amount: index === 0 ? base + remainder : base,
    }))
  }

  private resolveLineItems(dto: UpsertInvoiceDto, serviceNames: string[]) {
    if (!dto.lineItems?.length) {
      return this.buildLineItems(serviceNames, dto.amount)
    }

    const total = Number(
      dto.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2),
    )
    if (Math.abs(total - dto.amount) > 0.01) {
      throw new BadRequestException('The per-service charges must add up to the invoice amount')
    }

    return dto.lineItems.map(item => ({
      name: item.name,
      amount: Number(item.amount.toFixed(2)),
    }))
  }

  private normalizeHours(value: Prisma.JsonValue | undefined | null) {
    if (!value) {
      return {}
    }

    if (Array.isArray(value)) {
      return value.reduce<Record<string, { open: boolean; from: string; to: string }>>(
        (hours, entry) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return hours
          }

          const record = entry as Record<string, unknown>
          const day = typeof record.day === 'string' ? record.day : null
          if (!day) {
            return hours
          }

          hours[day] = {
            open: record.status === 'open',
            from: typeof record.from === 'string' ? record.from : '',
            to: typeof record.to === 'string' ? record.to : '',
          }

          return hours
        },
        {},
      )
    }

    if (typeof value !== 'object') {
      return {}
    }

    return value as Record<string, { open: boolean; from: string; to: string }>
  }

  private summarizeHours(value: Record<string, { open: boolean; from: string; to: string }>) {
    const openDays = Object.entries(value)
      .filter(([, hours]) => hours.open)
      .map(([day, hours]) => `${day}: ${hours.from}-${hours.to}`)

    return openDays.length > 0 ? openDays.join(', ') : 'Closed'
  }

  private mapSpAppointmentStatus(status: AppointmentStatus) {
    switch (status) {
      case AppointmentStatus.REQUESTED:
        return 'new'
      case AppointmentStatus.CONFIRMED:
        return 'confirmed'
      case AppointmentStatus.COMPLETED:
        return 'completed'
      case AppointmentStatus.CANCELLED:
        return 'cancelled'
    }
  }

  private mapSpInvoiceStatus(status: InvoiceStatus) {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'paid'
      case InvoiceStatus.REJECTED:
        return 'rejected'
      case InvoiceStatus.DISPUTED:
        return 'rejected'
      case InvoiceStatus.PENDING_AUTH:
        return 'pending'
      case InvoiceStatus.AUTHORIZED:
        return 'authorized'
    }
  }

  private mapVisitHistoryStatus(status: InvoiceStatus) {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'paid' as const
      case InvoiceStatus.AUTHORIZED:
        return 'authorized' as const
      case InvoiceStatus.DISPUTED:
      case InvoiceStatus.REJECTED:
        return 'pending' as const
      default:
        return 'pending' as const
    }
  }

  private mapMode(mode: AppointmentMode) {
    switch (mode) {
      case AppointmentMode.HOME_VISIT:
        return 'Home Visit'
      case AppointmentMode.TELEHEALTH:
        return 'Telehealth'
      case AppointmentMode.IN_PERSON:
        return 'In-Person'
    }
  }

  private mapPayoutMethod(method: 'mpesa' | 'bank' | 'mobile_money') {
    switch (method) {
      case 'mpesa':
        return ProviderPayoutMethod.MPESA
      case 'bank':
        return ProviderPayoutMethod.BANK
      case 'mobile_money':
        return ProviderPayoutMethod.MOBILE_MONEY
    }
  }

  private mapPayoutMethodToClient(method: ProviderPayoutMethod) {
    switch (method) {
      case ProviderPayoutMethod.MPESA:
        return 'mpesa'
      case ProviderPayoutMethod.BANK:
        return 'bank'
      case ProviderPayoutMethod.MOBILE_MONEY:
        return 'mobile_money'
    }
  }

  private mapProviderCategories(category: string) {
    const parsed = category
      .split(',')
      .map(value => this.mapProviderCategory(value))
      .filter((value, index, array) => array.indexOf(value) === index)

    return parsed.length > 0 ? parsed : [ProviderCategory.CLINIC]
  }

  private mapProviderCategory(category: string) {
    const normalized = category
      .trim()
      .toUpperCase()
      .replace(/[/-]+/g, ' ')
      .replace(/\s+/g, '_')

    switch (normalized) {
      case 'GENERAL_PRACTITIONER':
      case 'GENERAL_PRACTITIONER_DOCTOR':
      case ProviderCategory.DOCTOR:
        return ProviderCategory.DOCTOR
      case ProviderCategory.PHARMACY:
        return ProviderCategory.PHARMACY
      case ProviderCategory.LABORATORY:
        return ProviderCategory.LABORATORY
      case 'RADIOLOGY_IMAGING':
      case ProviderCategory.RADIOLOGY:
        return ProviderCategory.RADIOLOGY
      case ProviderCategory.HOSPITAL:
        return ProviderCategory.HOSPITAL
      case ProviderCategory.CLINIC:
        return ProviderCategory.CLINIC
      case 'SPECIALIST':
        return ProviderCategory.DOCTOR
      default:
        return ProviderCategory.CLINIC
    }
  }

  private formatProviderCategories(categories: string[] | undefined, primary: ProviderCategory) {
    const normalized = (categories ?? [])
      .map(value => value.trim())
      .filter(Boolean)

    if (normalized.length === 0) {
      return this.titleCase(primary)
    }

    return normalized.map(value => this.titleCase(value)).join(', ')
  }

  private normalizeServiceNames(tags: string[]) {
    return Array.from(
      new Set(
        tags
          .map(tag => tag.trim())
          .filter(Boolean),
      ),
    )
  }

  private ensureAttachmentContent(dto: UpsertInvoiceDto) {
    if (!dto.attachment?.dataUrl?.trim()) {
      throw new BadRequestException('Invoice PDF content is required')
    }
  }

  private titleCase(value: string) {
    return value
      .toLowerCase()
      .split('_')
      .map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ')
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

  private async getPrescriptionRequestRecords(providerId: number) {
    return this.prisma.prescriptionRequest.findMany({
      where: { providerId },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
        invoice: { select: { reference: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  private async resolvePharmacyPrescriptionRequest(
    provider: { id: number; category: ProviderCategory; categories: string[] },
    requestReference: string,
  ) {
    if (!this.isPharmacyProvider(provider)) {
      throw new BadRequestException('Only pharmacies can manage prescription requests')
    }

    const request = await this.prisma.prescriptionRequest.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: requestReference }, { reference: requestReference }],
      },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
      },
    })

    if (!request) {
      throw new NotFoundException('Prescription request not found')
    }

    return request
  }

  private async mapPrescriptionRequest(
    request: {
      id: string
      reference: string
      status: PrescriptionRequestStatus
      fulfillmentMode: string
      deliveryAddress: string | null
      patientNotes: string | null
      pharmacyNotes: string | null
      prescriptionAttachment: Prisma.JsonValue
      quotedItems: Prisma.JsonValue | null
      quotedAmount: Prisma.Decimal | null
      deliveryFee?: Prisma.Decimal | null
      quotedAt: Date | null
      acceptedAt: Date | null
      declinedAt: Date | null
      declineReason: string | null
      readyAt: Date | null
      fulfilledAt: Date | null
      forSelf: boolean
      createdAt: Date
      patient: { phone: string | null; email: string; patientProfile: { firstName: string; lastName: string; countryCode?: string | null } | null }
      beneficiary: { name: string; relation?: string } | null
      invoice?: { reference: string; status: InvoiceStatus } | null
    },
  ) {
    const patientName = request.patient.patientProfile
      ? `${request.patient.patientProfile.firstName} ${request.patient.patientProfile.lastName}`.trim()
      : 'Patient'

    return {
      id: request.reference,
      patient: patientName,
      patientPhone: request.patient.phone ?? undefined,
      patientEmail: request.patient.email,
      countryCode: request.patient.patientProfile?.countryCode ?? undefined,
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

  private async clearDefaultPayoutAccounts(providerId: number) {
    await this.prisma.providerPayoutAccount.updateMany({
      where: {
        providerId,
        isDefault: true,
      },
      data: { isDefault: false },
    })
  }
}
