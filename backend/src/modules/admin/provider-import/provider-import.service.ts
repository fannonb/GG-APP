import { allowedCredentialKinds, toCredentialCountry } from '../../../common/constants/credentials'
import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { Prisma, UserRole, UserStatus } from '@prisma/client'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { randomBytes } from 'node:crypto'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../../prisma/prisma.service'
import { RegisterSpDto } from '../../auth/dto/register-sp.dto'
import { coordinatePair, resolveMapsCoordinates } from '../../../common/utils/provider-location'
import { parseProviderCsv } from './csv'

@Injectable()
export class ProviderImportService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async run(actorUserId: string, csv: string, commit = false) {
    let records: Record<string, string>[]
    try { records = parseProviderCsv(csv) } catch (e) { throw new BadRequestException((e as Error).message) }
    const rows: Array<{ record: number; practiceName: string; email: string; lat?: number; lng?: number; errors: string[] }> = []
    const payloads: RegisterSpDto[] = []
    const seen = new Set<string>()
    for (const [index, r] of records.entries()) {
      const errors: string[] = []
      const email = r.email.toLowerCase()
      let dto: RegisterSpDto | undefined
      try {
        if (seen.has(email)) throw new Error('Duplicate email in this file')
        seen.add(email)
        if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new Error('An account already exists for this email')
        const country = ({ KE: 'Kenya', ZW: 'Zimbabwe', ZM: 'Zambia' } as Record<string, string>)[r.country.toUpperCase()] ?? r.country
        if (!['Kenya', 'Zimbabwe', 'Zambia'].includes(country)) throw new Error('Country must be Kenya, Zimbabwe, Zambia, KE, ZW or ZM')
        const serviceTypes = r.serviceTypes.split('|').map(s => s.trim())
        if (!serviceTypes.length || serviceTypes.some(s => !['Hospital', 'Clinic', 'Doctor', 'Pharmacy', 'Laboratory', 'Radiology'].includes(s))) throw new Error('Use service names from the template, separated by |')
        let point = r.latitude || r.longitude ? coordinatePair(r.latitude, r.longitude) : undefined
        if (r.googleMapsUrl) {
          const extracted = await resolveMapsCoordinates(r.googleMapsUrl)
          if (point && (Math.abs(point.lat - extracted.lat) > 0.0001 || Math.abs(point.lng - extracted.lng) > 0.0001)) throw new Error('Coordinates differ from the Google Maps pin')
          point = extracted
        }
        if (!point) throw new Error('Provide latitude and longitude, or an exact Google Maps pin link')
        const credentials = r.credentialsJson ? JSON.parse(r.credentialsJson) : []
        if (!Array.isArray(credentials) || credentials.some(c => !c || c.document)) throw new Error('credentialsJson must be an array of licence details; upload documents later')
        dto = plainToInstance(RegisterSpDto, {
          practiceName: r.practiceName, email, emailSecondary: r.emailSecondary || undefined, phone: r.phone,
          country, password: randomBytes(32).toString('hex'), serviceTypes,
          licenseNumber: r.licenseNumber || undefined, businessRegNumber: r.businessRegNumber || undefined, taxPin: r.taxPin || undefined, credentials,
          hours: r.hoursJson ? JSON.parse(r.hoursJson) : [],
          location: { address: r.address, city: r.city || undefined, region: r.region || undefined, label: r.locationLabel || undefined, ...point },
          payoutMethod: { method: r.payoutMethod || 'bank', accountNumber: r.accountNumber || undefined, accountName: r.accountName || undefined, bankName: r.bankName || undefined, bankBranch: r.bankBranch || undefined, summary: r.payoutSummary || undefined },
        })
        const allowed = allowedCredentialKinds(toCredentialCountry(country)!, serviceTypes)
        if (credentials.some(c => !allowed.has(c.kind)) || new Set(credentials.map(c => c.kind)).size !== credentials.length) throw new Error('Licence kinds must match the country and services, without duplicates')
        if (credentials.some(c => c.expiresAt && new Date(c.expiresAt).getTime() < Date.now())) throw new Error('A supplied licence has expired')
        const validation = await validate(dto, { whitelist: true, forbidNonWhitelisted: true })
        const flatten = (items: typeof validation): string[] => items.flatMap(v => [...Object.values(v.constraints ?? {}), ...flatten(v.children ?? [])])
        errors.push(...flatten(validation))
        if (!dto.practiceName.trim() || !dto.phone.trim() || !dto.location.address.trim()) errors.push('Practice, phone and address cannot be blank')
      } catch (e) { errors.push((e as Error).message) }
      if (dto) payloads.push(dto)
      rows.push({ record: index + 2, practiceName: r.practiceName, email, lat: dto?.location.lat, lng: dto?.location.lng, errors })
    }
    if (!commit || rows.some(r => r.errors.length)) return { imported: 0, valid: !rows.some(r => r.errors.length), rows }
    const passwordHash = await bcrypt.hash(randomBytes(48).toString('hex'), 12)
    try {
      await this.prisma.$transaction(async tx => {
        for (const dto of payloads) {
          const user = await tx.user.create({ data: { email: dto.email, passwordHash, role: UserRole.SP, status: UserStatus.SUSPENDED, phone: dto.phone, country: dto.country } })
          const application = await tx.providerApplication.create({ data: {
            userId: user.id, importedAt: new Date(), practiceName: dto.practiceName, email: dto.email, emailSecondary: dto.emailSecondary,
            phone: dto.phone, country: dto.country, address: dto.location.address, city: dto.location.city, region: dto.location.region,
            locationLabel: dto.location.label, lat: dto.location.lat, lng: dto.location.lng, serviceTypes: dto.serviceTypes,
            licenseNumber: dto.licenseNumber ?? dto.credentials?.[0]?.number ?? '', businessRegNumber: dto.businessRegNumber, taxPin: dto.taxPin,
            openingHours: dto.hours as unknown as Prisma.InputJsonValue, payoutMethod: dto.payoutMethod.method === 'mpesa' ? 'MPESA' : dto.payoutMethod.method === 'mobile_money' ? 'MOBILE_MONEY' : 'BANK',
            payoutSummary: dto.payoutMethod.summary, payoutDetails: dto.payoutMethod as unknown as Prisma.InputJsonValue,
            credentials: { create: (dto.credentials ?? []).map(c => ({ kind: c.kind, number: c.number, holderName: c.holderName, expiresAt: c.expiresAt ? new Date(c.expiresAt) : undefined })) },
          } })
          await tx.auditLog.create({ data: { actorUserId, action: 'admin.provider.imported', entityType: 'ProviderApplication', entityId: application.id, metadata: { email: dto.email } } })
        }
      }, { timeout: 30_000 })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException('An email was registered during import. No rows were imported. Preview again.')
      throw new ServiceUnavailableException('Import could not be saved. No rows were imported. Please retry.')
    }
    return { imported: payloads.length, valid: true, rows }
  }
}
