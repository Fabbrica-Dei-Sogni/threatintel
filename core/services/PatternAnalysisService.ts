import { logger } from '../../logger';
import crypto from 'crypto';
import ConfigService from './ConfigService';
import dotenv from 'dotenv';
import { Request } from 'express';

// Import JS dependencies
const geoip = require('geoip-lite');

dotenv.config();

interface RequestAnalysisResult {
    fingerprint: string;
    analysis: any;
    geo: any;
}

class PatternAnalysisService {
    private geoEnabled: boolean;
    private suspiciousPatterns: RegExp[];
    private botPatterns: RegExp[];
    private suspiciousReferers: RegExp[];
    private suspiciousScores: any;
    private initialized: Promise<void>;

    constructor(options: any = {}) {

        this.geoEnabled = options.geoEnabled !== false;
        this.suspiciousPatterns = [];
        this.botPatterns = [];
        this.suspiciousReferers = [];
        this.suspiciousScores = {};

        // Promessa di inizializzazione che sarà completata al caricamento da DB
        this.initialized = this._initFromDB();
    }

    async _initFromDB() {
        try {
            // Carica configurazioni chiave-valore
            const [
                suspiciousPatternsStr,
                botPatternsStr,
                suspiciousReferersStr,
                suspiciousScoresStr
            ] = await Promise.all([
                ConfigService.getConfigValue('SUSPICIOUS_PATTERNS'),
                ConfigService.getConfigValue('BOT_PATTERNS'),
                ConfigService.getConfigValue('SUSPICIOUS_REFERERS'),
                ConfigService.getConfigValue('SUSPICIOUS_SCORES')
            ]);

            // Parsing patterns in Regex
            this.suspiciousPatterns = (suspiciousPatternsStr || '')
                .split(',')
                .map((p: string) => p.trim())
                .filter(Boolean)
                .map((pat: string) => new RegExp(pat, 'i'));

            this.botPatterns = (botPatternsStr || '')
                .split(',')
                .map((p: string) => p.trim())
                .filter(Boolean)
                .map((pat: string) => new RegExp(pat, 'i'));

            this.suspiciousReferers = (suspiciousReferersStr || '')
                .split(',')
                .map((p: string) => p.trim())
                .filter(Boolean)
                .map((pat: string) => new RegExp(pat, 'i'));

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

            logger.info(`[ThreatLogger] Configurazioni pattern caricate da DB`);
        } catch (err: any) {
            logger.error(`[ThreatLogger] Errore caricamento configurazioni da DB: ${err.message}`);
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

    generateFingerprint(req: Request, ip: string) {
        const fingerprint = {
            ip: ip,
            userAgent: req.get('User-Agent'),
            acceptLanguage: req.get('Accept-Language'),
            acceptEncoding: req.get('Accept-Encoding')
        };

        const hash = crypto
            .createHash('md5')
            .update(JSON.stringify(fingerprint))
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

    analyze(fullUrl: string, userAgent: string, bodyStr: string, referer: string, method: string, queryStr: string, requestToAnalyze: any, jndiPayload?: string) {
        const suspicious: string[] = [];
        let score = 0;
        //0. analisi preliminare su controlli speciali di dogana
        //verificare se esiste l'header impostato dall'nginx della vps su cui traccia la provenienza da un altra porta
        Object.keys(requestToAnalyze.headers).forEach(headerName => {
            if (headerName.toLowerCase() === 'x-server-port') {
                suspicious.push(`ALT_PORT:${requestToAnalyze.headers[headerName]}`);
                score += this.suspiciousScores.ALT_PORT;
            }
        });
        // 1. Pattern sospetti in URL
        this.suspiciousPatterns.forEach(pattern => {
            if (pattern.test(fullUrl)) {
                suspicious.push(`URL_PATTERN:${pattern.source}`);
                score += this.suspiciousScores.URL_PATTERN;
            }
        });

        // 2. Pattern sospetti nel body
        this.suspiciousPatterns.forEach(pattern => {
            if (pattern.test(bodyStr)) {
                suspicious.push(`BODY_PATTERN:${pattern.source}`);
                score += this.suspiciousScores.BODY_PATTERN;
            }
        });


        // 3. User-Agent mancante o troppo corto
        if (!userAgent) {
            suspicious.push('MISSING_USER_AGENT');
            score += this.suspiciousScores.MISSING_USER_AGENT;
        } else if (userAgent.length < 10) {
            suspicious.push('SHORT_USER_AGENT');
            score += this.suspiciousScores.SHORT_USER_AGENT;
        }
        else {
            this.suspiciousReferers.forEach(pattern => {
                if (pattern.test(userAgent)) {
                    suspicious.push(`SUSPICIOUS_REFERER:${pattern.source}`);
                    score += this.suspiciousScores.SUSPICIOUS_REFERER;
                }
            });
        }

        // 4. User-Agent da bot/crawler
        this.botPatterns.forEach(pattern => {
            if (pattern.test(userAgent)) {
                suspicious.push(`BOT_USER_AGENT:${pattern.source}`);
                score += this.suspiciousScores.BOT_USER_AGENT;
            }
        });
        // Verifica bot/crawler
        //const isBot = this.botPatterns.some(pattern => pattern.test(userAgent));

        // 5. Referer sospetto
        this.suspiciousReferers.forEach(pattern => {
            if (referer && pattern.test(referer)) {
                suspicious.push(`SUSPICIOUS_REFERER:${pattern.source}`);
                score += this.suspiciousScores.SUSPICIOUS_REFERER;
            }
        });
        if (jndiPayload) {
            suspicious.push(`SUSPICIOUS_REFERER:JNDI_PAYLOAD[${jndiPayload}]`);
            //aggiungo un valore piu alto ad un jndiPayload, in futuro gestiro meglio questo punteggio
            score += this.suspiciousScores.SUSPICIOUS_REFERER + 15;
        }

        // 6. Metodo HTTP anomalo
        if (!['GET', 'POST', 'HEAD'].includes(method)) {
            suspicious.push('UNCOMMON_METHOD');
            score += this.suspiciousScores.UNCOMMON_METHOD;
        }

        return {
            suspicious: score > 0,
            score,
            indicators: suspicious,
            isBot: suspicious.some(i => i.startsWith('BOT_USER_AGENT'))
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
