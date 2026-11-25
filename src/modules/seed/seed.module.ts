import { Module } from '@nestjs/common'
import { RoleModule } from '../role/role.module'
import { UserModule } from '../user/user.module'
import { SeedService } from './services/seed.service'

@Module({
  imports: [RoleModule, UserModule],
  providers: [SeedService]
})
export class SeedModule {}
