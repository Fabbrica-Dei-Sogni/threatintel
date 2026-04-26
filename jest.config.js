module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'core/**/*.ts',
        '!core/**/__tests__/**',
        '!core/tools/**',      // Escludi tools (scheduler)
        '!core/utils/**',      // Escludi utils (logger)
        '!core/config.js'      // Config semplice
    ],
    coverageThreshold: {
        global: {
            statements: 75,
            branches: 55,
            functions: 75,
            lines: 75
        }
    },
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    testMatch: [
        '**/__tests__/**/*.test.ts'
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testTimeout: 30000,  // Aumentato per MongoDB download
    verbose: true,
    // MongoDB Memory Server config
    globalSetup: '<rootDir>/jest-mongodb-setup.js',
    globalTeardown: '<rootDir>/jest-mongodb-teardown.js'
};
