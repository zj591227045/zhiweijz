module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server/src', '<rootDir>/client/src', '<rootDir>/shared'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@server/(.*)$': '<rootDir>/server/src/$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  collectCoverageFrom: [
    'server/src/**/*.ts',
    'client/src/**/*.ts',
    'shared/**/*.ts',
    '!**/*.d.ts',
    '!**/generated/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
