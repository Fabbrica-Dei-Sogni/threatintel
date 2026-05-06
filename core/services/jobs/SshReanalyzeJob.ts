import { inject, singleton } from 'tsyringe';
import * as Tokens from '../../di/tokens';
import { Logger } from 'winston';
import { IBackgroundJob } from '../../types/jobs';
import { SshLogService } from '../SshLogService';
import { ThreatLogService } from '../ThreatLogService';
import AnalysisJob, { JobStatus } from '../../models/AnalysisJobSchema';
import { ProtocolType, ThreatIndicator, LogHeaderKey } from '../../types/CoreConstants';

@singleton()
export class SshReanalyzeJob implements IBackgroundJob {
    public readonly type = 'ssh_reanalyze';
    private isStopped = false;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.SSH_LOG_SERVICE_TOKEN) private readonly sshLogService: SshLogService,
        @inject(Tokens.THREAT_LOG_SERVICE_TOKEN) private readonly threatLogService: ThreatLogService
    ) {}

    async execute(jobId: string, params: any): Promise<void> {
        this.isStopped = false;
        const batchSize = params.batchSize || 100;

        this.logger.info(`[SshReanalyzeJob] Avvio job ${jobId}...`);

        try {
            await this.sshLogService.loadConfig();
            
            const total = await this.threatLogService.countLogs({ protocol: ProtocolType.SSH });
            await AnalysisJob.findByIdAndUpdate(jobId, { 'metadata.total': total });

            let processed = 0;
            let updated = 0;
            let page = 1;

            while (processed < total && !this.isStopped) {
                const logs = await this.threatLogService.getLogs({
                    page,
                    pageSize: batchSize,
                    filters: { protocol: ProtocolType.SSH }
                });

                if (logs.length === 0) break;

                for (const log of logs) {
                    if (this.isStopped) break;

                    const sshEvent = log.request?.headers?.[LogHeaderKey.SSH_EVENT];
                    let newScore = 0;
                    let newIndicators: string[] = [];
                    let shouldUpdate = false;

                    // Recupera configurazioni attuali da SshLogService (che sono caricate in loadConfig)
                    // NOTA: Dovrei rendere pubbliche queste proprietà o fornire getter
                    // Per ora usiamo valori di default se non accessibili o simuliamo la logica
                    // In realtà SshLogService le ha private. Meglio rifattorizzare leggermente SshLogService.
                    
                    // Simuliamo l'accesso o usiamo una versione di SshLogService modificata
                    // In questo caso, accedo alle config tramite configProvider o espongo i valori in SshLogService.
                    
                    const failedScore = this.sshLogService.failedPasswordScore;
                    const invalidScore = this.sshLogService.invalidUserScore;

                    if (sshEvent === 'Failed') {
                        newScore = failedScore;
                        newIndicators = [ThreatIndicator.SSH_FAILED_PASSWORD];
                        shouldUpdate = true;
                    } else if (sshEvent === 'Invalid') {
                        newScore = invalidScore;
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
                const progress = Math.round((processed / total) * 100);

                await AnalysisJob.findByIdAndUpdate(jobId, { 
                    progress,
                    'metadata.processed': processed,
                    'metadata.updated': updated
                });

                page++;
            }

            if (this.isStopped) {
                this.logger.info(`[SshReanalyzeJob] Job ${jobId} fermato.`);
            } else {
                this.logger.info(`[SshReanalyzeJob] Job ${jobId} completato.`);
            }

        } catch (err: any) {
            this.logger.error(`[SshReanalyzeJob] Errore nel job ${jobId}:`, err);
            throw err;
        }
    }

    async stop(): Promise<void> {
        this.isStopped = true;
    }
}
