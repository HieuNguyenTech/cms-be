import { resolveAccess } from '../services/role.access'
import { RoleDocument } from '../schemas/role.schema'

export class RoleResponse {
  id: string
  name: string
  slug: string
  permissions: string[]
  isSystem: boolean

  static from(role: RoleDocument): RoleResponse {
    return {
      id: role.id as string,
      name: role.name,
      slug: role.slug,
      permissions: resolveAccess([role]).permissions,
      isSystem: role.isSystem
    }
  }
}
