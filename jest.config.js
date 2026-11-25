/** Unit tests: files next to the source. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: { '^@app/(.*)$': '<rootDir>/src/$1' }
}
