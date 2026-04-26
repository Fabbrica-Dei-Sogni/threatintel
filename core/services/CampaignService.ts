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

        const baseFilters: any = {};
        if (protocol) {
            if (protocol === 'http') {
                baseFilters.$or = [{ protocol: 'http' }, { protocol: { $exists: false } }, { protocol: null }];
            } else {
                baseFilters.protocol = protocol;
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
            {
                $facet: {
                    pagedData: [
                        { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                        { $sort: { firstSeen: -1 as const, ipCount: -1 as const } },
                        { $skip: (page - 1) * pageSize },
                        { $limit: pageSize }
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
            const data = result?.pagedData || [];
            const bIps = result?.boundsIps[0] || { min: 0, max: 0 };
            const bScore = result?.boundsScore[0] || { min: 0, max: 0 };
            const bLogs = result?.boundsLogsPerIp[0] || { min: 0, max: 0 };
            const totalCount = result?.totalFiltered[0]?.total || 0;
            
            return { 
                campaigns: data, 
                count: totalCount,
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
                                sampleUrl: { $first: '$sampleUrl' }
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
            const meta = result?.meta[0] || { ipCount: 0, clusterLogs: 0, clusterAvgScore: 0 };
            return {
                hash,
                ipCount: meta.ipCount,
                totaleLogs: meta.clusterLogs,
                averageScore: meta.clusterAvgScore,
                firstSeen: meta.clusterFirstSeen,
                lastSeen: meta.clusterLastSeen,
                sampleUrl: meta.sampleUrl,
                nodes: result?.nodes || [],
                page, pageSize
            };
        } catch (err: any) {
            this.logger.error(`[CampaignService] Detail Error: ${err.message}`);
            throw err;
        }
    }
}
