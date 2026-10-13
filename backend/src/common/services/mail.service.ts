import { Inject, Injectable, Logger } from '@nestjs/common'
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

export interface LedgerPinEmailData {
  patientName: string
}

export interface ProviderApplicationEmailData {
  /** Links the email to the pending page where the provider can reply. */
  applicationId?: string
  practiceName: string
  note?: string
}

export interface WelcomeEmailData {
  /** First name when known; the greeting falls back to "Hi there". */
  name?: string
  role: 'patient' | 'sp'
  practiceName?: string
}

export interface NewSignInEmailData {
  name?: string
  device: string
  ipAddress?: string | null
  /** Already formatted for the reader, e.g. "13 Oct 2026, 09:41 UTC". */
  when: string
}

export interface PaymentEmailData {
  patientName: string
  providerName: string
  invoiceReference: string
  transactionReference: string
  /** Paid from GG'APP credit, formatted with currency. */
  amountPaid: string
  /** Still owed directly to the provider, formatted; omitted when fully paid. */
  remainingDue?: string
}

export interface PayoutEmailData {
  providerName: string
  amount: string
  reference: string
  invoiceCount: number
}

export interface AdminAlertEmailData {
  subject: string
  /** One plain-text sentence saying what happened and what the admin should do. */
  summary: string
  details: Array<[string, string]>
  /** Admin portal page, relative to the admin portal root (e.g. '/applications'). */
  cta: { label: string; adminPath: string }
}

export interface SecurityAlertEmailData {
  name?: string
  subject: string
  /** Plain-text paragraphs; escaped when rendered. */
  paragraphs: string[]
  cta?: { label: string; path: string }
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
  private readonly adminEmails: string[]
  private readonly adminPortalPath: string

  // Explicit @Inject token: tsx/esbuild doesn't emit constructor
  // design-type metadata, so bare ConfigService DI would resolve undefined.
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const apiKey = configService.get<string>('notifications.resendApiKey') ?? ''
    this.from =
      configService.get<string>('notifications.emailFrom')?.trim() ||
      "GG'APP <no-reply@gatewayglobal.africa>"
    this.appBaseUrl = (
      configService.get<string>('app.appBaseUrl') || 'http://localhost:5173'
    ).replace(/\/$/, '')
    this.adminEmails = configService.get<string[]>('notifications.adminEmails') ?? []
    this.adminPortalPath = (configService.get<string>('portal.adminPath') || '/admin').replace(/\/$/, '')
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

  private greeting(name?: string) {
    return `<p>Hi ${name?.trim() ? escapeHtml(name.trim()) : 'there'},</p>`
  }

  private detailsTable(rows: Array<[string, string]>) {
    const cells = rows
      .map(([label, value], i) => {
        const shade = i % 2 === 0 ? 'background:#F4F7FB;' : ''
        return (
          `<tr><td style="padding:8px 10px;${shade}color:#5B6B82;">${escapeHtml(label)}</td>` +
          `<td style="padding:8px 10px;${shade}font-weight:700;text-align:right;">${escapeHtml(value)}</td></tr>`
        )
      })
      .join('')
    return `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;">${cells}</table>`
  }

  /** Sent once an account is ready: after email verification, or straight away for Google sign-ups. */
  async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<boolean> {
    if (data.role === 'sp') {
      const practice = data.practiceName ? ` with <strong>${escapeHtml(data.practiceName)}</strong>` : ''
      return this.send({
        to,
        subject: "We've received your GG'APP provider application",
        html: this.layout(
          `
          ${this.greeting(data.name)}
          <p>Thanks for applying to join GG'APP${practice}. Your email is verified and your application is
          now with our review team.</p>
          <p>We check every provider's medical licence and documents before approving. We'll email you as soon
          as there's a decision, or if we need anything else from you.</p>`,
          { label: 'Check application status', url: `${this.appBaseUrl}/sp/pending` },
        ),
      })
    }
    return this.send({
      to,
      subject: "Welcome to GG'APP",
      html: this.layout(
        `
        ${this.greeting(data.name)}
        <p>Welcome to GG'APP. Your account is ready.</p>
        <p>Here's how to get started:</p>
        <ol style="padding-left:20px;margin:10px 0;">
          <li style="margin-bottom:6px;"><strong>Apply for healthcare credit</strong> so you can pay verified providers without paying at the counter.</li>
          <li style="margin-bottom:6px;"><strong>Set your payment PIN.</strong> You'll use it to approve every invoice.</li>
          <li><strong>Find care</strong> from verified hospitals, clinics, pharmacies and labs.</li>
        </ol>`,
        { label: "Open GG'APP", url: `${this.appBaseUrl}/app/dashboard` },
      ),
    })
  }

