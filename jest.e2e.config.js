/** End-to-end tests: real app and MongoDB, in-memory cache. */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.e2e-spec.ts'],
  moduleNameMapper: { '^@app/(.*)$': '<rootDir>/src/$1' },
  testTimeout: 60000,
  // `content-disposition` (used by Swagger's static files) ships as ES modules only, which Jest
  // cannot require, so it is compiled to CommonJS for the tests.
  transform: { '^.+\.[tj]s$': ['ts-jest', { tsconfig: { allowJs: true } }] },
  transformIgnorePatterns: ['/node_modules/(?!content-disposition/)']
}
