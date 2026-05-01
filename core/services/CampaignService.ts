import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../di/tokens';
import ThreatLog from '../models/ThreatLogSchema';
import { ForensicPipelineService } from './forense/ForensicPipelineService';
import { TimeFilterStage } from './forense/pipeline/stages/TimeFilterStage';
import { calculateCorrelationHubs } from '../utils/CampaignAnalytics';
import { ConfigService } from './ConfigService';
import { RagSyncService } from './assistant/RagSyncService';
import { OllamaService } from './assistant/OllamaService';
import { RagTranslationService } from './assistant/RagTranslationService';
import { RAG_SYNC_SERVICE_TOKEN, OLLAMA_SERVICE_TOKEN, RAG_TRANSLATION_TOKEN } from '../di/tokens';

@injectable()
export class CampaignService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly forensicPipelineService: ForensicPipelineService,
        private readonly configService: ConfigService,
        @inject(RAG_SYNC_SERVICE_TOKEN) private readonly ragSync: RagSyncService,
        @inject(OLLAMA_SERVICE_TOKEN) private readonly ollama: OllamaService,
        @inject(RAG_TRANSLATION_TOKEN) private readonly translator: RagTranslationService
    ) {}

    /**
     * Discovery (Lista): Ricerca dei cluster.
     */
    async getCampaigns(params: any) {
        const { 
            minIps = 2, 
            minScore = 0, 
            minLogsPerIp = 1,
            protocol = 'http', 
            page = 1, 
            pageSize = 10, 
            timeConfig = {},
            selectedUris = [],
            search = ''
        } = params;

        const baseFilters: any = {};
        if (protocol) {
            if (protocol === 'http') {
                baseFilters.$or = [{ protocol: 'http' }, { protocol: { $exists: false } }, { protocol: null }];
            } else {
                baseFilters.protocol = protocol;
            }
        }

        if (selectedUris.length > 0) {
            if (selectedUris.length === 1) {
                // Se c'è un solo URI, usiamo regex per massima robustezza contro punti e case-sensitivity
                const escapedUri = selectedUris[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                baseFilters['request.url'] = { $regex: `^${escapedUri}$`, $options: 'i' };
            } else {
                // Se sono più di uno, usiamo $in (match esatto letterale)
                baseFilters['request.url'] = { $in: selectedUris };
            }
        }

        if (search) {
            const cleanSearch = search.trim();
            if (cleanSearch.length > 0) {
                const searchFilter = {
                    $or: [
                        { 'request.ip': cleanSearch },
                        { 'fingerprint.hash': cleanSearch }
                    ]
                };
                if (baseFilters.$or) {
                    baseFilters.$and = [{ $or: baseFilters.$or }, searchFilter];
                    delete baseFilters.$or;
                } else {
                    baseFilters.$or = searchFilter.$or;
                }
            }
        }

        const [oldestLog] = await ThreatLog.find(baseFilters).sort({ timestamp: 1 }).limit(1).select('timestamp').lean();
        const [newestLog] = await ThreatLog.find(baseFilters).sort({ timestamp: -1 }).limit(1).select('timestamp').lean();
        const globalMinDate = oldestLog?.timestamp || null;
        const globalMaxDate = newestLog?.timestamp || null;
 
        const timeParams = { ...timeConfig };
        if (timeConfig.timeMode === 'ago' && timeConfig.agoUnit && timeConfig.agoValue) {
            timeParams[timeConfig.agoUnit] = timeConfig.agoValue;
        }
        const timeStage = new TimeFilterStage(timeParams).generate();

        // Pipeline per metadati adattivi dello slider LOGS/IP
        const logsPerIpMetadataPipeline = [
            ...timeStage,
            { $match: baseFilters },
            { $group: { _id: { hash: '$fingerprint.hash', ip: '$request.ip' }, logs: { $sum: 1 } } },
            { $group: { _id: null, maxLogs: { $max: '$logs' }, minLogs: { $min: '$logs' } } }
        ];
        const [logsMeta] = await ThreatLog.aggregate(logsPerIpMetadataPipeline).allowDiskUse(true);
 
        const pipeline = [
            ...timeStage,
            { $match: baseFilters },
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
            { $match: { '_id.hash': { $ne: null }, logsPerIp: { $gte: Number(minLogsPerIp) } } },
            {
                $group: {
                    _id: '$_id.hash',
                    ipCount: { $sum: 1 },
                    totaleLogs: { $sum: '$logsPerIp' },
                    sumScore: { $sum: '$sumScorePerIp' },
                    maxLogsInThisCampaign: { $max: '$logsPerIp' },
                    firstSeen: { $min: '$firstSeen' },
                    lastSeen: { $max: '$lastSeen' },
                    sampleUrl: { $first: '$sampleUrl' },
                    allIndicators: { $push: '$indicatorsPerIp' },
                    timeInfo: { $push: { ip: '$_id.ip', firstSeen: '$firstSeen', lastSeen: '$lastSeen' } }
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
                    timeInfo: 1,
                    attackPatterns: {
                        $reduce: {
                            input: '$allIndicators',
                            initialValue: [],
                            in: { $setUnion: ['$$value', { $reduce: { input: '$$this', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } }] }
                        }
                    }
                }
            },
            {
                $facet: {
                    discoveryCandidates: [
                        { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                        { $sort: { firstSeen: -1 as const, ipCount: -1 as const } }
                    ],
                    totalFiltered: [
                        { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                        { $count: "total" }
                    ],
                    boundsIps: [
                        { $match: { averageScore: { $gte: Number(minScore) } } },
                        { $group: { _id: null, min: { $min: "$ipCount" }, max: { $max: "$ipCount" } } }
                    ],
                    boundsScore: [
                        { $match: { ipCount: { $gte: Number(minIps) } } },
                        { $group: { _id: null, min: { $min: "$averageScore" }, max: { $max: "$averageScore" } } }
                    ],
                    boundsLogsPerIp: [
                        { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                        { $group: { _id: null, min: { $min: "$maxLogsInThisCampaign" }, max: { $max: "$maxLogsInThisCampaign" } } }
                    ]
                }
            }
        ];

        try {
            const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
            
            // 1. Estraiamo tutti i candidati idonei
            const allCandidates = result?.discoveryCandidates || [];
            
            // 2. Arricchimento e Filtraggio in memoria per correlazioni
            const enrichedAndFiltered = allCandidates
                .map((c: any) => {
                    const hubs = calculateCorrelationHubs(c.timeInfo || []);
                    const { timeInfo, ...rest } = c;
                    return {
                        ...rest,
                        correlationHubsCount: hubs.length
                    };
                })
                .filter((c: any) => c.correlationHubsCount >= Number(params.minCorrelations || 0));

            // 3. Ordinamento e Paginazione Manuale (post-filtro correlazioni)
            const totalCount = enrichedAndFiltered.length;
            const sortedData = enrichedAndFiltered.sort((a, b) => {
                const dateA = new Date(a.firstSeen).getTime();
                const dateB = new Date(b.firstSeen).getTime();
                return dateB - dateA || b.ipCount - a.ipCount;
            });
            
            const pNum = Number(page);
            const psNum = Number(pageSize);
            const pagedData = sortedData.slice((pNum - 1) * psNum, pNum * psNum);

            const bIps = result?.boundsIps[0] || { min: 0, max: 0 };
            const bScore = result?.boundsScore[0] || { min: 0, max: 0 };
            const bLogs = result?.boundsLogsPerIp[0] || { min: 0, max: 0 };

            return { 
                campaigns: pagedData, 
                total: totalCount,
                metadata: {
                    minIpCount: bIps.min || 0,
                    maxIpCount: bIps.max || 0,
                    minScore: bScore.min || 0,
                    maxScore: bScore.max || 0,
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
     * Dettaglio (Forensics): Analisi profonda dello stesso cluster con nodi IP arricchiti.
     */
    async getCampaignDetail(params: any) {
        const { 
            hash, 
            minScore = 0,
            minLogsPerIp = 1,
            protocol = null, 
            timeConfig = {}, 
            page = 1, 
            pageSize = 10 
        } = params;

        const baseFilters: any = { 'fingerprint.hash': hash };
        if (protocol) {
            if (protocol === 'http') {
                baseFilters.$or = [{ protocol: 'http' }, { protocol: { $exists: false } }, { protocol: null }];
            } else {
                baseFilters.protocol = protocol;
            }
        }
        
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
                    _id: '$request.ip',
                    totaleLogs: { $sum: 1 },
                    sumScore: { $sum: '$fingerprint.score' },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' },
                    allIndicators: { $push: '$fingerprint.indicators' },
                    sampleUrl: { $first: '$request.url' }
                }
            },
            // Filtro Fotografia: Solo gli IP che hanno partecipato alla scoperta
            { $match: { totaleLogs: { $gte: Number(minLogsPerIp) } } },
            {
                $project: {
                    ip: '$_id',
                    totaleLogs: 1,
                    firstSeen: 1,
                    lastSeen: 1,
                    sampleUrl: 1,
                    averageScore: { $divide: ['$sumScore', '$totaleLogs'] },
                    attackPatterns: {
                        $reduce: {
                            input: '$allIndicators',
                            initialValue: [],
                            in: { $setUnion: ['$$value', '$$this'] }
                        }
                    }
                }
            },
            // FILTRI DI COERENZA (FOTOGRAFIA): Solo nodi che hanno passato la soglia di scoperta
            { 
                $match: { 
                    totaleLogs: { $gte: Number(minLogsPerIp) },
                    averageScore: { $gte: Number(minScore) }
                } 
            },
            { $lookup: { from: 'ipdetails', localField: 'ip', foreignField: 'ip', as: 'geo' } },
            { $addFields: { geoInfo: { $arrayElemAt: ['$geo', 0] } } },
            {
                $facet: {
                    meta: [
                        {
                            $group: {
                                _id: null,
                                ipCount: { $sum: 1 },
                                clusterLogs: { $sum: '$totaleLogs' },
                                clusterAvgScore: { $avg: '$averageScore' },
                                clusterFirstSeen: { $min: '$firstSeen' },
                                clusterLastSeen: { $max: '$lastSeen' },
                                sampleUrl: { $first: '$sampleUrl' },
                                allIps: { $push: '$ip' },
                                timeInfo: { $push: { ip: '$ip', firstSeen: '$firstSeen', lastSeen: '$lastSeen' } }
                            }
                        }
                    ],
                    nodes: [
                        { $sort: { firstSeen: -1, totaleLogs: -1 } },
                        { $skip: (Number(page) - 1) * Number(pageSize) },
                        { $limit: Number(pageSize) }
                    ]
                }
            }
        ];

        try {
            const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
            const meta = result?.meta[0] || { ipCount: 0, clusterLogs: 0, clusterAvgScore: 0, timeInfo: [] };
            
            // Calcolo correlazioni su tutti i nodi (non solo quelli paginati)
            const correlations = calculateCorrelationHubs(meta.timeInfo || []);

            return {
                hash,
                ipCount: meta.ipCount,
                totaleLogs: meta.clusterLogs,
                averageScore: meta.clusterAvgScore,
                firstSeen: meta.clusterFirstSeen,
                lastSeen: meta.clusterLastSeen,
                sampleUrl: meta.sampleUrl,
                allIps: meta.allIps || [],
                correlations,
                nodes: result?.nodes || [],
                page, pageSize
            };
        } catch (err: any) {
            this.logger.error(`[CampaignService] Detail Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Recupera gli URI unici (Target URLs) associati alle campagne scoperte.
     */
    async getUniqueSampleUrls(params: any) {
        const {
            protocol = 'http',
            timeConfig = {},
            minIps = 2,
            minScore = 0,
            search = '',
            page = 1,
            pageSize = 20,
            sortBy = 'count',
            order = -1
        } = params;

        const baseFilters: any = {};
        if (protocol) {
            if (protocol === 'http') {
                baseFilters.$or = [{ protocol: 'http' }, { protocol: { $exists: false } }, { protocol: null }];
            } else {
                baseFilters.protocol = protocol;
            }
        }

        if (search) {
            const cleanSearch = search.trim();
            if (cleanSearch.length > 0) {
                const searchFilter = {
                    $or: [
                        { 'request.ip': cleanSearch },
                        { 'fingerprint.hash': cleanSearch }
                    ]
                };
                // Se abbiamo già un $or (per il protocollo http), usiamo $and
                if (baseFilters.$or) {
                    baseFilters.$and = [
                        { $or: baseFilters.$or },
                        searchFilter
                    ];
                    delete baseFilters.$or;
                } else {
                    baseFilters.$or = searchFilter.$or;
                }
            }
        }

        const timeParams = { ...timeConfig };
        if (timeConfig.timeMode === 'ago' && timeConfig.agoUnit && timeConfig.agoValue) {
            timeParams[timeConfig.agoUnit] = timeConfig.agoValue;
        }
        const timeStage = new TimeFilterStage(timeParams).generate();

        const pipeline: any[] = [
            ...timeStage,
            { $match: baseFilters },
            // Step 1: Raggruppiamo per Hash + IP per determinare i cluster (come in discovery)
            {
                $group: {
                    _id: { hash: '$fingerprint.hash', ip: '$request.ip' },
                    logsPerIp: { $sum: 1 },
                    sumScorePerIp: { $sum: '$fingerprint.score' },
                    sampleUrl: { $first: '$request.url' },
                    lastSeen: { $max: '$timestamp' }
                }
            },
            { $match: { '_id.hash': { $ne: null } } },
            // Step 2: Raggruppiamo per Hash per avere le metriche della campagna
            {
                $group: {
                    _id: '$_id.hash',
                    ipCount: { $sum: 1 },
                    totaleLogs: { $sum: '$logsPerIp' },
                    sumScore: { $sum: '$sumScorePerIp' },
                    sampleUrl: { $first: '$sampleUrl' },
                    lastSeen: { $max: '$lastSeen' }
                }
            },
            {
                $project: {
                    ipCount: 1,
                    totaleLogs: 1,
                    sampleUrl: 1,
                    lastSeen: 1,
                    averageScore: { $divide: ['$sumScore', '$totaleLogs'] }
                }
            },
            // Step 3: Filtriamo le campagne che non passano i criteri di base
            { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
            // Step 4: Raggruppiamo per URI finale
            {
                $group: {
                    _id: '$sampleUrl',
                    campaignCount: { $sum: 1 },
                    totaleLogs: { $sum: '$totaleLogs' },
                    lastSeen: { $max: '$lastSeen' }
                }
            },
            {
                $project: {
                    uri: { $ifNull: ['$_id', '/'] },
                    campaignCount: 1,
                    totaleLogs: 1,
                    lastSeen: 1
                }
            }
        ];

        // Sorting dinamico
        const sortStage: any = {};
        if (sortBy === 'uri') sortStage.uri = order;
        else if (sortBy === 'logs') sortStage.totaleLogs = order;
        else sortStage.campaignCount = order;

        const facetPipeline = [
            ...pipeline,
            {
                $facet: {
                    data: [
                        { $sort: sortStage },
                        { $skip: (page - 1) * pageSize },
                        { $limit: pageSize }
                    ],
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
            }
        ];

        try {
            const [result] = await ThreatLog.aggregate(facetPipeline).allowDiskUse(true);
            return {
                uris: result?.data || [],
                total: result?.totalCount[0]?.count || 0
            };
        } catch (err: any) {
            this.logger.error(`[CampaignService] Unique URIs Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Materializza i riassunti AI delle campagne nel database vettoriale.
     */
    async materializeCampaignSummaries(options: { forceAi?: boolean } = {}) {
        // Controllo Fallback
        if (!this.ragSync.getStatus().operational) {
            this.logger.debug('[CampaignService] RAG materialization skipped: System is not operational.');
            return;
        }

        // Verifica se la generazione AI è abilitata
        const aiEnabledConfig = await this.configService.getConfigValue('RAG_AI_SUMMARY_ENABLED');
        const isAiEnabled = options.forceAi || aiEnabledConfig === 'true' || process.env.RAG_AI_SUMMARY_ENABLED === 'true';

        this.logger.info('[CampaignService] Starting campaign materialization for RAG...');
        try {
            const result = await this.getCampaigns({ 
                minIps: 2, 
                pageSize: 50, 
                timeConfig: { timeMode: 'ago', agoUnit: 'h', agoValue: 24 } 
            });

            for (const campaign of result.campaigns) {
                try {
                    this.logger.debug(`[CampaignService] Materializing summary for campaign: ${campaign.hash}`);
                    
                    // 1. Narrazione Tecnica (Deterministica)
                    const technicalNarrative = this.translator.translateCampaign(campaign);
                    let finalContent = technicalNarrative;

                    // 2. Generazione AI (Opzionale)
                    if (isAiEnabled) {
                        try {
                            const prompt = this.translator.buildCampaignSummaryPrompt(campaign);
                            const aiSummary = await this.ollama.generate(prompt);
                            finalContent = `REPORT AI CAMPAGNA: ${aiSummary}\n\nDETTAGLI TECNICI AGGREGATI:\n${technicalNarrative}`;
                        } catch (aiErr) {
                            this.logger.warn(`[CampaignService] AI Generation failed for campaign ${campaign.hash}, falling back to technical data: ${aiErr.message}`);
                        }
                    }
                    
                    // 3. Embedding
                    const vector = await this.ollama.getEmbedding(finalContent);
                    
                    await this.ragSync.syncCampaignSummary(campaign, finalContent, vector);
                } catch (campaignError) {
                    this.logger.error(`[CampaignService] Error materializing campaign ${campaign.hash}: ${campaignError}`);
                }
            }
            
            this.logger.info(`[CampaignService] Materialization completed for ${result.campaigns.length} campaigns.`);
        } catch (error) {
            this.logger.error(`[CampaignService] Materialization failed: ${error}`);
        }
    }
}
