/** The signed-in user attached to each protected request. */
export interface AuthUser {
  id: string
  email: string
  name: string
  isSuperAdmin: boolean
  permissions: string[]
  sessionId: string
}
