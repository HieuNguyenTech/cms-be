import { CacheService } from '@app/core/cache/cache.service'

/** In-memory stand-in for Redis in tests. */
export class MemoryCacheService extends CacheService {
  private readonly entries = new Map<string, { raw: string; expiresAt: number }>()
  private readonly locks = new Map<string, Promise<unknown>>()

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key)
    return entry && entry.expiresAt > Date.now() ? (JSON.parse(entry.raw) as T) : null
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { raw: JSON.stringify(value), expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  async take<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key)
    this.entries.delete(key)
    return entry && entry.expiresAt > Date.now() ? (JSON.parse(entry.raw) as T) : null
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key)
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const entry = this.entries.get(key)
    if (!entry || entry.expiresAt <= Date.now()) return false
    entry.expiresAt = Date.now() + ttlSeconds * 1000
    return true
  }

  withLock<T>(name: string, task: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(name) ?? Promise.resolve()
    const result = previous.then(task, task)
    this.locks.set(
      name,
      result.catch(() => undefined)
    )
    return result
  }

  async ping(): Promise<void> {}
}
