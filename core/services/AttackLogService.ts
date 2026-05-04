import { inject, injectable } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN, EVENT_BUS_TOKEN, FORENSIC_PIPELINE_TOKEN } from '../di/tokens';
import { EventBus, AppEvents } from './EventBus';
import { ForensicPipelineService } from './forense/ForensicPipelineService';
import ThreatLog from '../models/ThreatLogSchema';
import IpDetails from '../models/IpDetailsSchema';
import AttackDTO from '../models/dto/AttackDTO';
import {
    sanitizeSortFields,
    sanitizeFilters,
    SortAllowedFields,
    FilterAllowedFields
} from '../utils/queryGuard';
import { GetAttackDetailParams, GetAttacksParams } from '../types/service-params.types';

@injectable()
export class AttackLogService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(FORENSIC_PIPELINE_TOKEN) private readonly forensicPipelineService: ForensicPipelineService,
        @inject(EVENT_BUS_TOKEN) private readonly eventBus: EventBus
    ) { }

    /**
     * Ricerca attacchi aggregati (V2 via ForensicPipelineService).
     */
    async getAttacks(params: GetAttacksParams = {}) {
        const {
            page = 1,
            pageSize = 20,
            filters = {},
            minLogsForAttack = 10,
            timeConfig = {},
            sortFields = null
        } = params;
        const skip = (page - 1) * pageSize;

        const postAggFields = ['dangerLevel', 'attackPatterns', 'dangerScore', 'averageScore', 'totaleLogs'];
        const initialFilters: any = {};
        const postAggregationFilters: any = {};

        for (const [key, value] of Object.entries(filters)) {
            if (postAggFields.includes(key)) {
                postAggregationFilters[key] = value;
            } else {
                initialFilters[key] = value;
            }
        }

        const mongoFilters = this.buildRegExpFilter(initialFilters, FilterAllowedFields.attack);
        const safeSort = sanitizeSortFields(sortFields, SortAllowedFields.attack, { lastSeen: -1 });
        const sortStage = { $sort: safeSort };

        const basePipeline = await this.forensicPipelineService.buildStandardPipeline(mongoFilters, minLogsForAttack, timeConfig);

        if (Object.keys(postAggregationFilters).length > 0) {
            const { dangerLevel, ...otherPostFilters } = postAggregationFilters;

            if (dangerLevel) {
                let levels: number[] = [];
                if (typeof dangerLevel === 'string') {
                    levels = dangerLevel.split(',').map(l => parseInt(l.trim())).filter(l => !isNaN(l));
                } else if (Array.isArray(dangerLevel)) {
                    levels = dangerLevel.map(l => typeof l === 'string' ? parseInt(l) : l).filter(l => !isNaN(l));
                } else if (typeof dangerLevel === 'number') {
                    levels = [dangerLevel];
                }

                if (levels.length > 0) {
                    basePipeline.push({ $match: { dangerLevel: { $in: levels } } });
                }
            }

            if (Object.keys(otherPostFilters).length > 0) {
                const postMongoFilters = this.buildRegExpFilter(otherPostFilters, FilterAllowedFields.attack);
                basePipeline.push({ $match: postMongoFilters });
            }
        }

        const pipeline = [
            ...basePipeline,
            {
                $facet: {
                    dati: [
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
                        },
                        sortStage,
                        { $skip: skip },
                        { $limit: pageSize }
                    ],
                    totale: [
                        { $count: 'totalCount' }
                    ]
                }
            },
            {
                $addFields: {
                    totalCount: { $arrayElemAt: ['$totale.totalCount', 0] }
                }
            },
            {
                $project: {
                    dati: 1,
                    totalCount: 1
                }
            }
        ];

        const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
        const attacks: AttackDTO[] = result.dati;

        if (attacks.length > 0) {
            this.eventBus.emit(AppEvents.ATTACK_SEARCHED, { items: attacks, totalCount: result.totalCount || 0 });
        }

        return {
            items: attacks,
            totalCount: result.totalCount || 0
        };
    }

    /**
     * Dettaglio attacco per singolo IP.
     */
    async getAttackDetail(params: GetAttackDetailParams) {
        const {
            ip,
            minLogsForAttack = 1,
            timeConfig = {},
            protocol = null,
            status = 'active'
        } = params;

        const mongoFilters = this.buildRegExpFilter({
            'request.ip': ip,
            protocol,
            status
        }, FilterAllowedFields.attack);

        const basePipeline = await this.forensicPipelineService.buildStandardPipeline(mongoFilters, minLogsForAttack, timeConfig);

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

        const [attack] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);

        if (attack) {
            this.eventBus.emit(AppEvents.ATTACK_RESOLVED, attack);
        }

        return attack || null;
    }

    /**
     * Analisi investigativa distribuita per cluster di IP.
     */
    async getDistributedAttackDetail({
        ipList,
        minLogsForAttack = 1,
        timeConfig = {},
        protocol = null,
        status = 'active'
    }: {
        ipList: string[];
        minLogsForAttack?: number;
        timeConfig?: any;
        protocol?: string | null;
        status?: string;
    }) {
        const pipeline = await this.forensicPipelineService.buildDistributedPipeline(ipList, minLogsForAttack, timeConfig, protocol, status);
        const [attack] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);

        if (!attack) {
            this.logger.warn(`[AttackLogService] No distributed attack data found for provided IPs`);
            return null;
        }

        this.logger.info(`[AttackLogService] Distributed attack detail found for ${attack.ips?.length || 0} IPs`);

        const result = await ThreatLog.populate(attack, { path: 'ipDetailsId', model: 'IpDetails' });
        const resAny = result as any;
        
        if (resAny.ipDetailsId) {
            resAny.ipDetails = resAny.ipDetailsId;
        }

        if (resAny.ips && resAny.ips.length > 0) {
            const allDetails = await IpDetails.find({ ip: { $in: resAny.ips } })
                .populate('abuseipdbId')
                .lean();
            resAny.allIpDetails = allDetails;
        }

        this.eventBus.emit(AppEvents.ATTACK_RESOLVED, resAny);
        return resAny;
    }

    /**
     * Helper per la costruzione dei filtri MongoDB (duplicato da ThreatLogService per autonomia).
     */
    private buildRegExpFilter(filters: any, allowedFields: Set<string>) {
        const mongoFilters: any = {};
        const andFilters: any[] = [];
        const safeFilters = sanitizeFilters(filters, allowedFields);

        if (allowedFields.has('status')) {
            const statusValue = safeFilters.status;
            if (!statusValue || statusValue === 'active') {
                mongoFilters.status = { $in: [null, 'active'] };
            } else {
                mongoFilters.status = statusValue;
            }
            delete safeFilters.status;
        }

        for (const [key, value] of Object.entries(safeFilters)) {
            if (key === 'protocol') {
                if (value === 'http') {
                    mongoFilters.$or = [
                        { protocol: 'http' },
                        { protocol: { $exists: false } },
                        { protocol: null }
                    ];
                } else {
                    mongoFilters[key] = value;
                }
            } else if (typeof value === 'string') {
                const words = value.trim().split(/\s+/).filter(w => w.length > 0);
                if (words.length > 1) {
                    words.forEach(w => {
                        andFilters.push({ [key]: { $regex: w, $options: 'i' } });
                    });
                } else if (words.length === 1) {
                    mongoFilters[key] = { $regex: words[0], $options: 'i' };
                }
            } else {
                mongoFilters[key] = value;
            }
        }

        if (andFilters.length > 0) {
            mongoFilters.$and = andFilters;
        }

        return mongoFilters;
    }
}
