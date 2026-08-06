import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

export interface MailMessage {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export interface InvoiceIssuedEmailData {
  patientName: string
  providerName: string
  reference: string
  amount: string
}

export interface AppointmentEmailData {
  patientName: string
  providerName: string
  date: string
  time: string
}

export interface PrescriptionQuoteEmailData {
  patientName: string
  providerName: string
  reference: string
}

export interface CreditDecisionEmailData {
  patientName: string
  approved: boolean
  amount?: string
  note?: string
}

export interface ProviderApplicationEmailData {
  practiceName: string
  note?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly client: Resend | null
  private readonly from: string
  private readonly appBaseUrl: string

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('notifications.resendApiKey') ?? ''
    this.from =
      configService.get<string>('notifications.emailFrom')?.trim() ||
      "GG'APP <no-reply@gatewayglobal.africa>"
    this.appBaseUrl = (
      configService.get<string>('app.appBaseUrl') || 'http://localhost:5173'
    ).replace(/\/$/, '')
    this.client = apiKey ? new Resend(apiKey) : null
    if (!this.client) {
      this.logger.warn(
        'Resend is not configured (RESEND_API_KEY missing) — transactional emails will be skipped.',
      )
    }
  }

  get isEnabled(): boolean {
    return this.client !== null
  }

