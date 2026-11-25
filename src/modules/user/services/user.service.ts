import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common'
import { NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { validate } from 'class-validator'
import { Model } from 'mongoose'
import { assertWithinOwnAccess } from '@app/common/auth/access-policy'
import type { AuthUser } from '@app/common/auth/auth-user'
import { rejectDuplicate } from '@app/common/database/duplicate-key'
import { Paginated, PaginationQueryDto } from '@app/common/pagination/pagination'
import { CacheService } from '@app/core/cache/cache.service'
import { isSuperAdminRole, resolveAccess } from '../../role/services/role.access'
import { RoleDocument } from '../../role/schemas/role.schema'
import { ACCESS_CONTROL_LOCK, RoleService } from '../../role/services/role.service'
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto'
import { hashPassword } from './password'
import { User, UserDocument } from '../schemas/user.schema'

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly roleService: RoleService,
    private readonly cache: CacheService
  ) {}

  async onModuleInit() {
    this.roleService.registerUsageCheck(async (roleId) => !!(await this.userModel.exists({ roles: roleId })))
    await this.userModel.init()
  }

  async paginate({ page, limit }: PaginationQueryDto): Promise<Paginated<UserDocument>> {
    const [items, total] = await Promise.all([
      this.userModel
        .find()
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments().exec()
    ])
    return new Paginated(items, total, page, limit)
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec()
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec()
  }

  findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+passwordHash').exec()
  }

  /** A user with their current roles, or null if the account cannot be used. */
  async findActiveWithRoles(id: string) {
    const user = await this.userModel.findOne({ _id: id, disabled: false }).exec()
    if (!user) return null

    const { roles } = await user.populate<{ roles: RoleDocument[] }>('roles')
    return { user, access: resolveAccess(roles) }
  }

  create(actor: AuthUser, dto: CreateUserDto): Promise<UserDocument> {
    return this.cache.withLock(ACCESS_CONTROL_LOCK, async () => {
      await this.assertAssignable(actor, dto.roleIds)
      return this.insert(dto)
    })
  }

  update(actor: AuthUser, id: string, dto: UpdateUserDto): Promise<UserDocument> {
    return this.cache.withLock(ACCESS_CONTROL_LOCK, async () => {
      const user = await this.findManageable(actor, id)

      if (dto.disabled === true) await this.assertNotLastSuperAdmin(user)
      if (dto.name !== undefined) user.name = dto.name
      if (dto.disabled !== undefined) user.disabled = dto.disabled
      if (dto.password !== undefined) user.passwordHash = await hashPassword(dto.password)
      // Atomic increment: a password change made by the user at the same moment must not be lost.
      if (dto.password !== undefined || dto.disabled === true) user.$inc('sessionVersion', 1)

      return user.save()
    })
  }

  setRoles(actor: AuthUser, id: string, roleIds: string[]): Promise<UserDocument> {
    return this.cache.withLock(ACCESS_CONTROL_LOCK, async () => {
      const user = await this.findManageable(actor, id)
      const roles = await this.assertAssignable(actor, roleIds)

      if (!roles.some(isSuperAdminRole)) await this.assertNotLastSuperAdmin(user)

      user.set({ roles: roles.map((role) => role._id) })
      return user.save()
    })
  }

  delete(actor: AuthUser, id: string): Promise<void> {
    return this.cache.withLock(ACCESS_CONTROL_LOCK, async () => {
      const user = await this.findManageable(actor, id)
      await this.assertNotLastSuperAdmin(user)
      await user.deleteOne()
    })
  }

  async changePassword(id: string, password: string): Promise<void> {
    const passwordHash = await hashPassword(password)
    await this.userModel
      .updateOne({ _id: id }, { $set: { passwordHash }, $inc: { sessionVersion: 1 } })
      .exec()
  }

  /** Creates the first account. Does nothing once any user exists. */
  async seedFirstUser(superAdmin: RoleDocument, credentials: { email?: string; password?: string }) {
    if (await this.userModel.exists({})) return

    const { email, password } = credentials
    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to create the first user')
    }

    const dto = Object.assign(new CreateUserDto(), {
      email,
      password,
      name: 'Super Admin',
      roleIds: [superAdmin.id as string]
    })
    await assertValidSeed(dto)
    await this.insert(dto)
  }

  private async insert(dto: CreateUserDto): Promise<UserDocument> {
    const passwordHash = await hashPassword(dto.password)
    return rejectDuplicate(
      this.userModel.create({ email: dto.email, name: dto.name, roles: dto.roleIds, passwordHash }),
      'A user with this email already exists'
    )
  }

  /** The actor may only hand out roles that stay within their own access. */
  private async assertAssignable(actor: AuthUser, roleIds: string[]): Promise<RoleDocument[]> {
    const roles = await this.roleService.findManyByIds(roleIds)
    assertWithinOwnAccess(actor, resolveAccess(roles))
    return roles
  }

  /** Nobody manages their own account here, or an account with more access than theirs. */
  private async findManageable(actor: AuthUser, id: string): Promise<UserDocument> {
    const user = await this.findById(id)
    if (actor.id === user.id) {
      throw new ForbiddenException('You cannot manage your own account here')
    }
    const { roles } = await this.userModel
      .findById(id)
      .populate<{ roles: RoleDocument[] }>('roles')
      .orFail()
      .exec()
    assertWithinOwnAccess(actor, resolveAccess(roles))
    return user
  }

  /** Call before an action that takes super admin access away from `user`. */
  private async assertNotLastSuperAdmin(user: UserDocument): Promise<void> {
    const superAdmin = (await this.roleService.findAll()).find(isSuperAdminRole)
    if (!superAdmin || !user.roles.some((roleId) => roleId.equals(superAdmin._id))) return

    const others = await this.userModel.exists({
      _id: { $ne: user._id },
      roles: superAdmin._id,
      disabled: false
    })
    if (!others) throw new ConflictException('At least one active super admin is required')
  }
}

async function assertValidSeed(dto: CreateUserDto): Promise<void> {
  const errors = await validate(dto)
  if (errors.length) {
    const fields = errors.map((error) => error.property).join(', ')
    throw new Error(`Invalid ADMIN_EMAIL or ADMIN_PASSWORD (failed fields: ${fields})`)
  }
}
