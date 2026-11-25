export interface AppConfig {
  isProduction: boolean
  port: number
  mongodbUri: string
  redisUrl: string
  jwtSecret: string
  accessTokenTtl: number
  refreshTokenTtl: number
  admin: { email?: string; password?: string }
  corsOrigins: string[]
  trustProxy: string | false
}

export const APP_CONFIG = Symbol('APP_CONFIG')

/** Reads the environment and fails fast, listing every problem at once. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const errors: string[] = []

  const required = (key: string): string => {
    const value = env[key]?.trim()
    if (!value) errors.push(`${key} is required`)
    return value ?? ''
  }

  const integer = (key: string, fallback: number): number => {
    const raw = env[key]?.trim()
    if (!raw) return fallback
    const value = Number(raw)
    if (!Number.isInteger(value) || value <= 0) errors.push(`${key} must be a positive integer`)
    return value
  }

  const config: AppConfig = {
    isProduction: env.NODE_ENV === 'production',
    port: integer('PORT', 8000),
    mongodbUri: required('MONGODB_URI'),
    redisUrl: required('REDIS_URL'),
    jwtSecret: required('JWT_SECRET'),
    accessTokenTtl: integer('ACCESS_TOKEN_TTL', 15 * 60),
    refreshTokenTtl: integer('REFRESH_TOKEN_TTL', 30 * 24 * 60 * 60),
    admin: {
      email: env.ADMIN_EMAIL?.trim().toLowerCase() || undefined,
      password: env.ADMIN_PASSWORD || undefined
    },
    corsOrigins: (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: env.TRUST_PROXY?.trim() || false
  }

  if (config.jwtSecret && config.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters')
  }

  if (errors.length) {
    throw new Error(`Invalid configuration:\n - ${errors.join('\n - ')}`)
  }

  return config
}
