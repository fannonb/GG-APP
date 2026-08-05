import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  CreditApplicationStatus,
  CreditApplicationType,
  CreditStatus,
  InvoiceStatus,
  NewsStatus,
  NotificationType,
  Prisma,
  ProviderApplicationDocumentKind,
  ProviderApplicationStatus,
  ProviderCategory,
  ProviderLifecycleStatus,
  ProviderOpenStatus,
  ProviderPayoutMethod,
  ProviderPayoutAccountStatus,
  UserRole,
  UserStatus,
} from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { FieldEncryptionService } from '../../common/services/field-encryption.service'
import { MailService } from '../../common/services/mail.service'
import { LedgerService } from '../ledger/ledger.service'
import { getInvoiceAttachmentDataUrl } from '../../common/utils/invoice-attachment.util'
import type { CreateNewsArticleDto, UpdateNewsArticleDto } from './dto/news-article.dto'
import type { CreateNewsCategoryDto } from './dto/news-category.dto'

const ADMIN_PROVIDER_DETAIL_INCLUDE = {
  authUser: true,
  appointments: true,
  invoices: true,
  application: {
    include: {
      documents: true,
    },
  },
  payoutAccounts: {
    where: {
      status: ProviderPayoutAccountStatus.ACTIVE,
    },
    orderBy: [{ isDefault: 'desc' as const }, { createdAt: 'asc' as const }],
    take: 1,
  },
} satisfies Prisma.ProviderInclude

type AdminProviderRecord = Prisma.ProviderGetPayload<{
  include: typeof ADMIN_PROVIDER_DETAIL_INCLUDE
}>

type AdminNewsArticleRecord = Prisma.NewsArticleGetPayload<{}>

type ResolvedProviderApplication = {
  email: string
  emailSecondary: string | null
  payoutMethod: ProviderPayoutMethod
  payoutDetails?: Prisma.JsonValue | null
  openingHours: Prisma.JsonValue
  serviceTypes: Prisma.JsonValue
  documents: Array<{
    originalName: string
    mimeType: string
    displaySize: string
    uploadedAt: Date
    kind: ProviderApplicationDocumentKind
  }>
} | null
import type { GetAdminActivityQueryDto } from './dto/get-admin-activity-query.dto'
import type { GetAdminPaymentsQueryDto } from './dto/get-admin-payments-query.dto'
import type { CreditApplicationActionDto } from './dto/credit-application-action.dto'
import type { GetAdminLedgerAccessQueryDto } from '../ledger/dto/ledger-query.dto'

const ADMIN_REVIEWABLE_APPLICATION_WHERE = {
  status: { not: ProviderApplicationStatus.APPROVED },
} as const

const NEWS_STATUS_RANK: Record<NewsStatus, number> = {
  PUBLISHED: 0,
  DRAFT: 1,
  ARCHIVED: 2,
}

