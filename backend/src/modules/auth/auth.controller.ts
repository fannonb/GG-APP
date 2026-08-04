import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common'
import { Public } from '../../common/decorators/public.decorator'
import { AuthService } from './auth.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { GoogleAuthDto } from './dto/google-auth.dto'
import { LoginDto } from './dto/login.dto'
import { LogoutDto } from './dto/logout.dto'
import { RefreshSessionDto } from './dto/refresh-session.dto'
import { RegisterPatientDto } from './dto/register-patient.dto'
import { RegisterSpDto } from './dto/register-sp.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'

@Controller('auth')
export class AuthController {
  private readonly authService: AuthService

  constructor(@Inject(AuthService) authService: AuthService) {
    this.authService = authService
  }

  @Public()
  @Post('register/patient')
  registerPatient(@Body() dto: RegisterPatientDto) {
    return this.authService.registerPatient(dto)
  }

  @Public()
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
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Public()
  @Post('google')
  loginWithGoogle(@Body() dto: GoogleAuthDto) {
    return this.authService.loginWithGoogle(dto)
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password)
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshSessionDto) {
    return this.authService.refresh(dto.refreshToken)
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken)
  }
}
