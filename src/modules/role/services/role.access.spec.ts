import { ALL_PERMISSIONS } from '../../permissions'
import { resolveAccess } from './role.access'

describe('resolveAccess', () => {
  it('merges the permissions of all roles', () => {
    const access = resolveAccess([
      { slug: 'a', isSystem: false, permissions: ['role:read'] },
      { slug: 'b', isSystem: false, permissions: ['user:read', 'role:read'] }
    ])
    expect(access).toEqual({ isSuperAdmin: false, permissions: ['role:read', 'user:read'] })
  })

  it('gives a super admin every permission', () => {
    const access = resolveAccess([{ slug: 'super_admin', isSystem: true, permissions: [] }])
    expect(access).toEqual({ isSuperAdmin: true, permissions: ALL_PERMISSIONS })
  })

  it('does not trust a custom role that only uses the super admin slug', () => {
    expect(resolveAccess([{ slug: 'super_admin', isSystem: false, permissions: [] }]).isSuperAdmin).toBe(
      false
    )
  })

  it('ignores permissions that no longer exist', () => {
    expect(resolveAccess([{ slug: 'a', isSystem: false, permissions: ['gone:read'] }]).permissions).toEqual(
      []
    )
  })
})
