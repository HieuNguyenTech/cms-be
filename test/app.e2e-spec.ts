import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { AppModule } from '@app/app.module'
import { setupApp } from '@app/app.setup'
import { CacheService } from '@app/core/cache/cache.service'
import { MemoryCacheService } from './memory-cache.service'

const ADMIN = { email: 'admin@example.com', password: 'correct-horse-battery' }
const STAFF = { email: 'staff@example.com', password: 'another-long-password' }

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

describe('API (e2e)', () => {
  let mongo: MongoMemoryServer
  let app: NestFastifyApplication
  let adminToken: string

  const call = async (method: Method, url: string, token?: string, body?: object) => {
    const response = await app.inject({
      method,
      url,
      payload: body,
      headers: token ? { authorization: `Bearer ${token}` } : {}
    })
    return { status: response.statusCode, body: response.json() }
  }

  const login = async (credentials: { email: string; password: string }) => {
    const { status, body } = await call('POST', '/auth/login', undefined, credentials)
    expect(status).toBe(200)
    return body.data as { accessToken: string; refreshToken: string }
  }

  const createRole = async (slug: string, permissions: string[]) => {
    const { status, body } = await call('POST', '/roles', adminToken, { name: slug, slug, permissions })
    expect(status).toBe(201)
    return body.data.id as string
  }

  const createStaff = async (roleIds: string[]) => {
    const dto = { ...STAFF, name: 'Staff', roleIds }
    const { status, body } = await call('POST', '/users', adminToken, dto)
    expect(status).toBe(201)
    return body.data.id as string
  }

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create()
  }, 600_000) // the first run downloads the MongoDB binary

  afterAll(async () => {
    await mongo?.stop()
  })

  // A fresh app and database for every test.
  beforeEach(async () => {
    Object.assign(process.env, {
      MONGODB_URI: mongo.getUri(`test-${Date.now()}`),
      REDIS_URL: 'redis://unused',
      JWT_SECRET: 'test-secret-test-secret-test-secret',
      ADMIN_EMAIL: ADMIN.email,
      ADMIN_PASSWORD: ADMIN.password
    })

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CacheService)
      .useClass(MemoryCacheService)
      .compile()

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await setupApp(app)
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
    adminToken = (await login(ADMIN)).accessToken
  })

  afterEach(async () => {
    await app?.close()
  })

  describe('authentication', () => {
    it('keeps health public and everything else closed', async () => {
      expect((await call('GET', '/health')).status).toBe(200)
      expect((await call('GET', '/users')).status).toBe(401)
      expect((await call('GET', '/auth/me', 'not-a-token')).status).toBe(401)
    })

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const wrong = await call('POST', '/auth/login', undefined, { ...ADMIN, password: 'wrong' })
      const unknown = await call('POST', '/auth/login', undefined, { ...STAFF })
      expect(wrong).toEqual(unknown)
      expect(wrong.status).toBe(401)
    })

    it('never returns password hashes', async () => {
      const { body } = await call('GET', '/users', adminToken)
      expect(body.meta.total).toBe(1)
      expect(Object.keys(body.data[0]).sort()).toEqual(['disabled', 'email', 'id', 'name', 'roleIds'])
    })

    it('accepts a refresh token only once', async () => {
      const { refreshToken } = await login(ADMIN)
      const results = await Promise.all([
        call('POST', '/auth/refresh', undefined, { refreshToken }),
        call('POST', '/auth/refresh', undefined, { refreshToken })
      ])
      expect(results.map((r) => r.status).sort()).toEqual([200, 401])
    })

    it('ends both tokens on logout', async () => {
      const { accessToken, refreshToken } = await login(ADMIN)
      expect((await call('POST', '/auth/logout', accessToken)).status).toBe(200)
      expect((await call('GET', '/auth/me', accessToken)).status).toBe(401)
      expect((await call('POST', '/auth/refresh', undefined, { refreshToken })).status).toBe(401)
    })

    it('signs out every session after a password change', async () => {
      const other = await login(ADMIN)
      const change = await call('PUT', '/auth/password', adminToken, {
        currentPassword: ADMIN.password,
        newPassword: 'a-brand-new-password'
      })
      expect(change.status).toBe(200)
      expect((await call('GET', '/auth/me', other.accessToken)).status).toBe(401)
      const refresh = await call('POST', '/auth/refresh', undefined, { refreshToken: other.refreshToken })
      expect(refresh.status).toBe(401)
    })

    it('blocks a disabled user at once', async () => {
      const id = await createStaff([])
      const staff = await login(STAFF)
      expect((await call('PATCH', `/users/${id}`, adminToken, { disabled: true })).status).toBe(200)
      expect((await call('GET', '/auth/me', staff.accessToken)).status).toBe(401)
      expect((await call('POST', '/auth/login', undefined, STAFF)).status).toBe(401)
    })
  })

  describe('dynamic roles', () => {
    it('applies permission changes without a new login', async () => {
      const roleId = await createRole('viewer', [])
      await createStaff([roleId])
      const { accessToken } = await login(STAFF)

      expect((await call('GET', '/users', accessToken)).status).toBe(403)
      await call('PATCH', `/roles/${roleId}`, adminToken, { permissions: ['user:read'] })
      expect((await call('GET', '/users', accessToken)).status).toBe(200)
      await call('PATCH', `/roles/${roleId}`, adminToken, { permissions: [] })
      expect((await call('GET', '/users', accessToken)).status).toBe(403)
    })

    it('rejects unknown permissions, null values and duplicate slugs', async () => {
      const id = await createRole('viewer', [])
      const unknown = { name: 'x', slug: 'other', permissions: ['nope:nope'] }
      expect((await call('POST', '/roles', adminToken, unknown)).status).toBe(400)
      expect((await call('PATCH', `/roles/${id}`, adminToken, { name: null })).status).toBe(400)
      const duplicate = { name: 'x', slug: 'viewer', permissions: [] }
      expect((await call('POST', '/roles', adminToken, duplicate)).status).toBe(409)
    })

    it('refuses to delete a role that is in use', async () => {
      const roleId = await createRole('viewer', [])
      const userId = await createStaff([roleId])
      expect((await call('DELETE', `/roles/${roleId}`, adminToken)).status).toBe(409)
      await call('PUT', `/users/${userId}/roles`, adminToken, { roleIds: [] })
      expect((await call('DELETE', `/roles/${roleId}`, adminToken)).status).toBe(200)
    })

    it('protects the super admin role and account', async () => {
      const roles = (await call('GET', '/roles', adminToken)).body.data as { id: string; slug: string }[]
      const superRole = roles.find((role) => role.slug === 'super_admin')!
      const me = (await call('GET', '/auth/me', adminToken)).body.data

      expect((await call('PATCH', `/roles/${superRole.id}`, adminToken, { name: 'x' })).status).toBe(403)
      expect((await call('DELETE', `/roles/${superRole.id}`, adminToken)).status).toBe(403)
      expect((await call('DELETE', `/users/${me.id}`, adminToken)).status).toBe(403)
    })

    it('keeps one super admin when two disable each other at once', async () => {
      const roles = (await call('GET', '/roles', adminToken)).body.data as { id: string; slug: string }[]
      const superRole = roles.find((role) => role.slug === 'super_admin')!
      const secondId = await createStaff([superRole.id])
      const firstId = (await call('GET', '/auth/me', adminToken)).body.data.id as string
      const second = await login(STAFF)

      const results = await Promise.all([
        call('PATCH', `/users/${secondId}`, adminToken, { disabled: true }),
        call('PATCH', `/users/${firstId}`, second.accessToken, { disabled: true })
      ])
      expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    })

    it('stops a limited manager from gaining more access', async () => {
      const managerRole = await createRole('manager', ['user:read', 'user:manage', 'role:manage'])
      const strongerRole = await createRole('auditor', ['role:read'])
      const managerId = await createStaff([managerRole])
      const { accessToken } = await login(STAFF)
      const adminId = (await call('GET', '/auth/me', adminToken)).body.data.id as string
      const newUser = { email: 'new@example.com', password: 'some-long-password', name: 'New' }

      const attempts = await Promise.all([
        call('POST', '/roles', accessToken, { name: 'x', slug: 'xx', permissions: ['role:read'] }),
        call('PATCH', `/roles/${strongerRole}`, accessToken, { permissions: [] }),
        call('DELETE', `/roles/${strongerRole}`, accessToken),
        call('POST', '/users', accessToken, { ...newUser, roleIds: [strongerRole] }),
        call('PATCH', `/users/${adminId}`, accessToken, { password: 'taken-over-password' }),
        call('PUT', `/users/${managerId}/roles`, accessToken, { roleIds: [strongerRole] })
      ])
      expect(attempts.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403])

      const allowed = await call('POST', '/users', accessToken, { ...newUser, roleIds: [managerRole] })
      expect(allowed.status).toBe(201)
    })
  })
})
