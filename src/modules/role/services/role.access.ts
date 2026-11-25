import type { AccessLevel } from '@app/common/auth/access-policy'
import { ALL_PERMISSIONS } from '../../permissions'
import { Role, SUPER_ADMIN_SLUG } from '../schemas/role.schema'

export const isSuperAdminRole = (role: Pick<Role, 'slug' | 'isSystem'>) => {
  return role.isSystem && role.slug === SUPER_ADMIN_SLUG
}

/** Combined access of a set of roles. Permissions no longer declared in code are ignored. */
export function resolveAccess(roles: Pick<Role, 'slug' | 'isSystem' | 'permissions'>[]): AccessLevel {
  const isSuperAdmin = roles.some(isSuperAdminRole)
  const granted = new Set(roles.flatMap((role) => role.permissions))
  return {
    isSuperAdmin,
    permissions: ALL_PERMISSIONS.filter((permission) => isSuperAdmin || granted.has(permission))
  }
}
