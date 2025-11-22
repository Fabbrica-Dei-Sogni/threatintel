module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'core/**/*.js',
        '!core/**/__tests__/**',
        '!core/tools/**',      // Escludi tools (scheduler)
        '!core/utils/**',      // Escludi utils (logger)
        '!core/config.js'      // Config semplice
    ],
    coverageThreshold: {
        global: {
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80
        }
    },
    testMatch: [
        '**/__tests__/**/*.test.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testTimeout: 30000,  // Aumentato per MongoDB download
    verbose: true,
    // MongoDB Memory Server config
    globalSetup: '<rootDir>/jest-mongodb-setup.js',
    globalTeardown: '<rootDir>/jest-mongodb-teardown.js'
};
