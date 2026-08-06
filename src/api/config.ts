export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

/** When true, services return mock fixtures instead of calling the backend. */
export const isMockApi =
  import.meta.env.VITE_USE_MOCK_API !== 'false'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

/** Secret admin portal token sent with admin login requests. */
export const ADMIN_PORTAL_TOKEN = import.meta.env.VITE_ADMIN_PORTAL_TOKEN ?? ''
