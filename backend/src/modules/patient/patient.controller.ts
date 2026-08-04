import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { AuthorizeInvoiceDto } from './dto/authorize-invoice.dto'
import { CancelAppointmentDto } from './dto/cancel-appointment.dto'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { SetupPaymentPinDto } from './dto/setup-payment-pin.dto'
import { ChangePatientPasswordDto } from './dto/change-patient-password.dto'
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto'
import { UpsertBeneficiaryDto } from './dto/upsert-beneficiary.dto'
import { SetBeneficiariesEnabledDto } from './dto/set-beneficiaries-enabled.dto'
import { RejectInvoiceDto } from './dto/reject-invoice.dto'
import { SubmitReviewDto } from './dto/submit-review.dto'
import { ApplyCreditDto } from './dto/apply-credit.dto'
import { IncreaseCreditDto } from './dto/increase-credit.dto'
import { CreatePrescriptionRequestDto } from './dto/create-prescription-request.dto'
import { DeclinePrescriptionRequestDto } from './dto/decline-prescription-request.dto'
import { PatientService } from './patient.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PATIENT)
@Controller('patient')
export class PatientController {
  private readonly patientService: PatientService

  constructor(@Inject(PatientService) patientService: PatientService) {
    this.patientService = patientService
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getProfile(user.sub)
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientService.updateProfile(user.sub, dto)
  }

  @Post('security/payment-pin')
  setupPaymentPin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetupPaymentPinDto,
  ) {
    return this.patientService.setupPaymentPin(user.sub, dto)
  }

  @Patch('security/password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePatientPasswordDto,
  ) {
    return this.patientService.changePassword(user.sub, dto)
  }

  @Patch('beneficiaries/enabled')
  setBeneficiariesEnabled(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetBeneficiariesEnabledDto,
  ) {
    return this.patientService.setBeneficiariesEnabled(user.sub, dto)
  }

  @Post('beneficiaries')
  createBeneficiary(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertBeneficiaryDto,
  ) {
    return this.patientService.createBeneficiary(user.sub, dto)
  }

  @Patch('beneficiaries/:id')
  updateBeneficiary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') beneficiaryId: string,
    @Body() dto: UpsertBeneficiaryDto,
  ) {
    return this.patientService.updateBeneficiary(user.sub, beneficiaryId, dto)
  }

  @Delete('beneficiaries/:id')
  deleteBeneficiary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') beneficiaryId: string,
  ) {
    return this.patientService.deleteBeneficiary(user.sub, beneficiaryId)
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getDashboard(user.sub)
  }

  @Get('appointments')
  getAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getAppointments(user.sub)
  }

  @Get('appointments/:id/rebook')
  getRebookContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') appointmentId: string,
  ) {
    return this.patientService.getRebookContext(user.sub, appointmentId)
  }

  @Post('appointments')
  createAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.patientService.createAppointment(user.sub, dto)
  }

  @Patch('appointments/:id/cancel')
  cancelAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') appointmentId: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.patientService.cancelAppointment(user.sub, appointmentId, dto)
  }

  @Patch('appointments/:id/confirm-reschedule')
  confirmRescheduledAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') appointmentId: string,
  ) {
    return this.patientService.confirmRescheduledAppointment(user.sub, appointmentId)
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getTransactions(user.sub)
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getNotifications(user.sub)
  }

  @Post('notifications/:id/read')
  markNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') notificationId: string,
  ) {
    return this.patientService.markNotificationRead(user.sub, notificationId)
  }

  @Get('news')
  getNews() {
    return this.patientService.getNews()
  }

  @Get('invoices')
  getInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getInvoices(user.sub)
  }

  @Get('invoices/:id')
  getInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceReference: string,
  ) {
    return this.patientService.getInvoice(user.sub, invoiceReference)
  }

  @Get('invoices/:id/attachment')
  getInvoiceAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceReference: string,
  ) {
    return this.patientService.getInvoiceAttachment(user.sub, invoiceReference)
  }

  @Post('invoices/:id/authorize')
  authorizeInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceReference: string,
    @Body() dto: AuthorizeInvoiceDto,
  ) {
    return this.patientService.authorizeInvoice(user.sub, invoiceReference, dto)
  }

  @Post('invoices/:id/reject')
  rejectInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceReference: string,
    @Body() dto: RejectInvoiceDto,
  ) {
    return this.patientService.rejectInvoice(user.sub, invoiceReference, dto)
  }

  @Post('reviews')
  submitReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.patientService.submitReview(user.sub, dto)
  }

  @Post('credit/apply')
  applyCredit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyCreditDto,
  ) {
    return this.patientService.applyCredit(user.sub, dto)
  }

  @Post('credit/increase')
  increaseCredit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: IncreaseCreditDto,
  ) {
    return this.patientService.increaseCredit(user.sub, dto)
  }

  @Get('credit/status')
  getCreditStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getCreditStatus(user.sub)
  }

  @Post('prescription-requests')
  createPrescriptionRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePrescriptionRequestDto,
  ) {
    return this.patientService.createPrescriptionRequest(user.sub, dto)
  }

  @Get('prescription-requests')
  getPrescriptionRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getPrescriptionRequests(user.sub)
  }

  @Patch('prescription-requests/:id/review')
  markPrescriptionQuoteReviewed(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.patientService.markPrescriptionQuoteReviewed(user.sub, id)
  }

  @Patch('prescription-requests/:id/accept')
  acceptPrescriptionQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.patientService.acceptPrescriptionQuote(user.sub, id)
  }

  @Patch('prescription-requests/:id/decline')
  declinePrescriptionQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DeclinePrescriptionRequestDto,
  ) {
    return this.patientService.declinePrescriptionQuote(user.sub, id, dto)
  }
}
