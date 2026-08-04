import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  ProviderCategory,
  ProviderLifecycleStatus,
  ProviderOpenStatus,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { formatPatientFullName } from '../../common/utils/patient-name.util'

type ReviewWithPatient = {
  id: string
  reference: string
  providerId: number
  rating: number
  text: string
  createdAt: Date
  patient: {
    patientProfile: {
      firstName: string
      lastName: string
    } | null
  }
}

@Injectable()
export class ProvidersService {
  private readonly prisma: PrismaService

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    this.prisma = prisma
  }

  async getAll(country?: string) {
    const providers = await this.prisma.provider.findMany({
      where: {
        lifecycleStatus: ProviderLifecycleStatus.ACTIVE,
        ...this.countryWhere(country),
      },
      include: {
        services: true,
      },
      orderBy: [{ rating: 'desc' }, { name: 'asc' }],
    })

    return providers.map(provider => this.mapProvider(provider))
  }

  async getByCategory(category: string, country?: string) {
    const parsed = this.parseCategory(category)
    const countryFilter = this.countryWhere(country)
    const providers = await this.prisma.provider.findMany({
      where: {
        lifecycleStatus: ProviderLifecycleStatus.ACTIVE,
        AND: [
          { OR: [{ category: parsed }, { categories: { has: parsed } }] },
          ...(Object.keys(countryFilter).length > 0 ? [countryFilter] : []),
        ],
      },
      include: { services: true },
      orderBy: [{ rating: 'desc' }, { name: 'asc' }],
    })

    return providers.map(provider => this.mapProvider(provider))
  }

  async getById(id: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        services: true,
      },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    return this.mapProvider(provider)
  }

  async getReviews(providerId: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    const reviews = await this.prisma.providerReview.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            patientProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    return reviews.map(review => this.mapReview(review))
  }

  async recalculateRating(providerId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    const aggregate = await client.providerReview.aggregate({
      where: { providerId },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await client.provider.update({
      where: { id: providerId },
      data: {
        rating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count.rating,
      },
    })
  }

  private mapReview(review: ReviewWithPatient) {
    return {
      id: review.reference,
      providerId: review.providerId,
      name: formatPatientFullName(review.patient.patientProfile),
      date: review.createdAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      rating: review.rating,
      text: review.text,
    }
  }

  private countryWhere(country?: string): Prisma.ProviderWhereInput {
    if (!country?.trim()) return {}

    const values = this.countryFilterValues(country)
    return {
      OR: [
        { country: { in: values } },
        // Legacy seeded providers may lack Provider.country — fall back to linked SP user.
        {
          AND: [
            { country: null },
            { authUser: { country: { in: values } } },
          ],
        },
      ],
    }
  }

  private countryFilterValues(country: string): string[] {
    const normalized = country.trim().toUpperCase()
    if (normalized === 'KE' || normalized === 'KENYA') return ['KE', 'Kenya']
    if (normalized === 'ZM' || normalized === 'ZAMBIA') return ['ZM', 'Zambia']
    return ['ZW', 'Zimbabwe']
  }

  private mapProvider(provider: {
    id: number
    name: string
    category: ProviderCategory
    categories?: string[]
    rating: Prisma.Decimal
    reviewCount: number
    distanceKm: Prisma.Decimal | null
    status: ProviderOpenStatus
    hours: string
    phone: string
    address: string
    description: string | null
    about: string | null
    license: string | null
    logoUrl: string | null
    languages: Prisma.JsonValue | null
    establishedYear: number | null
    lat: Prisma.Decimal | null
    lng: Prisma.Decimal | null
    country: string | null
    services: Array<{ name: string }>
  }) {
    return {
      id: provider.id,
      name: provider.name,
      category: this.mapCategoryToClient(provider.category),
      categories:
        provider.categories && provider.categories.length > 0
          ? provider.categories.map(category => this.mapCategoryToClient(category))
          : [this.mapCategoryToClient(provider.category)],
      rating: Number(provider.rating),
      reviews: provider.reviewCount,
      distance: provider.distanceKm ? `${Number(provider.distanceKm).toFixed(1)} km` : 'Nearby',
      status: provider.status === ProviderOpenStatus.OPEN ? 'open' : 'closed',
      services: provider.services.map(service => service.name),
      hours: provider.hours,
      phone: provider.phone,
      address: provider.address,
      country: provider.country ?? undefined,
      about: provider.about ?? provider.description ?? undefined,
      license: provider.license ?? undefined,
      logoUrl: provider.logoUrl ?? undefined,
      languages: Array.isArray(provider.languages) ? provider.languages : undefined,
      establishedYear: provider.establishedYear ?? undefined,
      lat: provider.lat ? Number(provider.lat) : undefined,
      lng: provider.lng ? Number(provider.lng) : undefined,
    }
  }

  private parseCategory(category: string): ProviderCategory {
    const normalized = category.trim().toUpperCase()

    switch (normalized) {
      case 'DOCTOR':
        return ProviderCategory.DOCTOR
      case 'PHARMACY':
        return ProviderCategory.PHARMACY
      case 'LABORATORY':
        return ProviderCategory.LABORATORY
      case 'RADIOLOGY':
        return ProviderCategory.RADIOLOGY
      case 'HOSPITAL':
        return ProviderCategory.HOSPITAL
      case 'CLINIC':
        return ProviderCategory.CLINIC
      default:
        throw new NotFoundException('Provider category not found')
    }
  }

  private mapCategoryToClient(category: string) {
    return category.toLowerCase() as
      | 'doctor'
      | 'pharmacy'
      | 'laboratory'
      | 'radiology'
      | 'hospital'
      | 'clinic'
  }
}
