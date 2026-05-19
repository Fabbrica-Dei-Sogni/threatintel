import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import * as Tokens from '../di/tokens';
import ThreatLog from '../models/ThreatLogSchema';

@injectable()
export class ThreatAnalyticsService {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger
    ) { }

    private getTimeframeHours(timeframe: string): number {
        const match = timeframe.match(/^(\d+)([mhdwMy])$/);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            switch (unit) {
                case 'm': // minutes
                    return value / 60;
                case 'h': // hours
                    return value;
                case 'd': // days
                    return value * 24;
                case 'w': // weeks
                    return value * 168;
                case 'M': // months
                    return value * 720;
                case 'y': // years
                    return value * 8760;
            }
        }

        // Backward compatibility fallbacks
        if (timeframe === '1m') return 720; 
        if (timeframe === '1w') return 168; 
        if (timeframe === '1y') return 8760; 

        const parsed = parseInt(timeframe);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed * 24;
        }
        return 24;
    }

    async getStats(timeframe = '24h', minScore = 15, limit = 10, minLogs = 1, protocols: string[] = []) {
        let timeframeMatch: any = {};

        if (protocols && protocols.length > 0) {
            if (protocols.includes('http')) {
                timeframeMatch.$or = [
                    { protocol: { $in: protocols } },
                    { protocol: { $exists: false } },
                    { protocol: null }
                ];
            } else {
                timeframeMatch.protocol = { $in: protocols };
            }
        }

        if (timeframe !== 'all') {
            const hours = this.getTimeframeHours(timeframe);
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            timeframeMatch.timestamp = { $gte: since };
            this.logger.info(`[ThreatAnalyticsService] Calculating stats for timeframe: ${timeframe} (since: ${since.toISOString()}) with minScore: ${minScore}, minLogs: ${minLogs}, limit: ${limit}`);
        } else {
            this.logger.info(`[ThreatAnalyticsService] Calculating stats for ALL TIME with minScore: ${minScore}, minLogs: ${minLogs}, limit: ${limit}`);
        }

        const effectiveLimit = limit > 0 ? limit : 1000;

        // Pipeline definitiva: separa il traffico globale dall'analisi delle minacce filtrata
        const results = await ThreatLog.aggregate([
            { $match: timeframeMatch },
            {
                $facet: {
                    // 1. Traffico Totale e Distribuzione Score (UNFILTERED)
                    global: [
                        {
                            $group: {
                                _id: null,
                                totalTraffic: { $sum: 1 },
                                min: { $min: "$fingerprint.score" },
                                max: { $max: "$fingerprint.score" },
                                avg: { $avg: "$fingerprint.score" }
                            }
                        }
                    ],
                    // 2. Conteggio Minacce Attenzionate (FILTERED BY minLogs)
                    threatsCount: [
                        {
                            $group: {
                                _id: "$request.ip",
                                count: { $sum: 1 },
                                isSuspicious: {
                                    $max: {
                                        $cond: [
                                            { $and: [{ $eq: ['$fingerprint.suspicious', true] }, { $gte: ['$fingerprint.score', minScore] }] },
                                            1, 0
                                        ]
                                    }
                                }
                            }
                        },
                        { $match: { count: { $gte: minLogs }, isSuspicious: 1 } },
                        { $count: "count" }
                    ],
                    // 3. Top Paesi (FILTERED BY minLogs)
                    topCountries: [
                        {
                            $group: {
                                _id: "$request.ip",
                                count: { $sum: 1 },
                                country: { $first: "$geo.country" },
                                isSuspicious: {
                                    $max: {
                                        $cond: [
                                            { $and: [{ $eq: ['$fingerprint.suspicious', true] }, { $gte: ['$fingerprint.score', minScore] }] },
                                            1, 0
                                        ]
                                    }
                                }
                            }
                        },
                        { $match: { count: { $gte: minLogs }, isSuspicious: 1, country: { $exists: true, $ne: null } } },
                        { $group: { _id: "$country", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: effectiveLimit }
                    ],
                    // 4. Top Indicators (FILTERED BY minLogs)
                    topIndicators: [
                        {
                            $group: {
                                _id: "$request.ip",
                                count: { $sum: 1 },
                                indicators: { $addToSet: "$fingerprint.indicators" },
                                isSuspicious: {
                                    $max: {
                                        $cond: [
                                            { $and: [{ $eq: ['$fingerprint.suspicious', true] }, { $gte: ['$fingerprint.score', minScore] }] },
                                            1, 0
                                        ]
                                    }
                                }
                            }
                        },
                        { $match: { count: { $gte: minLogs }, isSuspicious: 1 } },
                        { $unwind: "$indicators" },
                        { $unwind: "$indicators" },
                        { $group: { _id: { ip: "$_id", ind: "$indicators" } } },
                        { $group: { _id: "$_id.ind", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: effectiveLimit }
                    ],
                    // 5. Nodi Unici (FILTERED BY minLogs)
                    uniqueIPs: [
                        { $group: { _id: "$request.ip", count: { $sum: 1 } } },
                        { $match: { count: { $gte: minLogs } } },
                        { $group: { _id: null, ips: { $push: "$_id" } } }
                    ]
                }
            }
        ]);

        const facet = results[0];
        const global = facet.global[0] || { totalTraffic: 0, min: 0, max: 100, avg: 15 };
        const threats = facet.threatsCount[0] || { count: 0 };

        const countriesMap: Record<string, number> = {};
        (facet.topCountries || []).forEach((c: any) => { countriesMap[c._id] = c.count; });

        const indicatorsMap: Record<string, number> = {};
        (facet.topIndicators || []).forEach((i: any) => { indicatorsMap[i._id] = i.count; });

        return {
            totalRequests: global.totalTraffic,
            suspiciousRequests: threats.count,
            topCountries: countriesMap,
            topIndicators: indicatorsMap,
            uniqueIPs: facet.uniqueIPs[0]?.ips || [],
            scoreDistribution: { min: global.min, max: global.max, avg: global.avg }
        };
    }

    async getTopThreats(limit = 10, timeframe = '24h', minScore = 15, protocols: string[] = []) {
        let match: any = { 'fingerprint.suspicious': true };

        if (protocols && protocols.length > 0) {
            if (protocols.includes('http')) {
                match.$or = [
                    { protocol: { $in: protocols } },
                    { protocol: { $exists: false } },
                    { protocol: null }
                ];
            } else {
                match.protocol = { $in: protocols };
            }
        }

        if (timeframe !== 'all') {
            const hours = this.getTimeframeHours(timeframe);
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            match.timestamp = { $gte: since };
        }

        if (minScore > 0) {
            match['fingerprint.score'] = { $gte: minScore };
        }

        const effectiveLimit = limit > 0 ? limit : 1000;

        return await ThreatLog.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { ip: "$request.ip", url: "$request.url" },
                    score: { $max: "$fingerprint.score" },
                    indicators: { $first: "$fingerprint.indicators" },
                    country: { $first: "$geo.country" },
                    timestamp: { $max: "$timestamp" }
                }
            },
            { $sort: { timestamp: -1 } },
            { $limit: effectiveLimit },
            {
                $project: {
                    _id: 0,
                    request: {
                        ip: "$_id.ip",
                        url: "$_id.url"
                    },
                    fingerprint: {
                        score: "$score",
                        indicators: "$indicators"
                    },
                    geo: {
                        country: "$country"
                    },
                    timestamp: 1
                }
            }
        ]);
    }
}
