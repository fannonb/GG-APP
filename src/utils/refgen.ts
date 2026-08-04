/**
 * Centralised reference-number generator for GG'APP.
 *
 * Each entity type has its own counter, persisted to localStorage so numbers
 * survive page refreshes and remain unique within a browser session.
 *
 * Seed values are set above the highest IDs found in mock data so newly
 * generated references never collide with existing records.
 *
 * Format:
 *   with-year  →  {TYPE}-{YYYY}-{zero-padded seq}   e.g. INV-2026-0846
 *   without    →  {TYPE}-{zero-padded seq}            e.g. BEN-004
 */

export type RefType =
  | 'INV'   // Invoice          INV-YYYY-NNNN
  | 'TXN'   // Transaction      TXN-YYYY-NNNN
  | 'APT'   // Appointment      APT-YYYY-NNNN
  | 'AUTH'  // Authorization    AUTH-YYYY-NNNN
  | 'PAY'   // Payment          PAY-YYYY-NNNN
  | 'REV'   // Review           REV-YYYY-NNNN
  | 'PAT'   // Patient          PAT-NNN
  | 'PRV'   // Provider         PRV-NNN
  | 'BEN'   // Beneficiary      BEN-NNN
  | 'GGA'   // Credit account   GGA-NNNNNN
  | 'VIS'   // Visit record     VIS-NNN
  | 'ADB'   // Ad banner        ADB-NNN
  | 'SPA'   // SP application   SPA-NNN

interface RefConfig {
  pad: number       // zero-padding width
  withYear: boolean // prefix with current calendar year
  seed: number      // starting value (counter begins at seed + 1)
}

const CONFIG: Record<RefType, RefConfig> = {
  INV: { pad: 4, withYear: true,  seed: 845  },
  TXN: { pad: 4, withYear: true,  seed: 5    },
  APT: { pad: 4, withYear: true,  seed: 10   },
  AUTH:{ pad: 4, withYear: true,  seed: 0    },
  PAY: { pad: 4, withYear: true,  seed: 42   },
  REV: { pad: 4, withYear: true,  seed: 8    },
  PAT: { pad: 3, withYear: false, seed: 9    },
  PRV: { pad: 3, withYear: false, seed: 8    }, // mock ceiling: PROV-008
  BEN: { pad: 3, withYear: false, seed: 3    },
  GGA: { pad: 6, withYear: false, seed: 0    },
  VIS: { pad: 3, withYear: false, seed: 12   }, // mock ceiling: VH-012
  ADB: { pad: 3, withYear: false, seed: 4    }, // mock ceiling: AD-004
  SPA: { pad: 3, withYear: false, seed: 4    }, // mock ceiling: 4 SP applications
}

const STORAGE_KEY = (type: RefType) => `ggapp_ref_${type}`

// In-memory cache so we don't hit localStorage on every call
const cache: Partial<Record<RefType, number>> = {}

function nextSeq(type: RefType): number {
  if (cache[type] === undefined) {
    const stored = localStorage.getItem(STORAGE_KEY(type))
    cache[type] = stored !== null ? parseInt(stored, 10) : CONFIG[type].seed
  }
  cache[type] = (cache[type] as number) + 1
  try { localStorage.setItem(STORAGE_KEY(type), String(cache[type])) } catch { /* storage full — continue */ }
  return cache[type] as number
}

/**
 * Generate a new unique reference number for the given entity type.
 *
 * @example
 *   generateRef('INV')  // "INV-2026-0846"
 *   generateRef('BEN')  // "BEN-004"
 *   generateRef('GGA')  // "GGA-000001"
 */
export function generateRef(type: RefType): string {
  const { pad, withYear } = CONFIG[type]
  const seq = nextSeq(type)
  const padded = String(seq).padStart(pad, '0')
  return withYear
    ? `${type}-${new Date().getFullYear()}-${padded}`
    : `${type}-${padded}`
}

/**
 * Peek at what the next reference will look like without incrementing.
 * Useful for displaying a preview before the record is saved.
 */
export function previewRef(type: RefType): string {
  const { pad, withYear } = CONFIG[type]
  const current = cache[type] ?? (parseInt(localStorage.getItem(STORAGE_KEY(type)) ?? '', 10) || CONFIG[type].seed)
  const padded = String(current + 1).padStart(pad, '0')
  return withYear
    ? `${type}-${new Date().getFullYear()}-${padded}`
    : `${type}-${padded}`
}

/**
 * Reset all counters (test / dev utility — not exposed in production UI).
 */
export function _resetAllCounters(): void {
  Object.keys(CONFIG).forEach(type => {
    const t = type as RefType
    localStorage.removeItem(STORAGE_KEY(t))
    delete cache[t]
  })
}
