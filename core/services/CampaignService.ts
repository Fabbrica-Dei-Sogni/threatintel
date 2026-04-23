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
    async getCampaigns({ timeConfig = {}, minIps = 2 }: { timeConfig?: any, minIps?: number } = {}) {
        this.logger.info(`[CampaignService] Discovering campaigns with minIps: ${minIps}`);
        
        const mongoFilters: any = {};

        // Applichiamo il filtro temporale se presente
        if (timeConfig && (timeConfig.startTime || timeConfig.endTime)) {
            const timeFilter: any = {};
            if (timeConfig.startTime) timeFilter.$gte = new Date(timeConfig.startTime);
            if (timeConfig.endTime) timeFilter.$lte = new Date(timeConfig.endTime);
            mongoFilters.timestamp = timeFilter;
        }

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
            { $sort: { ipCount: -1 as const, totalLogs: -1 as const } }
        ];

        return await ThreatLog.aggregate(pipeline);
    }

    /**
     * Analisi forense aggregata per una campagna distribuita.
     */
    async getCampaignDetail({
        ips,
        hash,
        minLogsForAttack = 1,
        timeConfig = {}
    }: {
        ips?: string[];
        hash: string;
        minLogsForAttack?: number;
        timeConfig?: any;
    }) {
        this.logger.info(`[CampaignService] Fetching details for campaign hash: ${hash}`);
        
        const mongoFilters: any = { 
            'fingerprint.hash': hash
        };
        
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

        const [campaign] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
        return campaign || null;
    }
}
