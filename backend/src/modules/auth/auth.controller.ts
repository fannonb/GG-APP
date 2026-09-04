import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import {
  clearRefreshCookie,
  getRefreshCookie,
  setRefreshCookie,
} from '../../common/utils/session-cookie.util'
import { parseDurationToSeconds } from '../../common/utils/duration.util'
import { AuthService, type SessionContext } from './auth.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { GoogleAuthDto } from './dto/google-auth.dto'
import { LoginDto } from './dto/login.dto'
import { LogoutDto } from './dto/logout.dto'
import { RefreshSessionDto } from './dto/refresh-session.dto'
import { RegisterPatientDto } from './dto/register-patient.dto'
import { RegisterSpDto } from './dto/register-sp.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import type { AuthSessionResponse } from './auth.types'

@Controller('auth')
export class AuthController {
  private readonly authService: AuthService
  private readonly configService: ConfigService

  constructor(
    @Inject(AuthService) authService: AuthService,
    @Inject(ConfigService) configService: ConfigService,
  ) {
    this.authService = authService
    this.configService = configService
  }

  private sessionCtx(req: Request): SessionContext {
    return {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }
  }

  /**
   * Web clients identify themselves with `X-Client: web`. When cookie mode is
   * enabled they receive the refresh token in an httpOnly SameSite=Lax cookie
   * instead of the JSON body — the 30-day session handle never touches
   * localStorage. Native clients (no `X-Client`) keep body-returned tokens.
   */
  private isWebCookieSession(req: Request): boolean {
    if (req.headers['x-client'] !== 'web') return false
    return this.configService.get<boolean>('auth.cookieMode') === true
  }

  private writeCookieSession(
    res: Response,
    session: AuthSessionResponse,
  ): AuthSessionResponse {
    const refreshTtl = this.configService.getOrThrow<string>(
      session.role === 'admin' ? 'auth.adminRefreshTtl' : 'auth.refreshTtl',
    )
    setRefreshCookie(res, session.refreshToken, {
      maxAgeSeconds: parseDurationToSeconds(refreshTtl),
      secure: this.configService.get<string>('app.nodeEnv') === 'production',
    })
    return { ...session, refreshToken: '', cookieSession: true }
  }

  private refreshTokenFrom(req: Request, cookieMode: boolean, bodyToken?: string) {
    // Cookie mode prefers the httpOnly cookie but falls back to the body token
    // for legacy sessions minted before cookie mode shipped — their first
    // refresh rotates into the cookie and the body token is dropped client-side.
    if (cookieMode) return getRefreshCookie(req) ?? bodyToken
    return bodyToken
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('register/patient')
  async registerPatient(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RegisterPatientDto,
  ) {
    const result = await this.authService.registerPatient(dto, this.sessionCtx(req))
    const cookieMode = this.isWebCookieSession(req)
    if (result.session) {
      return {
        ...result,
        session: cookieMode ? this.writeCookieSession(res, result.session) : result.session,
      }
    }
    return result
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('register/sp')
  registerSp(@Body() dto: RegisterSpDto) {
    return this.authService.registerSp(dto)
  }

  @Public()
  @Get('register/sp/:applicationId/status')
  getSpRegistrationStatus(@Param('applicationId') applicationId: string) {
    return this.authService.getProviderApplicationStatus(applicationId)
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token)
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    const session = await this.authService.login(dto, this.sessionCtx(req))
    return this.isWebCookieSession(req) ? this.writeCookieSession(res, session) : session
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('google')
  async loginWithGoogle(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: GoogleAuthDto,
  ) {
    const result = await this.authService.loginWithGoogle(dto, this.sessionCtx(req))
    const cookieMode = this.isWebCookieSession(req)
    if ('needsRegistration' in result && result.needsRegistration) return result
    return cookieMode ? this.writeCookieSession(res, result) : result
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password)
  }

  // Generous enough for multi-tab refresh bursts, tight enough to stop
  // brute-forcing refresh tokens (120/min globally was far too loose).
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RefreshSessionDto,
  ) {
    const cookieMode = this.isWebCookieSession(req)
    const refreshToken = this.refreshTokenFrom(req, cookieMode, dto.refreshToken)
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh session has expired')
    }
    const session = await this.authService.refresh(refreshToken, this.sessionCtx(req))
    return cookieMode ? this.writeCookieSession(res, session) : session
  }

  // Requires a live access token so a caller holding only a stolen refresh
  // token cannot destroy the victim's session (audit L8).
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LogoutDto,
  ) {
    const cookieMode = this.isWebCookieSession(req)
    if (cookieMode) {
      clearRefreshCookie(res)
    }
    const refreshToken = this.refreshTokenFrom(req, cookieMode, dto.refreshToken)
    return this.authService.logout(
      { sub: user.sub, jti: user.jti },
      refreshToken ?? undefined,
    )
  }

  /** Active sessions for the signed-in user (any role) — previously only SP
   * had a sessions endpoint, so patients/admins could not manage their own. */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getMySessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listSessions(user.sub, user.jti)
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:id/revoke')
  revokeMySession(@CurrentUser() user: AuthenticatedUser, @Param('id') sessionId: string) {
    return this.authService.revokeSession(user.sub, sessionId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke-all')
  revokeAllSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.revokeAllSessions(user.sub)
  }
}
