import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ConfigModule } from './config/config.module'
import { CacheModule } from './core/cache/cache.module'
import { DatabaseModule } from './core/database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { HealthModule } from './modules/health/health.module'
import { RoleModule } from './modules/role/role.module'
import { SeedModule } from './modules/seed/seed.module'
import { UserModule } from './modules/user/user.module'

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CacheModule,
    // Counters are kept in memory, per instance. Use a Redis storage when running several instances.
    ThrottlerModule.forRoot([{ ttl: minutes(1), limit: 300 }]),
    HealthModule,
    // AuthModule registers the global auth guards.
    AuthModule,
    RoleModule,
    UserModule,
    SeedModule
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