  /** Security notice for a sign-in from a device this account hasn't used before. */
  async sendNewSignInEmail(to: string, data: NewSignInEmailData): Promise<boolean> {
    const rows: Array<[string, string]> = [['Device', data.device], ['When', data.when]]
    if (data.ipAddress) rows.push(['IP address', data.ipAddress])
    return this.send({
      to,
      subject: "New sign-in to your GG'APP account",
      html: this.layout(
        `
        ${this.greeting(data.name)}
        <p>Your GG'APP account was just signed in to from a new device:</p>
        ${this.detailsTable(rows)}
        <p>If this was you, there's nothing to do.</p>
        <p><strong>If it wasn't you,</strong> reset your password now. Resetting it signs out every other device.</p>`,
        { label: 'Reset my password', url: `${this.appBaseUrl}/forgot-password` },
      ),
    })
  }

  /** Receipt for the patient once all three PIN confirmations release payment. */
  async sendPaymentReceiptEmail(to: string, data: PaymentEmailData): Promise<boolean> {
    const rows: Array<[string, string]> = [
      ['Paid to', data.providerName],
      ['Invoice', data.invoiceReference],
      ['Paid from your credit', data.amountPaid],
    ]
    if (data.remainingDue) rows.push(['Still to pay the provider directly', data.remainingDue])
    rows.push(['Transaction reference', data.transactionReference])
    const remainder = data.remainingDue
      ? "<p>Your credit didn't cover the full invoice, so please settle the remaining amount directly with the provider.</p>"
      : ''
    return this.send({
      to,
      subject: `Payment receipt: ${data.amountPaid} to ${data.providerName}`,
      html: this.layout(
        `
        ${this.greeting(data.patientName)}
        <p>You approved a payment with your payment PIN. Here's your receipt:</p>
        ${this.detailsTable(rows)}
        ${remainder}
        <p>If you didn't approve this payment, contact GG'APP support immediately.</p>`,
        { label: 'View transaction history', url: `${this.appBaseUrl}/app/transactions` },
      ),
    })
  }

  /** Tells the provider a patient has approved payment for their invoice. */
  async sendPaymentReceivedEmail(to: string, data: PaymentEmailData): Promise<boolean> {
    const rows: Array<[string, string]> = [
      ['Patient', data.patientName],
      ['Invoice', data.invoiceReference],
      ["Approved via GG'APP", data.amountPaid],
    ]
    if (data.remainingDue) rows.push(['Collect directly from the patient', data.remainingDue])
    rows.push(['Transaction reference', data.transactionReference])
    return this.send({
      to,
      subject: `Payment approved for invoice ${data.invoiceReference}`,
      html: this.layout(
        `
        ${this.greeting(data.providerName)}
        <p><strong>${escapeHtml(data.patientName)}</strong> has approved payment for your invoice:</p>
        ${this.detailsTable(rows)}
        <p>The approved amount will be paid to your registered payout account. We'll email you when the payout is sent.</p>`,
        { label: 'View invoices', url: `${this.appBaseUrl}/sp/invoices` },
      ),
    })
  }

  /** Tells the provider money has been sent to their payout account. */
  async sendPayoutSentEmail(to: string, data: PayoutEmailData): Promise<boolean> {
    const covers = `${data.invoiceCount} invoice${data.invoiceCount === 1 ? '' : 's'}`
    return this.send({
      to,
      subject: `Payout sent: ${data.amount}`,
      html: this.layout(
        `
        ${this.greeting(data.providerName)}
        <p>We've sent a payout to your registered payout account:</p>
        ${this.detailsTable([['Amount', data.amount], ['Covers', covers], ['Payment reference', data.reference]])}
        <p>Depending on your bank or mobile money provider, it may take a short while to show in your account.</p>`,
        { label: 'View payments', url: `${this.appBaseUrl}/sp/payments` },
      ),
    })
  }

