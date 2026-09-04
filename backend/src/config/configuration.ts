function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

export function configuration() {
  return {
    app: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      port: Number(process.env.PORT ?? 3000),
      apiPrefix: process.env.API_PREFIX ?? 'api/v1',
      corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
      // Canonical public app origin for password-reset/deep links. Falls back
      // to the first CORS origin only when unset (local development).
      appBaseUrl: process.env.APP_BASE_URL ?? '',
    },
    database: {
      url: process.env.DATABASE_URL ?? '',
    },
    redis: {
      url: process.env.REDIS_URL ?? '',
    },
    auth: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
      adminRefreshTtl: process.env.ADMIN_REFRESH_TTL ?? '60m',
      // When true, web clients (X-Client: web) receive their refresh token in
      // an httpOnly SameSite=Lax cookie instead of the JSON body, so the
      // 30-day session handle never touches localStorage. Body-returned tokens
      // are unchanged for native clients. Requires the API and web app to be
      // on the same registrable domain (e.g. app. + api. example.com).
      cookieMode: process.env.SESSION_COOKIE_MODE === 'true',
    },
    portal: {
      // Secret admin portal path/token. The path is used only by the frontend;
      // the token must be sent with admin login requests (X-Admin-Portal header).
      adminPath: process.env.ADMIN_PORTAL_PATH ?? '/admin',
      adminToken: process.env.ADMIN_PORTAL_TOKEN || (process.env.NODE_ENV === 'development' ? 'gg-admin-2026' : ''),
    },
    security: {
      fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY ?? '',
    },
    storage: {
      // S3-compatible object storage (Railway Buckets / R2 / AWS S3 / B2).
      // Leave STORAGE_ENDPOINT empty to keep legacy data-URL embedding (dev only).
      endpoint: process.env.STORAGE_ENDPOINT ?? '',
      region: process.env.STORAGE_REGION ?? 'us-east-1',
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? '',
      bucket: process.env.STORAGE_BUCKET ?? '',
      publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? '',
      presignExpiresSeconds: process.env.STORAGE_PRESIGN_EXPIRES ?? '900',
    },
    oauth: {
      googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      googleMobileClientId: process.env.GOOGLE_CLIENT_ID_MOBILE ?? '',
      googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL ?? '',
      // Defense-in-depth: server-side allowlist of OAuth redirect URIs.
      // Empty = validation disabled (Google's own console config still applies).
      allowedRedirectUris: (process.env.GOOGLE_ALLOWED_REDIRECT_URIS ?? '')
        .split(',')
        .map(uri => uri.trim())
        .filter(Boolean),
    },
    notifications: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
      vapidSubject: process.env.VAPID_SUBJECT ?? '',
      emailFrom: process.env.EMAIL_FROM ?? '',
      brevoApiKey: process.env.BREVO_API_KEY ?? '',
      resendApiKey: process.env.RESEND_API_KEY ?? '',
      expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? '',
    },
  }
}
