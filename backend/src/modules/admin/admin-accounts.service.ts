import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import {
  EmailChangeStatus,
  NotificationType,
  Prisma,
  ProviderCategory,
  ProviderLifecycleStatus,
  ProviderOpenStatus,
  UserRole,
  UserStatus,
} from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { MailService } from '../../common/services/mail.service'
import { AuthService } from '../auth/auth.service'
import { AdminService } from './admin.service'
import type { UpdateAdminPatientDto, UpdateAdminProviderDto } from './dto/admin-accounts.dto'

const PROVIDER_CATEGORIES = new Set<string>(Object.values(ProviderCategory))

/**
 * Admin actions on patient and provider accounts: edits, credit limits,
 * suspension (which signs the person out everywhere), support tools,
 * the per-account history and email-change approvals.
 */
@Injectable()
export class AdminAccountsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AdminService) private readonly admin: AdminService,
  ) {}

  // ── helpers ───────────────────────────────────────────────────────────────

  private async audit(actorUserId: string, action: string, entityType: string, entityId: string, metadata?: Prisma.JsonObject) {
    await this.prisma.auditLog.create({ data: { actorUserId, action, entityType, entityId, metadata } })
  }

  private async notify(userId: string, title: string, body: string, screen: string) {
    await this.prisma.notification.create({ data: { userId, type: NotificationType.SYSTEM, title, body, screen } })
  }

  /** Ends every session and invalidates access tokens already issued. */
  private async signOutEverywhere(userId: string) {
    await this.auth.revokeAllSessions(userId)
    await this.auth.markAccessTokensRevoked(userId)
  }

  private async patientOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { patientProfile: true } })
    if (!user || user.role !== UserRole.PATIENT || !user.patientProfile) throw new NotFoundException('Patient not found')
    return user as typeof user & { patientProfile: NonNullable<typeof user.patientProfile> }
  }

  private async providerOrThrow(providerId: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id: Number(providerId) || -1 }, include: { authUser: true } })
    if (!provider) throw new NotFoundException('Provider not found')
    return provider
  }

  private requireReason(reason: string | undefined, what: string) {
    const trimmed = reason?.trim()
    if (!trimmed || trimmed.length < 3) throw new BadRequestException(`Give a reason for ${what}.`)
    return trimmed
  }

  // ── patients ──────────────────────────────────────────────────────────────

  async updatePatient(actorUserId: string, userId: string, dto: UpdateAdminPatientDto) {
    const user = await this.patientOrThrow(userId)
    const profile: Prisma.PatientProfileUpdateInput = {}
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    const track = (field: string, from: unknown, to: unknown) => {
      if (to !== undefined && String(from ?? '') !== String(to ?? '')) changes[field] = { from, to }
    }

    if (dto.firstName !== undefined) { track('firstName', user.patientProfile.firstName, dto.firstName.trim()); profile.firstName = dto.firstName.trim() }
    if (dto.lastName !== undefined) { track('lastName', user.patientProfile.lastName, dto.lastName.trim()); profile.lastName = dto.lastName.trim() }
    if (dto.dateOfBirth !== undefined) {
      const dob = new Date(dto.dateOfBirth)
      if (isNaN(dob.getTime()) || dob > new Date()) throw new BadRequestException('Enter a valid date of birth.')
      track('dateOfBirth', user.patientProfile.dateOfBirth.toISOString().slice(0, 10), dto.dateOfBirth.slice(0, 10))
      profile.dateOfBirth = dob
    }
    if (dto.gender !== undefined) { track('gender', user.patientProfile.gender, dto.gender || null); profile.gender = dto.gender || null }
    if (dto.countryCode !== undefined) { track('countryCode', user.patientProfile.countryCode, dto.countryCode); profile.countryCode = dto.countryCode }
    if (dto.phone !== undefined) track('phone', user.phone, dto.phone.trim())

    if (Object.keys(changes).length === 0) return this.admin.getUser(userId)

    await this.prisma.$transaction(async tx => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
          ...(dto.countryCode !== undefined ? { country: dto.countryCode } : {}),
          patientProfile: { update: profile },
        },
      })
      await tx.auditLog.create({
        data: { actorUserId, action: 'admin.patient.updated', entityType: 'User', entityId: userId, metadata: { changes, reason: dto.reason ?? null } as Prisma.JsonObject },
      })
    })
    await this.notify(userId, 'Your details were updated', 'GG’APP support updated your account details. Contact support if this wasn’t expected.', '/app/profile')
    return this.admin.getUser(userId)
  }

  /** Sets the total limit; what's available becomes limit minus what's already used. */
  async setCreditLimit(actorUserId: string, userId: string, limit: number, reason?: string) {
    const why = this.requireReason(reason, 'changing the credit limit')
    if (!Number.isFinite(limit) || limit < 0) throw new BadRequestException('Enter a valid credit limit.')
    const user = await this.patientOrThrow(userId)
    const used = Number(user.patientProfile.creditUsed)
    if (limit < used) throw new BadRequestException(`The limit can’t be below what’s already used (${used}).`)
    const previous = Number(user.patientProfile.creditLimit)

    await this.prisma.$transaction(async tx => {
      await tx.patientProfile.update({
        where: { userId },
        data: {
          creditLimit: new Prisma.Decimal(limit),
          creditAvailable: new Prisma.Decimal(limit - used),
          // A positive limit means the patient can use credit.
          ...(limit > 0 ? { creditStatus: 'APPROVED' } : {}),
        },
      })
      await tx.auditLog.create({
        data: { actorUserId, action: 'admin.patient.credit_limit_changed', entityType: 'User', entityId: userId, metadata: { from: previous, to: limit, reason: why } as Prisma.JsonObject },
      })
    })
    await this.notify(
      userId,
      'Your credit limit changed',
      `Your healthcare credit limit is now ${limit.toLocaleString('en-US')} (was ${previous.toLocaleString('en-US')}).`,
      '/app/credit',
    )
    return this.admin.getUser(userId)
  }

  async suspendPatient(actorUserId: string, userId: string, reason?: string) {
    const why = this.requireReason(reason, 'the suspension')
    const user = await this.patientOrThrow(userId)
    await this.admin.suspendUser(actorUserId, userId, why)
    await this.prisma.user.update({ where: { id: userId }, data: { suspendedReason: why, suspendedAt: new Date() } })
    await this.signOutEverywhere(userId)
    void this.mail.sendAccountNotice(user.email, {
      subject: 'Your GG’APP account has been suspended',
      paragraphs: ['Your GG’APP account has been suspended and you’ve been signed out.', `Reason: ${why}`, 'If you think this is a mistake, reply to this email or contact support.'],
    })
    return this.admin.getUser(userId)
  }

  async reactivatePatient(actorUserId: string, userId: string) {
    const user = await this.patientOrThrow(userId)
    await this.admin.reactivateUser(actorUserId, userId)
    await this.prisma.user.update({ where: { id: userId }, data: { suspendedReason: null, suspendedAt: null } })
    await this.notify(userId, 'Your account is active again', 'You can sign in and use GG’APP as normal.', '/app/dashboard')
    void this.mail.sendAccountNotice(user.email, { subject: 'Your GG’APP account is active again', paragraphs: ['Your account has been reactivated. You can sign in again.'], cta: { label: 'Sign in', path: '/login' } })
    return this.admin.getUser(userId)
  }

  // ── providers ─────────────────────────────────────────────────────────────

  async updateProvider(actorUserId: string, providerId: string, dto: UpdateAdminProviderDto) {
    const provider = await this.providerOrThrow(providerId)
    const data: Prisma.ProviderUpdateInput = {}
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    const set = <K extends keyof typeof provider>(field: K, value: unknown) => {
      if (value === undefined) return
      if (JSON.stringify(provider[field]) !== JSON.stringify(value)) changes[String(field)] = { from: provider[field], to: value }
      ;(data as Record<string, unknown>)[String(field)] = value
    }

    if (dto.categories !== undefined) {
      const categories = dto.categories.map(c => c.toUpperCase()).filter(c => PROVIDER_CATEGORIES.has(c)) as ProviderCategory[]
      if (categories.length === 0) throw new BadRequestException('Choose at least one provider type.')
      set('categories', categories)
      set('category', categories[0])
    }
    set('name', dto.name?.trim())
    set('phone', dto.phone?.trim())
    set('address', dto.address?.trim())
    set('license', dto.license?.trim())
    set('country', dto.country)
    set('about', dto.about?.trim())
    set('hours', dto.hours?.trim())
    if (dto.openStatus !== undefined) set('status', dto.openStatus === 'open' ? ProviderOpenStatus.OPEN : ProviderOpenStatus.CLOSED)

    if (Object.keys(changes).length > 0) {
      await this.prisma.$transaction(async tx => {
        await tx.provider.update({ where: { id: provider.id }, data })
        await tx.auditLog.create({
          data: { actorUserId, action: 'admin.provider.updated', entityType: 'Provider', entityId: String(provider.id), metadata: { changes, reason: dto.reason ?? null } as Prisma.JsonObject },
        })
      })
      if (provider.authUserId) {
        await this.notify(provider.authUserId, 'Your practice details were updated', 'GG’APP support updated your public profile. Contact support if this wasn’t expected.', '/sp/settings')
      }
    }

    if (dto.payout) {
      const { method, accountName, accountNumber } = dto.payout
      const current = await this.prisma.providerPayoutAccount.findFirst({ where: { providerId: provider.id, isDefault: true } })
      if (current) {
        await this.prisma.providerPayoutAccount.update({ where: { id: current.id }, data: { method, accountName, accountNumber } })
      } else {
        await this.prisma.providerPayoutAccount.create({
          data: { providerId: provider.id, method, accountName, accountNumber, country: provider.country ?? '', isDefault: true, status: 'ACTIVE' },
        })
      }
      await this.audit(actorUserId, 'admin.provider.payout_updated', 'Provider', String(provider.id), {
        method, accountName, accountNumberLast4: accountNumber.slice(-4), reason: dto.reason ?? null,
      })
      if (provider.authUserId) {
        await this.notify(provider.authUserId, 'Your payout account was changed', `Payouts now go to ${method} account ending ${accountNumber.slice(-4)}. Contact support immediately if you didn’t ask for this.`, '/sp/settings')
      }
    }
    return this.admin.getProvider(String(provider.id))
  }

  async suspendProvider(actorUserId: string, providerId: string, reason?: string) {
    const why = this.requireReason(reason, 'the suspension')
    const provider = await this.providerOrThrow(providerId)
    await this.admin.suspendProvider(actorUserId, providerId, why)
    if (provider.authUserId) {
      await this.prisma.user.update({ where: { id: provider.authUserId }, data: { suspendedReason: why, suspendedAt: new Date() } })
      await this.signOutEverywhere(provider.authUserId)
      if (provider.authUser?.email) {
        void this.mail.sendAccountNotice(provider.authUser.email, {
          subject: 'Your GG’APP provider account has been suspended',
          paragraphs: [`${provider.name} has been suspended and is hidden from patients. You’ve been signed out.`, `Reason: ${why}`, 'Reply to this email or contact support to resolve it.'],
        })
      }
    }
    return this.admin.getProvider(providerId)
  }

  async reactivateProvider(actorUserId: string, providerId: string) {
    const provider = await this.providerOrThrow(providerId)
    await this.admin.reactivateProvider(actorUserId, providerId)
    if (provider.authUserId) {
      await this.prisma.user.update({ where: { id: provider.authUserId }, data: { suspendedReason: null, suspendedAt: null } })
      await this.notify(provider.authUserId, 'Your practice is live again', `${provider.name} is visible to patients again.`, '/sp/dashboard')
      if (provider.authUser?.email) {
        void this.mail.sendAccountNotice(provider.authUser.email, { subject: 'Your GG’APP provider account is active again', paragraphs: [`${provider.name} has been reactivated and is visible to patients.`], cta: { label: 'Sign in', path: '/login?tab=sp' } })
      }
    }
    return this.admin.getProvider(providerId)
  }

  /** The login account behind a provider record, for the shared support tools. */
  async providerUserId(providerId: string) {
    const provider = await this.providerOrThrow(providerId)
    if (!provider.authUserId) throw new BadRequestException('This provider has no login account.')
    return provider.authUserId
  }

  // ── support tools (patients and providers) ───────────────────────────────

  async signOutAll(actorUserId: string, userId: string, entityType: 'User' | 'Provider', entityId: string) {
    await this.signOutEverywhere(userId)
    await this.audit(actorUserId, 'admin.account.signed_out_all', entityType, entityId)
    return { message: 'Signed out of every device.' }
  }

  async sendPasswordReset(actorUserId: string, userId: string, entityType: 'User' | 'Provider', entityId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Account not found')
    await this.auth.forgotPassword(user.email)
    await this.audit(actorUserId, 'admin.account.password_reset_sent', entityType, entityId)
    return { message: `Password reset link sent to ${user.email}.` }
  }

  async resendVerification(actorUserId: string, userId: string, entityType: 'User' | 'Provider', entityId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Account not found')
    if (user.emailVerifiedAt) throw new BadRequestException('This email address is already verified.')
    const token = randomUUID()
    await this.prisma.emailVerificationToken.create({ data: { token, userId, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } })
    void this.mail.sendVerificationEmail(user.email, token)
    await this.audit(actorUserId, 'admin.account.verification_resent', entityType, entityId)
    return { message: `Verification email sent to ${user.email}.` }
  }

  /** Admin actions taken on an account, newest first, with who did them. */
  async history(entityType: 'User' | 'Provider', entityId: string, extraUserId?: string) {
    const ids = [entityId, ...(extraUserId ? [extraUserId] : [])]
    const logs = await this.prisma.auditLog.findMany({
      where: { entityId: { in: ids }, action: { startsWith: 'admin.' } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const actorIds = [...new Set(logs.map(l => l.actorUserId).filter((v): v is string => !!v))]
    const actors = await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } })
    const actorEmail = new Map(actors.map(a => [a.id, a.email]))
    return logs.map(l => ({
      id: l.id,
      action: l.action,
      at: l.createdAt.toISOString(),
      by: l.actorUserId ? actorEmail.get(l.actorUserId) ?? 'Admin' : 'System',
      metadata: l.metadata,
    }))
  }

  /**
   * How a patient has used their credit: every invoice billed to them (with the part
   * taken from credit and the part paid straight to the provider) plus the events that
   * set their limit (application approvals and admin changes), newest first.
   */
  async creditActivity(userId: string) {
    const user = await this.patientOrThrow(userId)
    const [invoices, applications, limitLogs] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { patientUserId: userId },
        include: {
          provider: { select: { id: true, name: true } },
          lineItems: { select: { name: true, amount: true }, orderBy: { id: 'asc' } },
          prescriptionRequest: { select: { reference: true } },
          payout: { select: { reference: true, paidAt: true } },
        },
        orderBy: { submittedAt: 'desc' },
        take: 300,
      }),
      this.prisma.creditApplication.findMany({
        where: { patientUserId: userId, status: 'APPROVED' },
        orderBy: { reviewedAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { entityId: userId, action: 'admin.patient.credit_limit_changed' },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    const actors = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(limitLogs.map(l => l.actorUserId).filter((v): v is string => !!v))] } },
      select: { id: true, email: true },
    })
    const actorEmail = new Map(actors.map(a => [a.id, a.email]))
    const num = (v: Prisma.Decimal | null | undefined) => (v == null ? 0 : Number(v))

    const STATUS = { PENDING_AUTH: 'waiting', AUTHORIZED: 'approved', PAID: 'paid', DISPUTED: 'disputed', REJECTED: 'declined' } as const

    const spends = invoices.map(inv => {
      const fromCredit = num(inv.walletAmountPaid)
      return {
        kind: 'invoice' as const,
        id: inv.id,
        at: (inv.paymentAuthorizedAt ?? inv.submittedAt).toISOString(),
        reference: inv.reference,
        provider: { id: inv.provider.id, name: inv.provider.name },
        service: inv.prescriptionRequest ? `Prescription ${inv.prescriptionRequest.reference}` : inv.lineItems[0]?.name ?? 'Visit',
        lineItems: inv.lineItems.map(li => ({ name: li.name, amount: num(li.amount) })),
        forName: inv.serviceForType === 'BENEFICIARY' ? inv.serviceForName : null,
        forRelation: inv.serviceForType === 'BENEFICIARY' ? inv.serviceForRelation : null,
        amount: num(inv.amount),
        fromCredit,
        /** False for invoices approved before the credit/direct split was recorded. */
        splitRecorded: inv.walletAmountPaid != null,
        paidDirect: inv.offAppAmountDue != null ? num(inv.offAppAmountDue) : 0,
        status: STATUS[inv.status],
        submittedAt: inv.submittedAt.toISOString(),
        approvedAt: inv.paymentAuthorizedAt?.toISOString() ?? null,
        authRef: inv.paymentRef,
        providerPaidAt: inv.payout?.paidAt.toISOString() ?? inv.paidAt?.toISOString() ?? null,
        payoutRef: inv.payout?.reference ?? null,
        disputeReason: inv.disputeReason,
        rejectionReason: inv.rejectionReason,
      }
    })

    const limitEvents = [
      ...applications.map(a => ({
        kind: 'limit' as const,
        id: `app-${a.id}`,
        at: (a.reviewedAt ?? a.updatedAt).toISOString(),
        change: a.type === 'INCREASE' ? ('increase' as const) : ('approved' as const),
        amount: num(a.approvedAmount),
        from: null as number | null,
        to: null as number | null,
        reason: a.reference,
        by: null as string | null,
      })),
      ...limitLogs.map(l => {
        const meta = (l.metadata ?? {}) as { from?: number; to?: number; reason?: string }
        return {
          kind: 'limit' as const,
          id: `log-${l.id}`,
          at: l.createdAt.toISOString(),
          change: 'admin' as const,
          amount: (meta.to ?? 0) - (meta.from ?? 0),
          from: meta.from ?? null,
          to: meta.to ?? null,
          reason: meta.reason ?? null,
          by: l.actorUserId ? actorEmail.get(l.actorUserId) ?? 'Admin' : null,
        }
      }),
    ]

    const used = spends.filter(s => s.fromCredit > 0)
    const profile = user.patientProfile
    return {
      summary: {
        limit: num(profile.creditLimit),
        used: num(profile.creditUsed),
        available: num(profile.creditAvailable),
        spentFromCredit: used.reduce((s, i) => s + i.fromCredit, 0),
        paidDirect: spends.reduce((s, i) => s + i.paidDirect, 0),
        paidVisits: used.length,
        waiting: spends.filter(s => s.status === 'waiting').length,
        disputed: spends.filter(s => s.status === 'disputed').length,
        forFamily: used.filter(s => s.forName).reduce((s, i) => s + i.fromCredit, 0),
        lastUsedAt: used[0]?.approvedAt ?? null,
      },
      items: [...spends, ...limitEvents].sort((a, b) => b.at.localeCompare(a.at)),
    }
  }

  // ── email change requests ────────────────────────────────────────────────

  async listEmailChanges(status?: string) {
    const where = status && status !== 'all' ? { status: status.toUpperCase() as EmailChangeStatus } : {}
    const requests = await this.prisma.emailChangeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { role: true, patientProfile: { select: { firstName: true, lastName: true } }, providerRecord: { select: { id: true, name: true } } } } },
    })
    return requests.map(r => ({
      id: r.id,
      userId: r.userId,
      role: r.user.role === UserRole.SP ? 'provider' : 'patient',
      name: r.user.providerRecord?.name ?? (r.user.patientProfile ? `${r.user.patientProfile.firstName} ${r.user.patientProfile.lastName}` : r.currentEmail),
      providerId: r.user.providerRecord?.id ?? null,
      currentEmail: r.currentEmail,
      newEmail: r.newEmail,
      reason: r.reason,
      status: r.status.toLowerCase(),
      decisionNote: r.decisionNote,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt?.toISOString() ?? null,
    }))
  }

  async decideEmailChange(actorUserId: string, requestId: string, approve: boolean, note?: string) {
    const request = await this.prisma.emailChangeRequest.findUnique({ where: { id: requestId }, include: { user: { select: { role: true } } } })
    if (!request) throw new NotFoundException('Request not found')
    const settingsScreen = request.user.role === UserRole.SP ? '/sp/settings' : '/app/profile'
    if (request.status !== EmailChangeStatus.PENDING) throw new ConflictException('This request has already been handled.')
    if (!approve) this.requireReason(note, 'declining')

    if (approve) {
      const taken = await this.prisma.user.findUnique({ where: { email: request.newEmail } })
      if (taken && taken.id !== request.userId) throw new ConflictException('Another account already uses that email.')
    }

    await this.prisma.$transaction(async tx => {
      await tx.emailChangeRequest.update({
        where: { id: requestId },
        data: { status: approve ? EmailChangeStatus.APPROVED : EmailChangeStatus.REJECTED, decisionNote: note?.trim() || null, decidedByUserId: actorUserId, decidedAt: new Date() },
      })
      if (approve) {
        await tx.user.update({ where: { id: request.userId }, data: { email: request.newEmail, emailVerifiedAt: new Date() } })
      }
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: approve ? 'admin.account.email_change_approved' : 'admin.account.email_change_rejected',
          entityType: 'User',
          entityId: request.userId,
          metadata: { from: request.currentEmail, to: request.newEmail, note: note ?? null } as Prisma.JsonObject,
        },
      })
    })

    if (approve) {
      // Sign the person in again with the new address.
      await this.signOutEverywhere(request.userId)
      const body = `Your sign-in email changed from ${request.currentEmail} to ${request.newEmail}.`
      void this.mail.sendAccountNotice(request.newEmail, { subject: 'Your GG’APP email has changed', paragraphs: [body, 'Use this address to sign in from now on.'], cta: { label: 'Sign in', path: '/login' } })
      void this.mail.sendAccountNotice(request.currentEmail, { subject: 'Your GG’APP email was changed', paragraphs: [body, 'If you didn’t ask for this, contact support straight away.'] })
      await this.notify(request.userId, 'Email change approved', body, settingsScreen)
    } else {
      await this.notify(request.userId, 'Email change not approved', `Your request to use ${request.newEmail} was declined: ${note?.trim()}`, settingsScreen)
      void this.mail.sendAccountNotice(request.currentEmail, { subject: 'Your GG’APP email change wasn’t approved', paragraphs: [`Your request to change your email to ${request.newEmail} was declined.`, `Reason: ${note?.trim()}`] })
    }
    return { message: approve ? 'Email changed.' : 'Request declined.' }
  }
}
