import { apiClient } from '@/api/client'
import { ApiError } from '@/api/types'

export type ImportOutcome = 'import' | 'needs_email' | 'skip' | 'error'

export interface ProviderImportRow {
  record: number
  practiceName: string
  email: string
  serviceTypes: string[]
  city?: string
  lat?: number
  lng?: number
  outcome: ImportOutcome
  errors: string[]
  warnings: string[]
  skipReason?: string
}

export interface ProviderImportResult {
  format: 'template' | 'outscraper'
  valid: boolean
  imported: number
  leadsCreated: number
  summary: { toImport: number; needsEmail: number; skipped: number; errors: number }
  rows: ProviderImportRow[]
}

/** Exactly one of the two. `fileBase64` is the .xlsx bytes without a data: prefix. */
export type ImportSource = { csv: string } | { fileBase64: string; fileName: string }

/** A provider from an Outscraper export that has no email yet. */
export interface ImportLead {
  id: string
  practiceName: string
  phone: string
  website: string
  address: string
  city: string
  region: string
  serviceTypes: string[]
  googleMapsUrl?: string
  createdAt: string
}

export const MAX_IMPORT_BYTES = 15 * 1024 * 1024

export const providerImportKeys = {
  leadsCount: ['admin', 'provider-import', 'leads-count'] as const,
  leads: ['admin', 'provider-import', 'leads'] as const,
}

/** Sends the file as a CSV string or as base64 bytes, depending on its extension. */
export function importFileKind(name: string): 'csv' | 'xlsx' | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.xlsx')) return 'xlsx'
  return null
}

/** Base64 without a data: prefix. Converted in chunks so a 15 MB file cannot overflow the call stack. */
export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** Maps a failed request to the message shown to the admin. */
export function importErrorMessage(error: unknown, fallback: string): string {
  // A 404 means the API process predates these endpoints.
  if (error instanceof ApiError && (error.status === 404 || /provider not found/i.test(error.message))) {
    return 'The API server is running an older build. Restart the API, then try again.'
  }
  return error instanceof Error && error.message ? error.message : fallback
}

export async function fetchProviderImportTemplate(): Promise<string> {
  const { data } = await apiClient.get<string>('/admin/provider-import/template', { responseType: 'text' })
  return data
}

/** `commit: false` checks the file and returns the rows without saving anything. */
export async function importProviders(source: ImportSource, commit: boolean): Promise<ProviderImportResult> {
  // Large Outscraper files take longer than the client's default 30 seconds.
  const { data } = await apiClient.post<ProviderImportResult>('/admin/providers/import', { ...source, commit }, { timeout: 120_000 })
  return data
}

export async function fetchNeedsEmailCount(): Promise<{ needsEmail: number }> {
  const { data } = await apiClient.get<{ needsEmail: number }>('/admin/provider-import/leads/count')
  return data
}

export async function fetchImportLeads(): Promise<ImportLead[]> {
  const { data } = await apiClient.get<ImportLead[]>('/admin/provider-import/leads')
  return data
}

/** Creates the provider account from a lead, using the email the admin found. */
export async function importLead(id: string, email: string): Promise<{ applicationId: string }> {
  const { data } = await apiClient.post<{ applicationId: string }>(`/admin/provider-import/leads/${encodeURIComponent(id)}/import`, { email })
  return data
}

export async function deleteImportLead(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete<{ success: boolean }>(`/admin/provider-import/leads/${encodeURIComponent(id)}`)
  return data
}
