/**
 * Move inline (base64) attachments out of PostgreSQL and into object storage.
 *
 * Covers invoice PDFs, prescription uploads and appointment attachments. Each file is uploaded
 * first; the row is then updated to hold only the object key. A row that fails is left as it was.
 * Safe to re-run: rows already moved carry `storage: 'bucket'` and are skipped.
 *
 *   node dist/src/scripts/migrate-attachments.js --dry-run   # count and size, no changes
 *   node dist/src/scripts/migrate-attachments.js             # migrate
 */
import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { configuration } from '../config/configuration'
import { StorageService, type AttachmentMetadata } from '../common/services/storage.service'

const BATCH = 50
const dryRun = process.argv.includes('--dry-run')

type Inline = AttachmentMetadata & { dataUrl: string }

const isInline = (value: unknown): value is Inline =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as Inline).dataUrl === 'string' &&
  (value as Inline).dataUrl.trim().length > 0 &&
  (value as Inline).storage !== 'bucket'

const dataBytes = (dataUrl: string) => Math.floor(((dataUrl.split(',')[1] ?? '').length * 3) / 4)

const stats = { rows: 0, files: 0, bytes: 0, skipped: 0, failed: 0 }

async function main() {
  const storage = new StorageService(new ConfigService(configuration()))
  if (!dryRun && !storage.isEnabled) {
    throw new Error('Object storage is not configured (STORAGE_* variables). Nothing was changed.')
  }
  const prisma = new PrismaClient()
  console.log(dryRun ? 'Dry run: no changes will be made.' : 'Migrating attachments to object storage.')

  // Move one file: upload it (unless dry run), return the metadata to store.
  const move = async (meta: Inline, prefix: 'invoices' | 'prescriptions' | 'appointments', uploaded: string[]) => {
    stats.files += 1
    stats.bytes += dataBytes(meta.dataUrl)
    if (dryRun) return meta
    const stored = await storage.externalize(meta, prefix)
    if (stored?.storageKey) uploaded.push(stored.storageKey)
    return stored as AttachmentMetadata
  }

  // Invoices: one attachment per row, stored as JSON on the invoice.
  let cursor: string | undefined
  for (;;) {
    const rows: Array<{ id: string; attachmentMetadata: Prisma.JsonValue }> = await prisma.invoice.findMany({
      where: { attachmentMetadata: { not: Prisma.DbNull } },
      select: { id: true, attachmentMetadata: true },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
    if (rows.length === 0) break
    cursor = rows[rows.length - 1].id
    for (const row of rows) {
      if (!isInline(row.attachmentMetadata)) { stats.skipped += 1; continue }
      const uploaded: string[] = []
      try {
        const next = await move(row.attachmentMetadata, 'invoices', uploaded)
        if (!dryRun) {
          await prisma.invoice.update({
            where: { id: row.id },
            data: { attachmentMetadata: next as unknown as Prisma.InputJsonValue },
          })
        }
        stats.rows += 1
      } catch (error) {
        stats.failed += 1
        console.error(`invoice ${row.id} not moved: ${(error as Error).message}`)
        await Promise.all(uploaded.map(key => storage.deleteObject(key)))
      }
    }
  }

  // Prescription uploads: one attachment per request, stored as JSON on the request.
  cursor = undefined
  for (;;) {
    const rows: Array<{ id: string; prescriptionAttachment: Prisma.JsonValue }> = await prisma.prescriptionRequest.findMany({
      select: { id: true, prescriptionAttachment: true },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
    if (rows.length === 0) break
    cursor = rows[rows.length - 1].id
    for (const row of rows) {
      if (!isInline(row.prescriptionAttachment)) { stats.skipped += 1; continue }
      const uploaded: string[] = []
      try {
        const current = row.prescriptionAttachment
        const next = await move(current, 'prescriptions', uploaded)
        if (!dryRun) {
          await prisma.prescriptionRequest.update({
            where: { id: row.id },
            data: { prescriptionAttachment: next as unknown as Prisma.InputJsonValue },
          })
        }
        stats.rows += 1
      } catch (error) {
        stats.failed += 1
        console.error(`prescription ${row.id} not moved: ${(error as Error).message}`)
        await Promise.all(uploaded.map(key => storage.deleteObject(key)))
      }
    }
  }

  // Appointment attachments: a list per appointment; each file that is inline is moved.
  cursor = undefined
  for (;;) {
    const rows: Array<{ id: string; attachments: Prisma.JsonValue }> = await prisma.appointment.findMany({
      where: { attachments: { not: Prisma.DbNull } },
      select: { id: true, attachments: true },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
    if (rows.length === 0) break
    cursor = rows[rows.length - 1].id
    for (const row of rows) {
      const list = Array.isArray(row.attachments) ? row.attachments : []
      if (!list.some(isInline)) { stats.skipped += 1; continue }
      const uploaded: string[] = []
      try {
        const next: unknown[] = []
        for (const item of list) {
          if (!isInline(item)) { next.push(item); continue }
          // Same mapping the API uses on write: the app's name and size become the stored fields.
          const app = item as unknown as { name?: string; size?: string }
          const meta = { ...app, originalName: app.name, displaySize: app.size, dataUrl: item.dataUrl } as Inline
          next.push(await move(meta, 'appointments', uploaded))
        }
        if (!dryRun) {
          await prisma.appointment.update({
            where: { id: row.id },
            data: { attachments: next as unknown as Prisma.InputJsonValue },
          })
        }
        stats.rows += 1
      } catch (error) {
        stats.failed += 1
        console.error(`appointment ${row.id} not moved: ${(error as Error).message}`)
        await Promise.all(uploaded.map(key => storage.deleteObject(key)))
      }
    }
  }

  await prisma.$disconnect()
  const mb = (stats.bytes / (1024 * 1024)).toFixed(2)
  console.log(
    `${dryRun ? 'Would move' : 'Moved'} ${stats.files} file(s), ${mb} MB, across ${stats.rows} row(s). ` +
      `Skipped ${stats.skipped} row(s) with nothing to move. Failed: ${stats.failed}.`,
  )
  if (stats.failed > 0) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
