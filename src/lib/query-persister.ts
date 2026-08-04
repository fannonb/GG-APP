import { get, set, del } from 'idb-keyval'
import type { PersistedClient } from '@tanstack/react-query-persist-client'

const STORAGE_KEY = 'gg-app-query-cache'

/**
 * IndexedDB-backed persister for the TanStack Query cache. Lets screens
 * render the last known data after a full restart with no network access.
 * Only query state is persisted — in-flight mutations are dropped on
 * purpose, since financial actions (invoice authorization, bookings) must
 * never fire unattended after a restart.
 */
export const idbQueryPersister = {
  persistClient: async (client: PersistedClient): Promise<void> => {
    await set(STORAGE_KEY, client)
  },
  restoreClient: async (): Promise<PersistedClient | undefined> => {
    return await get<PersistedClient>(STORAGE_KEY)
  },
  removeClient: async (): Promise<void> => {
    await del(STORAGE_KEY)
  },
}
