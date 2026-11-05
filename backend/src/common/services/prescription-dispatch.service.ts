import { Inject, Injectable } from '@nestjs/common'
import {
  NotificationType,
  Prisma,
  PrescriptionOfferStatus,
  PrescriptionRequestStatus,
  ProviderCategory,
  ProviderLifecycleStatus,
} from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Search rings for a prescription, in km. A request goes to every registered pharmacy in the
 * first ring that has any; if all of them decline, it widens to the next ring.
 */
export const PRESCRIPTION_SEARCH_RINGS_KM = [2, 6] as const

export interface NearbyPharmacy {
  id: number
  name: string
  authUserId: string | null
  distanceKm: number
}

type Db = PrismaService | Prisma.TransactionClient

const EARTH_RADIUS_KM = 6371

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

@Injectable()
export class PrescriptionDispatchService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Registered, active pharmacies with a map location within `radiusKm` of the point, nearest first.
   * "Registered" means the pharmacy has a portal account, so it can actually answer the request.
   */
  async findPharmaciesWithin(
    lat: number,
    lng: number,
    radiusKm: number,
    db: Db = this.prisma,
  ): Promise<NearbyPharmacy[]> {
    // Bounding box first so Postgres does the coarse filtering; haversine trims the corners.
    const latDelta = radiusKm / 111.32
    const lngDelta = radiusKm / (111.32 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)))

    const candidates = await db.provider.findMany({
      where: {
        lifecycleStatus: ProviderLifecycleStatus.ACTIVE,
        authUserId: { not: null },
        lat: { not: null, gte: lat - latDelta, lte: lat + latDelta },
        lng: { not: null, gte: lng - lngDelta, lte: lng + lngDelta },
        OR: [
          { category: ProviderCategory.PHARMACY },
          { categories: { hasSome: ['PHARMACY', 'Pharmacy', 'pharmacy'] } },
        ],
      },
      select: { id: true, name: true, authUserId: true, lat: true, lng: true },
    })

    return candidates
      .map(provider => ({
        id: provider.id,
        name: provider.name,
        authUserId: provider.authUserId,
        distanceKm: haversineKm(lat, lng, Number(provider.lat), Number(provider.lng)),
      }))
      .filter(provider => provider.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
  }

  /** The smallest ring that has at least one pharmacy, or null when none are within the widest ring. */
  async findInitialRing(lat: number, lng: number, db: Db = this.prisma) {
    const widest = PRESCRIPTION_SEARCH_RINGS_KM[PRESCRIPTION_SEARCH_RINGS_KM.length - 1]
    const all = await this.findPharmaciesWithin(lat, lng, widest, db)

    for (const radiusKm of PRESCRIPTION_SEARCH_RINGS_KM) {
      const pharmacies = all.filter(pharmacy => pharmacy.distanceKm <= radiusKm)
      if (pharmacies.length > 0) return { radiusKm, pharmacies }
    }
    return null
  }

  /** Creates one offer per pharmacy and lets each pharmacy know. */
  async createOffers(
    db: Prisma.TransactionClient,
    request: { id: string; reference: string; fulfillmentMode: string },
    radiusKm: number,
    pharmacies: NearbyPharmacy[],
  ) {
    if (pharmacies.length === 0) return

    await db.prescriptionOffer.createMany({
      data: pharmacies.map(pharmacy => ({
        requestId: request.id,
        providerId: pharmacy.id,
        radiusKm,
        distanceKm: Number(pharmacy.distanceKm.toFixed(2)),
      })),
      skipDuplicates: true,
    })

    const mode = request.fulfillmentMode === 'DELIVERY' ? 'delivery' : 'pickup'
    await db.notification.createMany({
      data: pharmacies
        .filter(pharmacy => pharmacy.authUserId)
        .map(pharmacy => ({
          userId: pharmacy.authUserId!,
          type: NotificationType.PRESCRIPTION,
          title: 'New Prescription Nearby',
          body: `A patient ${pharmacy.distanceKm.toFixed(1)} km away needs a prescription filled (${mode}). Send a price or decline.`,
          screen: `/sp/prescriptions/${request.reference}`,
        })),
    })
  }

  /**
   * Called after a pharmacy declines. When nobody in the current ring is still able to answer,
   * widen to the next ring; past the widest ring the request expires.
   */
  async advanceAfterDecline(requestId: string) {
    return this.prisma.$transaction(async tx => {
      const request = await tx.prescriptionRequest.findUnique({
        where: { id: requestId },
        include: { offers: { select: { providerId: true, status: true } } },
      })

      if (!request || request.providerId != null) return null
      if (
        request.status !== PrescriptionRequestStatus.SUBMITTED &&
        request.status !== PrescriptionRequestStatus.QUOTED
      ) {
        return null
      }

      const stillOpen = request.offers.some(
        offer =>
          offer.status === PrescriptionOfferStatus.PENDING ||
          offer.status === PrescriptionOfferStatus.QUOTED,
      )
      if (stillOpen) return null

      const currentRadius = request.searchRadiusKm ?? PRESCRIPTION_SEARCH_RINGS_KM[0]
      const nextRadius = PRESCRIPTION_SEARCH_RINGS_KM.find(radius => radius > currentRadius)
      const alreadyAsked = new Set(request.offers.map(offer => offer.providerId))

      if (nextRadius != null && request.searchLat != null && request.searchLng != null) {
        const nextRing = (
          await this.findPharmaciesWithin(Number(request.searchLat), Number(request.searchLng), nextRadius, tx)
        ).filter(pharmacy => !alreadyAsked.has(pharmacy.id))

        if (nextRing.length > 0) {
          await tx.prescriptionRequest.update({
            where: { id: request.id },
            data: { searchRadiusKm: nextRadius, widenedAt: new Date() },
          })
          await this.createOffers(tx, request, nextRadius, nextRing)
          await tx.notification.create({
            data: {
              userId: request.patientUserId,
              type: NotificationType.PRESCRIPTION,
              title: 'Searching Further',
              body: `No pharmacy within ${currentRadius} km could fill your prescription, so we sent it to ${nextRing.length} more within ${nextRadius} km.`,
              screen: `/app/prescriptions/${request.reference}`,
            },
          })
          return { widenedTo: nextRadius, pharmacies: nextRing.length }
        }
      }

      await tx.prescriptionRequest.update({
        where: { id: request.id },
        data: { status: PrescriptionRequestStatus.EXPIRED, expiredAt: new Date() },
      })
      await tx.notification.create({
        data: {
          userId: request.patientUserId,
          type: NotificationType.PRESCRIPTION,
          title: 'No Available Pharmacies',
          body: `No pharmacy within ${PRESCRIPTION_SEARCH_RINGS_KM[PRESCRIPTION_SEARCH_RINGS_KM.length - 1]} km could fill your prescription.`,
          screen: `/app/prescriptions/${request.reference}`,
        },
      })
      return { expired: true }
    })
  }

  /** Closes every offer still open on a request, except the chosen one. */
  async closeOtherOffers(
    db: Prisma.TransactionClient,
    requestId: string,
    keepOfferId: string | null,
  ) {
    const open = await db.prescriptionOffer.findMany({
      where: {
        requestId,
        id: keepOfferId ? { not: keepOfferId } : undefined,
        status: { in: [PrescriptionOfferStatus.PENDING, PrescriptionOfferStatus.QUOTED] },
      },
      include: { provider: { select: { authUserId: true } } },
    })
    if (open.length === 0) return open

    await db.prescriptionOffer.updateMany({
      where: { id: { in: open.map(offer => offer.id) } },
      data: { status: PrescriptionOfferStatus.CLOSED, closedAt: new Date() },
    })
    return open
  }
}
