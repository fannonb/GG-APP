import { PrismaClient, AppointmentMode, AppointmentStatus, AuthProvider, CreditStatus, InvoiceStatus, NewsStatus, NotificationType, ProviderCategory, ProviderOpenStatus, ServiceForType, TransactionStatus, UserRole, UserStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { createCipheriv, randomBytes } from 'node:crypto'

const prisma = new PrismaClient()

// The seed contains demo credentials (Password1 etc.) and is only meant for
// local development. Refuse to run against production so those credentials
// can never be created in a live database (audit L7).
if (process.env.NODE_ENV === 'production') {
  console.error('[seed] Refusing to seed in production — demo credentials must never exist in a live database.')
  process.exit(1)
}

function encrypt(value: string, hexKey: string) {
  const key = Buffer.from(hexKey, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function resolveSeedPaymentPin() {
  const configuredPin = process.env.SEED_PAYMENT_PIN?.trim()
  if (configuredPin && /^\d{4}$/.test(configuredPin)) {
    return configuredPin
  }

  const generatedPin = String(Math.floor(1000 + Math.random() * 9000))
  console.log(`[seed] Generated patient payment PIN: ${generatedPin}`)
  return generatedPin
}

async function seedProviders() {
  const providers = [
    {
      slug: 'city-medical-centre',
      name: 'City Medical Centre',
      category: ProviderCategory.CLINIC,
      rating: '4.8',
      reviewCount: 112,
      distanceKm: '2.4',
      status: ProviderOpenStatus.OPEN,
      hours: '08:00 - 18:00',
      phone: '+263777123456',
      address: 'Borrowdale, Harare',
      country: 'ZW',
      license: 'GG-SP-1001',
      lat: '-17.783300',
      lng: '31.052200',
      services: ['General Consultation', 'Family Medicine', 'Lab Request Review'],
    },
    {
      slug: 'equity-diagnostics',
      name: 'Equity Diagnostics Lab',
      category: ProviderCategory.LABORATORY,
      rating: '4.6',
      reviewCount: 78,
      distanceKm: '4.1',
      status: ProviderOpenStatus.OPEN,
      hours: '07:00 - 17:00',
      phone: '+263777234567',
      address: 'Avondale, Harare',
      country: 'ZW',
      license: 'GG-SP-1002',
      lat: '-17.801000',
      lng: '31.039000',
      services: ['Blood Tests', 'Urinalysis', 'Home Sample Collection'],
    },
    {
      slug: 'harare-heart-specialists',
      name: 'Harare Heart Specialists',
      category: ProviderCategory.DOCTOR,
      rating: '4.9',
      reviewCount: 65,
      distanceKm: '5.8',
      status: ProviderOpenStatus.CLOSED,
      hours: '09:00 - 16:00',
      phone: '+263777345678',
      address: 'Mount Pleasant, Harare',
      country: 'ZW',
      license: 'GG-SP-1003',
      lat: '-17.769800',
      lng: '31.062100',
      services: ['Cardiology Review', 'ECG', 'Telehealth Follow-up'],
    },
  ]

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { slug: provider.slug },
      update: {
        name: provider.name,
        category: provider.category,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        distanceKm: provider.distanceKm,
        status: provider.status,
        hours: provider.hours,
        phone: provider.phone,
        address: provider.address,
        country: provider.country,
        license: provider.license,
        lat: provider.lat,
        lng: provider.lng,
        services: {
          deleteMany: {},
          create: provider.services.map(name => ({ name })),
        },
      },
      create: {
        slug: provider.slug,
        name: provider.name,
        category: provider.category,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        distanceKm: provider.distanceKm,
        status: provider.status,
        hours: provider.hours,
        phone: provider.phone,
        address: provider.address,
        country: provider.country,
        license: provider.license,
        lat: provider.lat,
        lng: provider.lng,
        services: {
          create: provider.services.map(name => ({ name })),
        },
      },
    })
  }
}

