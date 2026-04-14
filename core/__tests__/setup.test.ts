/**
 * Smoke test for Jest setup (TypeScript)
 */

describe('Jest Setup Verification', () => {
    test('should run basic test', () => {
        expect(true).toBe(true);
    });

    test('should have test environment variables', () => {
        expect(process.env.NODE_ENV).toBe('test');
        // Accetta sia il database fisico di test che quello in memoria (127.0.0.1)
        const mongoUri = process.env.MONGO_URI || '';
        const isTestDb = mongoUri.includes('threatintel_test') || mongoUri.includes('127.0.0.1');
        expect(isTestDb).toBe(true);
        expect(process.env.ABUSEIPDB_KEY).toBeDefined();
    });

    test('should mock console.log', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        console.log('This should be mocked');
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
    });
});
