import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { ConflictException, Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common'
import { Redis } from 'ioredis'
import { APP_CONFIG, AppConfig } from '@app/config/app-config'
import { CacheService } from './cache.service'

const LOCK_TTL_MS = 10_000
const LOCK_RETRY_MS = 100
const LOCK_ATTEMPTS = 50
/** Deletes the lock only if this caller still owns it. */
const RELEASE_LOCK = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0`

@Injectable()
export class RedisCacheService extends CacheService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisCacheService.name)
  private readonly redis: Redis

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super()
    this.redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 2 })
    this.redis.on('error', (error: Error) => this.logger.error(error.message))
  }

  async get<T>(key: string): Promise<T | null> {
    return this.parse<T>(await this.redis.get(key))
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  async take<T>(key: string): Promise<T | null> {
    return this.parse<T>(await this.redis.getdel(key))
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return (await this.redis.expire(key, ttlSeconds)) === 1
  }

  async withLock<T>(name: string, task: () => Promise<T>): Promise<T> {
    const key = `lock:${name}`
    const owner = randomUUID()

    for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
      if (await this.redis.set(key, owner, 'PX', LOCK_TTL_MS, 'NX')) {
        try {
          return await task()
        } finally {
          await this.redis.eval(RELEASE_LOCK, 1, key, owner)
        }
      }
      await sleep(LOCK_RETRY_MS)
    }

    throw new ConflictException('The resource is busy, please try again')
  }

  async ping(): Promise<void> {
    await this.redis.ping()
  }

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit()
  }

  private parse<T>(raw: string | null): T | null {
    return raw === null ? null : (JSON.parse(raw) as T)
  }
}