  async send(message: MailMessage): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(
        `Email skipped (Resend not configured): "${message.subject}" -> ${message.to}`,
      )
      return false
    }

    try {
      const { error } = await this.client.emails.send({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        replyTo: message.replyTo,
      })

      if (error) {
        this.logger.error(
          `Resend failed for "${message.subject}" -> ${message.to}: ${error.message}`,
        )
        return false
      }

      this.logger.log(`Email sent: "${message.subject}" -> ${message.to}`)
      return true
    } catch (error) {
      this.logger.error(
        `Resend threw for "${message.subject}" -> ${message.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return false
    }
  }

  private layout(bodyHtml: string, cta?: { label: string; url: string }): string {
    const ctaHtml = cta
      ? `
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#011F4A;color:#ffffff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">
            ${escapeHtml(cta.label)}
          </a>
        </div>
        <p style="font-size:12px;color:#7A8CA6;text-align:center;margin-top:10px;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${escapeHtml(cta.url)}" style="color:#38B6FF;word-break:break-all;">${escapeHtml(cta.url)}</a>
        </p>`
      : ''

    return `
      <div style="background:#F4F7FB;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E3EAF3;">
          <div style="background:#011F4A;padding:22px 28px;">
            <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.2px;">GG'APP</div>
            <div style="color:#8FB7E0;font-size:11px;margin-top:2px;letter-spacing:0.08em;">Healthcare Access Platform</div>
          </div>
          <div style="padding:28px;color:#15243D;font-size:14px;line-height:1.65;">
            ${bodyHtml}
            ${ctaHtml}
          </div>
          <div style="padding:16px 28px;background:#F8FAFD;border-top:1px solid #E3EAF3;font-size:11px;color:#7A8CA6;line-height:1.6;">
            You received this email because you use GG'APP. If you didn't expect it, you can safely ignore this
            message.<br/>© ${new Date().getFullYear()} Gateway Global. <a href="${escapeHtml(this.appBaseUrl)}" style="color:#38B6FF;">${escapeHtml(this.appBaseUrl)}</a>
          </div>
        </div>
      </div>`
  }

  async sendVerificationEmail(to: string, token: string): Promise<boolean> {
    const url = `${this.appBaseUrl}/verify?token=${encodeURIComponent(token)}`
    return this.send({
      to,
      subject: "Verify your GG'APP email address",
      html: this.layout(
        `
        <p>Hi there,</p>
        <p>Thanks for creating a GG'APP account. Please confirm your email address to activate your account and
        start using the platform.</p>`,
        { label: 'Verify my email', url },
      ),
    })
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
    const url = `${this.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`
    return this.send({
      to,
      subject: "Reset your GG'APP password",
      html: this.layout(
        `
        <p>Hi there,</p>
        <p>We received a request to reset your GG'APP password. Click the button below to choose a new one.
        This link expires in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email — your password will stay the same.</p>`,
        { label: 'Reset password', url },
      ),
    })
  }

  async sendInvoiceIssuedEmail(to: string, data: InvoiceIssuedEmailData): Promise<boolean> {
    return this.send({
      to,
      subject: `New invoice ${data.reference} from ${data.providerName}`,
      html: this.layout(
        `
        <p>Hi ${escapeHtml(data.patientName)},</p>
        <p><strong>${escapeHtml(data.providerName)}</strong> has issued an invoice on GG'APP:</p>
        <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;">
          <tr><td style="padding:8px 10px;background:#F4F7FB;border-radius:6px 0 0 6px;color:#5B6B82;">Invoice</td>
              <td style="padding:8px 10px;font-weight:700;text-align:right;">${escapeHtml(data.reference)}</td></tr>
          <tr><td style="padding:8px 10px;color:#5B6B82;">Amount</td>
              <td style="padding:8px 10px;font-weight:700;text-align:right;">${escapeHtml(data.amount)}</td></tr>
        </table>
        <p>Sign in to review the invoice and authorize payment.</p>`,
        { label: 'Review invoice', url: `${this.appBaseUrl}/app/invoices` },
      ),
    })
  }

  async sendAppointmentRequestEmail(to: string, data: AppointmentEmailData): Promise<boolean> {
    return this.send({
      to,
      subject: `New appointment request from ${data.patientName}`,
      html: this.layout(
        `
        <p>Hi ${escapeHtml(data.providerName)},</p>
        <p>A patient has requested an appointment on GG'APP:</p>
        <p style="margin:14px 0;">
          Patient: <strong>${escapeHtml(data.patientName)}</strong><br/>
          Date: <strong>${escapeHtml(data.date)}</strong> at <strong>${escapeHtml(data.time)}</strong>
        </p>
        <p>Sign in to confirm or reschedule the appointment.</p>`,
        { label: 'View appointment', url: `${this.appBaseUrl}/app/sp/appointments` },
      ),
    })
  }

  async sendAppointmentConfirmationEmail(to: string, data: AppointmentEmailData): Promise<boolean> {
    return this.send({
      to,
      subject: 'Appointment confirmed on GG\u2019APP',
      html: this.layout(
        `
        <p>Hi ${escapeHtml(data.patientName)},</p>
        <p>Your appointment with <strong>${escapeHtml(data.providerName)}</strong> has been confirmed:</p>
        <p style="margin:14px 0;"><strong>${escapeHtml(data.date)}</strong> at <strong>${escapeHtml(data.time)}</strong></p>
        <p>You'll find the details in your appointments on GG'APP.</p>`,
        { label: 'View my appointments', url: `${this.appBaseUrl}/app/appointments` },
      ),
    })
  }

  async sendAppointmentRequestReceivedEmail(to: string, data: AppointmentEmailData): Promise<boolean> {
    return this.send({
      to,
      subject: 'Appointment request received',
      html: this.layout(
        `
        <p>Hi ${escapeHtml(data.patientName)},</p>
        <p>Your appointment request with <strong>${escapeHtml(data.providerName)}</strong> has been submitted:</p>
        <p style="margin:14px 0;"><strong>${escapeHtml(data.date)}</strong> at <strong>${escapeHtml(data.time)}</strong></p>
        <p>The provider will confirm the appointment shortly — we'll let you know as soon as they do.</p>`,
        { label: 'View my appointments', url: `${this.appBaseUrl}/app/appointments` },
      ),
    })
  }

  async sendPrescriptionQuoteReadyEmail(to: string, data: PrescriptionQuoteEmailData): Promise<boolean> {
    return this.send({
      to,
      subject: `Your prescription quote is ready (${data.reference})`,
      html: this.layout(
        `
        <p>Hi ${escapeHtml(data.patientName)},</p>
        <p><strong>${escapeHtml(data.providerName)}</strong> has reviewed your prescription request
        (<strong>${escapeHtml(data.reference)}</strong>) and a quote is ready for you to review and accept.</p>`,
        { label: 'Review quote', url: `${this.appBaseUrl}/app/prescriptions` },
      ),
    })
  }

  async sendCreditDecisionEmail(to: string, data: CreditDecisionEmailData): Promise<boolean> {
    const outcome = data.approved
      ? `Congratulations! Your GG'APP credit request${data.amount ? ` of <strong>${escapeHtml(data.amount)}</strong>` : ''} has been approved.`
      : 'Your GG\u2019APP credit request was not approved at this time.'
    return this.send({
      to,
      subject: data.approved ? 'Credit request approved' : 'Credit request update',
      html: this.layout(
        `
        <p>Hi ${escapeHtml(data.patientName)},</p>
        <p>${outcome}</p>
        ${data.note ? `<p>${escapeHtml(data.note)}</p>` : ''}
        <p>Sign in to see your credit wallet.</p>`,
        { label: 'View credit wallet', url: `${this.appBaseUrl}/app/credit` },
      ),
    })
  }

  async sendProviderApplicationApprovedEmail(
    to: string,
    data: ProviderApplicationEmailData,
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `Your GG'APP provider application is approved`,
      html: this.layout(
        `
        <p>Congratulations!</p>
        <p>Your service provider application for <strong>${escapeHtml(data.practiceName)}</strong> has been
        approved. You can now sign in to complete your profile and start accepting appointments.</p>
        ${data.note ? `<p>Note from the review team: ${escapeHtml(data.note)}</p>` : ''}`,
        { label: 'Go to provider dashboard', url: `${this.appBaseUrl}/app/sp/dashboard` },
      ),
    })
  }

  async sendProviderApplicationRejectedEmail(
    to: string,
    data: ProviderApplicationEmailData,
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `Update on your GG'APP provider application`,
      html: this.layout(
        `
        <p>Hi there,</p>
        <p>We're sorry, but your service provider application for
        <strong>${escapeHtml(data.practiceName)}</strong> was not approved at this time.</p>
        ${data.note ? `<p>Reason given by the review team: ${escapeHtml(data.note)}</p>` : ''}
        <p>You can revise and resubmit your application, or contact support if you have questions.</p>`,
        { label: 'Check application status', url: `${this.appBaseUrl}/sp/pending` },
      ),
    })
  }

  async sendProviderApplicationInfoRequestedEmail(
    to: string,
    data: ProviderApplicationEmailData,
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `More information needed for your GG'APP provider application`,
      html: this.layout(
        `
        <p>Hi there,</p>
        <p>We need a bit more information to finish reviewing your application for
        <strong>${escapeHtml(data.practiceName)}</strong>.</p>
        ${data.note ? `<p>What we need: ${escapeHtml(data.note)}</p>` : ''}
        <p>Please log in to update your application so we can continue the review.</p>`,
        { label: 'Update application', url: `${this.appBaseUrl}/sp/pending` },
      ),
    })
  }
}
