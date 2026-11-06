import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  InvoiceStatus,
  Prisma,
  PrescriptionFulfillmentMode,
  ServiceForType,
} from '@prisma/client'
import { ReferenceService } from './reference.service'

type QuotedItem = { name: string; quantity?: string; unitPrice?: number }

/**
 * Issues the GG'APP invoice for a prescription as soon as the patient chooses the pharmacy's quote.
 * The invoice is built from the quote the same way the old pharmacy upload was, but no attachment
 * is needed and it goes straight to the patient for PIN approval.
 */
@Injectable()
export class PrescriptionInvoiceService {
  constructor(@Inject(ReferenceService) private readonly referenceService: ReferenceService) {}

  /** Creates the invoice for a prescription whose quote the patient just approved. Idempotent: returns the existing live invoice if there is one. */
  async createForPrescription(
    tx: Prisma.TransactionClient,
    requestId: string,
  ): Promise<{ id: string; reference: string; amount: number }> {
    const request = await tx.prescriptionRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: { include: { patientProfile: true } },
        beneficiary: true,
      },
    })

    if (!request) {
      throw new NotFoundException('Prescription request not found')
    }

    const providerId = request.providerId
    if (providerId == null) {
      throw new BadRequestException('Choose a pharmacy before invoicing this prescription')
    }

    const quotedAmount = request.quotedAmount
    if (quotedAmount == null) {
      throw new BadRequestException('Pharmacy quote is required before invoicing this prescription')
    }

    const patientProfile = request.patient.patientProfile
    if (!patientProfile) {
      throw new BadRequestException('Patient profile is required before invoicing this prescription')
    }

    const existingInvoice = await tx.invoice.findFirst({
      where: {
        prescriptionRequestId: request.id,
        status: { notIn: [InvoiceStatus.REJECTED, InvoiceStatus.DISPUTED] },
      },
      select: { id: true, reference: true, amount: true },
    })

    if (existingInvoice) {
      return {
        id: existingInvoice.id,
        reference: existingInvoice.reference,
        amount: Number(existingInvoice.amount),
      }
    }

    const reference = await this.referenceService.next('INV', tx)

    const quotedItems = Array.isArray(request.quotedItems)
      ? (request.quotedItems as QuotedItem[])
      : []
    const itemsSubtotal = Number(quotedAmount)
    const deliveryFee =
      request.fulfillmentMode === PrescriptionFulfillmentMode.DELIVERY && request.deliveryFee != null
        ? Number(request.deliveryFee)
        : 0
    const amount = Number((itemsSubtotal + deliveryFee).toFixed(2))

    const lineItems = [
      ...quotedItems.map(item => {
        const qty = Number.parseFloat(item.quantity || '1') || 1
        const unit = item.unitPrice ?? 0
        return {
          name: `${item.name}${qty !== 1 ? ` × ${qty}` : ''}`,
          amount: Number((unit * qty).toFixed(2)),
        }
      }),
      ...(deliveryFee > 0 ? [{ name: 'Delivery fee', amount: Number(deliveryFee.toFixed(2)) }] : []),
    ]

    // Ensure line items sum to invoice amount (adjust first line if rounding drift)
    const lineSum = lineItems.reduce((sum, item) => sum + item.amount, 0)
    if (lineItems.length > 0 && Math.abs(lineSum - amount) >= 0.01) {
      lineItems[0].amount = Number((lineItems[0].amount + (amount - lineSum)).toFixed(2))
    }

    const now = new Date()
    const patientName = `${patientProfile.firstName} ${patientProfile.lastName}`.trim()

    const created = await tx.invoice.create({
      data: {
        reference,
        patientUserId: request.patientUserId,
        providerId,
        prescriptionRequestId: request.id,
        status: InvoiceStatus.PENDING_AUTH,
        issueDate: now,
        dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
        amount,
        billedToName: patientName,
        billedToNationalId: patientProfile.nationalIdLast4
          ? `****${patientProfile.nationalIdLast4}`
          : '****',
        serviceForType: request.forSelf ? ServiceForType.SELF : ServiceForType.BENEFICIARY,
        serviceForName: request.forSelf
          ? patientName
          : request.beneficiary?.name ?? 'Beneficiary',
        serviceForRelation: request.beneficiary?.relation ?? null,
        serviceForAge: request.beneficiary ? this.getAge(request.beneficiary.dateOfBirth) : null,
        submittedAt: now,
        treatment: quotedItems.map(item => item.name).join(', ') || 'Prescription fulfillment',
        internalNote: request.pharmacyNotes,
        attachment: null,
        attachmentMetadata: Prisma.JsonNull,
        lineItems: {
          create: lineItems.length > 0 ? lineItems : [{ name: 'Prescription fulfillment', amount }],
        },
      },
      select: { id: true, reference: true, amount: true },
    })

    return { id: created.id, reference: created.reference, amount: Number(created.amount) }
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
}
