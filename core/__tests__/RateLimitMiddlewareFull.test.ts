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

// Mock di rate-limit-redis
jest.mock('rate-limit-redis', () => {
    return jest.fn().mockImplementation((options) => {
        return {
            options,
            sendCommand: options.sendCommand
        };
    });
});

// Mock di express-rate-limit
jest.mock('express-rate-limit', () => {
    const original = jest.requireActual('express-rate-limit');
    return {
        ...original,
        __esModule: true,
        default: jest.fn().mockImplementation((_options) => {
            return (_req: any, _res: any, next: any) => {
                next();
            };
        }),
        ipKeyGenerator: original.ipKeyGenerator
    };
});

describe('RateLimitMiddleware Full Coverage', () => {
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
            status: 'ready'
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

    it('should use RedisStore if RedisService is ready', () => {
        const store = (middleware as any).getStore();
        expect(store).toBeDefined();
        
        store.sendCommand('TEST');
        expect(mockRedisClient.call).toHaveBeenCalledWith('TEST');
    });

    it('should use memory store if RedisService is not ready', () => {
        mockRedisService.isReady.mockReturnValue(false);

        const store = (middleware as any).getStore();
        expect(store).toBeUndefined();
        expect(mockRedisClient.call).not.toHaveBeenCalled();
    });

    describe('violationTracker', () => {
        it('should block blacklisted IPs', async () => {
            mockRedisClient.sismember.mockResolvedValue(1); 
            mockRedisClient.ttl.mockResolvedValue(100);

            const tracker = middleware.violationTracker();
            const req = { ip: '1.2.3.4' } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
            const next = jest.fn();

            await tracker(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'IP temporarily blacklisted'
            }));
        });

        it('should track violations on 429 response', async () => {
            mockRedisClient.incr.mockResolvedValue(1);

            const tracker = middleware.violationTracker();
            const req = { ip: '1.1.1.1' } as any;
            const res = { 
                statusCode: 429,
                send: jest.fn()
            } as any;
            const next = jest.fn();

            await tracker(req, res, next);
            
            res.send('blocked');

            // Wait a bit for the async IIFE
            await new Promise(resolve => setTimeout(done => { resolve(done); }, 50));
            
            expect(mockRedisClient.incr).toHaveBeenCalledWith('violations:1.1.1.1');
        });

        it('should auto-blacklist after max violations', async () => {
            mockRedisClient.incr.mockResolvedValue(10); 
            const tracker = middleware.violationTracker();
            const req = { ip: '2.2.2.2' } as any;
            const res = { statusCode: 429, send: jest.fn() } as any;
            
            await tracker(req, res, () => {});
            res.send('blocked');

            await new Promise(resolve => setTimeout(done => { resolve(done); }, 50));

            expect(mockRedisClient.sadd).toHaveBeenCalledWith('blacklisted-ips', '2.2.2.2');
        });

        it('should continue when redis is not ready', async () => {
            mockRedisService.isReady.mockReturnValue(false);

            const tracker = middleware.violationTracker();
            const req = { ip: '3.3.3.3', path: '/login' } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
            const next = jest.fn();

            await tracker(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(mockRedisClient.sismember).not.toHaveBeenCalled();
        });
    });

    describe('Limiters', () => {
        it('should configure ddosProtectionLimiter', () => {
            const limiter = middleware.ddosProtectionLimiter();
            expect(limiter).toBeDefined();
        });

        it('should configure criticalEndpointsLimiter', () => {
            const limiter = middleware.criticalEndpointsLimiter();
            expect(limiter).toBeDefined();
        });

        it('should configure trapEndpointsLimiter', () => {
            const limiter = middleware.trapEndpointsLimiter();
            expect(limiter).toBeDefined();
        });

        it('should configure applicationLimiter', () => {
            const limiter = middleware.applicationLimiter();
            expect(limiter).toBeDefined();
        });
    });

    describe('createRateLimitHandler internals', () => {
        it('should handle missing res.getHeader', async () => {
             const handler = (middleware as any).createRateLimitHandler('test');
             const req = { ip: '1.2.3.4', get: jest.fn() } as any;
             const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
             
             await handler(req, res);
             expect(res.status).toHaveBeenCalledWith(429);
        });
    });
});
