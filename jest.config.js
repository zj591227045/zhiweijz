module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@server/(.*)$': '<rootDir>/server/src/$1',
  },
  collectCoverageFrom: [
    'server/src/**/*.ts',
    '!**/*.d.ts',
    '!**/generated/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
