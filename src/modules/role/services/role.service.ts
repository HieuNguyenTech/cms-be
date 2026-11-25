import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common'
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { assertWithinOwnAccess } from '@app/common/auth/access-policy'
import type { AuthUser } from '@app/common/auth/auth-user'
import { rejectDuplicate } from '@app/common/database/duplicate-key'
import { CacheService } from '@app/core/cache/cache.service'
import { CreateRoleDto, UpdateRoleDto } from '../dto/role.dto'
import { resolveAccess } from './role.access'
import { Role, RoleDocument, SUPER_ADMIN_SLUG } from '../schemas/role.schema'

/** Every change to roles and role assignments runs under this lock, so checks stay valid until the write. */
export const ACCESS_CONTROL_LOCK = 'access-control'

type RoleUsageCheck = (roleId: string) => Promise<boolean>

@Injectable()
export class RoleService implements OnModuleInit {
  private readonly usageChecks: RoleUsageCheck[] = []

  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    private readonly cache: CacheService
  ) {}

  async onModuleInit() {
    await this.roleModel.init() // make sure unique indexes exist before the first write
  }

  /** Lets modules that reference roles block their deletion, without a circular dependency. */
  registerUsageCheck(check: RoleUsageCheck): void {
    this.usageChecks.push(check)
  }

  findAll(): Promise<RoleDocument[]> {
    return this.roleModel.find().sort({ createdAt: 1 }).exec()
  }

  async findById(id: string): Promise<RoleDocument> {
    const role = await this.roleModel.findById(id).exec()
    if (!role) throw new NotFoundException('Role not found')
    return role
  }

  async findManyByIds(ids: string[]): Promise<RoleDocument[]> {
    const roles = await this.roleModel.find({ _id: { $in: ids } }).exec()
    if (roles.length !== ids.length) throw new BadRequestException('One or more roles do not exist')
    return roles
  }

  create(actor: AuthUser, dto: CreateRoleDto): Promise<RoleDocument> {
    if (dto.slug === SUPER_ADMIN_SLUG) throw new ConflictException('This slug is reserved')
    assertWithinOwnAccess(actor, { isSuperAdmin: false, permissions: dto.permissions })

    return rejectDuplicate(
      this.roleModel.create({ name: dto.name, slug: dto.slug, permissions: dto.permissions }),
      'A role with this slug already exists'
    )
  }

  update(actor: AuthUser, id: string, dto: UpdateRoleDto): Promise<RoleDocument> {
    return this.cache.withLock(ACCESS_CONTROL_LOCK, async () => {
      const role = await this.findEditable(actor, id)

      if (dto.permissions !== undefined) {
        assertWithinOwnAccess(actor, { isSuperAdmin: false, permissions: dto.permissions })
        role.permissions = dto.permissions
      }
      if (dto.name !== undefined) role.name = dto.name

      return role.save()
    })
  }

  delete(actor: AuthUser, id: string): Promise<void> {
    return this.cache.withLock(ACCESS_CONTROL_LOCK, async () => {
      const role = await this.findEditable(actor, id)

      for (const isUsed of this.usageChecks) {
        if (await isUsed(id)) throw new ConflictException('This role is still assigned to users')
      }

      await role.deleteOne()
    })
  }

  /** Creates the built-in roles. Safe to run on every start. */
  async seed(): Promise<RoleDocument> {
    // Sample roles are only added to an empty database, so deleted ones do not come back.
    if ((await this.roleModel.estimatedDocumentCount()) === 0) {
      await this.roleModel.create([
        { name: 'Editor', slug: 'editor', permissions: [] },
        { name: 'Author', slug: 'author', permissions: [] }
      ])
    }

    return this.roleModel
      .findOneAndUpdate(
        { slug: SUPER_ADMIN_SLUG },
        { $setOnInsert: { name: 'Super Admin', permissions: [], isSystem: true } },
        { upsert: true, new: true }
      )
      .orFail()
      .exec()
  }

  private async findEditable(actor: AuthUser, id: string): Promise<RoleDocument> {
    const role = await this.findById(id)
    if (role.isSystem) throw new ForbiddenException('System roles cannot be changed')
    assertWithinOwnAccess(actor, resolveAccess([role]))
    return role
  }
}
