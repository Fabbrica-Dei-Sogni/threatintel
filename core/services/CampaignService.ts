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
        const { 
            minIps = 2, 
            minScore = 0, 
            minLogsPerIp = 1,
            protocol = 'http', 
            page = 1, 
            pageSize = 10, 
            timeConfig = {} 
        } = params;

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

        // Global time bounds for the current baseFilters (protocol)
        const [oldestLog] = await ThreatLog.find(baseFilters).sort({ timestamp: 1 }).limit(1).select('timestamp').lean();
        const [newestLog] = await ThreatLog.find(baseFilters).sort({ timestamp: -1 }).limit(1).select('timestamp').lean();
        const globalMinDate = oldestLog?.timestamp || null;
        const globalMaxDate = newestLog?.timestamp || null;
 
        // 2. Generazione stage temporale
        const timeParams = { ...timeConfig };
        if (timeConfig.timeMode === 'ago' && timeConfig.agoUnit && timeConfig.agoValue) {
            timeParams[timeConfig.agoUnit] = timeConfig.agoValue;
        }
        const timeStage = new TimeFilterStage(timeParams).generate();
 
        // 3. Pipeline Principale con Discovery Granulare e Metadati "Context-Aware"
        const pipeline = [
            ...timeStage,
            { $match: baseFilters },
            // Step 1: Raggruppamento per Hash + IP per contare i log del singolo attaccante
            {
                $group: {
                    _id: { hash: '$fingerprint.hash', ip: '$request.ip' },
                    logsPerIp: { $sum: 1 },
                    sumScorePerIp: { $sum: '$fingerprint.score' },
                    indicatorsPerIp: { $push: '$fingerprint.indicators' },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' },
                    sampleUrl: { $first: '$request.url' }
                }
            },
            // Step 2: Filtro di Qualità (minLogsPerIp) - Questo seleziona GLI IP significativi
            { $match: { '_id.hash': { $ne: null }, logsPerIp: { $gte: Number(minLogsPerIp) } } },
            // Step 3: Raggruppamento finale per Campagna (solo IP qualificati)
            {
                $group: {
                    _id: '$_id.hash',
                    ipCount: { $sum: 1 },
                    totaleLogs: { $sum: '$logsPerIp' },
                    sumScore: { $sum: '$sumScorePerIp' },
                    maxLogsInThisCampaign: { $max: '$logsPerIp' }, // <-- Portiamo avanti il record di incisività
                    firstSeen: { $min: '$firstSeen' },
                    lastSeen: { $max: '$lastSeen' },
                    sampleUrl: { $first: '$sampleUrl' },
                    allIndicators: { $push: '$indicatorsPerIp' }
                }
            },
            {
                $project: {
                    hash: '$_id',
                    ipCount: 1,
                    totaleLogs: 1,
                    maxLogsInThisCampaign: 1,
                    firstSeen: 1,
                    lastSeen: 1,
                    sampleUrl: 1,
                    averageScore: { $divide: ['$sumScore', '$totaleLogs'] },
                    attackPatterns: {
                        $reduce: {
                            input: '$allIndicators',
                            initialValue: [],
                            in: { $setUnion: ['$$value', { $reduce: { input: '$$this', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } }] }
                        }
                    }
                }
            },
            // Step 4: Facet finale per Paginazione e Metadati dinamici ADATTIVI
            {
                $facet: {
                    // Risultati finali filtrati per IP Count e Score
                    pagedData: [
                        { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                        { $sort: { ipCount: -1 as const, totaleLogs: -1 as const } },
                        { $skip: (page - 1) * pageSize },
                        { $limit: pageSize }
                    ],
                    // Conteggio totale per i filtri attuali
                    totalFiltered: [
                        { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                        { $count: "total" }
                    ],
                    // Metadati per lo slider IP Count (filtrati dallo score e dalla qualità LOGS/IP corrente)
                    boundsIps: [
                        { $match: { averageScore: { $gte: Number(minScore) } } },
                        { $group: { _id: null, min: { $min: "$ipCount" }, max: { $max: "$ipCount" } } }
                    ],
                    // Metadati per lo slider Score (filtrati da IP Count e dalla qualità LOGS/IP corrente)
                    boundsScore: [
                        { $match: { ipCount: { $gte: Number(minIps) } } },
                        { $group: { _id: null, min: { $min: "$averageScore" }, max: { $max: "$averageScore" } } }
                    ],
                    // NOVITÀ: Metadati per lo slider LOGS/IP (filtrati da IP Count e Score correnti)
                    boundsLogsPerIp: [
                        { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                        { $group: { _id: null, min: { $min: "$maxLogsInThisCampaign" }, max: { $max: "$maxLogsInThisCampaign" } } }
                    ]
                }
            }
        ];
 
        try {
            const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
            
            const bIps = result?.boundsIps[0] || { min: 0, max: 0 };
            const bScore = result?.boundsScore[0] || { min: 0, max: 0 };
            const bLogs = result?.boundsLogsPerIp[0] || { min: 0, max: 0 };
            const totalCount = result?.totalFiltered[0]?.total || 0;
            const data = result?.pagedData || [];
            
            return { 
                campaigns: data, 
                count: totalCount,
                metadata: {
                    minIpCount: bIps.min || 0,
                    maxIpCount: bIps.max || 0,
                    minScore: bScore.min || 0,
                    maxScore: bScore.max || 0,
                    // Ora questi sono context-aware! Se cambi IP Count o Score, questi limiti cambiano.
                    minLogsPerIp: bLogs.min || 0,
                    maxLogsPerIp: bLogs.max || 0,
                    minDate: globalMinDate,
                    maxDate: globalMaxDate
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
