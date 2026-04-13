import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStoreImport from 'rate-limit-redis';
const RedisStore: any = (RedisStoreImport as any).default || RedisStoreImport;
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { RateLimitService } from './services/RateLimitService';
import { inject, singleton } from 'tsyringe';
import { LOGGER_TOKEN } from './di/tokens';
import { Logger } from 'winston';

dotenv.config();

// Configurazione Redis per rate limiting distribuito
let redisClient: any = null;

if (process.env.REDIS_HOST) {
    try {
        redisClient = new (Redis as any)({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD,
            db: Number(process.env.REDIS_DB) || 0,
            retryDelayOnFailover: 100,
            enableOfflineQueue: true,
            maxRetriesPerRequest: 3,
            lazyConnect: false
        } as any);

        redisClient.on('connect', () => {
            console.log('[REDIS] Rate limiting store connected');
        });

        redisClient.on('error', (err: any) => {
            console.error('[REDIS] Rate limiting store error:', err.message);
        });
    } catch (error) {
        console.warn('[REDIS] Redis non disponibile, usando memory store per rate limiting');
        redisClient = null;
    }
}

@singleton()
export class RateLimitMiddleware {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly rateLimitService: RateLimitService
    ) {}

    public async manualBlacklistIP(ip: string) {
        if (!redisClient) {
            throw new Error('Redis non disponibile');
        }

        const blacklistDuration = parseInt(process.env.BLACKLIST_DURATION || '7200', 10);

        // Aggiunta ip in blacklist redis
        await redisClient.sadd('blacklisted-ips', ip);
        await redisClient.setex(`blacklist:${ip}`, blacklistDuration, 'manual-blacklisted');

        // Log evento su MongoDB
        const eventData = {
            ip,
            limitType: 'manual-blacklist',
            path: '/manual-blacklist',
            method: 'POST',
            timestamp: new Date().toISOString(),
            message: `IP manualmente inserito in blacklist per ${blacklistDuration} secondi`,
            honeypotId: process.env.HONEYPOT_INSTANCE_ID
        };

        await this.rateLimitService.logEvent(eventData);
        this.logger.info(`[MANUAL BLACKLIST] IP ${ip} aggiunto in blacklist per ${blacklistDuration} secondi.`);
    }

    // Store configurazione (Redis se disponibile, altrimenti memory)
    private getStore() {
        if (redisClient) {
            return new RedisStore({
                sendCommand: (...args: any[]) => redisClient.call(...args),
            });
        }
        return undefined; // Default memory store
    }

    // Handler personalizzato per eventi di rate limiting
    private createRateLimitHandler(limitType: string) {
        return (req: any, res: any) => {
            const logData = {
                ip: req.ip,
                userAgent: req.get && req.get('User-Agent'),
                path: req.path,
                method: req.method,
                limitType: limitType,
                timestamp: new Date().toISOString(),
                headers: req.headers
            };


            const eventData = {
                ...logData,
                honeypotId: process.env.HONEYPOT_INSTANCE_ID,
                message: res.statusMessage || 'Rate limit event'
            };

            this.rateLimitService.logEvent(eventData).catch((err: any) => {
                this.logger.error('Errore salvataggio evento rate limit:', err);
            });

            // Log dell'evento prima di bloccare
            if (process.env.LOG_RATE_LIMIT_EVENTS === 'true') {
                this.logger.warn(`[RATE-LIMIT-${limitType.toUpperCase()}] ${req.ip} blocked on ${req.path}`, logData);
            }

            // Risposta personalizzata per honeypot
            res.status(429).json({
                error: 'Rate limit exceeded',
                type: limitType,
                message: 'Troppo veloce, amico! Rallenta un po\'...',
                retryAfter: res.getHeader && res.getHeader('Retry-After'),
                timestamp: new Date().toISOString(),
                honeypotId: process.env.HONEYPOT_INSTANCE_ID
            });
        };
    }

    // 1. Protezione DDoS generale (applicata a tutte le richieste)
    public ddosProtectionLimiter() {
        return rateLimit({
            store: this.getStore(),
            windowMs: parseInt(process.env.DDOS_WINDOW_MS || '60000', 10),
            max: parseInt(process.env.DDOS_MAX_REQUESTS || '100', 10),
            message: 'DDoS protection activated',
            standardHeaders: true,
            legacyHeaders: false,
            handler: this.createRateLimitHandler('ddos-protection'),
            keyGenerator: (req: any) => `ddos:${req.ip || 'unknown'}`,
            skip: (req: any) => {
                const excludedIPs = (process.env.EXCLUDED_IPS || '').split(',').map((ip) => ip.trim()).filter(Boolean);
                return excludedIPs.includes(req.ip);
            }
        });
    }

    // 2. Rate limiting per endpoint critici (login, admin)
    public criticalEndpointsLimiter() {
        return rateLimit({
            store: this.getStore(),
            windowMs: parseInt(process.env.CRITICAL_WINDOW_MS || '900000', 10), // 15 minuti
            max: parseInt(process.env.CRITICAL_MAX_REQUESTS || '20', 10),
            message: 'Critical endpoint rate limit exceeded',
            standardHeaders: true,
            legacyHeaders: false,
            handler: this.createRateLimitHandler('critical-endpoints'),
            keyGenerator: (req: any) => `critical:${req.ip || 'unknown'}:${req.path}`,
            skipSuccessfulRequests: false // Conta anche richieste "riuscite" per honeypot
        });
    }

    // 3. Rate limiting per endpoint trappola comuni
    public trapEndpointsLimiter() {
        return rateLimit({
            store: this.getStore(),
            windowMs: parseInt(process.env.TRAP_WINDOW_MS || '300000', 10), // 5 minuti
            max: parseInt(process.env.TRAP_MAX_REQUESTS || '50', 10),
            message: 'Trap endpoint rate limit exceeded',
            standardHeaders: true,
            legacyHeaders: false,
            handler: this.createRateLimitHandler('trap-endpoints'),
            keyGenerator: (req: any) => `trap:${req.ip || 'unknown'}`
        });
    }

    // 4. Rate limiting generale applicazione
    public applicationLimiter() {
        return rateLimit({
            store: this.getStore(),
            windowMs: parseInt(process.env.APP_WINDOW_MS || '60000', 10), // 1 minuto
            max: parseInt(process.env.APP_MAX_REQUESTS || '200', 10),
            message: 'Application rate limit exceeded',
            standardHeaders: true,
            legacyHeaders: false,
            handler: this.createRateLimitHandler('application'),
            keyGenerator: (req: any) => `app:${req.ip || 'unknown'}`
        });
    }

    // Middleware per tracking violazioni e blacklist automatica
    public violationTracker() {
        return async (req: any, res: any, next: any) => {
            const ip = req.ip;

            // Controlla blacklist dinamica
            if (redisClient) {
                try {
                    const isBlacklisted = await redisClient.sismember('blacklisted-ips', ip);
                    if (isBlacklisted) {
                        const blacklistTTL = await redisClient.ttl(`blacklist:${ip}`);

                        this.logger.warn(`[BLACKLISTED] IP ${ip} attempted access while blacklisted`);

                        return res.status(403).json({
                            error: 'IP temporarily blacklisted',
                            reason: 'Repeated rate limit violations',
                            unblockIn: blacklistTTL > 0 ? `${blacklistTTL} seconds` : 'soon',
                            honeypotId: process.env.HONEYPOT_INSTANCE_ID
                        });
                    }
                } catch (error: any) {
                    this.logger.error('[BLACKLIST-CHECK] Redis error:', error.message);
                }
            }

            // Hook per intercettare risposte 429 e tracciare violazioni
            const originalSend = res.send;
            const self = this;
            res.send = function (data: any) {
                if (res.statusCode === 429 && redisClient) {
                    // Traccia violazione per blacklist automatica
                    (async () => {
                        try {
                            const violationKey = `violations:${ip}`;
                            const violations = await redisClient.incr(violationKey);

                            if (violations === 1) {
                                await redisClient.expire(violationKey, 3600); // 1 ora window
                            }

                            const maxViolations = parseInt(process.env.MAX_VIOLATIONS || '5', 10);
                            if (violations >= maxViolations) {
                                // Blacklist temporanea
                                const blacklistDuration = parseInt(process.env.BLACKLIST_DURATION || '7200', 10);
                                await redisClient.sadd('blacklisted-ips', ip);
                                await redisClient.setex(`blacklist:${ip}`, blacklistDuration, 'auto-blacklisted');

                                self.logger.error(`[AUTO-BLACKLIST] IP ${ip} blacklisted for ${violations} violations`);
                            }
                        } catch (error: any) {
                            self.logger.error('[VIOLATION-TRACK] Redis error:', error.message);
                        }
                    })();
                }
                return originalSend.call(this, data);
            };

            next();
        };
    }
}

export { redisClient };
