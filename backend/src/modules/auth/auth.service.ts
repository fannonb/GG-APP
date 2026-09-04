import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { ConfigService } from '@nestjs/config'
import {
  AuthProvider,
  NotificationType,
  Prisma,
  ProviderApplicationDocumentKind,
  ProviderApplicationStatus,
  ProviderPayoutMethod,
  ProviderLifecycleStatus,
  UserRole,
  UserStatus,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { FieldEncryptionService } from '../../common/services/field-encryption.service'
import { MailService } from '../../common/services/mail.service'
import { parseDurationToMs, parseDurationToSeconds } from '../../common/utils/duration.util'
import { GoogleAuthService } from './google-auth.service'
import type { GoogleAuthDto } from './dto/google-auth.dto'
import type { LoginDto } from './dto/login.dto'
import type { RegisterPatientDto } from './dto/register-patient.dto'
import type { RegisterSpDto } from './dto/register-sp.dto'
import type { AuthSessionResponse, ForgotPasswordResponse } from './auth.types'

/** Request context captured at login/refresh and recorded on the session so the
 * "active sessions" screen can tell one device from another. */
export interface SessionContext {
  userAgent?: string
  ip?: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly prisma: PrismaService
  private readonly redis: RedisService
  private readonly jwtService: JwtService
  private readonly configService: ConfigService
  private readonly fieldEncryption: FieldEncryptionService
  private readonly googleAuth: GoogleAuthService
  private readonly mailService: MailService

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(RedisService) redis: RedisService,
    @Inject(JwtService) jwtService: JwtService,
    @Inject(ConfigService) configService: ConfigService,
    @Inject(FieldEncryptionService) fieldEncryption: FieldEncryptionService,
    @Inject(GoogleAuthService) googleAuth: GoogleAuthService,
    @Inject(MailService) mailService: MailService,
  ) {
    this.prisma = prisma
    this.redis = redis
    this.jwtService = jwtService
    this.configService = configService
    this.fieldEncryption = fieldEncryption
    this.googleAuth = googleAuth
    this.mailService = mailService
  }

  async registerPatient(dto: RegisterPatientDto, ctx: SessionContext = {}) {
    const email = dto.email.toLowerCase()
    const existing = await this.prisma.user.findUnique({ where: { email } })

    if (existing) {
      throw new ConflictException('An account already exists for this email address')
    }

    let googleId: string | null = null
    let passwordHash: string

    if (dto.googleIdToken) {
      const profile = await this.googleAuth.verifyIdToken(dto.googleIdToken, dto.googleClientId)
      if (!profile.emailVerified) {
        throw new BadRequestException('Your Google account email is not verified')
      }
      if (profile.email.toLowerCase() !== email) {
        throw new BadRequestException('Google account email does not match the submitted email')
      }

      const existingGoogleUser = await this.prisma.user.findUnique({ where: { googleId: profile.sub } })
      if (existingGoogleUser) {
        throw new ConflictException('An account already exists for this Google account')
      }

      googleId = profile.sub
      // Google is the auth mechanism for this account — the account has no usable password.
      passwordHash = await bcrypt.hash(randomUUID(), 12)
    } else {
      if (!dto.password) {
        throw new BadRequestException('Password is required')
      }
      passwordHash = await bcrypt.hash(dto.password, 12)
    }

    const isGoogleSignup = googleId !== null
    const nationalIdEncrypted = this.fieldEncryption.encrypt(dto.nationalId)
    const nationalIdLast4 = dto.nationalId.slice(-4)

    const userId = await this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.PATIENT,
          status: UserStatus.ACTIVE,
          // Local accounts must verify their email before they can sign in
          // (when Resend is configured). Google sign-ups are already verified
          // by Google, so they never get a verification email and can sign in
          // immediately. Without a mail provider we fall back to auto-verifying
          // so local development is never blocked.
          emailVerifiedAt:
            isGoogleSignup || !this.mailService.isEnabled ? new Date() : null,
          googleId,
          authProvider: isGoogleSignup ? AuthProvider.GOOGLE : AuthProvider.LOCAL,
          phone: dto.phone,
          country: dto.country,
          patientProfile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              dateOfBirth: new Date(dto.dob),
              countryCode: dto.country,
              nationalIdEncrypted,
              nationalIdLast4,
            },
          },
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'patient.registered',
          entityType: 'User',
          entityId: user.id,
          metadata: {
            role: 'patient',
            email,
            authProvider: isGoogleSignup ? 'google' : 'local',
          } as Prisma.JsonObject,
        },
      })

      return user.id
    })

    // Notify all admin users about the new patient registration (outside tx so it never blocks sign-up)
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      })

      if (adminUsers.length > 0) {
        const patientName = `${dto.firstName} ${dto.lastName}`.trim()
        await this.prisma.notification.createMany({
          data: adminUsers.map(admin => ({
            userId: admin.id,
            type: NotificationType.SYSTEM,
            title: 'New patient registered',
            body: `${patientName} (${email}) has just created a patient account.`,
            screen: '/admin/users',
          })),
        })
      }
    } catch {
      // Non-critical — registration already succeeded
    }

    if (!isGoogleSignup && this.mailService.isEnabled) {
      const verificationToken = randomUUID()
      await this.prisma.emailVerificationToken.create({
        data: {
          token: verificationToken,
          userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      void this.mailService.sendVerificationEmail(email, verificationToken)

      return {
        message:
          'Registration successful. Check your email to verify your account before signing in.',
        verificationToken,
      }
    }

    const session = await this.issueSession({ userId, email, role: 'patient' }, { ctx })
    return {
      message: 'Registration successful.',
      session,
    }
  }

  async loginWithGoogle(dto: GoogleAuthDto, ctx: SessionContext = {}) {
    const { profile, idToken } = await this.googleAuth.exchangeCode(
      dto.code,
      dto.redirectUri,
      dto.codeVerifier,
      dto.clientId,
    )
    if (!profile.emailVerified) {
      throw new UnauthorizedException('Your Google account email is not verified')
    }

    const email = profile.email.toLowerCase()
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.sub } })

    if (!user) {
      const existingLocal = await this.prisma.user.findUnique({ where: { email } })
      if (existingLocal) {
        if (existingLocal.role !== UserRole.PATIENT) {
          throw new UnauthorizedException('Google Sign-In is only available for patient accounts')
        }

        // Google has verified ownership of this patient email — safe to link to the existing account.
        user = await this.prisma.user.update({
          where: { id: existingLocal.id },
          data: { googleId: profile.sub, authProvider: AuthProvider.GOOGLE },
        })
      }
    }

    if (!user) {
      return {
        needsRegistration: true as const,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email,
        googleIdToken: idToken,
      }
    }

    if (user.role !== UserRole.PATIENT) {
      throw new UnauthorizedException('This Google account is not registered as a patient')
    }

    await this.assertLoginAccess(user.id, user.role, user.status, user.emailVerifiedAt)

    const session = await this.issueSession(
      {
        userId: user.id,
        email: user.email,
        role: this.mapRoleToClient(user.role),
      },
      { ctx },
    )

    return { needsRegistration: false as const, ...session }
  }

  async registerSp(dto: RegisterSpDto) {
    const email = dto.email.toLowerCase()
    const existing = await this.prisma.user.findUnique({ where: { email } })

    if (existing) {
      throw new ConflictException('An account already exists for this email address')
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const application = await this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.SP,
          status: UserStatus.ACTIVE,
          phone: dto.phone,
          country: dto.country,
          emailVerifiedAt: this.mailService.isEnabled ? null : new Date(),
        },
      })

      const createdApplication = await tx.providerApplication.create({
        data: {
          userId: user.id,
          status: ProviderApplicationStatus.PENDING,
          practiceName: dto.practiceName,
          email,
          emailSecondary: dto.emailSecondary?.toLowerCase() ?? null,
          phone: dto.phone,
          country: dto.country,
          locationLabel: dto.location.label ?? null,
          address: dto.location.address,
          city: dto.location.city ?? null,
          region: dto.location.region ?? null,
          serviceTypes: dto.serviceTypes,
          licenseNumber: dto.licenseNumber,
          openingHours: dto.hours as unknown as Prisma.InputJsonValue,
          payoutMethod: this.mapPayoutMethod(dto.payoutMethod.method),
          payoutSummary: this.buildPayoutSummary(dto),
          payoutDetails: dto.payoutMethod as unknown as Prisma.InputJsonValue,
          lat: dto.location.lat ?? null,
          lng: dto.location.lng ?? null,
          documents: {
            create: dto.documents.map(document => ({
              kind: this.mapDocumentKind(document.kind),
              originalName: document.originalName,
              mimeType: document.mimeType,
              sizeBytes: document.sizeBytes,
              displaySize: document.displaySize,
              storageKey: document.storageKey,
            })),
          },
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'sp.application.submitted',
          entityType: 'ProviderApplication',
          entityId: createdApplication.id,
          metadata: {
            email,
            practiceName: dto.practiceName,
            serviceTypes: dto.serviceTypes,
          } as Prisma.JsonObject,
        },
      })

      return createdApplication
    })

    // Notify admins about the new provider application (outside the tx so it
    // never blocks submission).
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      })
      if (adminUsers.length > 0) {
        await this.prisma.notification.createMany({
          data: adminUsers.map(admin => ({
            userId: admin.id,
            type: NotificationType.SYSTEM,
            title: 'New provider application',
            body: `${dto.practiceName} (${email}) submitted a service provider application.`,
            screen: '/admin/applications',
          })),
        })
      }
    } catch {
      // Non-critical — application already submitted
    }

    if (this.mailService.isEnabled) {
      const verificationToken = randomUUID()
      await this.prisma.emailVerificationToken.create({
        data: {
          token: verificationToken,
          userId: application.userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      void this.mailService.sendVerificationEmail(email, verificationToken)
    }

    return {
      message: this.mailService.isEnabled
        ? 'Application submitted successfully. Verify your email to track your application.'
        : 'Application submitted successfully. We will review it shortly.',
      applicationId: application.id,
      status: this.mapProviderApplicationStatus(application.status),
    }
  }

  async getProviderApplicationStatus(applicationId: string) {
    const application = await this.prisma.providerApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        status: true,
        decisionNote: true,
        submittedAt: true,
        decidedAt: true,
      },
    })

    if (!application) {
      throw new BadRequestException('Provider application not found')
    }

    return {
      applicationId: application.id,
      status: this.mapProviderApplicationStatus(application.status),
      note: application.decisionNote,
      submittedAt: application.submittedAt.toISOString(),
      decidedAt: application.decidedAt?.toISOString() ?? null,
    }
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new ForbiddenException('This verification token is invalid or expired')
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
    ])

    return {
      message: 'Email verified successfully. You can now sign in.',
    }
  }

  async login(dto: LoginDto, ctx: SessionContext = {}): Promise<AuthSessionResponse> {
    const email = dto.email.toLowerCase()
    const requestedRole = this.mapRequestedRole(dto.role)

    // Admin portal gate runs before any user lookup: a wrong or missing token
    // returns 404 regardless of whether the email exists, so admin login does
    // not reveal user existence and repeated failures are throttled via Redis.
    // The token is compared in constant time (SHA-256 + timingSafeEqual) to
    // avoid a timing side channel.
    if (requestedRole === UserRole.ADMIN) {
      const expectedToken = this.configService.get<string>('portal.adminToken') ?? ''
      if (!expectedToken || !this.tokensEqual(dto.portalToken, expectedToken)) {
        throw new NotFoundException()
      }
      const attempts = Number((await this.redis.get(this.getAdminLoginKey(email))) ?? '0')
      if (attempts >= 5) {
        throw new ThrottlerException(
          'Too many admin login attempts. Please try again later.',
        )
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new UnauthorizedException('Invalid email or password')
    }

    if (user.authProvider === AuthProvider.GOOGLE && user.role === UserRole.PATIENT) {
      throw new UnauthorizedException('This account uses Google Sign-In. Please continue with Google.')
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordMatches) {
      if (requestedRole === UserRole.ADMIN) await this.recordAdminLoginFailure(email)
      throw new UnauthorizedException('Invalid email or password')
    }

    if (user.role !== requestedRole) {
      if (requestedRole === UserRole.ADMIN) await this.recordAdminLoginFailure(email)
      throw new UnauthorizedException('This account is not registered for the selected portal')
    }

    await this.assertLoginAccess(user.id, user.role, user.status, user.emailVerifiedAt)

    if (requestedRole === UserRole.ADMIN) {
      await this.redis.del(this.getAdminLoginKey(email))
      await this.prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'auth.admin.login',
          entityType: 'User',
          entityId: user.id,
          metadata: { email } as Prisma.JsonObject,
        },
      })
    }

    return this.issueSession(
      {
        userId: user.id,
        email: user.email,
        role: this.mapRoleToClient(user.role),
      },
      { ctx },
    )
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const normalizedEmail = email.toLowerCase()
    const genericMessage = 'If an account exists for that email, a reset link has been sent.'
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return { message: genericMessage }
    }

    const existingToken = await this.redis.get(this.getPasswordResetUserKey(user.id))
    if (existingToken) {
      await this.redis.del(this.getPasswordResetTokenKey(existingToken))
      await this.redis.del(this.getPasswordResetUserKey(user.id))
    }

    const token = randomUUID()
    const ttlSeconds = 15 * 60

    await this.redis.set(this.getPasswordResetTokenKey(token), user.id, ttlSeconds)
    await this.redis.set(this.getPasswordResetUserKey(user.id), token, ttlSeconds)

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'auth.password_reset.requested',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          email: normalizedEmail,
        } as Prisma.JsonObject,
      },
    })

    await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: 'Password Reset Requested',
        body: 'A password reset request was started for your account.',
        screen: '/login',
      },
    })

    void this.mailService.sendPasswordResetEmail(
      normalizedEmail,
      token,
      user.role === UserRole.ADMIN ? 'admin' : undefined,
    )

    const response: ForgotPasswordResponse = { message: genericMessage }
    if (this.shouldExposeResetUrl()) {
      response.resetUrl = this.buildPasswordResetUrl(
        token,
        user.role === UserRole.ADMIN ? 'admin' : undefined,
      )
    }

    return response
  }

  async resetPassword(token: string, password: string) {
    const userId = await this.redis.get(this.getPasswordResetTokenKey(token))
    if (!userId) {
      throw new BadRequestException('This password reset link is invalid or has expired')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      await this.redis.del(this.getPasswordResetTokenKey(token))
      throw new BadRequestException('This password reset link is invalid or has expired')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.SYSTEM,
          title: 'Password Updated',
          body: 'Your password has been changed successfully.',
          screen: '/login',
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'auth.password_reset.completed',
          entityType: 'User',
          entityId: user.id,
          metadata: {
            email: user.email,
          } as Prisma.JsonObject,
        },
      }),
    ])

    await this.redis.del(this.getPasswordResetTokenKey(token))
    await this.redis.del(this.getPasswordResetUserKey(user.id))
    // A reset password invalidates any access tokens issued before it —
    // e.g. tokens held by an attacker who compromised the old password.
    await this.markAccessTokensRevoked(user.id)

    return {
      message: 'Password reset successfully. You can now sign in.',
    }
  }

  async refresh(refreshToken: string, ctx: SessionContext = {}): Promise<AuthSessionResponse> {
    const payload = await this.verifyRefreshToken(refreshToken)
    const key = this.getRefreshTokenKey(payload.jti)
    const storedDigest = await this.redis.get(key)
    const presentedDigest = this.hashToken(refreshToken)

    // Rotation already consumed {refreshToken}: the stored digest no longer
    // matches. This is either a replay of a rotated token (theft) or a
    // duplicate concurrent refresh (multi-tab). A token that matches the
    // previous digest within the grace window is treated as a concurrent
    // refresh and rejected WITHOUT killing the session — the losing tab
    // retries with the rotated token (or the shared cookie) on its next call.
    if (!storedDigest || !this.hashesEqual(presentedDigest, storedDigest)) {
      if (storedDigest) {
        const prevDigest = await this.redis.get(this.getRefreshTokenPrevKey(payload.jti))
        if (prevDigest && this.hashesEqual(presentedDigest, prevDigest)) {
          throw new UnauthorizedException('Refresh session has expired')
        }
        await this.revokeSessionByJti(
          payload.sub,
          payload.jti,
          'auth.refresh.rotated_token_replayed',
        )
        await this.notifySuspiciousSession(payload.sub, payload.jti)
      }
      throw new UnauthorizedException('Refresh session has expired')
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) {
      throw new UnauthorizedException('Account is not available')
    }

    await this.assertLoginAccess(user.id, user.role, user.status, user.emailVerifiedAt)

    // Keep the just-consumed digest around briefly so a concurrent tab that
    // presents it in the same window is not mistaken for a stolen replay.
    await this.redis.set(this.getRefreshTokenPrevKey(payload.jti), presentedDigest, 15)

    // Rotation: consume the presented refresh token and issue a fresh one for
    // the SAME logical session (same jti), so per-session revocation and the
    // device list stay stable across refreshes.
    const session = await this.issueSession(
      {
        userId: user.id,
        email: user.email,
        role: this.mapRoleToClient(user.role),
      },
      { ctx, track: false, reuseJti: payload.jti },
    )

    await this.prisma.providerSessionAudit.updateMany({
      where: { sessionId: payload.jti, revokedAt: null },
      data: {
        lastSeenAt: new Date(),
        deviceLabel: this.describeDevice(ctx, this.mapRoleToClient(user.role)),
        locationLabel: ctx.ip ? `IP ${ctx.ip}` : undefined,
        ipAddress: ctx.ip ?? undefined,
        userAgent: ctx.userAgent?.slice(0, 512) ?? undefined,
      },
    })

    return session
  }

  async logout(
    session?: { sub: string; jti?: string },
    refreshToken?: string,
  ) {
    // Preferred path: revoke by the access token's jti. Logout is guarded by
    // JwtAuthGuard, so a caller without a live access token (e.g. someone who
    // only stole a refresh token) cannot destroy the victim's session.
    if (session?.jti) {
      await this.revokeSessionByJti(session.sub, session.jti, 'auth.logout')
      return { message: 'Logged out' }
    }
    if (refreshToken) {
      try {
        const payload = await this.verifyRefreshToken(refreshToken)
        await this.revokeSessionByJti(payload.sub, payload.jti, 'auth.logout')
      } catch {
        return { message: 'Logged out' }
      }
    }

    return { message: 'Logged out' }
  }

  /** Revokes every live session for the account ("sign out everywhere"). */
  async revokeAllSessions(userId: string) {
    const sessions = await this.prisma.providerSessionAudit.findMany({
      where: { userId, revokedAt: null },
      select: { sessionId: true },
    })
    for (const { sessionId } of sessions) {
      await this.revokeSessionByJti(userId, sessionId, 'auth.sessions.revoked_all')
    }
    return { message: 'All sessions signed out.' }
  }

  private async assertLoginAccess(
    userId: string,
    role: UserRole,
    status: UserStatus,
    emailVerifiedAt: Date | null,
  ) {
    if (status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('This account has been suspended. Please contact support.')
    }

    if (role === UserRole.PATIENT) {
      if (status !== UserStatus.ACTIVE || !emailVerifiedAt) {
        throw new ForbiddenException('Please verify your email address before signing in')
      }
      return
    }

    if (role === UserRole.ADMIN) {
      if (status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('Admin access is not active for this account')
      }
      return
    }

    const application = await this.prisma.providerApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    if (!application) {
      throw new ForbiddenException('Your provider application has not been completed')
    }

    if (application.status === ProviderApplicationStatus.PENDING) {
      throw new ForbiddenException('Your provider application is still under review')
    }

    if (application.status === ProviderApplicationStatus.INFO_REQUESTED) {
      throw new ForbiddenException(
        application.decisionNote || 'More information is required before your provider account can be approved',
      )
    }

    if (application.status === ProviderApplicationStatus.REJECTED) {
      throw new ForbiddenException(
        application.decisionNote || 'Your provider application was not approved',
      )
    }

    const provider = await this.prisma.provider.findFirst({
      where: { authUserId: userId },
    })

    if (!provider) {
      throw new ForbiddenException('Your provider account has not been activated yet')
    }

    if (provider.lifecycleStatus === ProviderLifecycleStatus.SUSPENDED) {
      throw new ForbiddenException('Your provider account is suspended. Please contact an administrator.')
    }
  }

  private async issueSession(
    params: {
      userId: string
      email: string
      role: 'patient' | 'sp' | 'admin'
    },
    options: {
      /** Client context recorded as the session's device / location metadata. */
      ctx?: SessionContext
      /** Create a ProviderSessionAudit row (true for fresh logins). False when
       * rotating tokens for an existing session (refresh) — the existing row
       * is bumped instead so the device list is not churned. */
      track?: boolean
      /** Reuse an existing logical session id (refresh rotation keeps the
       * session stable so per-session revocation still targets one device). */
      reuseJti?: string
    } = {},
  ): Promise<AuthSessionResponse> {
    const accessTtl = this.configService.getOrThrow<string>('auth.accessTtl')
    // Admin sessions expire much sooner than patient/provider sessions.
    const refreshTtl = this.configService.getOrThrow<string>(
      params.role === 'admin' ? 'auth.adminRefreshTtl' : 'auth.refreshTtl',
    )
    const accessSecret = this.configService.getOrThrow<string>('auth.accessSecret')
    const refreshSecret = this.configService.getOrThrow<string>('auth.refreshSecret')
    const jti = options.reuseJti ?? randomUUID()

    const accessToken = await this.jwtService.signAsync(
      {
        sub: params.userId,
        email: params.email,
        role: params.role,
        jti,
      },
      {
        secret: accessSecret,
        expiresIn: accessTtl,
      },
    )

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: params.userId,
        email: params.email,
        role: params.role,
        jti,
        typ: 'refresh',
        // Unique per issuance even when `iat` is identical (same-second
        // rotations). Without it two refresh tokens signed in the same second
        // are byte-identical and rotation/replay detection collapses.
        nonce: randomUUID(),
      },
      {
        secret: refreshSecret,
        expiresIn: refreshTtl,
      },
    )

    // Store only a SHA-256 digest of the refresh token. The digest is the
    // source of truth for "which refresh token is currently valid for this
    // session" — it is replaced on every rotation, so replaying an older
    // refresh token is detectable.
    await this.redis.set(
      this.getRefreshTokenKey(jti),
      this.hashToken(refreshToken),
      parseDurationToSeconds(refreshTtl),
    )

    if (options.track !== false) {
      await this.prisma.providerSessionAudit.create({
        data: {
          userId: params.userId,
          sessionId: jti,
          deviceLabel: this.describeDevice(options.ctx, params.role),
          locationLabel: options.ctx?.ip ? `IP ${options.ctx.ip}` : null,
          ipAddress: options.ctx?.ip ?? null,
          userAgent: options.ctx?.userAgent?.slice(0, 512) ?? null,
          lastSeenAt: new Date(),
        },
      })
    }

    return {
      accessToken,
      refreshToken,
      role: params.role,
      expiresAt: Date.now() + parseDurationToMs(accessTtl),
      sessionId: jti,
    }
  }

  private async verifyRefreshToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string
        email: string
        role: 'patient' | 'sp' | 'admin'
        jti: string
        typ: string
      }>(token, {
        secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
      })
      if (payload.typ !== 'refresh' || !payload.jti) {
        throw new UnauthorizedException('Invalid refresh token')
      }
      return payload
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  private getRefreshTokenKey(tokenId: string) {
    return `refresh-token:${tokenId}`
  }

  /** Holds the digest of the token consumed by the most recent rotation for a
   * short grace window, so a concurrent duplicate refresh is distinguishable
   * from a real replay. */
  private getRefreshTokenPrevKey(tokenId: string) {
    return `refresh-token:${tokenId}:prev`
  }

  /**
   * Best-effort alert when a rotated refresh token is replayed outside the
   * grace window — the strongest signal of a stolen session. Never throws so
   * the auth path is unaffected by mail/Redis hiccups.
   */
  private async notifySuspiciousSession(userId: string, jti: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })
      if (!user) return
      await this.mailService.send({
        to: user.email,
        subject: 'Suspicious sign-in detected — GG’APP session terminated',
        html: `
          <p>We detected that one of your GG'APP session tokens was reused after it
          had already been rotated — a sign that the session may have been stolen.</p>
          <p>To protect your account, we terminated that session immediately.</p>
          <p>If this wasn't you, sign in and change your password, then sign out all
          sessions from Security settings.</p>
        `,
      })
    } catch (error) {
      this.logger.warn(
        `Suspicious-session notification failed (userId=${userId}, jti=${jti}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  /**
   * Records a user-wide cutoff timestamp so the JWT strategy rejects any access
   * token issued before now. Deliberately account-wide: used for password
   * reset and refresh-token reuse escalations, where every live session for
   * the account must die (devices recover by refreshing / re-logging in).
   * Single-device logout/revocation uses the per-session key instead.
   */
  async markAccessTokensRevoked(userId: string) {
    await this.redis.set(
      this.getAccessRevocationKey(userId),
      String(Math.floor(Date.now() / 1000)),
      3600,
    )
  }

  private getAccessRevocationKey(userId: string) {
    return `token-revoked-before:${userId}`
  }

  /** Lists a user's live sessions (any role). `currentJti` lets the caller
   * flag the exact session the active request belongs to. */
  async listSessions(userId: string, currentJti?: string) {
    const sessions = await this.prisma.providerSessionAudit.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
    })

    return sessions.map((session, index) => ({
      id: session.id,
      sessionId: session.sessionId,
      device: session.deviceLabel,
      location:
        session.locationLabel ??
        (session.ipAddress ? `IP ${session.ipAddress}` : 'Unknown location'),
      ipAddress: session.ipAddress ?? undefined,
      current: currentJti ? session.sessionId === currentJti : index === 0,
      active: index === 0,
      time: index === 0 ? 'Active now' : session.lastSeenAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
    }))
  }

  /** Revokes one of the user's sessions (by audit row id or session jti). */
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

    await this.revokeSessionByJti(userId, session.sessionId, 'auth.session.revoked')
    return { message: 'Session revoked successfully.' }
  }

  private async revokeSessionByJti(userId: string, jti: string, auditAction: string) {
    await this.redis.del(this.getRefreshTokenKey(jti))
    // Kill the paired access token immediately (it carries the same jti) —
    // a revoked device must not keep API access until the access token's
    // natural expiry.
    await this.redis.set(this.getSessionRevocationKey(jti), '1', 3600)
    await this.prisma.providerSessionAudit.updateMany({
      where: { sessionId: jti, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: auditAction,
        entityType: 'ProviderSessionAudit',
        entityId: jti,
        metadata: { sessionId: jti } as Prisma.JsonObject,
      },
    })
  }

  private getSessionRevocationKey(jti: string) {
    return `session-revoked:${jti}`
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  private hashesEqual(a: string, b: string): boolean {
    const left = Buffer.from(a)
    const right = Buffer.from(b)
    if (left.length !== right.length) return false
    return timingSafeEqual(left, right)
  }

  /** Constant-time comparison (SHA-256 + timingSafeEqual) for the admin portal
   * token — prevents a timing side channel on the admin gate. */
  private tokensEqual(a: string | undefined, b: string): boolean {
    if (!a) return false
    return this.hashesEqual(
      createHash('sha256').update(a).digest('hex'),
      createHash('sha256').update(b).digest('hex'),
    )
  }

  /** Builds a short human-readable device label from the User-Agent so the
   * "active sessions" list can tell one device from another. */
  private describeDevice(
    ctx: SessionContext | undefined,
    role: 'patient' | 'sp' | 'admin',
  ) {
    const ua = ctx?.userAgent?.toLowerCase() ?? ''
    if (!ua) return this.getSessionLabel(role)
    if (ua.includes('expo') || ua.includes('okhttp') || ua.includes('react-native')) {
      return 'Mobile App'
    }
    let label = ''
    if (ua.includes('edg/')) label = 'Edge'
    else if (ua.includes('chrome/')) label = 'Chrome'
    else if (ua.includes('firefox/')) label = 'Firefox'
    else if (ua.includes('safari/')) label = 'Safari'
    else label = 'Browser'
    if (ua.includes('windows')) label += ' · Windows'
    else if (ua.includes('mac os x') || ua.includes('macintosh')) label += ' · macOS'
    else if (ua.includes('iphone') || ua.includes('ipod')) label += ' · iPhone'
    else if (ua.includes('ipad')) label += ' · iPad'
    else if (ua.includes('android')) label += ' · Android'
    else if (ua.includes('linux')) label += ' · Linux'
    return label
  }

  private getPasswordResetTokenKey(token: string) {
    return `password-reset:token:${token}`
  }

  private getPasswordResetUserKey(userId: string) {
    return `password-reset:user:${userId}`
  }

  private getAdminLoginKey(email: string) {
    return `admin-login:${email}`
  }

  private async recordAdminLoginFailure(email: string) {
    const key = this.getAdminLoginKey(email)
    const current = Number((await this.redis.get(key)) ?? '0')
    await this.redis.set(key, String(current + 1), 15 * 60)
  }

  private shouldExposeResetUrl() {
    const nodeEnv = this.configService.get<string>('app.nodeEnv') ?? 'development'
    // Only expose the reset link in the API response outside production, or as
    // a dev fallback when no mail provider is configured (the link is otherwise
    // delivered by email only).
    return nodeEnv !== 'production' || !this.mailService.isEnabled
  }

  private buildPasswordResetUrl(token: string, role?: 'admin') {
    const origins = this.configService.get<string[]>('app.corsOrigins') ?? ['http://localhost:5173']
    const baseUrl = origins[0] ?? 'http://localhost:5173'
    const roleParam = role ? `&role=${role}` : ''
    return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}${roleParam}`
  }

  private mapRequestedRole(role: LoginDto['role']) {
    switch (role) {
      case 'patient':
        return UserRole.PATIENT
      case 'sp':
        return UserRole.SP
      case 'admin':
        return UserRole.ADMIN
    }
  }

  private mapRoleToClient(role: UserRole): 'patient' | 'sp' | 'admin' {
    switch (role) {
      case UserRole.PATIENT:
        return 'patient'
      case UserRole.SP:
        return 'sp'
      case UserRole.ADMIN:
        return 'admin'
    }
  }

  private mapProviderApplicationStatus(status: ProviderApplicationStatus) {
    switch (status) {
      case ProviderApplicationStatus.PENDING:
        return 'pending'
      case ProviderApplicationStatus.INFO_REQUESTED:
        return 'info_requested'
      case ProviderApplicationStatus.APPROVED:
        return 'approved'
      case ProviderApplicationStatus.REJECTED:
        return 'rejected'
    }
  }

  private mapPayoutMethod(method: RegisterSpDto['payoutMethod']['method']) {
    switch (method) {
      case 'mpesa':
        return ProviderPayoutMethod.MPESA
      case 'bank':
        return ProviderPayoutMethod.BANK
      case 'mobile_money':
        return ProviderPayoutMethod.MOBILE_MONEY
    }
  }

  private mapDocumentKind(kind: RegisterSpDto['documents'][number]['kind']) {
    switch (kind) {
      case 'logo':
        return ProviderApplicationDocumentKind.LOGO
      case 'license':
        return ProviderApplicationDocumentKind.LICENSE
      case 'supporting':
        return ProviderApplicationDocumentKind.SUPPORTING
      case 'invoice_pdf':
        return ProviderApplicationDocumentKind.INVOICE_PDF
    }
  }

  private buildPayoutSummary(dto: RegisterSpDto) {
    if (dto.payoutMethod.summary?.trim()) {
      return dto.payoutMethod.summary.trim()
    }

    if (dto.payoutMethod.method === 'mpesa') {
      return `M-Pesa ${dto.payoutMethod.accountNumber ?? ''}`.trim()
    }

    if (dto.payoutMethod.method === 'mobile_money') {
      return `Mobile Money ${dto.payoutMethod.accountNumber ?? ''}`.trim()
    }

    return [dto.payoutMethod.bankName, dto.payoutMethod.accountNumber].filter(Boolean).join(' ')
  }

  private getSessionLabel(role: 'patient' | 'sp' | 'admin') {
    switch (role) {
      case 'patient':
        return 'Patient portal session'
      case 'sp':
        return 'Provider portal session'
      case 'admin':
        return 'Admin portal session'
    }
  }
}
