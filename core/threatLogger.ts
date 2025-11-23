import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import ThreatLogService from './services/ThreatLogService';
import PatternAnalysis from './services/PatternAnalysisService';
import net from 'net';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

type AnyReq = Request & { jndiPayload?: any; sessionID?: string };

class ThreatLogger {
    patternAnalysisInstance: any;
    mongoUri: string;
    enabled: boolean;
    geoEnabled: boolean;
    maxBodySize: number;

    constructor(options: any = {}) {
        this.patternAnalysisInstance = options.patternAnalysisInstance || new PatternAnalysis({ geoEnabled: true });
        this.mongoUri = options.mongoUri || 'mongodb://localhost:27017/threatintel';
        this.enabled = options.enabled !== false;
        this.geoEnabled = options.geoEnabled !== false;
        this.maxBodySize = options.maxBodySize || 1024; // KB

        this.initDatabase();
    }

    async initDatabase() {
        try {
            await mongoose.connect(this.mongoUri as string);
            console.log('[ThreatLogger] Connesso a MongoDB');
        } catch (error: any) {
            console.error('[ThreatLogger] Errore connessione MongoDB:', error);
        }
    }

    middleware() {
        return async (req: AnyReq, res: Response, next: NextFunction) => {
            if (!this.enabled) return next();

            // Skip logging for /api/
            if ((req.path || (req as any).originalUrl || '').startsWith('/api/')) {
                return next();
            }

            const startTime = Date.now();
            const requestId = (crypto as any).randomUUID ? (crypto as any).randomUUID() : crypto.randomBytes(16).toString('hex');

            function isValidIP(ip?: string | null) {
                return !!ip && net.isIP(ip) !== 0;
            }

            const rawIpFromHeaders: string | undefined = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || (req.headers['x-real-ip'] as string | undefined)?.trim();

            let ip: string | null = null;
            let jndiPayload: string | null = null;

            if (rawIpFromHeaders && rawIpFromHeaders.includes('${jndi:')) {
                jndiPayload = rawIpFromHeaders;
            } else if (rawIpFromHeaders && isValidIP(rawIpFromHeaders)) {
                ip = rawIpFromHeaders;
            } else if (req.ip && isValidIP(req.ip)) {
                ip = req.ip;
            } else if ((req as any).connection?.remoteAddress && isValidIP((req as any).connection.remoteAddress)) {
                ip = (req as any).connection.remoteAddress;
            } else if ((req as any).socket?.remoteAddress && isValidIP((req as any).socket.remoteAddress)) {
                ip = (req as any).socket.remoteAddress;
            }

            req.jndiPayload = jndiPayload;

            const dataAnalysis = await this.patternAnalysisInstance.applyAnalysis(req, ip);
            const fingerprint = dataAnalysis.fingerprint;
            const analysis = dataAnalysis.analysis;
            const geo = dataAnalysis.geo;

            const logEntry: any = {
                id: requestId,
                timestamp: new Date(),
                request: {
                    ip: ip,
                    jndiPayload: req.jndiPayload,
                    method: req.method,
                    url: (req as any).originalUrl || req.url,
                    userAgent: req.get && req.get('User-Agent'),
                    referer: req.get && req.get('Referer'),
                    headers: this.sanitizeHeaders(req.headers as any),
                    body: this.sanitizeBody(req.body),
                    query: req.query,
                    cookies: (req as any).cookies
                },
                geo: geo,
                fingerprint: {
                    hash: fingerprint,
                    suspicious: analysis.suspicious,
                    score: analysis.score,
                    indicators: analysis.indicators
                },
                metadata: {
                    sessionId: (req as any).sessionID,
                    isBot: analysis.isBot,
                    isCrawler: analysis.isBot
                }
            };

            res.on('finish', async () => {
                const responseTime = Date.now() - startTime;

                logEntry.response = {
                    statusCode: res.statusCode,
                    responseTime: responseTime,
                    size: res.get('Content-Length') || 0
                };

                try {
                    await ThreatLogService.saveLog(logEntry);

                    if (analysis.suspicious && analysis.score > 10) {
                        console.warn('[ThreatLogger] ⚠️  Richiesta sospetta rilevata:', JSON.stringify({
                            ip: ip,
                            jndiPayload: req.jndiPayload,
                            url: (req as any).originalUrl,
                            score: analysis.score,
                            indicators: analysis.indicators
                        }, null, 2));
                    }
                } catch (error: any) {
                    console.error('[ThreatLogger] Errore salvataggio log:', error);
                }
            });

            next();
        };
    }

    sanitizeHeaders(headers: any) {
        const sanitized = { ...headers };
        delete sanitized.authorization;
        delete sanitized.cookie;
        return sanitized;
    }

    sanitizeBody(body: any) {
        if (!body) return {};

        const bodyStr = JSON.stringify(body);
        if (bodyStr.length > this.maxBodySize * 1024) {
            return { __truncated: true, size: bodyStr.length };
        }

        const sanitized = { ...body };
        ['password', 'token', 'key', 'secret'].forEach(field => {
            if (sanitized[field]) {
                console.log('La richiesta contiene informazioni sensibili');
            }
        });

        return sanitized;
    }
}

export default ThreatLogger;
