import { loadConfig } from './app-config'

const valid = {
  MONGODB_URI: 'mongodb://localhost/cms',
  REDIS_URL: 'redis://localhost',
  JWT_SECRET: 'x'.repeat(32)
}

describe('loadConfig', () => {
  it('applies safe defaults', () => {
    const config = loadConfig(valid)
    expect(config.trustProxy).toBe(false)
    expect(config.corsOrigins).toEqual([])
  })

  it('reports every missing variable at once', () => {
    expect(() => loadConfig({})).toThrow(/MONGODB_URI[\s\S]*REDIS_URL[\s\S]*JWT_SECRET/)
  })

  it('rejects a short JWT secret', () => {
    expect(() => loadConfig({ ...valid, JWT_SECRET: 'short' })).toThrow(/at least 32/)
  })

  it('rejects a non-numeric port', () => {
    expect(() => loadConfig({ ...valid, PORT: 'abc' })).toThrow(/PORT/)
  })
})
