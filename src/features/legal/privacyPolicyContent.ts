import type { LegalSection } from './LegalDocumentScreen'

export const PRIVACY_POLICY_EFFECTIVE_DATE = '20th July, 2026'
export const PRIVACY_POLICY_LAST_UPDATED = '22nd July, 2026'

export const PRIVACY_POLICY_INTRO =
  "GG'APP (\"we\", \"our\", or \"us\") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, disclose, and protect your information when you use GG'APP."

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: 'Information We Collect',
    subsections: [
      {
        heading: '1.1 Personal Information',
        intro: 'We may collect:',
        bullets: [
          'Full name',
          'Phone number',
          'Email address',
          'National ID or passport details',
          'Date of birth',
          'Gender',
          'Profile photo',
          'Address and location data',
        ],
      },
      {
        heading: '1.2 Medical and Healthcare Information',
        intro: 'We may collect:',
        bullets: [
          'Prescriptions',
          'Referral letters',
          'Appointment history',
          'Healthcare provider interactions',
          'Medical invoices',
          'Uploaded medical documents',
        ],
      },
      {
        heading: '1.3 Financial Information',
        intro: 'We may collect:',
        bullets: [
          'Credit application data',
          'Wallet balances',
          'Transaction references',
          'Payment authorization records',
        ],
        body: ["GG'APP does not store full financial payment information unless explicitly stated."],
      },
      {
        heading: '1.4 Technical Information',
        intro: 'We may automatically collect:',
        bullets: [
          'Device identifiers',
          'IP addresses',
          'Browser information',
          'Operating system details',
          'App version',
          'Crash logs',
          'Usage analytics',
          'Login activity',
        ],
      },
      {
        heading: '1.5 Location Information',
        intro: "With user permission, GG'APP may access geolocation data to:",
        bullets: [
          'Locate nearby healthcare providers',
          'Improve service delivery',
          'Enhance fraud prevention and security',
        ],
        body: ['Users may disable location permissions, though certain features may become unavailable.'],
      },
    ],
  },
  {
    heading: 'How We Use Information',
    intro: 'We use collected information to:',
    bullets: [
      'Create and manage accounts',
      'Verify user identity',
      'Process healthcare financing requests',
      'Facilitate appointments and healthcare services',
      'Process payment authorizations',
      'Improve platform security',
      'Detect fraud and abuse',
      'Provide customer support',
      'Send notifications and updates',
      'Improve platform functionality and user experience',
      'Meet legal and regulatory obligations',
    ],
  },
  {
    heading: 'Legal Basis for Processing',
    intro: 'We process personal data based on:',
    bullets: [
      'User consent',
      'Contractual necessity',
      'Legal obligations',
      'Legitimate business interests',
      'Protection of vital interests',
      'Regulatory compliance',
    ],
  },
  {
    heading: 'Data Sharing and Disclosure',
    intro: 'We may share information with:',
    subsections: [
      {
        heading: '4.1 Healthcare Service Providers',
        body: ['To facilitate appointments, treatment, invoicing, and healthcare services.'],
      },
      {
        heading: '4.2 Credit Finance Partners',
        intro: 'To:',
        bullets: [
          'Assess financing applications',
          'Process payments',
          'Verify transactions',
          'Manage repayment obligations',
        ],
      },
      {
        heading: '4.3 Service Providers and Vendors',
        intro: 'Including:',
        bullets: [
          'Cloud hosting providers',
          'Notification and email providers',
          'Analytics providers',
          'Security and fraud prevention services',
        ],
      },
      {
        heading: '4.4 Legal and Regulatory Authorities',
        intro: 'Where required by:',
        bullets: ['Law', 'Court orders', 'Regulatory obligations', 'Fraud investigations', 'National security requirements'],
        body: ['We do not sell user personal data to third parties.'],
      },
    ],
  },
  {
    heading: 'Data Security',
    intro: "GG'APP implements administrative, technical, and organizational safeguards including:",
    bullets: [
      'Encryption in transit using TLS',
      'Encryption at rest',
      'Secure password and PIN hashing',
      'Role-based access controls',
      'Session management and lockouts',
      'Audit logging',
      'API security measures',
      'Restricted infrastructure access',
    ],
    body: ['Despite our efforts, no system is completely secure, and users acknowledge inherent internet security risks.'],
  },
  {
    heading: 'Data Retention',
    intro: 'We retain personal data only as long as necessary for:',
    bullets: [
      'Service delivery',
      'Legal compliance',
      'Fraud prevention',
      'Financial recordkeeping',
      'Dispute resolution',
      'Regulatory obligations',
    ],
    body: ['Retention periods may vary depending on applicable laws and operational requirements.'],
  },
  {
    heading: 'User Rights',
    intro: 'Subject to applicable law, users may have the right to:',
    bullets: [
      'Access their personal data',
      'Correct inaccurate data',
      'Request deletion of personal data',
      'Withdraw consent',
      'Object to certain processing',
      'Request data portability',
      'Lodge complaints with regulators',
    ],
    body: [
      'Requests may be submitted through the Platform or official support channels.',
      'Identity verification may be required before processing requests.',
    ],
  },
  {
    heading: 'Cookies and Tracking Technologies',
    intro: "GG'APP may use:",
    bullets: ['Cookies', 'Session storage', 'Analytics tools', 'Push notification tokens', 'Device identifiers'],
    body: [
      'These technologies help maintain sessions, improve performance, personalize experiences, analyze usage trends, and enhance security.',
      'Users may manage cookie settings through their browsers or device settings.',
    ],
  },
  {
    heading: "Children's Privacy",
    body: [
      "GG'APP is not intended for children under 18 without guardian involvement.",
      'We do not knowingly collect personal data from minors without lawful authorization.',
      'If we become aware of unauthorized child data collection, we may delete such information.',
    ],
  },
  {
    heading: 'International Data Transfers',
    body: [
      "User data may be processed or stored in jurisdictions outside the user's country.",
      "Where international transfers occur, GG'APP will implement reasonable safeguards to protect personal information in accordance with applicable laws.",
    ],
  },
  {
    heading: 'Third-Party Services',
    intro: "GG'APP may integrate with third-party services including:",
    bullets: [
      'Google authentication services',
      'Push notification services',
      'Payment and finance systems',
      'Cloud infrastructure providers',
    ],
    body: [
      'Third-party services operate under their own privacy policies and terms.',
      "GG'APP is not responsible for third-party privacy practices.",
    ],
  },
  {
    heading: 'Data Breach Notification',
    intro: "In the event of a data breach affecting user personal information, GG'APP may:",
    bullets: ['Investigate the incident', 'Mitigate risks', 'Notify affected users', 'Notify regulators where legally required'],
  },
  {
    heading: 'Automated Decision-Making',
    body: [
      'Certain processes, including fraud detection, account security monitoring, and financing workflows, may involve automated processing.',
      'Financing decisions remain the responsibility of the relevant finance partner.',
    ],
  },
  {
    heading: 'Changes to This Privacy Policy',
    intro: 'We may update this Privacy Policy periodically. Updated versions will be published through:',
    bullets: ['The application', 'Official websites', 'Email notifications where appropriate'],
    body: ["Continued use of GG'APP after updates constitutes acceptance of the revised Privacy Policy."],
  },
  {
    heading: 'Contact Us',
    intro: 'For privacy-related inquiries, complaints, or data requests, contact:',
    bullets: [
      "GG'APP Data Protection Office",
      'Email: [Insert Privacy Email]',
      'Phone: [Insert Phone Number]',
      'Address: [Insert Business Address]',
    ],
  },
  {
    heading: 'Consent',
    body: [
      "By using GG'APP, you acknowledge that you have read and understood this Privacy Policy and consent to the collection and processing of your information as described herein.",
    ],
  },
]
