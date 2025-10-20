const rateLimit = require('express-rate-limit');
const RedisStoreImport = require('rate-limit-redis');
const RedisStore = RedisStoreImport.default || RedisStoreImport;
const rateLimitService = require('./services/RateLimitService');

const Redis = require('ioredis');
require('dotenv').config();

// Configurazione Redis per rate limiting distribuito
let redisClient = null;

if (process.env.REDIS_HOST) {
    try {
        redisClient = new Redis({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB || 0,
            retryDelayOnFailover: 100,
            enableOfflineQueue: true,
            maxRetriesPerRequest: 3,
            lazyConnect: false
        });

        redisClient.on('connect', () => {
            console.log('[REDIS] Rate limiting store connected');
        });

        redisClient.on('error', (err) => {
            console.error('[REDIS] Rate limiting store error:', err.message);
        });
    } catch (error) {
        console.warn('[REDIS] Redis non disponibile, usando memory store per rate limiting');
        redisClient = null;
    }
}

const manualBlacklistIP = async (ip) => {
    if (!redisClient) {
        throw new Error('Redis non disponibile');
    }

    const blacklistDuration = parseInt(process.env.BLACKLIST_DURATION) || 7200;

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

    await rateLimitService.logEvent(eventData);
    logger.info(`[MANUAL BLACKLIST] IP ${ip} aggiunto in blacklist per ${blacklistDuration} secondi.`);
};

// Store configurazione (Redis se disponibile, altrimenti memory)
const getStore = () => {
    if (redisClient) {
        return new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
        });
    }
    return undefined; // Default memory store
};

// Handler personalizzato per eventi di rate limiting
const createRateLimitHandler = (limitType, logger) => {
    return (req, res) => {
        const logData = {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
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

        rateLimitService.logEvent(eventData).catch(err => {
            if (logger) logger.error('Errore salvataggio evento rate limit:', err);
        });

        // Log dell'evento prima di bloccare
        if (process.env.LOG_RATE_LIMIT_EVENTS === 'true' && logger) {
            logger.warn(`[RATE-LIMIT-${limitType.toUpperCase()}] ${req.ip} blocked on ${req.path}`, logData);
        }

        // Risposta personalizzata per honeypot
        res.status(429).json({
            error: 'Rate limit exceeded',
            type: limitType,
            message: 'Troppo veloce, amico! Rallenta un po\'...',
            retryAfter: res.getHeader('Retry-After'),
            timestamp: new Date().toISOString(),
            honeypotId: process.env.HONEYPOT_INSTANCE_ID
        });
    };
};

// Configurazioni rate limiting per diversi livelli

// 1. Protezione DDoS generale (applicata a tutte le richieste)
const ddosProtectionLimiter = (logger) => rateLimit({
    store: getStore(),
    windowMs: parseInt(process.env.DDOS_WINDOW_MS) || 60000,
    max: parseInt(process.env.DDOS_MAX_REQUESTS) || 100,
    message: 'DDoS protection activated',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('ddos-protection', logger),
    keyGenerator: (req) => `ddos:${req.ip}`,
    skip: (req) => {
        // Skip per IP esclusi dalla configurazione esistente
        const excludedIPs = (process.env.EXCLUDED_IPS || '').split(',').map(ip => ip.trim());
        return excludedIPs.includes(req.ip);
    }
});

// 2. Rate limiting per endpoint critici (login, admin)
const criticalEndpointsLimiter = (logger) => rateLimit({
    store: getStore(),
    windowMs: parseInt(process.env.CRITICAL_WINDOW_MS) || 900000, // 15 minuti
    max: parseInt(process.env.CRITICAL_MAX_REQUESTS) || 20,
    message: 'Critical endpoint rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('critical-endpoints', logger),
    keyGenerator: (req) => `critical:${req.ip}:${req.path}`,
    skipSuccessfulRequests: false // Conta anche richieste "riuscite" per honeypot
});

// 3. Rate limiting per endpoint trappola comuni
const trapEndpointsLimiter = (logger) => rateLimit({
    store: getStore(),
    windowMs: parseInt(process.env.TRAP_WINDOW_MS) || 300000, // 5 minuti
    max: parseInt(process.env.TRAP_MAX_REQUESTS) || 50,
    message: 'Trap endpoint rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('trap-endpoints', logger),
    keyGenerator: (req) => `trap:${req.ip}`
});

// 4. Rate limiting generale applicazione
const applicationLimiter = (logger) => rateLimit({
    store: getStore(),
    windowMs: parseInt(process.env.APP_WINDOW_MS) || 60000, // 1 minuto
    max: parseInt(process.env.APP_MAX_REQUESTS) || 200,
    message: 'Application rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('application', logger),
    keyGenerator: (req) => `app:${req.ip}`
});

// Middleware per tracking violazioni e blacklist automatica
const violationTracker = (logger) => {
    return async (req, res, next) => {
        const ip = req.ip;

        // Controlla blacklist dinamica
        if (redisClient) {
            try {
                const isBlacklisted = await redisClient.sismember('blacklisted-ips', ip);
                if (isBlacklisted) {
                    const blacklistTTL = await redisClient.ttl(`blacklist:${ip}`);

                    if (logger) {
                        logger.warn(`[BLACKLISTED] IP ${ip} attempted access while blacklisted`);
                    }

                    return res.status(403).json({
                        error: 'IP temporarily blacklisted',
                        reason: 'Repeated rate limit violations',
                        unblockIn: blacklistTTL > 0 ? `${blacklistTTL} seconds` : 'soon',
                        honeypotId: process.env.HONEYPOT_INSTANCE_ID
                    });
                }
            } catch (error) {
                if (logger) {
                    logger.error('[BLACKLIST-CHECK] Redis error:', error.message);
                }
            }
        }

        // Hook per intercettare risposte 429 e tracciare violazioni
        const originalSend = res.send;
        res.send = function (data) {
            if (res.statusCode === 429 && redisClient) {
                // Traccia violazione per blacklist automatica
                (async () => {
                    try {
                        const violationKey = `violations:${ip}`;
                        const violations = await redisClient.incr(violationKey);

                        if (violations === 1) {
                            await redisClient.expire(violationKey, 3600); // 1 ora window
                        }

                        const maxViolations = parseInt(process.env.MAX_VIOLATIONS) || 5;
                        if (violations >= maxViolations) {
                            // Blacklist temporanea
                            const blacklistDuration = parseInt(process.env.BLACKLIST_DURATION) || 7200;
                            await redisClient.sadd('blacklisted-ips', ip);
                            await redisClient.setex(`blacklist:${ip}`, blacklistDuration, 'auto-blacklisted');

                            if (logger) {
                                logger.error(`[AUTO-BLACKLIST] IP ${ip} blacklisted for ${violations} violations`);
                            }
                        }
                    } catch (error) {
                        if (logger) {
                            logger.error('[VIOLATION-TRACK] Redis error:', error.message);
                        }
                    }
                })();
            }
            originalSend.call(this, data);
        };

        next();
    };
};


module.exports = {
    ddosProtectionLimiter,
    criticalEndpointsLimiter,
    trapEndpointsLimiter,
    applicationLimiter,
    violationTracker,
    manualBlacklistIP,
    redisClient
};
