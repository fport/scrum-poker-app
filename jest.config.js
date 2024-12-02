module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/v2/__tests__/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  testEnvironmentOptions: {
    'socket.io': {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    }
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: [151001]
      }
    }]
  }
}; 