import { inject, singleton } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { ThreatLogService } from './ThreatLogService';
import { AppConfigProvider } from './AppConfigProvider';
import { BaseJournalWatcher } from './BaseJournalWatcher';
import { ProtocolType, ThreatIndicator, LogHeaderKey, ConfigKey } from '../types/CoreConstants';
import { ThreatLogFactory } from '../utils/ThreatLogFactory';

@singleton()
export class SshLogService extends BaseJournalWatcher {
    public readonly serviceName = 'SshLogService';
    
    private failedPasswordScore: number = 15;
    private invalidUserScore: number = 25;
    private initialized: Promise<void>;

    // Buffer for batching SSH logs
    private sshBatchBuffer: Map<string, any> = new Map();
    private bufferFlushInterval: NodeJS.Timeout | null = null;
    private readonly FLUSH_INTERVAL_MS = 60000;

    constructor(
        @inject(LOGGER_TOKEN) logger: Logger,
        private readonly threatLogService: ThreatLogService,
        private readonly configProvider: AppConfigProvider,
        private readonly threatLogFactory: ThreatLogFactory
    ) {
        super(logger);
        this.initialized = this.loadConfig();
    }

    protected getJournalIdentifier(): string[] {
        return ['SYSLOG_IDENTIFIER=sshd'];
    }

    async loadConfig() {
        try {
            const scoreFailedPwd = await this.configProvider.getDynamicConfig(ConfigKey.SSH_FAILED_PASSWORD);
            const scoreInvalidUser = await this.configProvider.getDynamicConfig(ConfigKey.SSH_INVALID_USER);

            if (scoreFailedPwd) this.failedPasswordScore = parseInt(scoreFailedPwd, 10);
            if (scoreInvalidUser) this.invalidUserScore = parseInt(scoreInvalidUser, 10);

            this.logger.info(`[SshLogService] Configurazione caricata: ${ConfigKey.SSH_FAILED_PASSWORD}=${this.failedPasswordScore}, ${ConfigKey.SSH_INVALID_USER}=${this.invalidUserScore}`);
        } catch (err: any) {
            this.logger.error(`[SshLogService] Errore caricamento configurazioni: ${err.message}`);
        }
    }

    async start() {
        await this.initialized;
        await this.backfillLogs('3 hour ago');
        await super.start();

        if (!this.bufferFlushInterval) {
            this.bufferFlushInterval = setInterval(() => this.flushBuffer(), this.FLUSH_INTERVAL_MS);
        }
    }

    async stop() {
        super.stop();
        if (this.bufferFlushInterval) {
            clearInterval(this.bufferFlushInterval);
            this.bufferFlushInterval = null;
            await this.flushBuffer();
        }
    }

    protected async processEntry(entry: any) {
        const message = entry.MESSAGE;
        if (!message) return;

        if (!message.includes('Failed') && !message.includes('Accepted') && !message.includes('Invalid')) {
            return;
        }

        const failedMatch = message.match(/Failed password for (?:invalid user )?(\S+) from ([\d.]+) port/i);
        const invalidMatch = message.match(/Invalid user (\S+) from ([\d.]+) port/i);

        let ip = null;
        let user = null;
        let type = null;
        let score = 0;
        let indicators: string[] = [];

        if (failedMatch) {
            user = failedMatch[1];
            ip = failedMatch[2];
            type = 'Failed';
            score = this.failedPasswordScore;
            indicators = [ThreatIndicator.SSH_FAILED_PASSWORD];
        } else if (invalidMatch) {
            user = invalidMatch[1];
            ip = invalidMatch[2];
            type = 'Invalid';
            score = this.invalidUserScore;
            indicators = [ThreatIndicator.SSH_INVALID_USER];
        }

        if (ip) {
            let logDate = new Date();
            if (entry.__REALTIME_TIMESTAMP) {
                logDate = new Date(parseInt(entry.__REALTIME_TIMESTAMP, 10) / 1000);
            }

            const batchKey = `${ip}_${user}_${type}`;
            if (this.sshBatchBuffer.has(batchKey)) {
                const existing = this.sshBatchBuffer.get(batchKey)!;
                existing.count++;
                existing.logDate = logDate;
                if (entry.__CURSOR) existing.cursor = entry.__CURSOR;
                if (existing.rawMessages.length < 5) existing.rawMessages.push(message);
            } else {
                this.sshBatchBuffer.set(batchKey, {
                    ip, user, type, score, indicators, cursor: entry.__CURSOR, logDate, count: 1, rawMessages: [message]
                });
            }
        }
    }

