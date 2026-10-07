import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { AdminService } from './admin.service'
import { AdminMetricsService } from './admin-metrics.service'
import { AdminAccountsService } from './admin-accounts.service'
import { AdminCreditLimitDto, AdminDecisionDto, AdminReasonDto, RecordPayoutDto, UpdateAdminPatientDto, UpdateAdminProviderDto } from './dto/admin-accounts.dto'
import { AdminPayoutsService } from './admin-payouts.service'
import { GetAdminActivityQueryDto } from './dto/get-admin-activity-query.dto'
import { GetAdminPaymentsQueryDto } from './dto/get-admin-payments-query.dto'
import { ProviderApplicationActionDto } from './dto/provider-application-action.dto'
import { CreditApplicationActionDto } from './dto/credit-application-action.dto'
import { CreateNewsArticleDto, NewsStatusDto, UpdateNewsArticleDto } from './dto/news-article.dto'
import { CreateNewsCategoryDto } from './dto/news-category.dto'
import { GetAdminLedgerAccessQueryDto } from '../ledger/dto/ledger-query.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  private readonly adminService: AdminService
  private readonly metrics: AdminMetricsService
  private readonly accounts: AdminAccountsService

  constructor(
    @Inject(AdminService) adminService: AdminService,
    @Inject(AdminMetricsService) metrics: AdminMetricsService,
    @Inject(AdminAccountsService) accounts: AdminAccountsService,
    @Inject(AdminPayoutsService) private readonly payouts: AdminPayoutsService,
  ) {
    this.adminService = adminService
    this.metrics = metrics
    this.accounts = accounts
  }

  // Analytics pages: ?country=KE|ZW|ZM|all&range=7d|30d|90d|12m
  @Get('metrics/overview')
  metricsOverview(@Query('country') country?: string, @Query('range') range?: string) {
    return this.metrics.overview(country, range)
  }

  @Get('metrics/money')
  metricsMoney(@Query('country') country?: string, @Query('range') range?: string) {
    return this.metrics.money(country, range)
  }

  @Get('metrics/patients')
  metricsPatients(@Query('country') country?: string, @Query('range') range?: string) {
    return this.metrics.patients(country, range)
  }

  @Get('metrics/activity')
  metricsActivity(@Query('country') country?: string, @Query('range') range?: string) {
    return this.metrics.activity(country, range)
  }

  @Get('metrics/providers')
  metricsProviders(@Query('country') country?: string, @Query('range') range?: string) {
    return this.metrics.providers(country, range)
  }

  @Get('metrics/health')
  metricsHealth(@Query('country') country?: string, @Query('range') range?: string) {
    return this.metrics.health(country, range)
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

  @Patch('news/:id/status')
  setNewsStatus(@Param('id') articleId: string, @Body() dto: NewsStatusDto) {
    return this.adminService.setNewsStatus(articleId, dto.status)
  }

  @Delete('news/:id/permanent')
  deleteNews(@Param('id') articleId: string) {
    return this.adminService.deleteNews(articleId)
  }

  @Get('news/categories')
  getNewsCategories() {
    return this.adminService.getNewsCategories()
  }

  @Post('news/categories')
  createNewsCategory(@Body() dto: CreateNewsCategoryDto) {
    return this.adminService.createNewsCategory(dto)
  }

  @Delete('news/categories/:id')
  deleteNewsCategory(@Param('id') categoryId: string) {
    return this.adminService.deleteNewsCategory(Number(categoryId))
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

  @Patch('users/:id')
  updateUser(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string, @Body() dto: UpdateAdminPatientDto) {
    return this.accounts.updatePatient(user.sub, userId, dto)
  }

  @Post('users/:id/credit-limit')
  setCreditLimit(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string, @Body() dto: AdminCreditLimitDto) {
    return this.accounts.setCreditLimit(user.sub, userId, dto.limit, dto.reason)
  }

  @Post('users/:id/suspend')
  suspendUser(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string, @Body() dto: AdminReasonDto) {
    return this.accounts.suspendPatient(user.sub, userId, dto.reason)
  }

  @Post('users/:id/reactivate')
  reactivateUser(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string) {
    return this.accounts.reactivatePatient(user.sub, userId)
  }

  @Post('users/:id/sign-out-all')
  signOutUser(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string) {
    return this.accounts.signOutAll(user.sub, userId, 'User', userId)
  }

  @Post('users/:id/password-reset')
  resetUserPassword(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string) {
    return this.accounts.sendPasswordReset(user.sub, userId, 'User', userId)
  }

  @Post('users/:id/resend-verification')
  resendUserVerification(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string) {
    return this.accounts.resendVerification(user.sub, userId, 'User', userId)
  }

  @Get('users/:id/history')
  userHistory(@Param('id') userId: string) {
    return this.accounts.history('User', userId)
  }

  @Get('users/:id/credit-activity')
  userCreditActivity(@Param('id') userId: string) {
    return this.accounts.creditActivity(userId)
  }

  @Delete('users/:id')
  deleteUser(@CurrentUser() user: AuthenticatedUser, @Param('id') userId: string) {
    return this.adminService.deleteUser(user.sub, userId)
  }

  @Patch('providers/:id')
  updateProvider(@CurrentUser() user: AuthenticatedUser, @Param('id') providerId: string, @Body() dto: UpdateAdminProviderDto) {
    return this.accounts.updateProvider(user.sub, providerId, dto)
  }

  @Post('providers/:id/suspend')
  suspendProvider(@CurrentUser() user: AuthenticatedUser, @Param('id') providerId: string, @Body() dto: AdminReasonDto) {
    return this.accounts.suspendProvider(user.sub, providerId, dto.reason)
  }

  @Post('providers/:id/reactivate')
  reactivateProvider(@CurrentUser() user: AuthenticatedUser, @Param('id') providerId: string) {
    return this.accounts.reactivateProvider(user.sub, providerId)
  }

  @Post('providers/:id/sign-out-all')
  async signOutProvider(@CurrentUser() user: AuthenticatedUser, @Param('id') providerId: string) {
    return this.accounts.signOutAll(user.sub, await this.accounts.providerUserId(providerId), 'Provider', providerId)
  }

  @Post('providers/:id/password-reset')
  async resetProviderPassword(@CurrentUser() user: AuthenticatedUser, @Param('id') providerId: string) {
    return this.accounts.sendPasswordReset(user.sub, await this.accounts.providerUserId(providerId), 'Provider', providerId)
  }

  @Get('providers/:id/history')
  async providerHistory(@Param('id') providerId: string) {
    const userId = await this.accounts.providerUserId(providerId).catch(() => undefined)
    return this.accounts.history('Provider', providerId, userId)
  }

  // Payout desk: ?tab=to_pay|paid|waiting|disputed|rejected&country&range&q&providerId&page&pageSize
  @Get('payouts/invoices')
  payoutInvoices(@Query() query: Record<string, string>) {
    return this.payouts.list(query)
  }

  @Get('payouts/summary')
  payoutSummary(@Query('country') country?: string, @Query('range') range?: string) {
    return this.payouts.summary(country, range)
  }

  @Get('payouts/by-provider')
  payoutsByProvider(@Query('country') country?: string) {
    return this.payouts.owedByProvider(country)
  }

  @Get('payouts/invoices/:id')
  payoutInvoice(@Param('id') id: string) {
    return this.payouts.detail(id)
  }

  @Post('payouts/record')
  recordPayout(@CurrentUser() user: AuthenticatedUser, @Body() dto: RecordPayoutDto) {
    return this.payouts.recordManual(user.sub, dto)
  }

  @Get('email-changes')
  listEmailChanges(@Query('status') status?: string) {
    return this.accounts.listEmailChanges(status)
  }

  @Post('email-changes/:id/approve')
  approveEmailChange(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdminDecisionDto) {
    return this.accounts.decideEmailChange(user.sub, id, true, dto.note)
  }

  @Post('email-changes/:id/reject')
  rejectEmailChange(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdminDecisionDto) {
    return this.accounts.decideEmailChange(user.sub, id, false, dto.note)
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
