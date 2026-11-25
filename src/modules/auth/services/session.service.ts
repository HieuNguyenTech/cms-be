import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { APP_CONFIG, AppConfig } from '@app/config/app-config'
import { CacheService } from '@app/core/cache/cache.service'

export interface Session {
  userId: string
  version: number
}

const sessionKey = (id: string) => `auth:session:${id}`
/** Only a hash of the refresh token is stored. */
const refreshKey = (token: string) => `auth:refresh:${createHash('sha256').update(token).digest('hex')}`

/** A session lives as long as its refresh token. Deleting it ends both tokens. */
@Injectable()
export class SessionService {
  constructor(
    private readonly cache: CacheService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  async create(session: Session) {
    const sessionId = randomUUID()
    await this.cache.set(sessionKey(sessionId), session, this.config.refreshTokenTtl)
    return { sessionId, refreshToken: await this.issueRefreshToken(sessionId) }
  }

  find(sessionId: string): Promise<Session | null> {
    return this.cache.get<Session>(sessionKey(sessionId))
  }

  /** Uses up a refresh token. Each token works once, even under concurrent requests. */
  async consumeRefreshToken(token: string) {
    const sessionId = await this.cache.take<string>(refreshKey(token))
    if (!sessionId) return null
    const session = await this.find(sessionId)
    return session && { sessionId, session }
  }

  /** Extends the session and issues the next refresh token. Null if it was ended meanwhile. */
  async renew(sessionId: string): Promise<string | null> {
    const alive = await this.cache.expire(sessionKey(sessionId), this.config.refreshTokenTtl)
    return alive ? this.issueRefreshToken(sessionId) : null
  }

  end(sessionId: string): Promise<void> {
    return this.cache.delete(sessionKey(sessionId))
  }

  private async issueRefreshToken(sessionId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url')
    await this.cache.set(refreshKey(token), sessionId, this.config.refreshTokenTtl)
    return token
  }
}
