import { ROLE_PERMISSIONS } from './role/role.permissions'
import { USER_PERMISSIONS } from './user/user.permissions'

/** Every permission in the system. Add the file of each new module here. */
export const ALL_PERMISSIONS: string[] = [
  ...Object.values(ROLE_PERMISSIONS),
  ...Object.values(USER_PERMISSIONS)
]
