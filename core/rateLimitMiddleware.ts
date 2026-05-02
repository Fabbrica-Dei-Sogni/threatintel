/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
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

    public async removeIPFromBlacklist(ip: string) {
        if (!redisClient) {
            throw new Error('Redis non disponibile');
        }

        // Rimozione ip da blacklist redis
        await redisClient.srem('blacklisted-ips', ip);
        await redisClient.del(`blacklist:${ip}`);
        await redisClient.del(`violations:${ip}`);
        
        // Pulizia contatori rate limit (pattern matching semplificato o chiavi note)
        const keysToDel = [
            `ddos:${ip}`,
            `app:${ip}`,
            `trap:${ip}`
        ];
        
        for (const key of keysToDel) {
            await redisClient.del(key);
        }

        // Le chiavi 'critical' includono il path, potremmo averne diverse. 
        // Cerchiamole via pattern se necessario, ma intanto puliamo le principali.

        this.logger.info(`[BLACKLIST-REMOVE] IP ${ip} rimosso dalla blacklist e contatori resettati.`);
    }

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

    // Helper per verificare se un IP è escluso (whitelist)
    private isExcluded(req: any): boolean {
        // Logica specifica richiesta dall'utente: skip se naviga alla location della dashboard configurata
        const dashboardPath = (process.env.HONEYPOT_DASHBOARD_PATH || '/honeypot').toLowerCase();
        const pathStr = (req.originalUrl || req.path || '').toLowerCase();
        
        if (pathStr.includes(dashboardPath) || pathStr.startsWith('/api/')) {
            this.logger.debug(`[WHITELIST-BYPASS] IP ${req.ip} allowed for path: ${pathStr}`);
            return true;
        }

        const excludedIPs = (process.env.EXCLUDED_IPS || '').split(',').map((ip) => ip.trim()).filter(Boolean);
        const clientIp = req.ip || 'unknown';

        if (excludedIPs.includes(clientIp)) {
            this.logger.debug(`[WHITELIST-BYPASS] IP ${clientIp} allowed by EXCLUDED_IPS`);
            return true;
        }

        // Supporto per CIDR semplificato (es. 192.168.1.0/24)
        for (const range of excludedIPs) {
            if (range.includes('/')) {
                try {
                    const [rangeIp, prefix] = range.split('/');
                    const mask = parseInt(prefix, 10);
                    if (this.ipInSubnet(clientIp, rangeIp, mask)) return true;
                } catch (e) {
                    continue;
                }
            }
        }

        return false;
    }

    private ipInSubnet(ip: string, subnet: string, mask: number): boolean {
        // Implementazione semplificata per IPv4
        const ipToLong = (addr: string) => {
            const parts = addr.split('.');
            if (parts.length !== 4) return null;
            return parts.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
        };

        try {
            const ipLong = ipToLong(ip);
            const subnetLong = ipToLong(subnet);
            if (ipLong === null || subnetLong === null) return false;

            const maskLong = (0xFFFFFFFF << (32 - mask)) >>> 0;
            return (ipLong & maskLong) === (subnetLong & maskLong);
        } catch (e) {
            return false;
        }
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
            keyGenerator: (req, res) => `ddos:${ipKeyGenerator(req.ip || 'unknown')}`,
            skip: (req) => this.isExcluded(req)
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
            keyGenerator: (req, res) => `critical:${ipKeyGenerator(req.ip || 'unknown')}:${req.path}`,
            skipSuccessfulRequests: false, // Conta anche richieste "riuscite" per honeypot
            skip: (req) => this.isExcluded(req)
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
            keyGenerator: (req, res) => `trap:${ipKeyGenerator(req.ip || 'unknown')}`,
            skip: (req) => this.isExcluded(req)
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
            keyGenerator: (req, res) => `app:${ipKeyGenerator(req.ip || 'unknown')}`,
            skip: (req) => this.isExcluded(req)
        });
    }

    // Middleware per tracking violazioni e blacklist automatica
    public violationTracker() {
        return async (req: any, res: any, next: any) => {
            const ip = req.ip;

            // 1. PRIORITÀ ASSOLUTA: Bypass per navigazione protetta (Dashboard e API)
            const dashboardPath = (process.env.HONEYPOT_DASHBOARD_PATH || '/honeypot').toLowerCase();
            const pathStr = (req.originalUrl || req.path || req.url || '').toLowerCase();
            
            if (pathStr.includes(dashboardPath) || pathStr.startsWith('/api/')) {
                // Log solo per dashboard per non intasare i log
                if (pathStr.includes(dashboardPath)) {
                    console.log(`[DEBUG-BYPASS] IP ${ip} sta accedendo a dashboard configurata: ${pathStr} - BYPASS ATTIVATO`);
                }
                return next();
            }

            // 2. Salta se l'IP è in whitelist (EXCLUDED_IPS)
            if (this.isExcluded(req)) {
                return next();
            }

            // 3. Controlla blacklist dinamica
            if (redisClient) {
                try {
                    const isBlacklisted = await redisClient.sismember('blacklisted-ips', ip);
                    if (isBlacklisted) {
                        const blacklistTTL = await redisClient.ttl(`blacklist:${ip}`);

                        this.logger.warn(`[BLACKLISTED] IP ${ip} attempted access to ${pathStr} while blacklisted`);

                        return res.status(403).json({
                            error: 'IP temporarily blacklisted',
                            reason: 'Repeated rate limit violations',
                            unblockIn: blacklistTTL > 0 ? `${blacklistTTL} seconds` : 'soon',
                            honeypotId: process.env.HONEYPOT_INSTANCE_ID,
                            debugPath: pathStr // Ti aggiungo questo per capire cosa vede il server
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
                    // Verifica se il path è escluso dal tracking delle violazioni
                    // Escludiamo solo la dashboard configurata e le chiamate API
                    const isWhitelistedPath = (pathStr.includes(dashboardPath) || 
                                              pathStr.startsWith('/api/'));

                    if (!isWhitelistedPath) {
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

                                    self.logger.error(`[AUTO-BLACKLIST] IP ${ip} blacklisted for ${violations} violations on ${req.path}`);
                                }
                            } catch (error: any) {
                                self.logger.error('[VIOLATION-TRACK] Redis error:', error.message);
                            }
                        })();
                    } else {
                        self.logger.info(`[VIOLATION-SKIP] Skipping violation track for ${ip} on whitelisted path: ${req.path}`);
                    }
                }
                return originalSend.call(this, data);
            };

            next();
        };
    }
}

export { redisClient };
