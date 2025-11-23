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
            statements: 30,
            branches: 30,
            functions: 30,
            lines: 30
        }
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
