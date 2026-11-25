/** Cache contract. The app depends on this class; Redis is one implementation. */
export abstract class CacheService {
  abstract get<T>(key: string): Promise<T | null>
  abstract set(key: string, value: unknown, ttlSeconds: number): Promise<void>
  /** Reads and deletes in one atomic step, so only one caller can receive the value. */
  abstract take<T>(key: string): Promise<T | null>
  abstract delete(key: string): Promise<void>
  /** Extends the lifetime of an existing key. Returns false if the key is gone. */
  abstract expire(key: string, ttlSeconds: number): Promise<boolean>
  /** Runs `task` while holding a lock shared by all app instances. */
  abstract withLock<T>(name: string, task: () => Promise<T>): Promise<T>
  abstract ping(): Promise<void>
}