@Injectable()
export class AdminService {
  private readonly prisma: PrismaService
  private readonly fieldEncryption: FieldEncryptionService
  private readonly ledgerService: LedgerService
  private readonly mailService: MailService

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(FieldEncryptionService) fieldEncryption: FieldEncryptionService,
    @Inject(LedgerService) ledgerService: LedgerService,
    @Inject(MailService) mailService: MailService,
  ) {
    this.prisma = prisma
    this.fieldEncryption = fieldEncryption
    this.ledgerService = ledgerService
    this.mailService = mailService
  }

  async getDashboard() {
    const [
      pendingSPApps,
      pendingCreditApps,
      totalProviders,
      totalPatients,
      monthlyVolume,
      applications,
      creditApplications,
    ] = await Promise.all([
      this.prisma.providerApplication.count({
        where: {
          status: {
            in: [ProviderApplicationStatus.PENDING, ProviderApplicationStatus.INFO_REQUESTED],
          },
        },
      }),
      this.prisma.creditApplication.count({
        where: { status: CreditApplicationStatus.SUBMITTED },
      }),
      this.prisma.provider.count(),
      this.prisma.user.count({ where: { role: 'PATIENT' } }),
      this.prisma.invoice.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.providerApplication.findMany({
        where: ADMIN_REVIEWABLE_APPLICATION_WHERE,
        include: { documents: true },
        orderBy: { submittedAt: 'desc' },
        take: 6,
      }),
      this.prisma.creditApplication.findMany({
        include: {
          patient: {
            select: {
              email: true,
              phone: true,
              country: true,
              patientProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                  countryCode: true,
                  residenceCountry: true,
                  residesAbroad: true,
                  creditLimit: true,
                  creditAvailable: true,
                  creditUsed: true,
                  creditStatus: true,
                },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        take: 6,
      }),
    ])

    return {
      stats: {
        pendingSPApps,
        pendingCreditApps,
        totalProviders,
        totalPatients,
        monthlyVolume: Number(monthlyVolume._sum.amount ?? 0),
      },
      applications: applications.map(application => this.mapApplication(application)),
      creditApplications: creditApplications.map(application => this.mapCreditApplication(application)),
    }
  }

  async getNews() {
    const items = await this.prisma.newsArticle.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return items
      .sort((left, right) => {
        const statusDelta = NEWS_STATUS_RANK[left.status] - NEWS_STATUS_RANK[right.status]
        if (statusDelta !== 0) return statusDelta
        return right.publishedAt.getTime() - left.publishedAt.getTime()
      })
      .map(item => this.mapNewsArticle(item))
  }

  async getNewsCategories() {
    const [categories, articles] = await Promise.all([
      this.prisma.newsCategory.findMany({
        orderBy: { name: 'asc' },
      }),
      this.prisma.newsArticle.findMany({
        where: { status: { not: NewsStatus.ARCHIVED } },
        select: { tag: true },
      }),
    ])

    const counts = new Map<string, number>()
    for (const article of articles) {
      counts.set(article.tag, (counts.get(article.tag) ?? 0) + 1)
    }

    return categories.map(category => ({
      ...category,
      articleCount: counts.get(category.name) ?? 0,
    }))
  }

  async createNewsCategory(dto: CreateNewsCategoryDto) {
    const name = dto.name.trim()
    if (!name) {
      throw new BadRequestException('Category name cannot be empty')
    }

    const existing = await this.prisma.newsCategory.findUnique({ where: { name } })
    if (existing) {
      throw new ConflictException(`Category "${name}" already exists`)
    }

    return this.prisma.newsCategory.create({
      data: { name },
    })
  }

  async deleteNewsCategory(categoryId: number) {
    const existing = await this.prisma.newsCategory.findUnique({
      where: { id: categoryId },
    })
    if (!existing) {
      throw new NotFoundException('Category not found')
    }

    // Articles keep their tag text; only the managed suggestion is removed.
    await this.prisma.newsCategory.delete({
      where: { id: categoryId },
    })

    return { success: true }
  }

  async createNews(dto: CreateNewsArticleDto) {
    const item = await this.prisma.newsArticle.create({
      data: {
        title: dto.title.trim(),
        source: dto.source.trim(),
        tag: dto.tag.trim(),
        body: dto.body.trim(),
        url: dto.url?.trim() || null,
        publishedAt: new Date(dto.date),
        status: NewsStatus.PUBLISHED,
      },
    })

    return this.mapNewsArticle(item)
  }

  async updateNews(articleId: string, dto: UpdateNewsArticleDto) {
    const existing = await this.prisma.newsArticle.findUnique({
      where: { id: Number(articleId) },
    })

    if (!existing) {
      throw new NotFoundException('News article not found')
    }

    const item = await this.prisma.newsArticle.update({
      where: { id: existing.id },
      data: {
        title: dto.title.trim(),
        source: dto.source.trim(),
        tag: dto.tag.trim(),
        body: dto.body.trim(),
        url: dto.url?.trim() || null,
        publishedAt: new Date(dto.date),
        status: existing.status,
      },
    })

    return this.mapNewsArticle(item)
  }

  async archiveNews(articleId: string) {
    const existing = await this.prisma.newsArticle.findUnique({
      where: { id: Number(articleId) },
    })

    if (!existing) {
      throw new NotFoundException('News article not found')
    }

    const item = await this.prisma.newsArticle.update({
      where: { id: existing.id },
      data: {
        status: NewsStatus.ARCHIVED,
      },
    })

    return this.mapNewsArticle(item)
  }

  async getAnalytics() {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const [users, providers, invoices] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.PATIENT },
        include: {
          patientProfile: {
            select: {
              countryCode: true,
            },
          },
        },
      }),
      this.prisma.provider.findMany({
        include: {
          authUser: { select: { email: true } },
          appointments: { select: { id: true, patientUserId: true } },
          invoices: {
            select: {
              amount: true,
              status: true,
              issueDate: true,
              patientUserId: true,
            },
          },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          issueDate: {
            gte: sixMonthsAgo,
          },
        },
        select: {
          amount: true,
          issueDate: true,
          provider: {
            select: {
              country: true,
            },
          },
        },
      }),
    ])

    const countryStats = this.buildCountryStats(users, providers)
    const monthlyTrend = this.buildMonthlyTrend(invoices)
    const categoryStats = this.buildCategoryStats(providers)
    const topProviders = providers
      .map(provider => this.mapProvider(provider as unknown as AdminProviderRecord, null))
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 5)

    return {
      countryStats,
      monthlyTrend: {
        all: monthlyTrend,
        Zimbabwe: this.buildMonthlyTrend(invoices.filter(invoice => this.mapCountry(invoice.provider.country) === 'Zimbabwe')),
        Kenya: this.buildMonthlyTrend(invoices.filter(invoice => this.mapCountry(invoice.provider.country) === 'Kenya')),
        Zambia: this.buildMonthlyTrend(invoices.filter(invoice => this.mapCountry(invoice.provider.country) === 'Zambia')),
      },
      categoryStats,
      topProviders,
    }
  }

  async getApplications() {
    const applications = await this.prisma.providerApplication.findMany({
      where: ADMIN_REVIEWABLE_APPLICATION_WHERE,
      include: { documents: true },
      orderBy: { submittedAt: 'desc' },
    })

    return applications.map(application => this.mapApplication(application))
  }

  private mapNewsArticle(item: AdminNewsArticleRecord) {
    return {
      id: item.id,
      title: item.title,
      source: item.source,
      tag: item.tag,
      body: item.body,
      url: item.url ?? undefined,
      date: item.publishedAt.toISOString(),
      status: item.status.toLowerCase() as 'draft' | 'published' | 'archived',
    }
  }

  async getApplication(applicationId: string) {
    const application = await this.prisma.providerApplication.findUnique({
      where: { id: applicationId },
      include: { documents: true },
    })

    if (!application) {
      throw new NotFoundException('Provider application not found')
    }

    return this.mapApplication(application)
  }

  async approveApplication(actorUserId: string, applicationId: string, note?: string) {
    const application = await this.prisma.providerApplication.findUnique({
      where: { id: applicationId },
    })

    if (!application) {
      throw new NotFoundException('Provider application not found')
    }

    const payoutDetails = this.asObject(application.payoutDetails)
    const serviceNames = this.normalizeServiceNames(application.serviceTypes)
    const providerCategories = this.mapProviderCategoriesFromServices(application.serviceTypes)
    const provider = await this.prisma.$transaction(async tx => {
      const updatedApplication = await tx.providerApplication.update({
        where: { id: application.id },
        data: {
          status: ProviderApplicationStatus.APPROVED,
          decisionNote: note ?? null,
          decidedAt: new Date(),
        },
      })

      const createdProvider = await tx.provider.upsert({
        where: { authUserId: application.userId },
        update: {
          applicationId: updatedApplication.id,
          name: application.practiceName,
          category: providerCategories[0],
          categories: providerCategories,
          phone: application.phone,
          address: application.address,
          license: application.licenseNumber,
          country: application.country,
          lifecycleStatus: ProviderLifecycleStatus.ACTIVE,
          status: ProviderOpenStatus.OPEN,
          tags: serviceNames,
          hoursJson: application.openingHours as Prisma.InputJsonValue,
          hours: this.summarizeApplicationHours(application.openingHours),
          lat: application.lat,
          lng: application.lng,
          description: this.buildProviderDescription(application.serviceTypes),
          services: {
            deleteMany: {},
            create: serviceNames.map(name => ({ name })),
          },
        },
        create: {
          authUserId: application.userId,
          applicationId: updatedApplication.id,
          slug: this.buildProviderSlug(application.practiceName, application.id),
          name: application.practiceName,
          category: providerCategories[0],
          categories: providerCategories,
          description: this.buildProviderDescription(application.serviceTypes),
          phone: application.phone,
          address: application.address,
          license: application.licenseNumber,
          country: application.country,
          tags: serviceNames,
          lifecycleStatus: ProviderLifecycleStatus.ACTIVE,
          status: ProviderOpenStatus.OPEN,
          hoursJson: application.openingHours as Prisma.InputJsonValue,
          hours: this.summarizeApplicationHours(application.openingHours),
          lat: application.lat,
          lng: application.lng,
          services: {
            create: serviceNames.map(name => ({ name })),
          },
        },
      })

      await tx.providerNotificationPreference.upsert({
        where: { providerId: createdProvider.id },
        update: {},
        create: { providerId: createdProvider.id },
      })

      if (payoutDetails.accountNumber) {
        const existingDefault = await tx.providerPayoutAccount.findFirst({
          where: {
            providerId: createdProvider.id,
            isDefault: true,
          },
        })

        if (!existingDefault) {
          await tx.providerPayoutAccount.create({
            data: {
              providerId: createdProvider.id,
              method: application.payoutMethod,
              accountNumber: String(payoutDetails.accountNumber),
              accountName: String(payoutDetails.accountName ?? application.practiceName),
              country: application.country,
              isDefault: true,
              status: ProviderPayoutAccountStatus.ACTIVE,
            },
          })
        }
      }

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'admin.provider_application.approved',
          entityType: 'ProviderApplication',
          entityId: application.id,
          metadata: {
            providerId: createdProvider.id,
            note: note ?? null,
          } as Prisma.JsonObject,
        },
      })

      return createdProvider
    })

    return this.getProvider(String(provider.id))
  }

  async requestInfo(actorUserId: string, applicationId: string, note?: string) {
    return this.updateApplicationStatus(
      actorUserId,
      applicationId,
      ProviderApplicationStatus.INFO_REQUESTED,
      note,
    )
  }

  async rejectApplication(actorUserId: string, applicationId: string, note?: string) {
    return this.updateApplicationStatus(
      actorUserId,
      applicationId,
      ProviderApplicationStatus.REJECTED,
      note,
    )
  }

  async getProviders() {
    const providers = await this.prisma.provider.findMany({
      include: ADMIN_PROVIDER_DETAIL_INCLUDE,
      orderBy: { joinedAt: 'desc' },
    })

    return Promise.all(
      providers.map(async provider => {
        const application = await this.resolveProviderApplication(provider)
        return this.mapProvider(provider, application)
      }),
    )
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: UserRole.PATIENT },
      include: {
        patientProfile: {
          include: {
            beneficiaries: { select: { id: true } },
          },
        },
        transactions: { select: { id: true } },
        appointments: { select: { id: true }, take: 1 },
        invoices: { select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })

    return users.map(user => this.mapUser(user))
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: {
          include: {
            beneficiaries: { select: { id: true } },
          },
        },
        transactions: { select: { id: true } },
        appointments: { select: { id: true }, take: 1 },
        invoices: { select: { id: true }, take: 1 },
      },
    })

    if (!user || user.role !== UserRole.PATIENT) {
      throw new NotFoundException('Patient user not found')
    }

    return this.mapUser(user)
  }

  async revealUserNationalId(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      select: { nationalIdEncrypted: true, countryCode: true },
    })

    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    const nationalId = this.fieldEncryption.decrypt(profile.nationalIdEncrypted)
    return { nationalId }
  }

  async getProvider(providerId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: {
        OR: [{ id: Number(providerId) || -1 }, { authUserId: providerId }],
      },
      include: ADMIN_PROVIDER_DETAIL_INCLUDE,
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    const application = await this.resolveProviderApplication(provider)
    return this.mapProvider(provider, application)
  }

  async suspendUser(actorUserId: string, userId: string) {
    return this.updateUserStatus(actorUserId, userId, UserStatus.SUSPENDED)
  }

  async reactivateUser(actorUserId: string, userId: string) {
    return this.updateUserStatus(actorUserId, userId, UserStatus.ACTIVE)
  }

  async deleteUser(actorUserId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: {
          include: {
            beneficiaries: { select: { id: true }, take: 1 },
          },
        },
        appointments: { select: { id: true }, take: 1 },
        invoices: { select: { id: true }, take: 1 },
        transactions: { select: { id: true }, take: 1 },
      },
    })

    if (!user || user.role !== UserRole.PATIENT) {
      throw new NotFoundException('Patient user not found')
    }

    if (
      user.appointments.length > 0 ||
      user.invoices.length > 0 ||
      user.transactions.length > 0 ||
      (user.patientProfile?.beneficiaries.length ?? 0) > 0
    ) {
      throw new BadRequestException(
        'Patients with appointments, invoices, transactions, or beneficiaries cannot be deleted.',
      )
    }

    await this.prisma.$transaction(async tx => {
      await tx.user.delete({
        where: { id: user.id },
      })

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'admin.patient.deleted',
          entityType: 'User',
          entityId: user.id,
        },
      })
    })

    return {
      message: 'Patient deleted successfully.',
    }
  }

  async suspendProvider(actorUserId: string, providerId: string) {
    return this.updateProviderLifecycle(actorUserId, providerId, ProviderLifecycleStatus.SUSPENDED)
  }

  async reactivateProvider(actorUserId: string, providerId: string) {
    return this.updateProviderLifecycle(actorUserId, providerId, ProviderLifecycleStatus.ACTIVE)
  }

  async deleteProvider(actorUserId: string, providerId: string) {
    const numericProviderId = Number(providerId)
    const provider = await this.prisma.provider.findUnique({
      where: { id: numericProviderId },
      include: {
        appointments: { select: { id: true }, take: 1 },
        invoices: { select: { id: true }, take: 1 },
        transactions: { select: { id: true }, take: 1 },
      },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    if (
      provider.appointments.length > 0 ||
      provider.invoices.length > 0 ||
      provider.transactions.length > 0
    ) {
      throw new BadRequestException(
        'Providers with appointments, invoices, or transactions cannot be deleted. Suspend the provider instead.',
      )
    }

    await this.prisma.$transaction(async tx => {
      if (provider.authUserId) {
        await tx.user.update({
          where: { id: provider.authUserId },
          data: { status: UserStatus.SUSPENDED },
        })
      }

      await tx.provider.delete({
        where: { id: provider.id },
      })

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'admin.provider.deleted',
          entityType: 'Provider',
          entityId: String(provider.id),
        },
      })
    })

    return {
      message: 'Provider deleted successfully.',
    }
  }

  async getPayments(query: GetAdminPaymentsQueryDto) {
    const page = query.page ?? 1
    const pageSize = query.limit ?? 10
    const search = query.search?.trim() ?? ''
    const country = query.country?.trim() ?? 'all'
    const where = this.buildAdminPaymentsWhere(search, country)

    const [total, invoices, summaryRows] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: [
          { paidAt: 'desc' },
          { paymentAuthorizedAt: 'desc' },
          { issueDate: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          provider: {
            select: {
              name: true,
              country: true,
            },
          },
          transaction: {
            select: {
              id: true,
              occurredAt: true,
            },
          },
        },
      }),
      this.prisma.invoice.findMany({
        where,
        select: {
          amount: true,
          provider: {
            select: {
              country: true,
            },
          },
        },
      }),
    ])

    const volumeByCountry = this.buildPaymentVolumeByCountry(summaryRows, country)

    return {
      items: invoices.map(invoice => this.mapAdminPayment(invoice)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
      summary: {
        totalTransactions: total,
        volumeByCountry,
      },
    }
  }

  async getLedgerAccess(query: GetAdminLedgerAccessQueryDto) {
    return this.ledgerService.getAdminAccessLog(query)
  }

  async getRecentActivity(query: GetAdminActivityQueryDto) {
    const country = query.country?.trim() ?? 'all'
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 30)

    const logs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { startsWith: 'patient.' } },
          { action: { startsWith: 'sp.' } },
          { action: { startsWith: 'admin.provider_application.' } },
          { action: { startsWith: 'admin.credit_application.' } },
        ],
        NOT: {
          OR: [
            { action: { startsWith: 'patient.beneficiary.' } },
            { action: { startsWith: 'patient.payment_pin.' } },
            { action: 'patient.profile.updated' },
            { action: 'patient.invoice.pin_confirmed' },
            { action: 'patient.invoice.pin_locked' },
            { action: 'sp.password.changed' },
            { action: 'sp.invoice.updated' },
          ],
        },
      },
      include: {
        actor: {
          select: {
            email: true,
            patientProfile: {
              select: {
                firstName: true,
                lastName: true,
                countryCode: true,
              },
            },
            providerRecord: {
              select: {
                name: true,
                country: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const items = logs
      .map(log => this.mapActivityItem(log))
      .filter(item => country === 'all' || item.country === country)

    return items.slice(0, limit)
  }

  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })

    return notifications.map(notification => ({
      id: notification.id,
      type: notification.type.toLowerCase(),
      title: notification.title,
      body: notification.body,
      time: notification.createdAt.toISOString(),
      read: !!notification.readAt,
      screen: notification.screen,
    }))
  }

  async markNotificationRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        readAt: new Date(),
      },
    })

    return { success: true }
  }

  private async updateApplicationStatus(
    actorUserId: string,
    applicationId: string,
    status: ProviderApplicationStatus,
    note?: string,
  ) {
    const application = await this.prisma.providerApplication.update({
      where: { id: applicationId },
      data: {
        status,
        decisionNote: note ?? null,
        decidedAt: new Date(),
      },
      include: { documents: true },
    })

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: `admin.provider_application.${status.toLowerCase()}`,
        entityType: 'ProviderApplication',
        entityId: application.id,
        metadata: {
          note: note ?? null,
        } as Prisma.JsonObject,
      },
    })

    return this.mapApplication(application)
  }

  private async updateUserStatus(
    actorUserId: string,
    userId: string,
    status: UserStatus,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })

    if (!existing || existing.role !== UserRole.PATIENT) {
      throw new NotFoundException('Patient user not found')
    }

    const user = await this.prisma.$transaction(async tx => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { status },
        include: {
          patientProfile: {
            include: {
              beneficiaries: { select: { id: true } },
            },
          },
          transactions: { select: { id: true } },
          appointments: { select: { id: true }, take: 1 },
          invoices: { select: { id: true }, take: 1 },
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId,
          action:
            status === UserStatus.SUSPENDED
              ? 'admin.patient.suspended'
              : 'admin.patient.reactivated',
          entityType: 'User',
          entityId: userId,
        },
      })

      return updatedUser
    })

    return this.mapUser(user)
  }

  private async updateProviderLifecycle(
    actorUserId: string,
    providerId: string,
    lifecycleStatus: ProviderLifecycleStatus,
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: Number(providerId) },
      include: { authUser: true, appointments: true, invoices: true },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    const updated = await this.prisma.$transaction(async tx => {
      const nextProvider = await tx.provider.update({
        where: { id: provider.id },
        data: { lifecycleStatus },
        include: ADMIN_PROVIDER_DETAIL_INCLUDE,
      })

      if (provider.authUserId) {
        await tx.user.update({
          where: { id: provider.authUserId },
          data: {
            status:
              lifecycleStatus === ProviderLifecycleStatus.SUSPENDED
                ? UserStatus.SUSPENDED
                : UserStatus.ACTIVE,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          actorUserId,
          action:
            lifecycleStatus === ProviderLifecycleStatus.SUSPENDED
              ? 'admin.provider.suspended'
              : 'admin.provider.reactivated',
          entityType: 'Provider',
          entityId: String(provider.id),
        },
      })

      return nextProvider
    })

    const application = await this.resolveProviderApplication(updated)
    return this.mapProvider(updated, application)
  }

  private mapApplication(application: {
    id: string
    practiceName: string
    country: string
    email: string
    emailSecondary: string | null
    phone: string
    licenseNumber: string
    openingHours: Prisma.JsonValue
    payoutMethod: ProviderPayoutMethod
    payoutDetails?: Prisma.JsonValue | null
    documents: Array<{
      originalName: string
      mimeType: string
      displaySize: string
      uploadedAt: Date
      kind: ProviderApplicationDocumentKind
    }>
    serviceTypes: Prisma.JsonValue
    submittedAt: Date
    status: ProviderApplicationStatus
  }) {
    const payoutDetails = this.asObject(application.payoutDetails)

    return {
      id: application.id,
      name: application.practiceName,
      serviceTypes: Array.isArray(application.serviceTypes) ? application.serviceTypes : [],
      country: application.country,
      email: application.email,
      emailSecondary: application.emailSecondary ?? undefined,
      phone: application.phone,
      licenseNumber: application.licenseNumber,
      hours: this.mapApplicationHours(application.openingHours),
      paymentMethod: this.mapPayoutMethodToClient(application.payoutMethod),
      mpesaPaybill: this.asOptionalString(payoutDetails.accountNumber),
      bankName: this.asOptionalString(payoutDetails.bankName),
      bankAccount: this.asOptionalString(payoutDetails.accountNumber),
      bankBranch: this.asOptionalString(payoutDetails.bankBranch),
      documents: application.documents.map(document => ({
        name: document.originalName,
        type: document.mimeType.includes('pdf') ? 'pdf' : 'image',
        size: document.displaySize,
        uploadedAt: document.uploadedAt.toISOString(),
        kind: document.kind.toLowerCase(),
      })),
      submitted: application.submittedAt.toISOString(),
      status: this.mapApplicationStatusToClient(application.status),
    }
  }

  private async resolveProviderApplication(
    provider: Pick<AdminProviderRecord, 'applicationId' | 'authUserId' | 'application'>,
  ): Promise<ResolvedProviderApplication> {
    if (provider.application) {
      return provider.application
    }

    if (provider.applicationId) {
      return this.prisma.providerApplication.findUnique({
        where: { id: provider.applicationId },
        include: { documents: true },
      })
    }

    if (provider.authUserId) {
      return this.prisma.providerApplication.findFirst({
        where: { userId: provider.authUserId },
        include: { documents: true },
        orderBy: { submittedAt: 'desc' },
      })
    }

    return null
  }

  private mapProvider(
    provider: AdminProviderRecord,
    application: ResolvedProviderApplication,
  ) {
    const totalEarnings = provider.invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount),
      0,
    )
    const pendingPayments = provider.invoices
      .filter(invoice => invoice.status !== 'PAID')
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0)

    const serviceTypes = this.mapProviderServiceTypes(provider, application)
    const hours = this.mapProviderHours(
      provider.hoursJson ?? application?.openingHours ?? null,
    )
    const payment = this.mapProviderPaymentDetails(application, provider.payoutAccounts)
    const documents = application?.documents.map(document => ({
      name: document.originalName,
      type: document.mimeType.includes('pdf') ? 'pdf' as const : 'image' as const,
      size: document.displaySize,
      uploadedAt: document.uploadedAt.toISOString(),
      kind: document.kind.toLowerCase(),
    })) ?? []

    return {
      id: String(provider.id),
      name: provider.name,
      type: this.formatProviderCategories(provider.categories, provider.category),
      serviceTypes,
      country: provider.country ?? 'Zimbabwe',
      email: application?.email ?? provider.authUser?.email ?? '',
      emailSecondary: application?.emailSecondary ?? undefined,
      phone: provider.phone,
      address: provider.address || undefined,
      description: provider.description ?? undefined,
      license: provider.license ?? '',
      status:
        provider.lifecycleStatus === ProviderLifecycleStatus.ACTIVE ? 'active' : 'suspended',
      totalPatients: provider.appointments.length,
      totalEarnings,
      pendingPayments,
      joinedDate: provider.joinedAt.toISOString(),
      rating: Number(provider.rating),
      hours: Object.keys(hours).length > 0 ? hours : undefined,
      documents,
      ...payment,
    }
  }

  private mapProviderServiceTypes(
    provider: {
    categories?: string[]
    category: ProviderCategory
  },
    application: { serviceTypes: Prisma.JsonValue } | null,
  ) {
    if (provider.categories && provider.categories.length > 0) {
      return provider.categories.map(value => this.titleCase(value))
    }

    const fromApplication = this.normalizeServiceNames(application?.serviceTypes ?? [])
    if (fromApplication.length > 0) {
      return fromApplication
    }

    return [this.titleCase(provider.category)]
  }

  private mapProviderHours(value: Prisma.JsonValue | null | undefined) {
    if (!value) {
      return {}
    }

    if (Array.isArray(value)) {
      return value.reduce<Record<string, { open: boolean; from: string; to: string }>>(
        (hours, entry) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return hours
          }

          const record = entry as Record<string, unknown>
          const day = typeof record.day === 'string' ? record.day : null
          if (!day) {
            return hours
          }

          hours[day] = {
            open: record.status === 'open' || record.open === true,
            from: typeof record.from === 'string' ? record.from : '',
            to: typeof record.to === 'string' ? record.to : '',
          }

          return hours
        },
        {},
      )
    }

    if (typeof value === 'object') {
      const result: Record<string, { open: boolean; from: string; to: string }> = {}

      for (const [day, entry] of Object.entries(value as Record<string, unknown>)) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          continue
        }

        const record = entry as Record<string, unknown>
        result[day] = {
          open: record.open === true || record.status === 'open',
          from: typeof record.from === 'string' ? record.from : '',
          to: typeof record.to === 'string' ? record.to : '',
        }
      }

      return result
    }

    return {}
  }

  private mapProviderPaymentDetails(
    application: {
      payoutMethod: ProviderPayoutMethod
      payoutDetails?: Prisma.JsonValue | null
    } | null | undefined,
    payoutAccounts?: Array<{
      method: ProviderPayoutMethod
      accountNumber: string
      accountName: string
    }>,
  ) {
    const payoutDetails = application ? this.asObject(application.payoutDetails) : {}
    const defaultPayout = payoutAccounts?.[0]
    const paymentMethod = this.resolveProviderPaymentMethod(
      application?.payoutMethod,
      payoutDetails,
      defaultPayout?.method,
    )

    if (!paymentMethod) {
      return {}
    }

    if (paymentMethod === 'mpesa' || paymentMethod === 'mobile_money') {
      const paybill =
        this.asOptionalString(payoutDetails.accountNumber) ?? defaultPayout?.accountNumber

      return {
        paymentMethod,
        mpesaPaybill: paybill,
      }
    }

    return {
      paymentMethod,
      bankName:
        this.asOptionalString(payoutDetails.bankName) ?? defaultPayout?.accountName,
      bankAccount:
        this.asOptionalString(payoutDetails.accountNumber) ?? defaultPayout?.accountNumber,
      bankBranch: this.asOptionalString(payoutDetails.bankBranch),
    }
  }

  private resolveProviderPaymentMethod(
    applicationMethod?: ProviderPayoutMethod,
    payoutDetails?: Record<string, unknown>,
    accountMethod?: ProviderPayoutMethod,
  ): 'mpesa' | 'bank' | 'mobile_money' | undefined {
    if (applicationMethod) {
      return this.mapPayoutMethodToClient(applicationMethod)
    }

    if (accountMethod) {
      return this.mapPayoutMethodToClient(accountMethod)
    }

    const rawMethod = payoutDetails?.method
    if (rawMethod === 'mpesa' || rawMethod === 'bank' || rawMethod === 'mobile_money') {
      return rawMethod
    }

    return undefined
  }

  private mapUser(user: {
    id: string
    email: string
    phone: string | null
    country: string | null
    status: UserStatus
    createdAt: Date
    patientProfile: {
      firstName: string
      lastName: string
      dateOfBirth: Date
      countryCode: string
      nationalIdLast4: string
      creditLimit: Prisma.Decimal
      creditUsed: Prisma.Decimal
      creditStatus: CreditStatus
      financePartnerId: string | null
      memberSince: Date
      beneficiaries: Array<{ id: string }>
    } | null
    transactions: Array<{ id: string }>
  }) {
    const profile = user.patientProfile
    const fullName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : user.email

    return {
      id: user.id,
      name: fullName,
      email: user.email,
      phone: user.phone ?? '',
      nationalId: this.maskNationalId(profile?.countryCode, profile?.nationalIdLast4),
      dob: profile?.dateOfBirth.toISOString() ?? user.createdAt.toISOString(),
      country: this.mapCountry(profile?.countryCode ?? user.country),
      creditStatus: this.mapCreditStatusToClient(profile?.creditStatus),
      creditLimit: Number(profile?.creditLimit ?? 0),
      creditUsed: Number(profile?.creditUsed ?? 0),
      financePartner: this.mapFinancePartner(profile?.financePartnerId),
      beneficiariesCount: profile?.beneficiaries.length ?? 0,
      transactionCount: user.transactions.length,
      memberSince: profile?.memberSince.toISOString() ?? user.createdAt.toISOString(),
      status: this.mapUserStatusToClient(user.status),
      idDocuments: [],
    }
  }

  private buildCountryStats(
    users: Array<{
      country: string | null
      patientProfile: {
        countryCode: string
      } | null
    }>,
    providers: Array<{
      country: string | null
      invoices: Array<{ amount: Prisma.Decimal }>
    }>,
  ) {
    const countries = [
      { country: 'Zimbabwe', code: 'ZW', currency: 'ZWG', currencySymbol: 'Z$' },
      { country: 'Kenya', code: 'KE', currency: 'KES', currencySymbol: 'Ksh.' },
      { country: 'Zambia', code: 'ZM', currency: 'ZMW', currencySymbol: 'ZK' },
    ] as const

    return countries.map(entry => ({
      ...entry,
      patients: users.filter(user => this.mapCountry(user.patientProfile?.countryCode ?? user.country) === entry.country).length,
      providers: providers.filter(provider => this.mapCountry(provider.country) === entry.country).length,
      volume: providers
        .filter(provider => this.mapCountry(provider.country) === entry.country)
        .reduce((sum, provider) => (
          sum + provider.invoices.reduce((invoiceSum, invoice) => invoiceSum + Number(invoice.amount), 0)
        ), 0),
    }))
  }

  private buildMonthlyTrend(
    invoices: Array<{
      amount: Prisma.Decimal
      issueDate: Date
      provider: {
        country: string | null
      }
    }>,
  ) {
    const monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - index), 1)
      date.setHours(0, 0, 0, 0)
      return date
    })

    return monthKeys.map(monthDate => {
      const month = monthDate.getMonth()
      const year = monthDate.getFullYear()
      const monthInvoices = invoices.filter(invoice => (
        invoice.issueDate.getMonth() === month &&
        invoice.issueDate.getFullYear() === year
      ))

      return {
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        volume: monthInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
        transactions: monthInvoices.length,
      }
    })
  }

  private buildCategoryStats(providers: Array<{
    category: ProviderCategory
    categories?: string[]
    appointments: Array<{ id: string; patientUserId: string }>
    invoices: Array<{ amount: Prisma.Decimal }>
  }>) {
    const categories = new Map<string, { providers: number; patients: Set<string>; volume: number }>()

    for (const provider of providers) {
      const providerCategories =
        provider.categories && provider.categories.length > 0
          ? provider.categories
          : [provider.category]

      for (const category of providerCategories) {
        const key = this.titleCase(category)
        const current = categories.get(key) ?? {
          providers: 0,
          patients: new Set<string>(),
          volume: 0,
        }
        current.providers += 1
        provider.appointments.forEach(appointment => current.patients.add(appointment.patientUserId))
        current.volume += provider.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0)
        categories.set(key, current)
      }
    }

    return Array.from(categories.entries())
      .map(([category, values]) => ({
        category,
        providers: values.providers,
        patients: values.patients.size,
        volume: values.volume,
      }))
      .sort((a, b) => b.volume - a.volume)
  }

  private mapApplicationHours(value: Prisma.JsonValue) {
    const result: Record<string, { open: boolean; from: string; to: string }> = {}

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
        const record = entry as Record<string, unknown>
        const day = typeof record.day === 'string' ? record.day : undefined
        if (!day) continue
        result[day] = {
          open: record.status === 'open',
          from: typeof record.from === 'string' ? record.from : '',
          to: typeof record.to === 'string' ? record.to : '',
        }
      }
    }

    return result
  }

  private summarizeApplicationHours(value: Prisma.JsonValue) {
    const hours = this.mapApplicationHours(value)
    const openDays = Object.entries(hours)
      .filter(([, entry]) => entry.open)
      .map(([day, entry]) => `${day}: ${entry.from}-${entry.to}`)
    return openDays.length > 0 ? openDays.join(', ') : 'Closed'
  }

  private mapProviderCategoriesFromServices(value: Prisma.JsonValue) {
    if (!Array.isArray(value)) {
      return [ProviderCategory.CLINIC]
    }

    const categories = value
      .filter((item): item is string => typeof item === 'string')
      .map(item => this.mapProviderCategory(item))
      .filter((item, index, array) => array.indexOf(item) === index)

    return categories.length > 0 ? categories : [ProviderCategory.CLINIC]
  }

  private mapProviderCategory(value: string) {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[/-]+/g, ' ')
      .replace(/\s+/g, '_')

    switch (normalized) {
      case ProviderCategory.DOCTOR:
      case 'GENERAL_PRACTITIONER':
      case 'GENERAL_PRACTITIONER_DOCTOR':
        return ProviderCategory.DOCTOR
      case ProviderCategory.PHARMACY:
        return ProviderCategory.PHARMACY
      case ProviderCategory.LABORATORY:
        return ProviderCategory.LABORATORY
      case 'RADIOLOGY_IMAGING':
      case ProviderCategory.RADIOLOGY:
        return ProviderCategory.RADIOLOGY
      case ProviderCategory.HOSPITAL:
        return ProviderCategory.HOSPITAL
      case ProviderCategory.CLINIC:
        return ProviderCategory.CLINIC
      case 'SPECIALIST':
        return ProviderCategory.DOCTOR
      default:
        return ProviderCategory.CLINIC
    }
  }

  private formatProviderCategories(categories: string[] | undefined, primary: ProviderCategory) {
    const normalized = (categories ?? [])
      .map(value => value.trim())
      .filter(Boolean)

    if (normalized.length === 0) {
      return this.titleCase(primary)
    }

    return normalized.map(value => this.titleCase(value)).join(', ')
  }

  private normalizeServiceNames(value: Prisma.JsonValue) {
    if (!Array.isArray(value)) {
      return [] as string[]
    }

    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map(item => item.trim())
          .filter(Boolean),
      ),
    )
  }

  private buildProviderDescription(value: Prisma.JsonValue) {
    return Array.isArray(value) ? value.join(', ') : 'Healthcare provider'
  }

  private buildProviderSlug(name: string, applicationId: string) {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36)

    return `${sanitized || 'provider'}-${applicationId.slice(-6).toLowerCase()}`
  }

  private mapApplicationStatusToClient(status: ProviderApplicationStatus) {
    switch (status) {
      case ProviderApplicationStatus.PENDING:
        return 'pending'
      case ProviderApplicationStatus.INFO_REQUESTED:
        return 'info_requested'
      case ProviderApplicationStatus.APPROVED:
        return 'approved'
      case ProviderApplicationStatus.REJECTED:
        return 'rejected'
    }
  }

  private mapPayoutMethodToClient(method: ProviderPayoutMethod) {
    switch (method) {
      case ProviderPayoutMethod.MPESA:
        return 'mpesa'
      case ProviderPayoutMethod.BANK:
        return 'bank'
      case ProviderPayoutMethod.MOBILE_MONEY:
        return 'mobile_money'
    }
  }

  private mapUserStatusToClient(status: UserStatus) {
    switch (status) {
      case UserStatus.ACTIVE:
        return 'active'
      case UserStatus.SUSPENDED:
        return 'suspended'
      case UserStatus.PENDING_VERIFICATION:
        return 'pending_verification'
    }
  }

  private mapCreditStatusToClient(status?: CreditStatus) {
    switch (status) {
      case CreditStatus.APPROVED:
        return 'approved'
      case CreditStatus.PENDING:
        return 'pending'
      case CreditStatus.REJECTED:
        return 'rejected'
      case CreditStatus.NOT_APPLIED:
      default:
        return 'not_applied'
    }
  }

  private mapFinancePartner(value?: string | null) {
    const normalized = value?.toLowerCase() ?? ''
    if (normalized.includes('equity')) return 'equity'
    if (normalized.includes('money')) return 'moneymart'
    return undefined
  }

  private buildAdminPaymentsWhere(search: string, country: string): Prisma.InvoiceWhereInput {
    const filters: Prisma.InvoiceWhereInput[] = [
      {
        status: {
          in: [InvoiceStatus.AUTHORIZED, InvoiceStatus.PAID],
        },
      },
    ]

    if (country !== 'all') {
      filters.push({
        provider: {
          country: {
            in: this.countryCodesForFilter(country),
          },
        },
      })
    }

    if (search) {
      filters.push({
        OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { billedToName: { contains: search, mode: 'insensitive' } },
          { paymentRef: { contains: search, mode: 'insensitive' } },
          { provider: { name: { contains: search, mode: 'insensitive' } } },
        ],
      })
    }

    return { AND: filters }
  }

  private countryCodesForFilter(country: string) {
    if (country === 'Kenya') return ['Kenya', 'KE']
    if (country === 'Zambia') return ['Zambia', 'ZM']
    return ['Zimbabwe', 'ZW']
  }

  private buildPaymentVolumeByCountry(
    rows: Array<{ amount: Prisma.Decimal; provider: { country: string | null } | null }>,
    countryFilter: string,
  ) {
    const countries = countryFilter === 'all'
      ? (['Zimbabwe', 'Kenya', 'Zambia'] as const)
      : ([countryFilter] as const)

    return countries.map(country => {
      const matched = rows.filter(row => this.mapCountry(row.provider?.country) === country)
      return {
        country,
        volume: matched.reduce((sum, row) => sum + Number(row.amount), 0),
        count: matched.length,
      }
    })
  }

  private mapAdminPayment(invoice: {
    reference: string
    billedToName: string
    amount: Prisma.Decimal
    status: InvoiceStatus
    issueDate: Date
    paymentAuthorizedAt: Date | null
    paidAt: Date | null
    paymentRef: string | null
    provider: { name: string; country: string | null }
    transaction: { id: string; occurredAt: Date } | null
  }) {
    const paymentDate =
      invoice.paidAt ??
      invoice.paymentAuthorizedAt ??
      invoice.transaction?.occurredAt ??
      invoice.issueDate

    return {
      id: invoice.transaction?.id ?? invoice.paymentRef ?? invoice.reference,
      invoiceId: invoice.reference,
      patient: invoice.billedToName,
      provider: invoice.provider.name,
      amount: Number(invoice.amount),
      country: this.mapCountry(invoice.provider.country),
      date: paymentDate.toISOString(),
      status: this.mapInvoicePaymentStatus(invoice.status),
      paymentRef: invoice.paymentRef ?? undefined,
    }
  }

  private mapInvoicePaymentStatus(status: InvoiceStatus): 'paid' | 'authorized' | 'pending' {
    // Platform payments always display as authorized (no pending/paid split in UI).
    if (
      status === InvoiceStatus.PAID ||
      status === InvoiceStatus.AUTHORIZED ||
      status === InvoiceStatus.PENDING_AUTH
    ) {
      return 'authorized'
    }
    return 'authorized'
  }

  private mapActivityItem(log: {
    id: string
    action: string
    metadata: Prisma.JsonValue | null
    createdAt: Date
    actor: {
      email: string
      patientProfile: {
        firstName: string
        lastName: string
        countryCode: string
      } | null
      providerRecord: {
        name: string
        country: string | null
      } | null
    } | null
  }) {
    const metadata = this.asObject(log.metadata)
    const isProviderAction = log.action.startsWith('sp.')
    const actorType = isProviderAction ? ('provider' as const) : ('patient' as const)
    const profile = log.actor?.patientProfile
    const provider = log.actor?.providerRecord
    const actorName = isProviderAction
      ? provider?.name ??
        this.asOptionalString(metadata.practiceName) ??
        log.actor?.email ??
        'Service provider'
      : profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : log.actor?.email ?? 'Patient'
    const country = isProviderAction
      ? this.mapCountry(provider?.country)
      : this.mapCountry(profile?.countryCode)
    const reference =
      this.asOptionalString(metadata.reference) ??
      this.asOptionalString(metadata.invoiceReference) ??
      undefined
    const paymentReference = this.asOptionalString(metadata.paymentReference)
    const previousReference = this.asOptionalString(metadata.previousReference)
    const reason = this.asOptionalString(metadata.reason)
    const note = this.asOptionalString(metadata.note)
    const practiceName = this.asOptionalString(metadata.practiceName)
    const rescheduleDate = this.asOptionalString(metadata.date)
    const rescheduleTime = this.asOptionalString(metadata.time)
    const serviceTypes = Array.isArray(metadata.serviceTypes)
      ? metadata.serviceTypes.filter((item): item is string => typeof item === 'string')
      : []
    const { title, actionHighlight, category } = this.describeActivityAction(log.action)

    const summaryParts = [
      reason ? `Reason: ${reason}` : null,
      note && log.action.includes('cancel') ? `Note: ${note}` : null,
      practiceName && log.action === 'sp.application.submitted'
        ? `Practice: ${practiceName}`
        : null,
      serviceTypes.length > 0 && log.action === 'sp.application.submitted'
        ? `Services: ${serviceTypes.join(', ')}`
        : null,
      rescheduleDate && rescheduleTime
        ? `New slot: ${rescheduleDate} at ${rescheduleTime}`
        : null,
      paymentReference ? `Payment ref: ${paymentReference}` : null,
      previousReference && reference && previousReference !== reference
        ? `Updated from ${previousReference}`
        : null,
    ].filter(Boolean)

    const summary = summaryParts.join(' · ') || undefined
    const detail = summary ?? (reference ? `Ref ${reference}` : 'Platform activity recorded')

    return {
      id: log.id,
      actorType,
      actorName,
      country,
      title,
      actionHighlight,
      reference,
      summary,
      detail,
      occurredAt: log.createdAt.toISOString(),
      category,
    }
  }

  private describeActivityAction(action: string): {
    title: string
    actionHighlight: string
    category: 'appointment' | 'invoice' | 'payment' | 'registration'
  } {
    const labels: Record<
      string,
      {
        title: string
        actionHighlight: string
        category: 'appointment' | 'invoice' | 'payment' | 'registration'
      }
    > = {
      'patient.registered': {
        title: 'New patient registered',
        actionHighlight: 'Registered',
        category: 'registration',
      },
      'patient.appointment.created': {
        title: 'Appointment booked',
        actionHighlight: 'Booked',
        category: 'appointment',
      },
      'patient.appointment.cancelled': {
        title: 'Appointment cancelled',
        actionHighlight: 'Cancelled',
        category: 'appointment',
      },
      'patient.appointment.reschedule-confirmed': {
        title: 'Reschedule confirmed',
        actionHighlight: 'Confirmed',
        category: 'appointment',
      },
      'patient.invoice.authorized': {
        title: 'Payment authorized',
        actionHighlight: 'Authorized',
        category: 'payment',
      },
      'patient.invoice.rejected': {
        title: 'Invoice rejected',
        actionHighlight: 'Rejected',
        category: 'invoice',
      },
      'sp.application.submitted': {
        title: 'Provider application submitted',
        actionHighlight: 'Submitted',
        category: 'registration',
      },
      'sp.invoice.created': {
        title: 'Invoice sent to patient',
        actionHighlight: 'Invoice sent',
        category: 'invoice',
      },
      'sp.invoice.updated': {
        title: 'Invoice corrected',
        actionHighlight: 'Invoice updated',
        category: 'invoice',
      },
      'sp.visit.created': {
        title: 'Patient visit recorded',
        actionHighlight: 'Visit recorded',
        category: 'appointment',
      },
      'sp.appointment.rescheduled': {
        title: 'Appointment rescheduled',
        actionHighlight: 'Rescheduled',
        category: 'appointment',
      },
      'sp.appointment.confirmed': {
        title: 'Appointment confirmed',
        actionHighlight: 'Confirmed',
        category: 'appointment',
      },
      'sp.appointment.cancelled': {
        title: 'Appointment cancelled',
        actionHighlight: 'Cancelled',
        category: 'appointment',
      },
      'sp.appointment.completed': {
        title: 'Appointment completed',
        actionHighlight: 'Completed',
        category: 'appointment',
      },
      'admin.provider_application.approved': {
        title: 'Provider application approved',
        actionHighlight: 'Approved',
        category: 'registration',
      },
      'admin.provider_application.rejected': {
        title: 'Provider application rejected',
        actionHighlight: 'Rejected',
        category: 'registration',
      },
      'admin.provider_application.info_requested': {
        title: 'More provider information requested',
        actionHighlight: 'Info requested',
        category: 'registration',
      },
      'admin.credit_application.approved': {
        title: 'Credit application approved',
        actionHighlight: 'Approved',
        category: 'payment',
      },
      'admin.credit_application.rejected': {
        title: 'Credit application rejected',
        actionHighlight: 'Rejected',
        category: 'payment',
      },
    }

    if (labels[action]) {
      return labels[action]
    }

    if (action.startsWith('sp.appointment.')) {
      const status = action.split('.').pop() ?? 'updated'
      const highlight = this.titleCase(status.replace(/-/g, '_'))
      return { title: `Appointment ${status.replace(/-/g, ' ')}`, actionHighlight: highlight, category: 'appointment' }
    }

    return { title: 'Platform activity', actionHighlight: 'Activity', category: 'appointment' }
  }

  private mapCountry(value?: string | null) {
    if (value === 'KE' || value === 'Kenya') return 'Kenya'
    if (value === 'ZM' || value === 'Zambia') return 'Zambia'
    return 'Zimbabwe'
  }

  private maskNationalId(countryCode?: string | null, last4?: string | null) {
    const suffix = last4?.trim()
    if (!suffix) return 'Not available'
    const prefix = countryCode?.trim() ? `${countryCode.toUpperCase()}-` : ''
    return `${prefix}****${suffix}`
  }

  private titleCase(value: string) {
    return value
      .toLowerCase()
      .split('_')
      .map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ')
  }

  private asObject(value: Prisma.JsonValue | null | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, unknown>
    }

    return value as Record<string, unknown>
  }

  async getCreditApplications() {
    const applications = await this.prisma.creditApplication.findMany({
      include: {
        patient: {
          select: {
            email: true,
            phone: true,
            country: true,
            patientProfile: {
              select: {
                firstName: true,
                lastName: true,
                countryCode: true,
                residenceCountry: true,
                residesAbroad: true,
                creditLimit: true,
                creditAvailable: true,
                creditUsed: true,
                creditStatus: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return applications.map(application => this.mapCreditApplication(application))
  }

  async getCreditApplication(applicationId: string) {
    const application = await this.prisma.creditApplication.findUnique({
      where: { id: applicationId },
      include: {
        patient: {
          select: {
            email: true,
            phone: true,
            country: true,
            patientProfile: {
              select: {
                firstName: true,
                lastName: true,
                countryCode: true,
                residenceCountry: true,
                residesAbroad: true,
                creditLimit: true,
                creditAvailable: true,
                creditUsed: true,
                creditStatus: true,
              },
            },
          },
        },
      },
    })

    if (!application) {
      throw new NotFoundException('Credit application not found')
    }

    return this.mapCreditApplication(application)
  }

  async approveCreditApplication(
    actorUserId: string,
    applicationId: string,
    dto: CreditApplicationActionDto,
  ) {
    const application = await this.prisma.creditApplication.findUnique({
      where: { id: applicationId },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
      },
    })

    if (!application) {
      throw new NotFoundException('Credit application not found')
    }

    if (application.status !== CreditApplicationStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted applications can be approved')
    }

    const approvedAmount = dto.approvedAmount ?? Number(application.requestedAmount)
    if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
      throw new BadRequestException('Approved amount must be greater than zero')
    }

    await this.prisma.$transaction(async tx => {
      const profile = application.patient.patientProfile
      if (!profile) {
        throw new NotFoundException('Patient profile not found')
      }

      const currentLimit = Number(profile.creditLimit)
      const currentUsed = Number(profile.creditUsed)
      const currentAvailable = Number(profile.creditAvailable)

      const nextLimit = application.type === CreditApplicationType.INCREASE
        ? currentLimit + approvedAmount
        : approvedAmount
      const nextAvailable = application.type === CreditApplicationType.INCREASE
        ? currentAvailable + approvedAmount
        : approvedAmount - currentUsed

      await tx.creditApplication.update({
        where: { id: application.id },
        data: {
          status: CreditApplicationStatus.APPROVED,
          approvedAmount,
          reviewedByUserId: actorUserId,
          reviewedAt: new Date(),
          declineReason: null,
        },
      })

      await tx.patientProfile.update({
        where: { userId: application.patientUserId },
        data: {
          creditStatus: CreditStatus.APPROVED,
          creditLimit: nextLimit,
          creditAvailable: Math.max(0, nextAvailable),
          financePartnerId: application.financePartnerId,
          creditAccountRef: application.type === CreditApplicationType.INITIAL
            ? application.reference
            : profile.creditAccountRef ?? application.reference,
        },
      })

      await tx.notification.create({
        data: {
          userId: application.patientUserId,
          type: NotificationType.CREDIT,
          title: application.type === CreditApplicationType.INCREASE
            ? 'Limit Increase Approved'
            : 'Credit Application Approved',
          body: application.type === CreditApplicationType.INCREASE
            ? `Your limit increase of ${approvedAmount} was approved. Your updated balance is ready to use.`
            : `Your credit application ${application.reference} was approved. ${approvedAmount} has been loaded to your wallet.`,
          screen: '/app/credit',
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'admin.credit_application.approved',
          entityType: 'CreditApplication',
          entityId: application.id,
          metadata: {
            reference: application.reference,
            approvedAmount,
            note: dto.note ?? null,
          } as Prisma.JsonObject,
        },
      })
    })

    const approvedPatientName =
      `${application.patient.patientProfile?.firstName ?? ''} ${application.patient.patientProfile?.lastName ?? ''}`.trim() ||
      'there'
    void this.mailService.sendCreditDecisionEmail(application.patient.email, {
      patientName: approvedPatientName,
      approved: true,
      amount: `KSh ${Number(approvedAmount).toFixed(2)}`,
      note: dto.note ?? undefined,
    })

    return this.getCreditApplication(applicationId)
  }

  async rejectCreditApplication(
    actorUserId: string,
    applicationId: string,
    dto: CreditApplicationActionDto,
  ) {
    const application = await this.prisma.creditApplication.findUnique({
      where: { id: applicationId },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
      },
    })

    if (!application) {
      throw new NotFoundException('Credit application not found')
    }

    if (application.status !== CreditApplicationStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted applications can be rejected')
    }

    const profile = application.patient.patientProfile
    if (!profile) {
      throw new NotFoundException('Patient profile not found')
    }

    const nextCreditStatus = application.type === CreditApplicationType.INCREASE
      && profile.creditStatus === CreditStatus.APPROVED
      ? CreditStatus.APPROVED
      : profile.creditLimit.gt(0)
        ? CreditStatus.APPROVED
        : CreditStatus.REJECTED

    await this.prisma.$transaction(async tx => {
      await tx.creditApplication.update({
        where: { id: application.id },
        data: {
          status: CreditApplicationStatus.REJECTED,
          reviewedByUserId: actorUserId,
          reviewedAt: new Date(),
          declineReason: dto.note ?? 'Application declined by admin',
        },
      })

      await tx.patientProfile.update({
        where: { userId: application.patientUserId },
        data: { creditStatus: nextCreditStatus },
      })

      await tx.notification.create({
        data: {
          userId: application.patientUserId,
          type: NotificationType.CREDIT,
          title: application.type === CreditApplicationType.INCREASE
            ? 'Limit Increase Declined'
            : 'Credit Application Declined',
          body: dto.note ?? 'Your credit request was not approved at this time.',
          screen: '/app/credit/status',
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'admin.credit_application.rejected',
          entityType: 'CreditApplication',
          entityId: application.id,
          metadata: {
            reference: application.reference,
            note: dto.note ?? null,
          } as Prisma.JsonObject,
        },
      })
    })

    const rejectedPatientName =
      `${application.patient.patientProfile?.firstName ?? ''} ${application.patient.patientProfile?.lastName ?? ''}`.trim() ||
      'there'
    void this.mailService.sendCreditDecisionEmail(application.patient.email, {
      patientName: rejectedPatientName,
      approved: false,
      note: dto.note ?? undefined,
    })

    return this.getCreditApplication(applicationId)
  }

  private mapCreditApplication(application: {
    id: string
    reference: string
    patientUserId: string
    type: CreditApplicationType
    status: CreditApplicationStatus
    financePartnerId: string
    employment: string
    monthlyIncome: Prisma.Decimal
    requestedAmount: Prisma.Decimal
    approvedAmount: Prisma.Decimal | null
    reason: string | null
    notes: string | null
    declineReason: string | null
    submittedAt: Date
    reviewedAt: Date | null
    patient: {
      email: string
      phone: string | null
      country: string | null
      patientProfile: {
        firstName: string
        lastName: string
        countryCode: string
        residenceCountry: string | null
        residesAbroad: boolean
        creditLimit: Prisma.Decimal
        creditAvailable: Prisma.Decimal
        creditUsed: Prisma.Decimal
        creditStatus: CreditStatus
      } | null
    }
  }) {
    const profile = application.patient.patientProfile
    const residenceCountry = profile?.residenceCountry
      ?? application.patient.country
      ?? profile?.countryCode
      ?? ''
    return {
      id: application.id,
      reference: application.reference,
      patientUserId: application.patientUserId,
      patientName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Unknown patient',
      patientEmail: application.patient.email,
      patientPhone: application.patient.phone ?? '',
      country: residenceCountry,
      residenceCountry,
      residesAbroad: Boolean(profile?.residesAbroad),
      marketCountryCode: profile?.countryCode ?? '',
      type: application.type.toLowerCase() as 'initial' | 'increase',
      status: application.status.toLowerCase() as 'submitted' | 'approved' | 'rejected',
      financePartnerId: application.financePartnerId.toLowerCase(),
      employment: application.employment,
      monthlyIncome: Number(application.monthlyIncome),
      requestedAmount: Number(application.requestedAmount),
      approvedAmount: application.approvedAmount != null ? Number(application.approvedAmount) : undefined,
      currentCreditLimit: profile ? Number(profile.creditLimit) : 0,
      currentCreditAvailable: profile ? Number(profile.creditAvailable) : 0,
      currentCreditUsed: profile ? Number(profile.creditUsed) : 0,
      creditStatus: profile?.creditStatus.toLowerCase() ?? 'not_applied',
      reason: application.reason ?? undefined,
      notes: application.notes ?? undefined,
      declineReason: application.declineReason ?? undefined,
      submittedAt: application.submittedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString(),
    }
  }

  private asOptionalString(value: unknown) {
    return typeof value === 'string' ? value : undefined
  }
}
