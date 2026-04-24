import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../di/tokens';
import ThreatLog from '../models/ThreatLogSchema';
import { ForensicPipelineService } from './forense/ForensicPipelineService';

@injectable()
export class CampaignService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly forensicPipelineService: ForensicPipelineService
    ) {}

    /**
     * Scopre pattern di attacco (hash) condivisi da più IP diversi.
     * Implementa il cuore della Distributed Anomaly Analysis.
     */
    async getCampaigns({ 
        timeConfig = {}, 
        minIps = 2, 
        minScore = 0,
        page = 1,
        pageSize = 10
    }: { 
        timeConfig?: any, 
        minIps?: number, 
        minScore?: number,
        page?: number,
        pageSize?: number 
    } = {}) {
        const startTimeProc = Date.now();
        this.logger.info(`[CampaignService] Discovery START - Params: page=${page}, size=${pageSize}, minIps=${minIps}, minScore=${minScore}`);
        
        const mongoFilters: any = {};

        // Applichiamo il filtro temporale se presente
        if (timeConfig && (timeConfig.startTime || timeConfig.endTime)) {
            const timeFilter: any = {};
            if (timeConfig.startTime) timeFilter.$gte = new Date(timeConfig.startTime);
            if (timeConfig.endTime) timeFilter.$lte = new Date(timeConfig.endTime);
            mongoFilters.timestamp = timeFilter;
        }

        // Filtro di severità (rumore di fondo) - di default esclude score 0 o mancanti
        mongoFilters['fingerprint.score'] = { $gt: minScore };

        const pipeline = [
            { $match: mongoFilters },
            {
                $group: {
                    _id: '$fingerprint.hash',
                    ips: { $addToSet: '$request.ip' },
                    totalLogs: { $sum: 1 },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' },
                    sampleUrl: { $first: '$request.url' }
                }
            },
            {
                $project: {
                    hash: '$_id',
                    ips: 1,
                    ipCount: { $size: '$ips' },
                    totalLogs: 1,
                    firstSeen: 1,
                    lastSeen: 1,
                    sampleUrl: 1
                }
            },
            // Filtriamo solo pattern usati da almeno N IP (default 2)
            { $match: { ipCount: { $gte: minIps }, hash: { $ne: null } } },
            { $sort: { ipCount: -1 as const, totalLogs: -1 as const } },
            // Paginazione server-side tramite $facet
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $skip: (page - 1) * pageSize },
                        { $limit: pageSize }
                    ]
                }
            }
        ];

        try {
            const [result] = await ThreatLog.aggregate(pipeline);
            const duration = Date.now() - startTimeProc;
            
            const total = result.metadata[0]?.total || 0;
            const campaigns = result.data || [];
            
            this.logger.info(`[CampaignService] Discovery COMPLETED in ${duration}ms - Page ${page}: ${campaigns.length}/${total} campaigns`);
            
            return {
                campaigns,
                total
            };
        } catch (err) {
            this.logger.error(`[CampaignService] Discovery FAILED after ${Date.now() - startTimeProc}ms:`, err);
            throw err;
        }
    }

    /**
     * Analisi forense aggregata per una campagna distribuita.
     */
    async getCampaignDetail({
        ips,
        hash,
        minLogsForAttack = 1,
        minScore = 0,
        timeConfig = {}
    }: {
        ips?: string[];
        hash: string;
        minLogsForAttack?: number;
        minScore?: number;
        timeConfig?: any;
    }) {
        const startTimeProc = Date.now();
        this.logger.info(`[CampaignService] Detail Fetch START - Hash: ${hash}, minLogsForAttack: ${minLogsForAttack}, minScore: ${minScore}`);
        
        const mongoFilters: any = { 
            'fingerprint.hash': hash
        };

        if (minScore > 0) {
            mongoFilters['fingerprint.score'] = { $gt: minScore };
        }
        
        if (ips && ips.length > 0) {
            mongoFilters['request.ip'] = { $in: ips };
        }

        // Pipeline configurata per raggruppare per HASH (il pattern della campagna)
        const basePipeline = await this.forensicPipelineService.buildStandardPipeline(
            mongoFilters, 
            minLogsForAttack, 
            timeConfig, 
            'fingerprint.hash'
        );

        const pipeline = [
            ...basePipeline,
            // Aggiungiamo estrazione IP unici e conteggio per il dettaglio campagna
            {
                $addFields: {
                    ips: {
                        $reduce: {
                            input: "$logsRaggruppati",
                            initialValue: [],
                            in: { $setUnion: ["$$value", ["$$this.request.ip"]] }
                        }
                    }
                }
            },
            {
                $addFields: {
                    ipCount: { $size: "$ips" },
                    // Allineamento nomi per il frontend (attackPatterns -> techniques)
                    techniques: "$attackPatterns"
                }
            },
            {
                $lookup: {
                    from: 'ipdetails',
                    localField: 'ipDetailsId',
                    foreignField: '_id',
                    as: 'ipDetails'
                }
            },
            {
                $addFields: {
                    ipDetails: { $arrayElemAt: ['$ipDetails', 0] }
                }
            }
        ];

        try {
            const [campaign] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
            const duration = Date.now() - startTimeProc;
            this.logger.info(`[CampaignService] Detail Fetch COMPLETED in ${duration}ms for hash ${hash}`);
            return campaign || null;
        } catch (err) {
            this.logger.error(`[CampaignService] Detail Fetch FAILED after ${Date.now() - startTimeProc}ms for hash ${hash}:`, err);
            throw err;
        }
    }
}
