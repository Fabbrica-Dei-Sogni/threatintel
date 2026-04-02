import { spawn } from 'child_process';
import { inject, singleton } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { ThreatLogService } from './ThreatLogService';
import PatternAnalysisService from './PatternAnalysisService';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Lista di pattern di URI sospetti da monitorare sul traffico HTTPS.
 * Viene popolata con i COMMON_ENDPOINTS del .env, ma può essere estesa.
 */
const DEFAULT_SUSPICIOUS_PATTERNS = [
    /^\/(admin|wp-admin|phpmyadmin|manager|console|panel|control|dashboard)/i,
    /\.(env|git|config|bak|sql|zip|tar|gz|log|backup)(\?.*)?$/i,
    /^\/(api|rest|graphql|actuator|solr|jenkins|setup|install)/i,
    /\/(shell|cmd|exec|eval|passthru|system)\b/i,
    /\.(php|asp|aspx|jsp|cgi)\b/i,
    /\/(etc\/passwd|proc\/self|win\.ini)/i,
    /(union.*select|select.*from|insert.*into|drop.*table)/i, // SQLi
    /(<script|javascript:|onerror=|onload=)/i,                // XSS
];

import { ILongRunningService, ServiceStatus } from '../types/lifecycle';
import { ThreatIndicator } from '../types/indicators';
import { log } from 'console';

@singleton()
export class NginxLogService implements ILongRunningService {
    public readonly serviceName = 'NginxLogService';
    private status: ServiceStatus = ServiceStatus.IDLE;
    private journalProcess: any = null;
    private suspiciousPatterns: RegExp[];

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly threatLogService: ThreatLogService,
        private readonly patternAnalysisService: PatternAnalysisService
    ) {
        this.suspiciousPatterns = this.buildSuspiciousPatterns();
    }

    /**
     * Combina i pattern di default con i COMMON_ENDPOINTS definiti nel .env
     */
    private buildSuspiciousPatterns(): RegExp[] {
        const patterns = [...DEFAULT_SUSPICIOUS_PATTERNS];

        const commonEndpoints = process.env.COMMON_ENDPOINTS;
        if (commonEndpoints) {
            const endpoints = commonEndpoints.split(',').map(e => e.trim()).filter(Boolean);
            for (const endpoint of endpoints) {
                const escaped = endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                patterns.push(new RegExp(`^${escaped}`, 'i'));
            }
        }

        this.logger.info(`[NginxLogService] Monitoraggio HTTPS attivo con ${patterns.length} pattern sospetti`);
        return patterns;
    }

    /**
     * Verifica se un URI è sospetto.
     */
    private isSuspicious(url: string): boolean {
        return this.suspiciousPatterns.some(pattern => pattern.test(url));
    }

    public getStatus(): ServiceStatus {
        return this.status;
    }

    /**
     * Avvia il monitoraggio in tempo reale dei log Nginx tramite journalctl.
     */
    async start() {
        this.status = ServiceStatus.STARTING;
        if (this.journalProcess) {
            this.logger.warn('[NginxLogService] Monitoraggio già attivo.');
            this.status = ServiceStatus.RUNNING;
            return;
        }

        await this.backfillLogs('3 hour ago');

        this.logger.info('[NginxLogService] Avvio monitoraggio log Nginx (filtro URI sospetti attivo)...');

        this.journalProcess = spawn('journalctl', ['_SYSTEMD_UNIT=nginx.service', '-f', '-o', 'json', '-n', '0']);

        this.journalProcess.stdout.on('data', (data: Buffer) => {
            const dataStr = data.toString();
            const lines = dataStr.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const entry = JSON.parse(line);
                    this.processEntry(entry);
                } catch { /* riga non JSON, ignorata */ }
            }
        });

        this.journalProcess.stderr.on('data', (data: Buffer) => {
            this.logger.error(`[NginxLogService] journalctl stderr: ${data.toString()}`);
        });

        this.journalProcess.on('close', (code: number) => {
            this.logger.warn(`[NginxLogService] Processo terminato (code ${code}). Riavvio in 10s...`);
            this.journalProcess = null;
            setTimeout(() => this.start(), 10000);
        });

        this.status = ServiceStatus.RUNNING;
    }

    /**
     * Ferma il monitoraggio.
     */
    stop() {
        if (this.journalProcess) {
            this.journalProcess.kill();
            this.journalProcess = null;
            this.logger.info('[NginxLogService] Monitoraggio Nginx fermato.');
        }
        this.status = ServiceStatus.IDLE;
    }

    /**
     * Recupera i log pregressi da journalctl.
     */
    async backfillLogs(since: string = '1 day ago') {
        this.logger.info(`[NginxLogService] Recupero log pregressi (--since "${since}")...`);
        return new Promise<void>((resolve) => {
            const proc = spawn('journalctl', ['_SYSTEMD_UNIT=nginx.service', '--since', since, '-o', 'json', '--no-pager']);
            let buffer = '';

            proc.stdout.on('data', (data) => {
                buffer += data.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const entry = JSON.parse(line);
                        this.processEntry(entry);
                    } catch { /* ignorata */ }
                }
            });

            proc.on('close', () => {
                this.logger.info('[NginxLogService] Backfill completato.');
                resolve();
            });
        });
    }

    private async processEntry(entry: any) {
        const message = entry.MESSAGE;
        if (!message || !message.includes('nginx_threat:')) return;

        try {
            const jsonStartIndex = message.indexOf('{');
            if (jsonStartIndex === -1) return;

            const nginxData = JSON.parse(message.substring(jsonStartIndex));

            // *** FILTRO: processa solo URI sospetti ***
            if (!this.isSuspicious(nginxData.url)) return;

            await this.saveAsThreatLog(nginxData, entry.__CURSOR);
        } catch {
            // riga non valida, ignorata
        }
    }

    private async saveAsThreatLog(data: any, cursor?: string) {
        const { ip, method, url, user_agent, referer, timestamp } = data;

        const analysis = this.patternAnalysisService.analyze(
            url, user_agent, '{}', referer, method, '',
            { headers: { 'user-agent': user_agent, 'referer': referer } }
        );

        const geo = this.patternAnalysisService.getGeoLocation(ip);

        const requestId = cursor
            ? crypto.createHash('md5').update(cursor).digest('hex')
            : crypto.randomBytes(16).toString('hex');

        const logEntry: any = {
            id: requestId,
            timestamp: new Date(timestamp),
            protocol: 'https',
            request: {
                ip,
                method,
                url,
                userAgent: user_agent,
                headers: {
                    'referer': referer,
                    'x-source': 'nginx-proxy'
                }
            },
            geo,
            fingerprint: {
                hash: crypto.createHash('md5').update(`https-${ip}-${url}-${user_agent}`).digest('hex'),
                suspicious: analysis.suspicious,
                score: analysis.score ? analysis.score : 999,
                indicators: analysis.indicators
            },
            metadata: {
                isBot: analysis.isBot,
                isCrawler: false
            }
        };

        try {
            await this.threatLogService.saveLog(logEntry);
            this.logger.info(`[NginxLogService] 🛡️ HTTPS sospetto: ${method} ${url} da ${ip} (Score: ${logEntry.fingerprint.score})`);
        } catch (err) {
            this.logger.error('[NginxLogService] Errore salvataggio ThreatLog', err);
        }
    }
}
