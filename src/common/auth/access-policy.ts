import { ForbiddenException } from '@nestjs/common'
import type { AuthUser } from './auth-user'

/** What a role or a user is able to do. */
export interface AccessLevel {
  isSuperAdmin: boolean
  permissions: string[]
}

export function hasPermissions(actor: AccessLevel, required: string[]): boolean {
  return actor.isSuperAdmin || required.every((permission) => actor.permissions.includes(permission))
}

/**
 * Nobody may grant, change or take over more access than they have themselves.
 * Only a super admin may touch super admin access.
 */
export function assertWithinOwnAccess(actor: AuthUser, target: AccessLevel): void {
  if (actor.isSuperAdmin) return
  if (target.isSuperAdmin || !hasPermissions(actor, target.permissions)) {
    throw new ForbiddenException('This action involves permissions that you do not have')
  }
}
