import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { AdminService } from './admin.service'
import { GetAdminActivityQueryDto } from './dto/get-admin-activity-query.dto'
import { GetAdminPaymentsQueryDto } from './dto/get-admin-payments-query.dto'
import { ProviderApplicationActionDto } from './dto/provider-application-action.dto'
import { CreditApplicationActionDto } from './dto/credit-application-action.dto'
import { CreateNewsArticleDto, UpdateNewsArticleDto } from './dto/news-article.dto'
import { GetAdminLedgerAccessQueryDto } from '../ledger/dto/ledger-query.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  private readonly adminService: AdminService

  constructor(@Inject(AdminService) adminService: AdminService) {
    this.adminService = adminService
  }

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard()
  }

  @Get('news')
  getNews() {
    return this.adminService.getNews()
  }

  @Post('news')
  createNews(@Body() dto: CreateNewsArticleDto) {
    return this.adminService.createNews(dto)
  }

  @Patch('news/:id')
  updateNews(@Param('id') articleId: string, @Body() dto: UpdateNewsArticleDto) {
    return this.adminService.updateNews(articleId, dto)
  }

  @Delete('news/:id')
  archiveNews(@Param('id') articleId: string) {
    return this.adminService.archiveNews(articleId)
  }

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getAnalytics()
  }

  @Get('applications')
  getApplications() {
    return this.adminService.getApplications()
  }

  @Get('applications/:id')
  getApplication(@Param('id') applicationId: string) {
    return this.adminService.getApplication(applicationId)
  }

  @Post('applications/:id/approve')
  approveApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() dto: ProviderApplicationActionDto,
  ) {
    return this.adminService.approveApplication(user.sub, applicationId, dto.note)
  }

  @Post('applications/:id/request-info')
  requestInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() dto: ProviderApplicationActionDto,
  ) {
    return this.adminService.requestInfo(user.sub, applicationId, dto.note)
  }

  @Post('applications/:id/reject')
  rejectApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() dto: ProviderApplicationActionDto,
  ) {
    return this.adminService.rejectApplication(user.sub, applicationId, dto.note)
  }

  @Get('providers')
  getProviders() {
    return this.adminService.getProviders()
  }

  @Get('users')
  getUsers() {
    return this.adminService.getUsers()
  }

  @Get('users/:id')
  getUser(@Param('id') userId: string) {
    return this.adminService.getUser(userId)
  }

  @Get('users/:id/national-id')
  revealUserNationalId(@Param('id') userId: string) {
    return this.adminService.revealUserNationalId(userId)
  }

  @Get('providers/:id')
  getProvider(@Param('id') providerId: string) {
    return this.adminService.getProvider(providerId)
  }

  @Post('users/:id/suspend')
  suspendUser(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string) {
    return this.adminService.suspendUser(user.sub, userId)
  }

  @Post('users/:id/reactivate')
  reactivateUser(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string) {
    return this.adminService.reactivateUser(user.sub, userId)
  }

  @Delete('users/:id')
  deleteUser(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string) {
    return this.adminService.deleteUser(user.sub, userId)
  }

  @Post('providers/:id/suspend')
  suspendProvider(@CurrentUser() user: AuthenticatedUser, @Param('id') providerId: string) {
    return this.adminService.suspendProvider(user.sub, providerId)
  }

  @Post('providers/:id/reactivate')
  reactivateProvider(@CurrentUser() user: AuthenticatedUser, @Param('id') providerId: string) {
    return this.adminService.reactivateProvider(user.sub, providerId)
  }

  @Delete('providers/:id')
  deleteProvider(@CurrentUser() user: AuthenticatedUser, @Param('id') providerId: string) {
    return this.adminService.deleteProvider(user.sub, providerId)
  }

  @Get('activity')
  getRecentActivity(@Query() query: GetAdminActivityQueryDto) {
    return this.adminService.getRecentActivity(query)
  }

  @Get('payments')
  getPayments(@Query() query: GetAdminPaymentsQueryDto) {
    return this.adminService.getPayments(query)
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.getNotifications(user.sub)
  }

  @Post('notifications/:id/read')
  markNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') notificationId: string,
  ) {
    return this.adminService.markNotificationRead(user.sub, notificationId)
  }

  @Get('credit-applications')
  getCreditApplications() {
    return this.adminService.getCreditApplications()
  }

  @Get('credit-applications/:id')
  getCreditApplication(@Param('id') applicationId: string) {
    return this.adminService.getCreditApplication(applicationId)
  }

  @Post('credit-applications/:id/approve')
  approveCreditApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() dto: CreditApplicationActionDto,
  ) {
    return this.adminService.approveCreditApplication(user.sub, applicationId, dto)
  }

  @Get('ledger-access')
  getLedgerAccess(@Query() query: GetAdminLedgerAccessQueryDto) {
    return this.adminService.getLedgerAccess(query)
  }

  @Post('credit-applications/:id/reject')
  rejectCreditApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') applicationId: string,
    @Body() dto: CreditApplicationActionDto,
  ) {
    return this.adminService.rejectCreditApplication(user.sub, applicationId, dto)
  }
}
