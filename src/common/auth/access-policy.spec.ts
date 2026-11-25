import { assertWithinOwnAccess, hasPermissions } from './access-policy'
import type { AuthUser } from './auth-user'

const actor = (permissions: string[], isSuperAdmin = false): AuthUser => ({
  id: '1',
  email: 'a@example.com',
  name: 'A',
  sessionId: 's',
  permissions,
  isSuperAdmin
})

describe('access policy', () => {
  it('requires every listed permission', () => {
    expect(hasPermissions(actor(['a']), ['a'])).toBe(true)
    expect(hasPermissions(actor(['a']), ['a', 'b'])).toBe(false)
  })

  it('lets a super admin do anything', () => {
    expect(() =>
      assertWithinOwnAccess(actor([], true), { isSuperAdmin: true, permissions: [] })
    ).not.toThrow()
  })

  it('blocks granting a permission the actor lacks', () => {
    expect(() => assertWithinOwnAccess(actor(['a']), { isSuperAdmin: false, permissions: ['b'] })).toThrow()
  })

  it('blocks super admin access even without listed permissions', () => {
    expect(() => assertWithinOwnAccess(actor(['a']), { isSuperAdmin: true, permissions: [] })).toThrow()
  })
})
