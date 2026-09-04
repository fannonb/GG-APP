const requiredVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'FIELD_ENCRYPTION_KEY',
]

export function validateEnv(env: Record<string, unknown>) {
  for (const variable of requiredVars) {
    const value = env[variable]
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Missing required environment variable: ${variable}`)
    }
  }

  const port = Number(env.PORT ?? 3000)
  if (Number.isNaN(port) || port <= 0) {
    throw new Error('PORT must be a valid positive number')
  }

  const key = String(env.FIELD_ENCRYPTION_KEY)
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('FIELD_ENCRYPTION_KEY must be a 64 character hex string')
  }

  // JWT signing secrets must have real entropy. The example placeholders in
  // .env.example ("change-me-*") would otherwise pass the non-empty check and
  // silently produce forgeable tokens. Hard-fail in production; warn loudly in
  // development so local iteration is not blocked.
  for (const secretVar of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = env[secretVar]
    if (typeof value === 'string' && value.length >= 32) continue
    if (env.NODE_ENV === 'production') {
      throw new Error(
        `${secretVar} must be at least 32 characters long in production — generate one with: openssl rand -base64 48`,
      )
    }
    console.warn(
      `⚠ ${secretVar} is shorter than 32 characters. It is usable for local development only; ` +
        'production boots will refuse to start until a strong random secret is configured.',
    )
  }

  return env
}
