/**
 * Test suite for ThreatLogService (TypeScript)
 */

import mongoose from 'mongoose';
import ThreatLogService from '../ThreatLogService';
import ThreatLog from '../../models/ThreatLogSchema';
import IpDetails from '../../models/IpDetailsSchema';

// Mock dependencies
jest.mock('../IpDetailsService', () => ({
    parseExcludedIPs: jest.fn().mockReturnValue([]),
    isIPExcluded: jest.fn().mockReturnValue(false),
    saveIpDetails: jest.fn().mockResolvedValue('507f1f77bcf86cd799439011'), // ObjectId string
}));

jest.mock('../PatternAnalysisService', () => {
    return jest.fn().mockImplementation(() => ({
        analyze: jest.fn().mockReturnValue({
            suspicious: false,
            score: 0,
            indicators: [],
            isBot: false,
        }),
    }));
});

jest.mock('../forense/ForensicService', () => ({
    buildAttackGroupsBasePipeline: jest.fn().mockResolvedValue([]),
}));

describe('ThreatLogService', () => {
    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/test';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await ThreatLog.deleteMany({});
        await IpDetails.deleteMany({});
    });

    describe('saveLog', () => {
        test('should save a valid log entry', async () => {
            const logEntry = {
                id: 'test-id-1',
                request: {
                    ip: '1.2.3.4',
                    method: 'GET',
                    url: '/test',
                    headers: {},
                    body: {},
                },
                fingerprint: {
                    hash: 'hash123',
                    suspicious: false,
                    score: 0,
                    indicators: [],
                },
            };

            const savedLog = await ThreatLogService.saveLog(logEntry as any);

            expect(savedLog).toBeDefined();
            expect(savedLog.id).toBe(logEntry.id);
            expect(savedLog.request.ip).toBe(logEntry.request.ip);

            const count = await ThreatLog.countDocuments();
            expect(count).toBe(1);
        });

        test('should not save excluded IP', async () => {
            const IpDetailsService = require('../IpDetailsService');
            IpDetailsService.isIPExcluded.mockReturnValueOnce(true);

            const logEntry = {
                id: 'test-id-excluded',
                request: { ip: '127.0.0.1' },
            } as any;

            const result = await ThreatLogService.saveLog(logEntry);

            expect(result).toBeNull();
            const count = await ThreatLog.countDocuments();
            expect(count).toBe(0);
        });
    });

    describe('getLogs', () => {
        beforeEach(async () => {
            await ThreatLog.create([
                { id: '1', request: { ip: '1.1.1.1', url: '/a' }, timestamp: new Date('2023-01-01') },
                { id: '2', request: { ip: '2.2.2.2', url: '/b' }, timestamp: new Date('2023-01-02') },
                { id: '3', request: { ip: '1.1.1.1', url: '/c' }, timestamp: new Date('2023-01-03') },
            ]);
        });

        test('should get all logs with pagination', async () => {
            const logs = await ThreatLogService.getLogs({ pageSize: 2 } as any);
            expect(logs).toHaveLength(2);
        });

        test('should filter logs', async () => {
            const logs = await ThreatLogService.getLogs({ filters: { 'request.ip': '1.1.1.1' } } as any);
            expect(logs).toHaveLength(2);
        });
    });

    describe('getStats', () => {
        test('should return correct stats', async () => {
            await ThreatLog.create([
                {
                    id: '1',
                    timestamp: new Date(),
                    request: { ip: '1.1.1.1', userAgent: 'UA1' },
                    fingerprint: { suspicious: true },
                    geo: { country: 'US' },
                },
                {
                    id: '2',
                    timestamp: new Date(),
                    request: { ip: '2.2.2.2', userAgent: 'UA2' },
                    fingerprint: { suspicious: false },
                    geo: { country: 'IT' },
                },
            ]);

            const stats = await ThreatLogService.getStats('24h' as any);

            expect(stats.totalRequests).toBe(2);
            expect(stats.suspiciousRequests).toBe(1);
            expect(stats.uniqueIPs).toHaveLength(2);
            expect(stats.topCountries).toContain('US');
            expect(stats.topCountries).toContain('IT');
        });
    });

    describe('getTopThreats', () => {
        test('should return top threats sorted by score', async () => {
            await ThreatLog.create([
                { id: '1', fingerprint: { suspicious: true, score: 10 } },
                { id: '2', fingerprint: { suspicious: true, score: 50 } },
                { id: '3', fingerprint: { suspicious: false, score: 0 } },
            ]);

            const threats = await ThreatLogService.getTopThreats(5);

            expect(threats).toHaveLength(2);
            expect(threats[0].fingerprint.score).toBe(50);
            expect(threats[1].fingerprint.score).toBe(10);
        });
    });
});
