import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { SpService } from './sp.service'
import { CreateProviderVisitDto } from './dto/create-provider-visit.dto'
import { UpsertProviderPayoutAccountDto } from './dto/provider-payout-account.dto'
import { UpdateProviderProfileDto } from './dto/provider-profile.dto'
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto'
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto'
import {
  ChangeProviderPasswordDto,
  UpdateProviderNotificationPrefsDto,
} from './dto/provider-settings.dto'
import { UpsertInvoiceDto } from './dto/upsert-invoice.dto'
import { QuotePrescriptionRequestDto } from './dto/quote-prescription-request.dto'
import { RejectPrescriptionRequestDto } from './dto/reject-prescription-request.dto'
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SP)
@Controller('sp')
export class SpController {
  private readonly spService: SpService

  constructor(@Inject(SpService) spService: SpService) {
    this.spService = spService
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getDashboard(user.sub)
  }

  @Get('appointments')
  getAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getAppointments(user.sub)
  }

  @Get('appointments/:id')
  getAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') appointmentId: string,
  ) {
    return this.spService.getAppointment(user.sub, appointmentId)
  }

  @Patch('appointments/:id/status')
  updateAppointmentStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') appointmentId: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.spService.updateAppointmentStatus(user.sub, appointmentId, dto)
  }

  @Patch('appointments/:id/reschedule')
  rescheduleAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') appointmentId: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.spService.rescheduleAppointment(user.sub, appointmentId, dto)
  }

  @Get('patients')
  getPatients(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getPatients(user.sub)
  }

  @Get('patients/:id')
  getPatient(@CurrentUser() user: AuthenticatedUser, @Param('id') patientId: string) {
    return this.spService.getPatient(user.sub, patientId)
  }

  @Get('visits')
  getVisits(@CurrentUser() user: AuthenticatedUser, @Query('patientId') patientId?: string) {
    return this.spService.getVisits(user.sub, patientId)
  }

  @Post('visits')
  createVisit(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProviderVisitDto) {
    return this.spService.createVisit(user.sub, dto)
  }

  @Get('invoices')
  getInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getInvoices(user.sub)
  }

  @Get('invoices/next-reference')
  getNextInvoiceReference(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getNextInvoiceReference(user.sub)
  }

  @Get('invoices/:id')
  getInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceReference: string,
  ) {
    return this.spService.getInvoice(user.sub, invoiceReference)
  }

  @Get('invoices/:id/attachment')
  getInvoiceAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceReference: string,
  ) {
    return this.spService.getInvoiceAttachment(user.sub, invoiceReference)
  }

  @Post('invoices')
  createInvoice(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertInvoiceDto) {
    return this.spService.createInvoice(user.sub, dto)
  }

  @Patch('invoices/:id')
  updateInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceReference: string,
    @Body() dto: UpsertInvoiceDto,
  ) {
    return this.spService.updateInvoice(user.sub, invoiceReference, dto)
  }

  @Get('payments')
  getPayments(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getPayments(user.sub)
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getNotifications(user.sub)
  }

  @Post('notifications/:id/read')
  markNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') notificationId: string,
  ) {
    return this.spService.markNotificationRead(user.sub, notificationId)
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getProfile(user.sub)
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProviderProfileDto) {
    return this.spService.updateProfile(user.sub, dto)
  }

  @Get('settings')
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getSettings(user.sub)
  }

  @Patch('settings/notifications')
  updateNotificationPrefs(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProviderNotificationPrefsDto,
  ) {
    return this.spService.updateNotificationPreferences(user.sub, dto)
  }

  @Patch('settings/security/password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangeProviderPasswordDto,
  ) {
    return this.spService.changePassword(user.sub, dto)
  }

  @Get('settings/sessions')
  getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getSessions(user.sub)
  }

  @Post('settings/sessions/:id/revoke')
  revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id') sessionId: string) {
    return this.spService.revokeSession(user.sub, sessionId)
  }

  @Get('payout-accounts')
  getPayoutAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getPayoutAccounts(user.sub)
  }

  @Post('payout-accounts')
  createPayoutAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertProviderPayoutAccountDto,
  ) {
    return this.spService.createPayoutAccount(user.sub, dto)
  }

  @Patch('payout-accounts/:id')
  updatePayoutAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') payoutAccountId: string,
    @Body() dto: UpsertProviderPayoutAccountDto,
  ) {
    return this.spService.updatePayoutAccount(user.sub, payoutAccountId, dto)
  }

  @Post('payout-accounts/:id/set-default')
  setDefaultPayoutAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') payoutAccountId: string,
  ) {
    return this.spService.setDefaultPayoutAccount(user.sub, payoutAccountId)
  }

  @Delete('payout-accounts/:id')
  deletePayoutAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') payoutAccountId: string,
  ) {
    return this.spService.deletePayoutAccount(user.sub, payoutAccountId)
  }

  @Get('prescription-requests')
  getPrescriptionRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.spService.getPrescriptionRequests(user.sub)
  }

  @Get('prescription-requests/:id')
  getPrescriptionRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestReference: string,
  ) {
    return this.spService.getPrescriptionRequest(user.sub, requestReference)
  }

  @Patch('prescription-requests/:id/quote')
  quotePrescriptionRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestReference: string,
    @Body() dto: QuotePrescriptionRequestDto,
  ) {
    return this.spService.quotePrescriptionRequest(user.sub, requestReference, dto)
  }

  @Patch('prescription-requests/:id/reject')
  rejectPrescriptionRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestReference: string,
    @Body() dto: RejectPrescriptionRequestDto,
  ) {
    return this.spService.rejectPrescriptionRequest(user.sub, requestReference, dto)
  }

  @Patch('prescription-requests/:id/ready')
  markPrescriptionReady(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestReference: string,
  ) {
    return this.spService.markPrescriptionReady(user.sub, requestReference)
  }

  @Patch('prescription-requests/:id/fulfill')
  fulfillPrescriptionRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestReference: string,
  ) {
    return this.spService.fulfillPrescriptionRequest(user.sub, requestReference)
  }
}
