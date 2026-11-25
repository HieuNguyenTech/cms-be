import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { SkipThrottle } from '@nestjs/throttler'
import { Connection } from 'mongoose'
import { Public } from '@app/common/decorators/public.decorator'
import { CacheService } from '@app/core/cache/cache.service'

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly cache: CacheService
  ) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check() {
    try {
      await Promise.all([this.connection.db!.admin().ping(), this.cache.ping()])
    } catch {
      throw new ServiceUnavailableException('A dependency is unavailable')
    }
    return { status: 'ok' }
  }
}
