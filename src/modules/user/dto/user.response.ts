import { UserDocument } from '../schemas/user.schema'

/** Only the fields listed here ever leave the API. */
export class UserResponse {
  id: string
  email: string
  name: string
  roleIds: string[]
  disabled: boolean

  static from(user: UserDocument): UserResponse {
    return {
      id: user.id as string,
      email: user.email,
      name: user.name,
      roleIds: user.roles.map(String),
      disabled: user.disabled
    }
  }
}
