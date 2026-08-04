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

  return env
}
