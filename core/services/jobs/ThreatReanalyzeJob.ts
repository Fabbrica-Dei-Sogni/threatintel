import { inject, injectable } from 'tsyringe';
import * as Tokens from '../../di/tokens';
import { Logger } from 'winston';
import { IBackgroundJob } from '../../types/jobs';
import { ThreatLogService } from '../ThreatLogService';
import { PatternAnalysisService } from '../PatternAnalysisService';
import AnalysisJob from '../../models/AnalysisJobSchema';
import ThreatLog from '../../models/ThreatLogSchema';

@injectable()
export class ThreatReanalyzeJob implements IBackgroundJob {
    public readonly type = 'threat_reanalyze';
    private isStopped = false;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.THREAT_LOG_SERVICE_TOKEN) private readonly threatLogService: ThreatLogService,
        @inject(Tokens.PATTERN_ANALYSIS_SERVICE_TOKEN) private readonly patternAnalysisService: PatternAnalysisService
    ) {}

    async execute(jobId: string, params: any): Promise<void> {
        this.isStopped = false;
        const batchSize = params.batchSize || 100;
        const updateDatabase = params.updateDatabase !== false;

        this.logger.info(`[ThreatReanalyzeJob] Avvio job ${jobId}...`);

        try {
            await this.patternAnalysisService.loadConfigFromDB();

            const httpFilter = {
                protocol: { $in: ['http', 'https', null] }
            };

            const total = await this.threatLogService.countLogs(httpFilter);
            await AnalysisJob.findByIdAndUpdate(jobId, { 'metadata.total': total });

            let processed = 0;
            let updated = 0;

            for (let skip = 0; skip < total && !this.isStopped; skip += batchSize) {
                const logs = await ThreatLog.find(httpFilter)
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(batchSize)
                    .lean();

                if (logs.length === 0) break;

                const batchPromises = logs.map(async (logEntry: any) => {
                    if (this.isStopped) return;

                    const fullUrl = logEntry.request.url || '';
                    const userAgent = logEntry.request.userAgent || '';
                    const bodyStr = JSON.stringify(logEntry.request.body || {});
                    const referer = logEntry.request.referer || '';
                    const method = logEntry.request.method || '';
                    const queryStr = JSON.stringify(logEntry.request.query || {});

                    const otherToAnalyze = {
                        headers: logEntry.request.headers
                    };

                    const newAnalysis = this.patternAnalysisService.analyze(
                        fullUrl, userAgent, bodyStr, referer, method, queryStr, otherToAnalyze
                    );

                    const oldAnalysis = logEntry.fingerprint;
                    const newHash = this.patternAnalysisService.generateFingerprint(logEntry.request);

                    const hasChanges =
                        oldAnalysis.hash !== newHash ||
                        oldAnalysis.suspicious !== newAnalysis.suspicious ||
                        oldAnalysis.score !== newAnalysis.score ||
                        JSON.stringify(oldAnalysis.indicators) !== JSON.stringify(newAnalysis.indicators);

                    if (hasChanges && updateDatabase) {
                        await ThreatLog.findByIdAndUpdate(logEntry._id, {
                            'fingerprint.hash': newHash,
                            'fingerprint.suspicious': newAnalysis.suspicious,
                            'fingerprint.score': newAnalysis.score,
                            'fingerprint.indicators': newAnalysis.indicators,
                            'metadata.reanalyzedAt': new Date(),
                            'metadata.isBot': newAnalysis.isBot
                        });
                        return true;
                    }
                    return false;
                });

                const batchResults = await Promise.all(batchPromises);
                updated += batchResults.filter(r => r === true).length;
                processed += logs.length;

                const progress = Math.round((processed / total) * 100);
                await AnalysisJob.findByIdAndUpdate(jobId, {
                    $set: {
                        progress,
                        'metadata.processed': processed,
                        'metadata.updated': updated,
                        'metadata.total': total
                    }
                });
            }

            if (this.isStopped) {
                this.logger.info(`[ThreatReanalyzeJob] Job ${jobId} fermato.`);
            } else {
                this.logger.info(`[ThreatReanalyzeJob] Job ${jobId} completato.`);
            }

        } catch (err: any) {
            this.logger.error(`[ThreatReanalyzeJob] Errore nel job ${jobId}:`, err);
            throw err;
        }
    }

    async stop(): Promise<void> {
        this.isStopped = true;
    }
}
