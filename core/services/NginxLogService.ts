import { inject, singleton } from 'tsyringe';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { ThreatLogService } from './ThreatLogService';
import PatternAnalysisService from './PatternAnalysisService';
import { AppConfigProvider } from './AppConfigProvider';
import { BaseJournalWatcher } from './BaseJournalWatcher';
import { ProtocolType, LogHeaderKey } from '../types/CoreConstants';
import { ThreatLogFactory } from '../utils/ThreatLogFactory';

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

@singleton()
export class NginxLogService extends BaseJournalWatcher {
    public readonly serviceName = 'NginxLogService';
    private suspiciousPatterns: RegExp[] = [];
    private readonly logPrefix: string;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) logger: Logger,
        @inject(Tokens.THREAT_LOG_SERVICE_TOKEN) private readonly threatLogService: ThreatLogService,
        @inject(Tokens.PATTERN_ANALYSIS_SERVICE_TOKEN) private readonly patternAnalysisService: PatternAnalysisService,
        @inject(Tokens.CONFIG_PROVIDER_TOKEN) private readonly configProvider: AppConfigProvider,
        @inject(Tokens.THREAT_LOG_FACTORY_TOKEN) private readonly threatLogFactory: ThreatLogFactory
    ) {
        super(logger);
        this.suspiciousPatterns = [...DEFAULT_SUSPICIOUS_PATTERNS];
        // Default to 'nginx_threat:' for backward compatibility
        this.logPrefix = process.env.NGINX_LOG_PREFIX || 'nginx_threat:';
    }

    protected getJournalIdentifier(): string[] {
        return ['_SYSTEMD_UNIT=nginx.service'];
    }

    async start() {
        this.suspiciousPatterns = await this.buildSuspiciousPatterns();
        this.logger.info(`[NginxLogService] Avvio monitoraggio con prefisso: "${this.logPrefix}"`);
        await this.backfillLogs('3 hour ago');
        await super.start();
    }

    private async buildSuspiciousPatterns(): Promise<RegExp[]> {
        const patterns = [...DEFAULT_SUSPICIOUS_PATTERNS];
        const sharedPatterns = await this.configProvider.getNginxSuspiciousPatterns();
        
        for (const endpoint of sharedPatterns) {
            const escaped = endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            patterns.push(new RegExp(`^${escaped}`, 'i'));
        }

        this.logger.info(`[NginxLogService] Monitoraggio HTTPS attivo con ${patterns.length} pattern sospetti`);
        return patterns;
    }

    private isSuspicious(url: string): boolean {
        return this.suspiciousPatterns.some(pattern => pattern.test(url));
    }

    protected async processEntry(entry: any) {
        const message = entry.MESSAGE;
        if (!message || !message.includes(this.logPrefix)) return;

        try {
            const jsonStartIndex = message.indexOf('{');
            if (jsonStartIndex === -1) return;

            const nginxData = JSON.parse(message.substring(jsonStartIndex));

            if (!this.isSuspicious(nginxData.url)) return;

            await this.saveAsThreatLog(nginxData, entry.__CURSOR);
        } catch {
            // ignore malformed entry
        }
    }

    private async saveAsThreatLog(data: any, cursor?: string) {
        const { ip, method, url, user_agent, referer, timestamp } = data;

        const analysis = this.patternAnalysisService.analyze(
            url, user_agent, '{}', referer, method, '',
            { headers: { 'user-agent': user_agent, 'referer': referer } }
        );

        const logEntry = this.threatLogFactory.createLog({
            ip,
            protocol: ProtocolType.HTTPS,
            method,
            url,
            userAgent: user_agent,
            referer,
            headers: {
                [LogHeaderKey.X_SOURCE]: 'nginx-proxy'
            },
            score: analysis.score || 0,
            indicators: analysis.indicators,
            suspicious: analysis.suspicious,
            isBot: analysis.isBot,
            timestamp: new Date(timestamp),
            id: cursor
        });

        try {
            await this.threatLogService.saveLog(logEntry);
            this.logger.info(`[NginxLogService] 🛡️ HTTPS sospetto: ${method} ${url} da ${ip} (Score: ${logEntry.fingerprint?.score})`);
        } catch (err) {
            this.logger.error('[NginxLogService] Errore salvataggio ThreatLog', err);
        }
    }
}
