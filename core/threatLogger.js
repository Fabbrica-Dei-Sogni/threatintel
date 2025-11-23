const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();
const ThreatLogService = require('./services/ThreatLogService').default;
const PatternAnalysis = require('./services/PatternAnalysisService').default;
const net = require('net');


class ThreatLogger {
    constructor(options = {}) {
        this.patternAnalysisInstance = options.patternAnalysisInstance || new PatternAnalysis({ geoEnabled: true });
        this.mongoUri = options.mongoUri || 'mongodb://localhost:27017/threatintel';
        this.enabled = options.enabled !== false;
        this.geoEnabled = options.geoEnabled !== false;
        this.maxBodySize = options.maxBodySize || 1024; // KB

        this.initDatabase();
    }

    async initDatabase() {
        try {
            await mongoose.connect(this.mongoUri);
            console.log('[ThreatLogger] Connesso a MongoDB');
        } catch (error) {
            console.error('[ThreatLogger] Errore connessione MongoDB:', error);
        }
    }


    middleware() {
        return async (req, res, next) => {
            if (!this.enabled) return next();

            // --- AGGIUNTA: Salta logging per /api/ ---
            if ((req.path || req.originalUrl || '').startsWith('/api/')) {
                return next();
            }
            // -----------------------------------------

            const startTime = Date.now();
            const requestId = crypto.randomUUID();

            // Estrai IP reale
            /*const ip = req.ip ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.headers['x-forwarded-for']?.split(',')[0];*/

            // Funzione helper per validare IP
            function isValidIP(ip) {
                return net.isIP(ip) !== 0;
            }

            // Estrai possibile IP dagli header
            const rawIpFromHeaders = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.headers['x-real-ip']?.trim();

            let ip = null;
            let jndiPayload = null;

            if (rawIpFromHeaders && rawIpFromHeaders.includes('${jndi:')) {
                // Payload JNDI sospetto isolato
                jndiPayload = rawIpFromHeaders;
            } else if (rawIpFromHeaders && isValidIP(rawIpFromHeaders)) {
                ip = rawIpFromHeaders;
            } else if (req.ip && isValidIP(req.ip)) {
                ip = req.ip;
            } else if (req.connection?.remoteAddress && isValidIP(req.connection.remoteAddress)) {
                ip = req.connection.remoteAddress;
            } else if (req.socket?.remoteAddress && isValidIP(req.socket.remoteAddress)) {
                ip = req.socket.remoteAddress;
            }

            //normalizzazione dell'ip qualora sia stato adulterato con il jndipayload
            //req.ip = ip;
            req.jndiPayload = jndiPayload;  // Aggiunta variabile payload JNDI


            const dataAnalysis = await this.patternAnalysisInstance.applyAnalysis(req, ip);
            // Genera fingerprint
            const fingerprint = dataAnalysis.fingerprint;// this.generateFingerprint(req);

            // Analizza richiesta
            const analysis = dataAnalysis.analysis; // this.analyzeRequest(req);

            // Ottieni geolocalizzazione
            const geo = dataAnalysis.geo;// this.getGeoLocation(ip);

            // Crea log entry
            const logEntry = {
                id: requestId,
                timestamp: new Date(),
                request: {
                    ip: ip,
                    jndiPayload: req.jndiPayload,  // Aggiunta variabile payload JNDI
                    method: req.method,
                    url: req.originalUrl || req.url,
                    userAgent: req.get('User-Agent'),
                    referer: req.get('Referer'),
                    headers: this.sanitizeHeaders(req.headers),
                    body: this.sanitizeBody(req.body),
                    query: req.query,
                    cookies: req.cookies
                },
                geo: geo,
                fingerprint: {
                    hash: fingerprint,
                    suspicious: analysis.suspicious,
                    score: analysis.score,
                    indicators: analysis.indicators
                },
                metadata: {
                    sessionId: req.sessionID,
                    isBot: analysis.isBot,
                    isCrawler: analysis.isBot
                }
            };

            // Log della risposta
            res.on('finish', async () => {
                const responseTime = Date.now() - startTime;

                logEntry.response = {
                    statusCode: res.statusCode,
                    responseTime: responseTime,
                    size: res.get('Content-Length') || 0
                };

                try {
                    //await new ThreatLog(logEntry).save();
                    await ThreatLogService.saveLog(logEntry);

                    if (analysis.suspicious && analysis.score > 10) {
                        console.warn(`[ThreatLogger] ⚠️  Richiesta sospetta rilevata:`, JSON.stringify({
                            ip: ip,
                            jndiPayload: req.jndiPayload,
                            url: req.originalUrl,
                            score: analysis.score,
                            indicators: analysis.indicators
                        }, null, 2));
                    }
                } catch (error) {
                    console.error('[ThreatLogger] Errore salvataggio log:', error);
                }
            });

            next();
        };
    }

    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        delete sanitized.authorization;
        delete sanitized.cookie;
        return sanitized;
    }

    sanitizeBody(body) {
        if (!body) return {};

        const bodyStr = JSON.stringify(body);
        if (bodyStr.length > this.maxBodySize * 1024) {
            return { __truncated: true, size: bodyStr.length };
        }

        const sanitized = { ...body };
        ['password', 'token', 'key', 'secret'].forEach(field => {
            if (sanitized[field]) {
                console.log("La richiesta contiene informazioni sensibili");
                //sanitized[field] = '[MASKED]';
            }
        });

        return sanitized;
    }
}

module.exports = ThreatLogger;
