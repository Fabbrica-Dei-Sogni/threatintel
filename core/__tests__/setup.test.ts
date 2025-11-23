/**
 * Smoke test for Jest setup (TypeScript)
 */

describe('Jest Setup Verification', () => {
    test('should run basic test', () => {
        expect(true).toBe(true);
    });

    test('should have test environment variables', () => {
        expect(process.env.NODE_ENV).toBe('test');
        expect(process.env.MONGO_URI).toContain('threatintel_test');
        expect(process.env.ABUSEIPDB_KEY).toBeDefined();
    });

    test('should mock console.log', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        console.log('This should be mocked');
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
    });
});
