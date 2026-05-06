import crypto from 'crypto';
import dotenv from 'dotenv';
import { Request } from 'express';
import { ConfigService } from './ConfigService';
import { inject, injectable } from 'tsyringe';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { ThreatIndicator } from '../types/indicators';
import { AnalysisResult, GeoLocation } from '../types/threat-log.types';

// Import JS dependencies
import * as geoip from 'geoip-lite';

dotenv.config();

interface RequestAnalysisResult {
    fingerprint: string;
    analysis: AnalysisResult;
    geo: GeoLocation | Record<string, any>;
}

@injectable()
export class PatternAnalysisService {
    private geoEnabled: boolean;
    private suspiciousPatterns: RegExp[];
    private botPatterns: RegExp[];
    private suspiciousReferers: RegExp[];
    private suspiciousScores: any;
    private initialized: Promise<void>;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService
    ) {

        //XXX: si imposta la geolocalizzazione sempre attiva. fornire un sistema per parametrizzarlo qualora sia necessario in futuro.
        this.geoEnabled = true;// options.geoEnabled !== false;
        this.suspiciousPatterns = [];
        this.botPatterns = [];
        this.suspiciousReferers = [];
        this.suspiciousScores = {};

        // Promessa di inizializzazione che sarà completata al caricamento da DB
        this.initialized = this.loadConfigFromDB();
    }

    async loadConfigFromDB() {
        try {
            // Carica configurazioni chiave-valore
            const [
                suspiciousPatternsStr,
                botPatternsStr,
                suspiciousReferersStr,
                suspiciousScoresStr
            ] = await Promise.all([
                this.configService.getConfigValue('SUSPICIOUS_PATTERNS'),
                this.configService.getConfigValue('BOT_PATTERNS'),
                this.configService.getConfigValue('SUSPICIOUS_REFERERS'),
                this.configService.getConfigValue('SUSPICIOUS_SCORES')
            ]);

            // Parsing patterns in Regex
            this.suspiciousPatterns = (suspiciousPatternsStr || '')
                .split(',')
                .map((p: string) => p.trim())
                .filter(Boolean)
                .map((pat: string) => {
                    try {
                        return new RegExp(pat, 'i');
                    } catch (e) {
                        this.logger.error(`[PatternAnalysisService] Invalid suspicious pattern regex: ${pat}`);
                        return null;
                    }
                })
                .filter((r): r is RegExp => r !== null);

            this.botPatterns = (botPatternsStr || '')
                .split(',')
                .map((p: string) => p.trim())
                .filter(Boolean)
                .map((pat: string) => {
                    try {
                        return new RegExp(pat, 'i');
                    } catch (e) {
                        this.logger.error(`[PatternAnalysisService] Invalid bot pattern regex: ${pat}`);
                        return null;
                    }
                })
                .filter((r): r is RegExp => r !== null);

            this.suspiciousReferers = (suspiciousReferersStr || '')
                .split(',')
                .map((p: string) => p.trim())
                .filter(Boolean)
                .map((pat: string) => {
                    try {
                        return new RegExp(pat, 'i');
                    } catch (e) {
                        this.logger.error(`[PatternAnalysisService] Invalid suspicious referer regex: ${pat}`);
                        return null;
                    }
                })
                .filter((r): r is RegExp => r !== null);

            // Parsing punteggi
            let scores: any = {};
            if (suspiciousScoresStr) {
                try {
                    scores = JSON.parse(suspiciousScoresStr);
                } catch {
                    // fallback parsing key:value
                    scores = suspiciousScoresStr.split(',').reduce((acc: any, pair: string) => {
                        const [key, value] = pair.split(':');
                        if (key && value && !isNaN(Number(value))) acc[key] = Number(value);
                        return acc;
                    }, {});
                }
            }
            const defaultScores = {
                URL_PATTERN: 10,
                ALT_PORT: 0,
                BODY_PATTERN: 15,
                MISSING_USER_AGENT: 5,
                SHORT_USER_AGENT: 3,
                BOT_USER_AGENT: 7,
                SUSPICIOUS_REFERER: 5,
                UNCOMMON_METHOD: 2,
                QUERY_PATTERN: 8
            };
            this.suspiciousScores = { ...defaultScores, ...scores };

            this.logger.info(`[ThreatLogger] Configurazioni pattern caricate da DB`);
        } catch (err: any) {
            this.logger.error(`[ThreatLogger] Errore caricamento configurazioni da DB: ${err.message}`);
            // fallback o rilancio errore a seconda del contesto
            // qui si potrebbe caricare default oppure propagare errore
        }
    }

    /**
 * Applica analisi di fingerprint, threat e geolocalizzazione su una richiesta Express.
 * @param {import('express').Request} req
 * @returns {RequestAnalysisResult}
 */
    async applyAnalysis(req: Request, ip: string): Promise<RequestAnalysisResult> {
        // Aspetta che l'inizializzazione sia completata
        await this.initialized;

        // Estrai IP reale
        /*const ip = req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.headers['x-forwarded-for']?.split(',')[0];*/

        // Genera fingerprint
        const fingerprint = this.generateFingerprint(req, ip);

        // Analizza richiesta
        const analysis = this.analyzeRequest(req);

        // Ottieni geolocalizzazione
        const geo = this.getGeoLocation(ip);

        return {
            fingerprint,
            analysis,
            geo
        };
    }

    generateFingerprint(req: any, _ip?: string) {
        // Compose the attack signature tokens
        // We exclude the IP to allow correlation of distributed attacks
        
        // Support both Express Request (req.get) and plain log objects (req.headers/userAgent)
        const getHeader = (name: string) => {
            if (!req) return null;
            const lowerName = name.toLowerCase();
            if (req.headers) {
                // Find case-insensitive match in headers object
                const key = Object.keys(req.headers).find(k => k.toLowerCase() === lowerName);
                if (key) return req.headers[key];
            }
            // Fallback for Express Request object (using 'header' alias to avoid Mongoose 'get' clash)
            if (typeof req.header === 'function') return req.header(name);
            return null;
        };

        const signatureTokens = {
            method: (req.method || 'GET').toUpperCase(),
            url: (req.originalUrl || req.url || '/'),
            userAgent: (req.userAgent || getHeader('User-Agent') || 'none'),
            acceptLanguage: getHeader('Accept-Language') || 'none',
            serverPort: getHeader('X-Server-Port') || getHeader('X-Forwarded-Port') || 'standard',
            // Normalize body to avoid hash changes on whitespace/order if possible
            body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : 'none',
            contentType: getHeader('Content-Type') || 'none'
        };

        const hash = crypto
            .createHash('md5')
            .update(JSON.stringify(signatureTokens))
            .digest('hex');

        return hash;
    }

    analyzeRequest(req: Request) {

        const fullUrl = req.originalUrl || req.url;
        const userAgent = req.get('User-Agent') || '';
        const bodyStr = JSON.stringify(req.body || {});
        const referer = req.get('Referer') || '';
        const method = req.method || '';
        const queryStr = JSON.stringify(req.query || {});

        const otherToAnalyze = {
            headers: this.sanitizeHeaders(req.headers)
        };

        const jndiPayload = (req as any).jndiPayload || '';

        return this.analyze(fullUrl, userAgent, bodyStr, referer, method, queryStr, otherToAnalyze, jndiPayload);
    }

    sanitizeHeaders(headers: any) {
        const sanitized = { ...headers };
        delete sanitized.authorization;
        delete sanitized.cookie;
        return sanitized;
    }

    analyze(fullUrl: string, userAgent: string, bodyStr: string, referer: string, method: string, _queryStr: string, requestToAnalyze: any, jndiPayload?: string): AnalysisResult {
        const indicators: string[] = [];
        let score = 0;

        // 0. analisi preliminare su controlli speciali di dogana
        if (requestToAnalyze && requestToAnalyze.headers) {
            Object.keys(requestToAnalyze.headers).forEach(headerName => {
                if (headerName.toLowerCase() === 'x-server-port') {
                    indicators.push(`${ThreatIndicator.ALT_PORT}:${requestToAnalyze.headers[headerName]}`);
                    score += this.suspiciousScores[ThreatIndicator.ALT_PORT];
                }
            });
        }

        // 1. Pattern sospetti in URL
        this.suspiciousPatterns.forEach(pattern => {
            if (pattern.test(fullUrl)) {
                indicators.push(`${ThreatIndicator.URL_PATTERN}:${pattern.source}`);
                score += this.suspiciousScores[ThreatIndicator.URL_PATTERN];
            }
        });

        // 2. Pattern sospetti nel body
        this.suspiciousPatterns.forEach(pattern => {
            if (pattern.test(bodyStr)) {
                indicators.push(`${ThreatIndicator.BODY_PATTERN}:${pattern.source}`);
                score += this.suspiciousScores[ThreatIndicator.BODY_PATTERN];
            }
        });

        // 3. User-Agent mancante o troppo corto
        if (!userAgent) {
            indicators.push(ThreatIndicator.MISSING_USER_AGENT);
            score += this.suspiciousScores[ThreatIndicator.MISSING_USER_AGENT];
        } else if (userAgent.length < 10) {
            indicators.push(ThreatIndicator.SHORT_USER_AGENT);
            score += this.suspiciousScores[ThreatIndicator.SHORT_USER_AGENT];
        } else {
            this.suspiciousReferers.forEach(pattern => {
                if (pattern.test(userAgent)) {
                    indicators.push(`${ThreatIndicator.SUSPICIOUS_REFERER}:${pattern.source}`);
                    score += this.suspiciousScores[ThreatIndicator.SUSPICIOUS_REFERER];
                }
            });
        }

        // 4. User-Agent da bot/crawler
        this.botPatterns.forEach(pattern => {
            if (pattern.test(userAgent)) {
                indicators.push(`${ThreatIndicator.BOT_USER_AGENT}:${pattern.source}`);
                score += this.suspiciousScores[ThreatIndicator.BOT_USER_AGENT];
            }
        });

        // 5. Referer sospetto
        this.suspiciousReferers.forEach(pattern => {
            if (referer && pattern.test(referer)) {
                indicators.push(`${ThreatIndicator.SUSPICIOUS_REFERER}:${pattern.source}`);
                score += this.suspiciousScores[ThreatIndicator.SUSPICIOUS_REFERER];
            }
        });

        if (jndiPayload) {
            indicators.push(`${ThreatIndicator.JNDI_PAYLOAD}[${jndiPayload}]`);
            score += this.suspiciousScores[ThreatIndicator.SUSPICIOUS_REFERER] + 15;
        }

        // 6. Metodo HTTP anomalo
        if (!['GET', 'POST', 'HEAD'].includes(method)) {
            indicators.push(ThreatIndicator.UNCOMMON_METHOD);
            score += this.suspiciousScores[ThreatIndicator.UNCOMMON_METHOD];
        }

        const tags = Array.from(new Set(indicators.map(s => s.split(':')[0].toLowerCase())));

        return {
            score,
            tags,
            indicators,
            suspicious: score > 0,
            isBot: indicators.some(i => i.startsWith(ThreatIndicator.BOT_USER_AGENT))
        };
    }

    getGeoLocation(ip: string) {
        if (!this.geoEnabled) return {};

        const geo = geoip.lookup(ip);
        if (!geo) return {};

        return {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            coordinates: geo.ll,
            timezone: geo.timezone
        };
    }

}

export default PatternAnalysisService;