async function seedProviderUser() {
  const passwordHash = await bcrypt.hash('Password1', 12)

  const user = await prisma.user.upsert({
    where: { email: 'city-medical-centre@example.com' },
    update: {
      passwordHash,
      role: UserRole.SP,
      status: UserStatus.ACTIVE,
      phone: '+263777123456',
      country: 'ZW',
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'city-medical-centre@example.com',
      passwordHash,
      role: UserRole.SP,
      status: UserStatus.ACTIVE,
      phone: '+263777123456',
      country: 'ZW',
      emailVerifiedAt: new Date(),
    },
  })

  await prisma.provider.update({
    where: { slug: 'city-medical-centre' },
    data: {
      authUserId: user.id,
      country: 'ZW',
    },
  })
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash('Ironman2', 12)

  await prisma.user.upsert({
    where: { email: 'fbenja91@gmail.com' },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      authProvider: AuthProvider.LOCAL,
      googleId: null,
    },
    create: {
      email: 'fbenja91@gmail.com',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      authProvider: AuthProvider.LOCAL,
    },
  })
}

async function seedPatient() {
  const encryptionKey =
    process.env.FIELD_ENCRYPTION_KEY ??
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  const passwordHash = await bcrypt.hash('Password1', 12)
  const paymentPinHash = await bcrypt.hash(resolveSeedPaymentPin(), 12)
  const nationalIdEncrypted = encrypt('63-123456-A-99', encryptionKey)
  const beneficiaryNationalId = encrypt('63-654321-B-11', encryptionKey)

  const patient = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {
      passwordHash,
      paymentPinHash,
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      phone: '771234567',
      country: 'ZW',
      emailVerifiedAt: new Date(),
      patientProfile: {
        upsert: {
          update: {
            firstName: 'Sarah',
            lastName: 'Johnson',
            dateOfBirth: new Date('1992-06-14'),
            countryCode: 'ZW',
            nationalIdEncrypted,
            nationalIdLast4: 'A-99',
            creditLimit: '1200',
            creditUsed: '350',
            creditAvailable: '850',
            creditStatus: CreditStatus.APPROVED,
            financePartnerId: 'moneymart',
            creditAccountRef: 'MM-ACC-2048',
          },
          create: {
            firstName: 'Sarah',
            lastName: 'Johnson',
            dateOfBirth: new Date('1992-06-14'),
            countryCode: 'ZW',
            nationalIdEncrypted,
            nationalIdLast4: 'A-99',
            creditLimit: '1200',
            creditUsed: '350',
            creditAvailable: '850',
            creditStatus: CreditStatus.APPROVED,
            financePartnerId: 'moneymart',
            creditAccountRef: 'MM-ACC-2048',
          },
        },
      },
    },
    create: {
      email: 'sarah@example.com',
      passwordHash,
      paymentPinHash,
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      phone: '771234567',
      country: 'ZW',
      emailVerifiedAt: new Date(),
      patientProfile: {
        create: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          dateOfBirth: new Date('1992-06-14'),
          countryCode: 'ZW',
          nationalIdEncrypted,
          nationalIdLast4: 'A-99',
          creditLimit: '1200',
          creditUsed: '350',
          creditAvailable: '850',
          creditStatus: CreditStatus.APPROVED,
          financePartnerId: 'moneymart',
          creditAccountRef: 'MM-ACC-2048',
        },
      },
    },
    include: {
      patientProfile: true,
    },
  })

  await prisma.beneficiary.deleteMany({
    where: { patientUserId: patient.id },
  })

  const beneficiary = await prisma.beneficiary.create({
    data: {
      patientUserId: patient.id,
      name: 'Emma Johnson',
      relation: 'Daughter',
      dateOfBirth: new Date('2018-08-11'),
      countryCode: 'KE',
      nationalIdEncrypted: beneficiaryNationalId,
      nationalIdLast4: 'B-11',
    },
  })

  const provider = await prisma.provider.findFirstOrThrow({
    where: { slug: 'city-medical-centre' },
  })

  await prisma.transaction.deleteMany({ where: { patientUserId: patient.id } })
  await prisma.notification.deleteMany({ where: { userId: patient.id } })
  await prisma.appointment.deleteMany({ where: { patientUserId: patient.id } })
  await prisma.invoiceLineItem.deleteMany()
  await prisma.invoice.deleteMany({ where: { patientUserId: patient.id } })

  await prisma.transaction.createMany({
    data: [
      {
        patientUserId: patient.id,
        providerId: provider.id,
        amount: '120',
        currency: 'ZWG',
        status: TransactionStatus.AUTHORIZED,
        service: 'General Consultation',
        providerNameSnapshot: 'City Medical Centre',
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
      },
      {
        patientUserId: patient.id,
        providerId: provider.id,
        amount: '230',
        currency: 'ZWG',
        status: TransactionStatus.AUTHORIZED,
        service: 'Diagnostic Screening',
        providerNameSnapshot: 'Equity Diagnostics Lab',
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
      },
    ],
  })

  await prisma.notification.createMany({
    data: [
      {
        userId: patient.id,
        type: NotificationType.APPOINTMENT,
        title: 'Appointment Confirmed',
        body: 'Your clinic appointment at City Medical Centre is confirmed.',
        screen: '/app/appointments',
      },
      {
        userId: patient.id,
        type: NotificationType.CREDIT,
        title: 'Credit Wallet Active',
        body: 'Your available balance is ready for healthcare spending.',
        screen: '/app/credit',
      },
    ],
  })

  await prisma.appointment.createMany({
    data: [
      {
        reference: 'BK-EXAMPLE01',
        patientUserId: patient.id,
        providerId: provider.id,
        beneficiaryId: beneficiary.id,
        service: 'Pediatric Review',
        description: 'Recurring cough and fever review',
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
        timeLabel: '10:30',
        status: AppointmentStatus.CONFIRMED,
        forSelf: false,
        mode: AppointmentMode.IN_PERSON,
        address: 'Borrowdale, Harare',
        duration: '30 min',
      },
      {
        reference: 'BK-EXAMPLE02',
        patientUserId: patient.id,
        providerId: provider.id,
        service: 'General Consultation',
        description: 'Follow-up review',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
        timeLabel: '09:00',
        status: AppointmentStatus.COMPLETED,
        forSelf: true,
        mode: AppointmentMode.TELEHEALTH,
        address: 'Online',
        duration: '20 min',
      },
    ],
  })

  await prisma.invoice.create({
    data: {
      reference: 'INV-2026-0842',
      patientUserId: patient.id,
      providerId: provider.id,
      status: InvoiceStatus.PENDING_AUTH,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      amount: '450',
      billedToName: 'Sarah Johnson',
      billedToNationalId: '****A-99',
      serviceForType: ServiceForType.BENEFICIARY,
      serviceForName: 'Emma Johnson',
      serviceForRelation: 'Daughter',
      serviceForAge: 7,
      submittedAt: new Date(),
      attachment: 'INV-2026-0842.pdf',
      diagnosis: 'Acute upper respiratory tract infection with persistent cough and fever.',
      treatment: 'Consultation, medication review, and symptom management plan.',
      followUp: 'Return if fever persists beyond 48 hours or symptoms worsen.',
      internalNote: 'Initial seeded provider invoice for authorization testing.',
      lineItems: {
        create: [
          { name: 'Consultation', amount: '150' },
          { name: 'Medication', amount: '200' },
          { name: 'Lab Review', amount: '100' },
        ],
      },
    },
  })
}

async function seedNews() {
  await prisma.newsArticle.deleteMany()
  await prisma.newsArticle.createMany({
    data: [
      {
        title: 'Staying Ahead of Seasonal Flu',
        source: 'GG Health Desk',
        tag: 'Prevention',
        body: 'Keep vaccinations current, wash hands frequently, and seek early care when symptoms worsen.',
        url: 'https://example.com/health/seasonal-flu',
        publishedAt: new Date(),
        status: NewsStatus.PUBLISHED,
      },
      {
        title: 'How Telehealth Can Reduce Follow-up Costs',
        source: 'GG Insights',
        tag: 'Digital Care',
        body: 'Telehealth visits can reduce travel time and help patients follow through on care plans faster.',
        url: 'https://example.com/health/telehealth-costs',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        status: NewsStatus.PUBLISHED,
      },
    ],
  })
}

async function main() {
  await seedAdmin()
  await seedProviders()
  await seedProviderUser()
  await seedPatient()
  await seedNews()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async error => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