    private async flushBuffer() {
        if (this.sshBatchBuffer.size === 0) return;

        const entriesToFlush = Array.from(this.sshBatchBuffer.values());
        this.sshBatchBuffer.clear();

        const promises = entriesToFlush.map(async (entry) => {
            const sampleRawLog = entry.count > 1
                ? `[Aggregated ${entry.count} events]\nLast message: ${entry.rawMessages[entry.rawMessages.length - 1]}`
                : entry.rawMessages[0];

            await this.saveAsThreatLog(entry, sampleRawLog);
        });

        await Promise.allSettled(promises);
    }

    private async saveAsThreatLog(entry: any, rawMessage: string) {
        const logEntry = this.threatLogFactory.createLog({
            ip: entry.ip,
            protocol: ProtocolType.SSH,
            method: entry.type,
            url: `ssh://${entry.user}`,
            userAgent: 'sshd',
            headers: {
                [LogHeaderKey.RAW_LOG]: rawMessage,
                [LogHeaderKey.SSH_EVENT]: entry.type,
                [LogHeaderKey.SSH_USER]: entry.user
            },
            score: entry.score,
            indicators: entry.indicators,
            timestamp: entry.logDate,
            id: entry.cursor, // Use cursor as seed for ID
            metadata: {
                eventCount: entry.count,
                sshInfo: { user: entry.user, type: entry.type }
            }
        });

        try {
            await this.threatLogService.saveLog(logEntry);
            this.logger.info(`[SshLogService] Rilevato evento SSH ${entry.type} da ${entry.ip} (utente: ${entry.user})`);
        } catch (err) {
            this.logger.error('[SshLogService] Errore salvataggio log SSH', err);
        }
    }

    async analyzeSshLogs(batchSize: number = 100) {
        await this.loadConfig();
        this.logger.info('[SshLogService] Avvio ricalcolo score SSH...');

        let page = 1;
        let processed = 0;
        let updated = 0;
        let total = 0;

        try {
            total = await this.threatLogService.countLogs({ protocol: ProtocolType.SSH });
            this.logger.info(`[SshLogService] Trovati ${total} log SSH da analizzare.`);

            while (processed < total) {
                const logs = await this.threatLogService.getLogs({
                    page,
                    pageSize: batchSize,
                    filters: { protocol: ProtocolType.SSH }
                });

                if (logs.length === 0) break;

                for (const log of logs) {
                    const sshEvent = log.request?.headers?.[LogHeaderKey.SSH_EVENT];
                    let newScore = 0;
                    let newIndicators: string[] = [];
                    let shouldUpdate = false;

                    if (sshEvent === 'Failed') {
                        newScore = this.failedPasswordScore;
                        newIndicators = [ThreatIndicator.SSH_FAILED_PASSWORD];
                        shouldUpdate = true;
                    } else if (sshEvent === 'Invalid') {
                        newScore = this.invalidUserScore;
                        newIndicators = [ThreatIndicator.SSH_INVALID_USER];
                        shouldUpdate = true;
                    }

                    if (shouldUpdate) {
                        log.fingerprint.score = newScore;
                        log.fingerprint.indicators = newIndicators;
                        log.fingerprint.suspicious = newScore > 0;

                        await this.threatLogService.saveLog(log);
                        updated++;
                    }
                }

                processed += logs.length;
                this.logger.info(`[SshLogService] Processati ${processed}/${total} log...`);
                page++;
            }

            this.logger.info(`[SshLogService] Ricalcolo completato. Aggiornati ${updated} log su ${total}.`);
            return { processed, updated, total };

        } catch (err: any) {
            this.logger.error('[SshLogService] Errore durante il ricalcolo score SSH', err);
            throw err;
        }
    }
}
