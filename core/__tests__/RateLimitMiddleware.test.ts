/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import 'reflect-metadata';
import { RateLimitMiddleware } from '../rateLimitMiddleware';
import { RateLimitService } from '../services/RateLimitService';
import { RedisService } from '../services/RedisService';
import { Logger } from 'winston';

describe('RateLimitMiddleware', () => {
    let middleware: RateLimitMiddleware;
    let mockLogger: jest.Mocked<Logger>;
    let mockRateLimitService: jest.Mocked<RateLimitService>;
    let mockRedisService: jest.Mocked<RedisService>;
    let mockRedisClient: any;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        mockRateLimitService = {
            logEvent: jest.fn().mockResolvedValue({}),
        } as any;

        mockRedisClient = {
            sadd: jest.fn(),
            setex: jest.fn(),
            srem: jest.fn(),
            del: jest.fn(),
            call: jest.fn(),
            sismember: jest.fn(),
            ttl: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
        };

        mockRedisService = {
            isReady: jest.fn().mockReturnValue(true),
            getClient: jest.fn().mockReturnValue(mockRedisClient),
            getState: jest.fn().mockReturnValue('ready'),
        } as any;

        const mockConfig = {
            blacklistDuration: 7200,
            honeypotInstanceId: 'test-id',
            logRateLimitEvents: true,
            appBasePath: '/honeypot',
            excludedIps: ['127.0.0.1'],
            ddosWindowMs: 60000,
            ddosMaxRequests: 100,
            criticalWindowMs: 900000,
            criticalMaxRequests: 20,
            trapWindowMs: 300000,
            trapMaxRequests: 50,
            appWindowMs: 60000,
            appMaxRequests: 200,
            maxViolations: 5
        } as any;

        middleware = new RateLimitMiddleware(mockLogger, mockRedisService, mockConfig, mockRateLimitService);
        jest.clearAllMocks();
    });

    describe('manualBlacklistIP', () => {
        it('should throw error if redis is not available', async () => {
            mockRedisService.isReady.mockReturnValue(false);

            await expect(middleware.manualBlacklistIP('1.2.3.4')).rejects.toThrow('Redis non disponibile');
            expect(mockRedisClient.sadd).not.toHaveBeenCalled();
        });

        it('should blacklist IP and log event when redis is available', async () => {
            mockRedisService.isReady.mockReturnValue(true);

            await middleware.manualBlacklistIP('1.2.3.4');

            expect(mockRedisClient.sadd).toHaveBeenCalledWith('blacklisted-ips', '1.2.3.4');
            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                'blacklist:1.2.3.4',
                expect.any(Number),
                'manual-blacklisted'
            );
            expect(mockRateLimitService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
                ip: '1.2.3.4',
                limitType: 'manual-blacklist'
            }));
        });
    });

    describe('createRateLimitHandler', () => {
        it('should log event when rate limit is exceeded', async () => {
            const handler = (middleware as any).createRateLimitHandler('test-limit');
            const req = {
                ip: '192.168.1.1',
                get: jest.fn().mockReturnValue('test-agent'),
                path: '/test',
                method: 'GET',
                headers: { 'x-test': 'value' }
            } as any;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
                statusMessage: 'Test Status'
            } as any;

            await handler(req, res);

            expect(mockRateLimitService.logEvent).toHaveBeenCalledWith(expect.objectContaining({
                ip: '192.168.1.1',
                limitType: 'test-limit',
                userAgent: 'test-agent'
            }));
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });
});
