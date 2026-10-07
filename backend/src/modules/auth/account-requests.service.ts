import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import {
  EmailChangeStatus,
  NotificationType,
  Prisma,
  ProviderApplicationDocumentKind,
  ProviderApplicationStatus,
  UserRole,
} from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { EmailChangeRequestDto, ProviderApplicationReplyDto } from './dto/account-requests.dto'

const DOCUMENT_KINDS: Record<string, ProviderApplicationDocumentKind> = {
  logo: ProviderApplicationDocumentKind.LOGO,
  license: ProviderApplicationDocumentKind.LICENSE,
  supporting: ProviderApplicationDocumentKind.SUPPORTING,
  invoice_pdf: ProviderApplicationDocumentKind.INVOICE_PDF,
}

/**
 * Requests people raise for an admin to act on: changing their sign-in email,
 * and providers answering a "more information needed" request on their application.
 */
@Injectable()
export class AccountRequestsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async notifyAdmins(title: string, body: string, screen: string) {
    const admins = await this.prisma.user.findMany({ where: { role: UserRole.ADMIN }, select: { id: true } })
    if (admins.length === 0) return
    await this.prisma.notification.createMany({
      data: admins.map(a => ({ userId: a.id, type: NotificationType.SYSTEM, title, body, screen })),
    })
  }

  private mapRequest(r: { id: string; currentEmail: string; newEmail: string; status: EmailChangeStatus; decisionNote: string | null; createdAt: Date; decidedAt: Date | null }) {
    return {
      id: r.id,
      currentEmail: r.currentEmail,
      newEmail: r.newEmail,
      status: r.status.toLowerCase(),
      decisionNote: r.decisionNote,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt?.toISOString() ?? null,
    }
  }

  // ── email change ──────────────────────────────────────────────────────────

  async latestEmailChange(userId: string) {
    const latest = await this.prisma.emailChangeRequest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
    return latest ? this.mapRequest(latest) : null
  }

  async requestEmailChange(userId: string, dto: EmailChangeRequestDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { patientProfile: { select: { firstName: true, lastName: true } }, providerRecord: { select: { name: true } } },
    })
    if (!user || user.role === UserRole.ADMIN) throw new NotFoundException('Account not found')

    const newEmail = dto.newEmail.trim().toLowerCase()
    if (newEmail === user.email.toLowerCase()) throw new BadRequestException('That’s already your email address.')

    // Google sign-ups have no password of their own; everyone else confirms with theirs.
    if (user.authProvider !== 'GOOGLE') {
      if (!dto.password) throw new BadRequestException('Enter your password to confirm.')
      const ok = await bcrypt.compare(dto.password, user.passwordHash)
      if (!ok) throw new ForbiddenException('That password isn’t right.')
    }

    const taken = await this.prisma.user.findUnique({ where: { email: newEmail } })
    if (taken) throw new ConflictException('Another account already uses that email.')

    const request = await this.prisma.$transaction(async tx => {
      // Only one open request at a time; a new one replaces the old.
      await tx.emailChangeRequest.updateMany({ where: { userId, status: EmailChangeStatus.PENDING }, data: { status: EmailChangeStatus.CANCELLED } })
      return tx.emailChangeRequest.create({
        data: { userId, currentEmail: user.email, newEmail, reason: dto.reason?.trim() || null },
      })
    })

    const who = user.providerRecord?.name ?? (user.patientProfile ? `${user.patientProfile.firstName} ${user.patientProfile.lastName}` : user.email)
    await this.notifyAdmins('Email change request', `${who} wants to change their email to ${newEmail}.`, 'admin-email-changes')
    return this.mapRequest(request)
  }

  async cancelEmailChange(userId: string) {
    const result = await this.prisma.emailChangeRequest.updateMany({ where: { userId, status: EmailChangeStatus.PENDING }, data: { status: EmailChangeStatus.CANCELLED } })
    if (result.count === 0) throw new NotFoundException('There’s no open request to cancel.')
    return { message: 'Request cancelled.' }
  }

  // ── provider application reply ───────────────────────────────────────────

  /** Providers can't sign in while under review, so the reply is confirmed with their password. */
  async replyToApplication(applicationId: string, dto: ProviderApplicationReplyDto) {
    const application = await this.prisma.providerApplication.findUnique({ where: { id: applicationId }, include: { user: true } })
    if (!application) throw new NotFoundException('Application not found')
    if (application.user.email.toLowerCase() !== dto.email.trim().toLowerCase()) throw new ForbiddenException('Email or password isn’t right.')
    const ok = await bcrypt.compare(dto.password, application.user.passwordHash)
    if (!ok) throw new ForbiddenException('Email or password isn’t right.')
    if (application.status !== ProviderApplicationStatus.INFO_REQUESTED) {
      throw new BadRequestException('This application isn’t waiting for more information.')
    }

    const documents = dto.documents ?? []
    await this.prisma.$transaction(async tx => {
      if (documents.length > 0) {
        await tx.providerApplicationDocument.createMany({
          data: documents.map(d => ({
            applicationId,
            kind: DOCUMENT_KINDS[d.kind] ?? ProviderApplicationDocumentKind.SUPPORTING,
            originalName: d.originalName,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
            displaySize: d.displaySize,
            storageKey: d.storageKey,
          })),
        })
      }
      await tx.providerApplicationMessage.create({
        data: {
          applicationId,
          author: 'PROVIDER',
          kind: 'reply',
          body: dto.message.trim(),
          attachments: documents.map(d => ({ name: d.originalName, size: d.displaySize })) as Prisma.InputJsonValue,
        },
      })
      // Back into the review queue.
      await tx.providerApplication.update({ where: { id: applicationId }, data: { status: ProviderApplicationStatus.PENDING, decidedAt: null } })
    })

    await this.notifyAdmins('Provider replied', `${application.practiceName} replied to your information request.`, 'admin-applications')
    return { applicationId, status: 'pending', message: 'Thanks — your reply was sent for review.' }
  }

  async applicationThread(applicationId: string) {
    const messages = await this.prisma.providerApplicationMessage.findMany({ where: { applicationId }, orderBy: { createdAt: 'asc' } })
    return messages.map(m => ({ id: m.id, author: m.author.toLowerCase(), kind: m.kind, body: m.body, at: m.createdAt.toISOString() }))
  }
}