  /**
   * Account security notice (password or PIN changed, PIN locked, failed ledger
   * access). Always ends with what to do if the reader didn't do this.
   */
  async sendSecurityAlertEmail(to: string, data: SecurityAlertEmailData): Promise<boolean> {
    return this.send({
      to,
      subject: data.subject,
      html: this.layout(
        `
        ${this.greeting(data.name)}
        ${data.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
        <p><strong>If this wasn't you,</strong> reset your password straight away and contact GG'APP support.</p>`,
        data.cta ? { label: data.cta.label, url: `${this.appBaseUrl}${data.cta.path}` } : undefined,
      ),
    })
  }

  /**
   * Tells the admin inbox about something waiting for review on the dashboard
   * (new registrations, provider replies). Sent to every ADMIN_NOTIFICATION_EMAIL.
   */
  async sendAdminAlert(data: AdminAlertEmailData): Promise<void> {
    if (this.adminEmails.length === 0) return
    const html = this.layout(
      `
      <p>Hi GG'APP team,</p>
      <p>${escapeHtml(data.summary)}</p>
      ${this.detailsTable(data.details)}`,
      { label: data.cta.label, url: `${this.appBaseUrl}${this.adminPortalPath}${data.cta.adminPath}` },
    )
    await Promise.all(this.adminEmails.map(to => this.send({ to, subject: data.subject, html })))
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

  async sendPasswordResetEmail(
    to: string,
    token: string,
    role?: 'admin',
  ): Promise<boolean> {
    const roleParam = role ? `&role=${role}` : ''
    const url = `${this.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}${roleParam}`
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
        { label: 'View appointment', url: `${this.appBaseUrl}/sp/appointments` },
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
        { label: 'Go to provider dashboard', url: `${this.appBaseUrl}/sp/dashboard` },
      ),
    })
  }

  /** Plain account notice (suspension, email change, reactivation). Paragraphs are escaped. */
  async sendAccountNotice(
    to: string,
    data: { subject: string; paragraphs: string[]; cta?: { label: string; path: string } },
  ): Promise<boolean> {
    return this.send({
      to,
      subject: data.subject,
      html: this.layout(
        ['<p>Hi there,</p>', ...data.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`)].join(''),
        data.cta ? { label: data.cta.label, url: `${this.appBaseUrl}${data.cta.path}` } : undefined,
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
        <p>Reply from your application page so we can continue the review.</p>`,
        {
          label: 'Reply to the review team',
          url: `${this.appBaseUrl}/sp/pending${data.applicationId ? `?applicationId=${encodeURIComponent(data.applicationId)}` : ''}`,
        },
      ),
    })
  }

  async sendLedgerPinExpiredEmail(to: string, data: LedgerPinEmailData): Promise<boolean> {
    return this.send({
      to,
      subject: 'Your Health Ledger PIN has expired',
      html: this.layout(
        `
        <p>Hi ${escapeHtml(data.patientName)},</p>
        <p>Your GG'APP Health Ledger PIN has expired. Providers can no longer unlock your treatment
        history with that PIN.</p>
        <p>Create a new Ledger PIN in the app whenever you want to share access again. Any previous
        provider access has been removed.</p>`,
        { label: 'Create a new Ledger PIN', url: `${this.appBaseUrl}/app/ledger/pin` },
      ),
    })
  }

  async sendLedgerPinResetEmail(to: string, data: LedgerPinEmailData): Promise<boolean> {
    return this.send({
      to,
      subject: 'Your Health Ledger PIN was reset',
      html: this.layout(
        `
        <p>Hi ${escapeHtml(data.patientName)},</p>
        <p>Your GG'APP Health Ledger PIN was reset from your account. Providers who previously had
        access must ask you for the new PIN.</p>
        <p>If you didn't do this, sign in immediately and change your account password, then set a
        new Ledger PIN.</p>`,
        { label: 'Open Health Ledger', url: `${this.appBaseUrl}/app/ledger` },
      ),
    })
  }
}
