import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { APP_CONFIG, AppConfig } from '@app/config/app-config'
import { CacheService } from '@app/core/cache/cache.service'
import { RoleService } from '../../role/services/role.service'
import { UserService } from '../../user/services/user.service'

/** Creates the built-in roles and the first account on startup. */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    private readonly roleService: RoleService,
    private readonly userService: UserService,
    private readonly cache: CacheService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  async onApplicationBootstrap() {
    // The lock keeps instances that start together from seeding twice.
    await this.cache.withLock('seed', async () => {
      const superAdmin = await this.roleService.seed()
      await this.userService.seedFirstUser(superAdmin, this.config.admin)
    })
  }
}
