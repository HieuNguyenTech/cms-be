import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { AuthUser } from '@app/common/auth/auth-user'
import { CurrentUser } from '@app/common/decorators/current-user.decorator'
import { RequirePermissions } from '@app/common/decorators/require-permissions.decorator'
import { Paginated, PaginationQueryDto } from '@app/common/pagination/pagination'
import { ParseObjectIdPipe } from '@app/common/validation/parse-object-id.pipe'
import { CreateUserDto, SetUserRolesDto, UpdateUserDto } from '../dto/user.dto'
import { UserResponse } from '../dto/user.response'
import { USER_PERMISSIONS } from '../user.permissions'
import { UserService } from '../services/user.service'

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions(USER_PERMISSIONS.Read)
  async list(@Query() query: PaginationQueryDto): Promise<Paginated<UserResponse>> {
    return (await this.userService.paginate(query)).map(UserResponse.from)
  }

  @Get(':id')
  @RequirePermissions(USER_PERMISSIONS.Read)
  async get(@Param('id', ParseObjectIdPipe) id: string): Promise<UserResponse> {
    return UserResponse.from(await this.userService.findById(id))
  }

  @Post()
  @RequirePermissions(USER_PERMISSIONS.Manage)
  async create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto): Promise<UserResponse> {
    return UserResponse.from(await this.userService.create(actor, dto))
  }

  @Patch(':id')
  @RequirePermissions(USER_PERMISSIONS.Manage)
  async update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateUserDto
  ): Promise<UserResponse> {
    return UserResponse.from(await this.userService.update(actor, id, dto))
  }

  @Put(':id/roles')
  @RequirePermissions(USER_PERMISSIONS.Manage)
  async setRoles(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() { roleIds }: SetUserRolesDto
  ): Promise<UserResponse> {
    return UserResponse.from(await this.userService.setRoles(actor, id, roleIds))
  }

  @Delete(':id')
  @RequirePermissions(USER_PERMISSIONS.Manage)
  delete(@CurrentUser() actor: AuthUser, @Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.userService.delete(actor, id)
  }
}
