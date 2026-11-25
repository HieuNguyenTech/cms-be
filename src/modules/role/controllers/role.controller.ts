import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { AuthUser } from '@app/common/auth/auth-user'
import { CurrentUser } from '@app/common/decorators/current-user.decorator'
import { RequirePermissions } from '@app/common/decorators/require-permissions.decorator'
import { ParseObjectIdPipe } from '@app/common/validation/parse-object-id.pipe'
import { ALL_PERMISSIONS } from '../../permissions'
import { CreateRoleDto, UpdateRoleDto } from '../dto/role.dto'
import { RoleResponse } from '../dto/role.response'
import { ROLE_PERMISSIONS } from '../role.permissions'
import { RoleService } from '../services/role.service'

@ApiTags('roles')
@ApiBearerAuth()
@Controller()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('permissions')
  @RequirePermissions(ROLE_PERMISSIONS.Read)
  listPermissions(): string[] {
    return ALL_PERMISSIONS
  }

  @Get('roles')
  @RequirePermissions(ROLE_PERMISSIONS.Read)
  async list(): Promise<RoleResponse[]> {
    return (await this.roleService.findAll()).map(RoleResponse.from)
  }

  @Get('roles/:id')
  @RequirePermissions(ROLE_PERMISSIONS.Read)
  async get(@Param('id', ParseObjectIdPipe) id: string): Promise<RoleResponse> {
    return RoleResponse.from(await this.roleService.findById(id))
  }

  @Post('roles')
  @RequirePermissions(ROLE_PERMISSIONS.Manage)
  async create(@CurrentUser() actor: AuthUser, @Body() dto: CreateRoleDto): Promise<RoleResponse> {
    return RoleResponse.from(await this.roleService.create(actor, dto))
  }

  @Patch('roles/:id')
  @RequirePermissions(ROLE_PERMISSIONS.Manage)
  async update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateRoleDto
  ): Promise<RoleResponse> {
    return RoleResponse.from(await this.roleService.update(actor, id, dto))
  }

  @Delete('roles/:id')
  @RequirePermissions(ROLE_PERMISSIONS.Manage)
  delete(@CurrentUser() actor: AuthUser, @Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.roleService.delete(actor, id)
  }
}
