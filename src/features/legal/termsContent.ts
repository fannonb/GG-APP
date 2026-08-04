import type { LegalSection } from './LegalDocumentScreen'

export const TERMS_EFFECTIVE_DATE = '20th July, 2026'
export const TERMS_LAST_UPDATED = '22nd July, 2026'

export const TERMS_INTRO =
  "Welcome to GG'APP (\"Platform\", \"App\", \"we\", \"our\", or \"us\"). These Terms and Conditions (\"Terms\") govern the use of the GG'APP mobile application, Progressive Web Application (PWA), website, and related services. By accessing or using GG'APP, you acknowledge that you have read, understood, and agreed to be bound by these Terms. If you do not agree with these Terms, you must not use the Platform."

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "About GG'APP",
    intro: "GG'APP is a digital healthcare financing platform that connects:",
    bullets: [
      'Patients seeking healthcare services',
      'Verified healthcare service providers',
      'Credit finance partners',
      'Platform administrators',
    ],
    body: [
      'The Platform facilitates healthcare service access, appointment coordination, invoice processing, and payment authorization through approved healthcare financing channels.',
      "GG'APP does not itself provide medical treatment, medical advice, or financial lending services unless expressly stated.",
    ],
  },
  {
    heading: 'Eligibility',
    intro: "To use GG'APP, you must:",
    bullets: [
      'Be at least 18 years old or have legal guardian consent',
      'Have the legal capacity to enter binding agreements',
      'Provide accurate and truthful registration information',
      'Use the Platform only for lawful purposes',
    ],
    body: ['We reserve the right to suspend or terminate accounts found to contain false, misleading, or fraudulent information.'],
  },
  {
    heading: 'User Accounts',
    subsections: [
      {
        heading: '3.1 Registration',
        intro: 'Users may register using:',
        bullets: ['Email and password', 'Google Sign-In', "Any additional authentication methods introduced by GG'APP"],
        body: ['Users are responsible for maintaining the confidentiality of their login credentials and payment PIN.'],
      },
      {
        heading: '3.2 Account Security',
        intro: 'You agree:',
        bullets: [
          'Not to share your account credentials or PIN',
          'To immediately notify us of unauthorized access',
          'To ensure all activities under your account are authorized',
        ],
        body: ["GG'APP shall not be liable for losses arising from unauthorized account use caused by user negligence."],
      },
      {
        heading: '3.3 Suspension and Termination',
        intro: 'We may suspend, restrict, or terminate accounts where:',
        bullets: [
          'Fraudulent activity is suspected',
          'There are repeated failed authentication attempts',
          'These Terms are violated',
          'Regulatory or legal obligations require suspension',
        ],
      },
    ],
  },
  {
    heading: 'Healthcare Services Disclaimer',
    intro: "GG'APP is a technology platform only. We do not:",
    bullets: [
      'Provide medical advice',
      'Diagnose medical conditions',
      'Guarantee treatment outcomes',
      'Replace professional healthcare consultation',
    ],
    body: [
      'All healthcare services are independently provided by licensed healthcare service providers.',
      'Patients are solely responsible for consulting qualified medical professionals regarding diagnosis, treatment, medication, and medical decisions.',
      'In emergencies, users must contact local emergency medical services directly.',
    ],
  },
  {
    heading: 'Service Providers',
    intro: "Healthcare service providers using GG'APP are independently licensed professionals or institutions. While GG'APP performs verification procedures, we:",
    bullets: [
      'Do not guarantee provider conduct',
      'Do not guarantee treatment quality or outcomes',
      'Are not responsible for malpractice or negligence by providers',
    ],
    body: ['Users acknowledge that any healthcare engagement is strictly between the patient and the service provider.'],
  },
  {
    heading: 'Credit and Financing Services',
    subsections: [
      {
        heading: '6.1 Third-Party Finance Partners',
        intro: "Healthcare credit services available through GG'APP are offered by independent finance partners. GG'APP:",
        bullets: [
          'Is not a bank or lender',
          'Does not guarantee loan approval',
          'Does not determine lending decisions',
          'Does not control repayment terms set by finance partners',
        ],
        body: ['Loan approvals, interest rates, repayment schedules, and financing conditions are determined solely by the finance partner.'],
      },
      {
        heading: '6.2 User Responsibility',
        intro: 'Users remain fully responsible for:',
        bullets: [
          'Reviewing financing terms carefully',
          'Repaying approved credit facilities',
          'Understanding interest rates, fees, and penalties',
        ],
        body: ["Failure to repay financing obligations may affect the user's credit standing with the finance partner."],
      },
    ],
  },
  {
    heading: 'Payment Authorization and Triple-PIN Security',
    intro: "GG'APP utilizes a secure Triple-PIN authorization process for payment approvals. By entering your PIN and confirming payment:",
    bullets: [
      'You authorize the release of funds to the healthcare provider',
      'You confirm the invoice details are accurate',
      'You acknowledge that completed authorizations may become irreversible',
    ],
    body: [
      'Users are responsible for safeguarding their PIN.',
      "GG'APP is not liable for losses resulting from shared PINs, user negligence, or unauthorized access caused by compromised devices or credentials.",
    ],
  },
  {
    heading: 'User Conduct',
    intro: 'Users agree not to:',
    bullets: [
      'Use the Platform unlawfully',
      'Upload false medical or financial information',
      'Attempt unauthorized access to systems or accounts',
      'Disrupt platform functionality',
      'Reverse engineer or exploit the Platform',
      'Use the Platform for fraud or money laundering',
      'Harass, threaten, or abuse other users',
    ],
    body: ['Violation may result in account suspension, legal action, or reporting to authorities.'],
  },
  {
    heading: 'Uploads and Submitted Content',
    intro: 'Users may upload:',
    bullets: ['Prescriptions', 'Identification documents', 'Referral letters', 'Medical records', 'Invoices', 'Other supporting documentation'],
    body: [
      'You confirm that you own or are authorized to submit such content, the information is accurate, and the content does not violate laws or third-party rights.',
      "GG'APP may remove content that violates these Terms or applicable law.",
    ],
  },
  {
    heading: 'Privacy and Data Protection',
    body: [
      "Your use of GG'APP is also governed by our Privacy Policy.",
      'We process personal data in compliance with applicable data protection laws, including the Kenya Data Protection Act, 2019.',
      'By using the Platform, you consent to the collection, processing, storage, and sharing of data as described in the Privacy Policy.',
    ],
  },
  {
    heading: 'Intellectual Property',
    intro: "All intellectual property rights relating to GG'APP, including software, branding, logos, designs, databases, content, source code, and features and functionality, remain the exclusive property of GG'APP and its licensors. Users may not:",
    bullets: ['Copy', 'Modify', 'Distribute', 'Resell', 'Reverse engineer', 'Create derivative works'],
    body: ['Any of the above requires prior written permission from GG\'APP.'],
  },
  {
    heading: 'Platform Availability',
    intro: "While we strive for continuous availability, GG'APP does not guarantee uninterrupted service. The Platform may occasionally experience:",
    bullets: ['Maintenance downtime', 'Network interruptions', 'Third-party service failures', 'Technical errors'],
    body: ['We reserve the right to modify, suspend, or discontinue features without prior notice.'],
  },
  {
    heading: 'Notifications and Communications',
    intro: "By using GG'APP, users consent to receiving:",
    bullets: ['Push notifications', 'SMS messages', 'Emails', 'In-app alerts', 'Transaction confirmations', 'Security notifications'],
    body: [
      'Users may adjust certain communication preferences within the application settings.',
      'Critical security and transactional notifications cannot be disabled.',
    ],
  },
  {
    heading: 'Disputes and Invoice Challenges',
    intro: "Users may dispute invoices before payment authorization. GG'APP administrators may:",
    bullets: ['Request supporting evidence', 'Review provider documentation', 'Mediate disputes', 'Issue binding platform resolutions'],
    body: ["GG'APP reserves the right to suspend disputed transactions pending investigation."],
  },
  {
    heading: 'Limitation of Liability',
    intro: "To the maximum extent permitted by law, GG'APP and its affiliates shall not be liable for:",
    bullets: [
      'Medical outcomes',
      'Provider negligence',
      'Loan approval decisions',
      'Financial losses',
      'Indirect or consequential damages',
      'Data loss caused by external attacks',
      'User negligence',
      'Third-party system failures',
      'Service interruptions',
    ],
    body: [
      "Our total liability shall not exceed the amount of fees paid directly to GG'APP by the user in the preceding twelve (12) months.",
    ],
  },
  {
    heading: 'Indemnification',
    intro: "Users agree to indemnify and hold harmless GG'APP, its directors, employees, affiliates, and partners from claims, losses, liabilities, damages, and expenses arising from:",
    bullets: [
      'Violation of these Terms',
      'Fraudulent activity',
      'Misuse of the Platform',
      'Violation of third-party rights',
      'Illegal conduct',
    ],
  },
  {
    heading: 'Regulatory Compliance',
    intro: 'Users agree to comply with all applicable laws and regulations relating to:',
    bullets: [
      'Healthcare services',
      'Financial transactions',
      'Data protection',
      'Anti-money laundering obligations',
      'Electronic communications',
    ],
    body: ["GG'APP reserves the right to cooperate with regulators and law enforcement authorities where legally required."],
  },
  {
    heading: 'Data Retention',
    intro: "GG'APP may retain certain records for:",
    bullets: ['Legal compliance', 'Financial reporting', 'Fraud prevention', 'Regulatory obligations', 'Dispute resolution'],
    body: ['Even after account deletion requests, certain transactional or compliance records may be retained where legally required.'],
  },
  {
    heading: 'Account Deletion',
    body: [
      'Users may request account deletion through the Platform or by contacting support.',
      'Deletion requests may take up to 30 days to process, subject to legal and regulatory retention requirements.',
      'Certain data may remain archived for compliance, fraud prevention, or audit purposes.',
    ],
  },
  {
    heading: 'Governing Law',
    body: [
      'These Terms shall be governed by and interpreted in accordance with the laws of the Republic of Kenya.',
      'Any disputes arising from these Terms shall be subject to the jurisdiction of Kenyan courts unless otherwise required by applicable law.',
    ],
  },
  {
    heading: 'Changes to Terms',
    intro: "GG'APP may update these Terms periodically. Users will be notified of material changes through:",
    bullets: ['In-app notifications', 'Email communication', 'Website publication'],
    body: ['Continued use of the Platform after updates constitutes acceptance of the revised Terms.'],
  },
  {
    heading: 'Contact Information',
    intro: 'For support, legal inquiries, or complaints, contact:',
    bullets: [
      "GG'APP Support Team",
      'Email: [Insert Support Email]',
      'Phone: [Insert Phone Number]',
      'Website: [Insert Website URL]',
    ],
  },
]
