import 'reflect-metadata';
import { RateLimitMiddleware, redisClient } from '../rateLimitMiddleware';
import { RateLimitService } from '../services/RateLimitService';
import { Logger } from 'winston';

// Mock di ioredis
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => {
        return {
            on: jest.fn(),
            sadd: jest.fn(),
            setex: jest.fn(),
            call: jest.fn(),
            sismember: jest.fn(),
            ttl: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
        };
    });
});

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
        default: jest.fn().mockImplementation((options) => {
            return (req: any, res: any, next: any) => {
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

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        } as any;

        mockRateLimitService = {
            logEvent: jest.fn().mockResolvedValue({}),
        } as any;

        middleware = new RateLimitMiddleware(mockLogger, mockRateLimitService);
        jest.clearAllMocks();
    });

    it('should use RedisStore if redisClient is available', () => {
        const store = (middleware as any).getStore();
        expect(store).toBeDefined();
        
        const mockRedis = redisClient;
        store.sendCommand('TEST');
        expect(mockRedis.call).toHaveBeenCalledWith('TEST');
    });

    describe('violationTracker', () => {
        it('should block blacklisted IPs', async () => {
            const mockRedis = redisClient as any;
            mockRedis.sismember.mockResolvedValue(1); 
            mockRedis.ttl.mockResolvedValue(100);

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
            const mockRedis = redisClient as any;
            mockRedis.incr.mockResolvedValue(1);

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
            
            expect(mockRedis.incr).toHaveBeenCalledWith('violations:1.1.1.1');
        });

        it('should auto-blacklist after max violations', async () => {
            const mockRedis = redisClient as any;
            mockRedis.incr.mockResolvedValue(10); 
            process.env.MAX_VIOLATIONS = '5';

            const tracker = middleware.violationTracker();
            const req = { ip: '2.2.2.2' } as any;
            const res = { statusCode: 429, send: jest.fn() } as any;
            
            await tracker(req, res, () => {});
            res.send('blocked');

            await new Promise(resolve => setTimeout(done => { resolve(done); }, 50));

            expect(mockRedis.sadd).toHaveBeenCalledWith('blacklisted-ips', '2.2.2.2');
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
