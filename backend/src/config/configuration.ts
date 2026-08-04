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
    },
    security: {
      fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY ?? '',
    },
    oauth: {
      googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      googleMobileClientId: process.env.GOOGLE_CLIENT_ID_MOBILE ?? '',
      googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL ?? '',
    },
    notifications: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
      vapidSubject: process.env.VAPID_SUBJECT ?? '',
      emailFrom: process.env.EMAIL_FROM ?? '',
      brevoApiKey: process.env.BREVO_API_KEY ?? '',
    },
  }
}
