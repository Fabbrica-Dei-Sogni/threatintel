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
        const { minIps = 2, minScore = 0, protocol = 'http', page = 1, pageSize = 10, timeConfig = {} } = params;

        // 1. Filtro Protocollo (applicato subito alla base log)
        const baseFilters: any = {};
        if (protocol) {
            if (protocol === 'http') {
                baseFilters.$or = [
                    { protocol: 'http' },
                    { protocol: { $exists: false } },
                    { protocol: null }
                ];
            } else {
                baseFilters.protocol = protocol;
            }
        }
 
        // 2. Generazione stage temporale
        const timeParams = { ...timeConfig };
        if (timeConfig.timeMode === 'ago' && timeConfig.agoUnit && timeConfig.agoValue) {
            timeParams[timeConfig.agoUnit] = timeConfig.agoValue;
        }
        const timeStage = new TimeFilterStage(timeParams).generate();
 
        const pipeline = [
            ...timeStage,
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
            { $match: { hash: { $ne: null } } }, // Filtro base per avere solo cluster validi
            {
                $facet: {
                    // 1. Limiti IP filtrati dalla soglia di rischio corrente
                    boundsIps: [
                        { $match: { averageScore: { $gte: Number(minScore) } } },
                        {
                            $group: {
                                _id: null,
                                minIpCount: { $min: "$ipCount" },
                                maxIpCount: { $max: "$ipCount" }
                            }
                        }
                    ],
                    // 2. Limiti SCORE filtrati dal numero minimo di IP corrente
                    boundsScore: [
                        { $match: { ipCount: { $gte: Number(minIps) } } },
                        {
                            $group: {
                                _id: null,
                                minScore: { $min: "$averageScore" },
                                maxScore: { $max: "$averageScore" }
                            }
                        }
                    ],
                    // 3. Conteggio totale (filtrato da entrambi)
                    totalFiltered: [
                        { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                        { $count: "total" }
                    ],
                    // 4. Dati paginati
                    pagedData: [
                        { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                        { $sort: { ipCount: -1 as const, totaleLogs: -1 as const } },
                        { $skip: (page - 1) * pageSize },
                        { $limit: pageSize }
                    ]
                }
            }
        ];
 
        try {
            const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
            const bIps = result?.boundsIps[0] || { minIpCount: 0, maxIpCount: 0 };
            const bScore = result?.boundsScore[0] || { minScore: 0, maxScore: 0 };
            
            const totalCount = result?.totalFiltered[0]?.total || 0;
            const data = result?.pagedData || [];
            
            return { 
                campaigns: data, 
                count: totalCount,
                metadata: {
                    minIpCount: bIps.minIpCount || 0,
                    maxIpCount: bIps.maxIpCount || 0,
                    minScore: bScore.minScore || 0,
                    maxScore: bScore.maxScore || 0
                }
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
        const { hash, minScore = 0, protocol = null, timeConfig = {}, minLogsForAttack = 1 } = params;

        const baseFilters: any = { 'fingerprint.hash': hash };
        const score = Number(minScore || 0);
        if (score > 0) baseFilters['fingerprint.score'] = { $gte: score };

        if (protocol) {
            if (protocol === 'http') {
                baseFilters.$or = [
                    { protocol: 'http' },
                    { protocol: { $exists: false } },
                    { protocol: null }
                ];
            } else {
                baseFilters.protocol = protocol;
            }
        }

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
