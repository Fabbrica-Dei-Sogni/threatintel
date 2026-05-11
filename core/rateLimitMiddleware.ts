import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStoreImport from 'rate-limit-redis';
const RedisStore: any = (RedisStoreImport as any).default || RedisStoreImport;
import { RateLimitService } from './services/RateLimitService';
import { RedisService } from './services/RedisService';
import { AppConfigProvider } from './services/AppConfigProvider';
import { inject, singleton } from 'tsyringe';
import { getComponent } from './di/container';
import { LOGGER_TOKEN, REDIS_SERVICE_TOKEN, CONFIG_PROVIDER_TOKEN } from './di/tokens';
import { Logger } from 'winston';

@singleton()
export class RateLimitMiddleware {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(REDIS_SERVICE_TOKEN) private readonly redisService: RedisService,
        @inject(CONFIG_PROVIDER_TOKEN) private readonly config: AppConfigProvider,
        private readonly rateLimitService: RateLimitService
    ) { }

    private getRedisClient() {
        if (!this.redisService.isReady()) {
            throw new Error('Redis non disponibile');
        }
        return this.redisService.getClient()!;
    }

    public async removeIPFromBlacklist(ip: string) {
        const client = this.getRedisClient();

        // Rimozione ip da blacklist redis
        await client.srem('blacklisted-ips', ip);
        await client.del(`blacklist:${ip}`);
        await client.del(`violations:${ip}`);

        // Pulizia contatori rate limit (pattern matching semplificato o chiavi note)
        const keysToDel = [
            `ddos:${ip}`,
            `app:${ip}`,
            `trap:${ip}`
        ];

        for (const key of keysToDel) {
            await client.del(key);
        }

        this.logger.info(`[BLACKLIST-REMOVE] IP ${ip} rimosso dalla blacklist e contatori resettati.`);
    }

    public async manualBlacklistIP(ip: string) {
        const client = this.getRedisClient();

        const blacklistDuration = this.config.blacklistDuration;

        // Aggiunta ip in blacklist redis
        await client.sadd('blacklisted-ips', ip);
        await client.setex(`blacklist:${ip}`, blacklistDuration, 'manual-blacklisted');

        // Log evento su MongoDB
        const eventData = {
            ip,
            limitType: 'manual-blacklist',
            path: '/manual-blacklist',
            method: 'POST',
            timestamp: new Date().toISOString(),
            message: `IP manualmente inserito in blacklist per ${blacklistDuration} secondi`,
            honeypotId: this.config.honeypotInstanceId
        };

        await this.rateLimitService.logEvent(eventData);
        this.logger.info(`[MANUAL BLACKLIST] IP ${ip} aggiunto in blacklist per ${blacklistDuration} secondi.`);
    }

    // Store configurazione (Redis se disponibile, altrimenti memory)
    private getStore() {
        if (!this.redisService.isReady()) {
            return undefined; // Default memory store
        }

        const client = this.redisService.getClient()!;
        return new RedisStore({
            sendCommand: (...args: any[]) => (client as any).call(...args),
        });
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
                honeypotId: this.config.honeypotInstanceId,
                message: res.statusMessage || 'Rate limit event'
            };

            this.rateLimitService.logEvent(eventData).catch((err: any) => {
                this.logger.error('Errore salvataggio evento rate limit:', err);
            });

            // Log dell'evento prima di bloccare
            if (this.config.logRateLimitEvents) {
                this.logger.warn(`[RATE-LIMIT-${limitType.toUpperCase()}] ${req.ip} blocked on ${req.path}`, logData);
            }

            // Risposta personalizzata per honeypot
            res.status(429).json({
                error: 'Rate limit exceeded',
                type: limitType,
                message: 'Troppo veloce, amico! Rallenta un po\'...',
                retryAfter: res.getHeader && res.getHeader('Retry-After'),
                timestamp: new Date().toISOString(),
                honeypotId: this.config.honeypotInstanceId
            });
        };
    }

    // Helper per verificare se un IP è escluso (whitelist)
    private isExcluded(req: any): boolean {
        // Logica specifica richiesta dall'utente: skip se naviga alla location della dashboard configurata
        const dashboardPath = this.config.appBasePath.toLowerCase();
        const pathStr = (req.originalUrl || req.path || '').toLowerCase();

        // Se la dashboard è in root (/), whitelisti solo la home. 
        // Se è in una sottocartella, whitelisti tutto ciò che inizia con quel path.
        const isDashboardRequest = dashboardPath === '/' 
            ? (pathStr === '/' || pathStr === '') 
            : pathStr.startsWith(dashboardPath);

        if (isDashboardRequest || pathStr.startsWith('/api/')) {
            this.logger.debug(`[WHITELIST-BYPASS] IP ${req.ip} allowed for path: ${pathStr}`);
            return true;
        }

        const excludedIPs = this.config.excludedIps;
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
            windowMs: this.config.ddosWindowMs,
            max: this.config.ddosMaxRequests,
            message: 'DDoS protection activated',
            standardHeaders: true,
            legacyHeaders: false,
            passOnStoreError: true,
            handler: this.createRateLimitHandler('ddos-protection'),
            keyGenerator: (req, _res) => `ddos:${ipKeyGenerator(req.ip || 'unknown')}`,
            skip: (req) => this.isExcluded(req)
        });
    }

    // 2. Rate limiting per endpoint critici (login, admin)
    public criticalEndpointsLimiter() {
        return rateLimit({
            store: this.getStore(),
            windowMs: this.config.criticalWindowMs,
            max: this.config.criticalMaxRequests,
            message: 'Critical endpoint rate limit exceeded',
            standardHeaders: true,
            legacyHeaders: false,
            passOnStoreError: true,
            handler: this.createRateLimitHandler('critical-endpoints'),
            keyGenerator: (req, _res) => `critical:${ipKeyGenerator(req.ip || 'unknown')}:${req.path}`,
            skipSuccessfulRequests: false, // Conta anche richieste "riuscite" per honeypot
            skip: (req) => this.isExcluded(req)
        });
    }

    // 3. Rate limiting per endpoint trappola comuni
    public trapEndpointsLimiter() {
        return rateLimit({
            store: this.getStore(),
            windowMs: this.config.trapWindowMs,
            max: this.config.trapMaxRequests,
            message: 'Trap endpoint rate limit exceeded',
            standardHeaders: true,
            legacyHeaders: false,
            passOnStoreError: true,
            handler: this.createRateLimitHandler('trap-endpoints'),
            keyGenerator: (req, _res) => `trap:${ipKeyGenerator(req.ip || 'unknown')}`,
            skip: (req) => this.isExcluded(req)
        });
    }

    // 4. Rate limiting generale applicazione
    public applicationLimiter() {
        return rateLimit({
            store: this.getStore(),
            windowMs: this.config.appWindowMs,
            max: this.config.appMaxRequests,
            message: 'Application rate limit exceeded',
            standardHeaders: true,
            legacyHeaders: false,
            passOnStoreError: true,
            handler: this.createRateLimitHandler('application'),
            keyGenerator: (req, _res) => `app:${ipKeyGenerator(req.ip || 'unknown')}`,
            skip: (req) => this.isExcluded(req)
        });
    }

    // Middleware per tracking violazioni e blacklist automatica
    public violationTracker() {
        return async (req: any, res: any, next: any) => {
            const ip = req.ip;

            // 1. PRIORITÀ ASSOLUTA: Bypass per navigazione protetta (Dashboard e API)
            const dashboardPath = this.config.appBasePath.toLowerCase();
            const pathStr = (req.originalUrl || req.path || req.url || '').toLowerCase();

            const isDashboardRequest = dashboardPath === '/' 
                ? (pathStr === '/' || pathStr === '') 
                : pathStr.startsWith(dashboardPath);

            if (isDashboardRequest || pathStr.startsWith('/api/')) {
                // Log solo per dashboard per non intasare i log
                if (isDashboardRequest) {
                    console.log(`[DEBUG-BYPASS] IP ${ip} sta accedendo a dashboard configurata: ${pathStr} - BYPASS ATTIVATO`);
                }
                return next();
            }

            // 2. Salta se l'IP è in whitelist (EXCLUDED_IPS)
            if (this.isExcluded(req)) {
                return next();
            }

            // 3. Controlla blacklist dinamica
            if (this.redisService.isReady()) {
                const client = this.redisService.getClient()!;
                try {
                    const isBlacklisted = await client.sismember('blacklisted-ips', ip);
                    if (isBlacklisted) {
                        const blacklistTTL = await client.ttl(`blacklist:${ip}`);

                        this.logger.warn(`[BLACKLISTED] IP ${ip} attempted access to ${pathStr} while blacklisted`);

                        return res.status(403).json({
                            error: 'IP temporarily blacklisted',
                            reason: 'Repeated rate limit violations',
                            unblockIn: blacklistTTL > 0 ? `${blacklistTTL} seconds` : 'soon',
                            honeypotId: this.config.honeypotInstanceId,
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
                if (res.statusCode === 429 && self.redisService.isReady()) {
                    const client = self.redisService.getClient()!;
                    // Verifica se il path è escluso dal tracking delle violazioni
                    // Escludiamo solo la dashboard configurata e le chiamate API
                    const isDashboardRequest = dashboardPath === '/' 
                        ? (pathStr === '/' || pathStr === '') 
                        : pathStr.startsWith(dashboardPath);
                    const isWhitelistedPath = (isDashboardRequest || pathStr.startsWith('/api/'));

                    if (!isWhitelistedPath) {
                        // Traccia violazione per blacklist automatica
                        (async () => {
                            try {
                                const violationKey = `violations:${ip}`;
                                const violations = await client.incr(violationKey);

                                if (violations === 1) {
                                    await client.expire(violationKey, 3600); // 1 ora window
                                }

                                const maxViolations = self.config.maxViolations;
                                if (violations >= maxViolations) {
                                    // Blacklist temporanea
                                    const blacklistDuration = self.config.blacklistDuration;
                                    await client.sadd('blacklisted-ips', ip);
                                    await client.setex(`blacklist:${ip}`, blacklistDuration, 'auto-blacklisted');

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

export const redisClient = {
    get status() { return getComponent<RedisService>(REDIS_SERVICE_TOKEN).isReady() ? 'ready' : 'connecting'; },
    call: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.call(...args),
    sadd: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.sadd(...args),
    setex: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.setex(...args),
    srem: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.srem(...args),
    del: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.del(...args),
    keys: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.keys(...args),
    scard: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.scard(...args),
    sismember: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.sismember(...args),
    ttl: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.ttl(...args),
    incr: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.incr(...args),
    expire: (...args: any[]) => (getComponent<RedisService>(REDIS_SERVICE_TOKEN).getClient() as any)?.expire(...args),
} as any;

export const isRedisRateLimitReady = () => getComponent<RedisService>(REDIS_SERVICE_TOKEN).isReady();
