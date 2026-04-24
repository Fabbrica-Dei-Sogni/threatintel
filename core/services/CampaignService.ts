import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../di/tokens';
import ThreatLog from '../models/ThreatLogSchema';
import { ForensicPipelineService } from './forense/ForensicPipelineService';
import { TimeFilterStage } from './forense/pipeline/stages/TimeFilterStage';

@injectable()
export class CampaignService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly forensicPipelineService: ForensicPipelineService
    ) {}

    /**
     * Discovery (Lista): Ricerca dei cluster.
     * Centralizza la logica del tempo usando il TimeFilterStage per coerenza globale.
     */
    async getCampaigns(params: any) {
        const { minIps = 2, minScore = 0, page = 1, pageSize = 10, timeConfig = {} } = params;

        // 1. Filtro Score (applicato subito alla base log)
        const baseFilters: any = {};
        const score = Number(minScore || 0);
        if (score > 0) baseFilters['fingerprint.score'] = { $gt: score };

        // 2. Generazione automatica dello stage temporale (gestisce ago e range in modo solido)
        // Mappiamo agoValue/agoUnit sui nomi attesi dal TimeFilterStage (minutes, hours, days, etc.)
        const timeParams = { ...timeConfig };
        if (timeConfig.timeMode === 'ago' && timeConfig.agoUnit && timeConfig.agoValue) {
            timeParams[timeConfig.agoUnit] = timeConfig.agoValue;
        }
        const timeStage = new TimeFilterStage(timeParams).generate();

        const pipeline = [
            ...timeStage, // Lo stage temporale è il primo per performance
            { $match: baseFilters },
            {
                $group: {
                    _id: '$fingerprint.hash',
                    ips: { $addToSet: '$request.ip' },
                    totaleLogs: { $sum: 1 },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' },
                    sampleUrl: { $first: '$request.url' },
                    sumScore: { $sum: '$fingerprint.score' },
                    // Raccogliamo tutti gli indicatori unici di minaccia rilevati in tutto il cluster
                    allIndicators: { $push: '$fingerprint.indicators' }
                }
            },
            {
                $project: {
                    hash: '$_id',
                    ips: 1,
                    ipCount: { $size: '$ips' },
                    totaleLogs: 1,
                    firstSeen: 1,
                    lastSeen: 1,
                    sampleUrl: 1,
                    // Appiattiamo l'array di array e teniamo solo i valori unici
                    attackPatterns: {
                        $reduce: {
                            input: '$allIndicators',
                            initialValue: [],
                            in: { $setUnion: ['$$value', '$$this'] }
                        }
                    },
                    averageScore: { $divide: ['$sumScore', '$totaleLogs'] }
                }
            },
            { $match: { ipCount: { $gte: Number(minIps) }, hash: { $ne: null } } },
            { $sort: { ipCount: -1 as const, totaleLogs: -1 as const } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }]
                }
            }
        ];

        try {
            const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
            return { 
                campaigns: result?.data || [], 
                count: result?.metadata[0]?.total || 0 
            };
        } catch (err: any) {
            this.logger.error(`[CampaignService] Discovery Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Dettaglio (Forensics): Analisi profonda dello stesso cluster.
     */
    async getCampaignDetail(params: any) {
        const { hash, minScore = 0, timeConfig = {}, minLogsForAttack = 1 } = params;

        const baseFilters: any = { 'fingerprint.hash': hash };
        const score = Number(minScore || 0);
        if (score > 0) baseFilters['fingerprint.score'] = { $gt: score };

        // Normalizzazione parametri tempo per la pipeline forense
        const timeParams = { ...timeConfig };
        if (timeConfig.timeMode === 'ago' && timeConfig.agoUnit && timeConfig.agoValue) {
            timeParams[timeConfig.agoUnit] = timeConfig.agoValue;
        }

        const pipeline = await this.forensicPipelineService.buildCampaignPipeline(
            baseFilters, 
            minLogsForAttack, 
            timeParams
        );

        try {
            const [campaign] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
            return campaign || null;
        } catch (err: any) {
            this.logger.error(`[CampaignService] Detail Error: ${err.message}`);
            throw err;
        }
    }
}
