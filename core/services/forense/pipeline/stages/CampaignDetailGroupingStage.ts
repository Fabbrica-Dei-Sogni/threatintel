/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import { PipelineStage } from '../PipelineStage';

/**
 * Stage di raggruppamento per il Dettaglio Campagna (Forensics).
 * Raggruppa per IP all'interno di una campagna specifica, calcolando metriche per singolo nodo
 * e includendo il lookup geografico e il facet finale per meta/nodes.
 */
export class CampaignDetailGroupingStage implements PipelineStage {
    constructor(
        private readonly minLogsPerIp: number = 1,
        private readonly minScore: number = 0,
        private readonly page: number = 1,
        private readonly pageSize: number = 10
    ) { }

    generate(): any[] {
        return [
            // Stage 1: Raggruppamento per IP
            {
                $group: {
                    _id: '$request.ip',
                    totaleLogs: { $sum: 1 },
                    sumScore: { $sum: '$fingerprint.score' },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' },
                    allIndicators: { $push: '$fingerprint.indicators' },
                    sampleUrl: { $first: '$request.url' },
                    collectedUserAgents: { $addToSet: '$request.userAgent' },
                    status: { $first: '$status' }
                }
            },
            // Stage 2: Filtro per minimi logs per IP
            { $match: { totaleLogs: { $gte: Number(this.minLogsPerIp) } } },
            // Stage 3: Proiezione intermedia e calcolo score medio
            {
                $project: {
                    ip: '$_id',
                    totaleLogs: 1,
                    firstSeen: 1,
                    lastSeen: 1,
                    sampleUrl: 1,
                    status: 1,
                    averageScore: { $divide: ['$sumScore', '$totaleLogs'] },
                    fingerprintAnalysis: {
                        userAgents: '$collectedUserAgents'
                    },
                    attackPatterns: {
                        $reduce: {
                            input: '$allIndicators',
                            initialValue: [],
                            in: { $setUnion: ['$$value', '$$this'] }
                        }
                    }
                }
            },
            // Stage 4: Filtri di coerenza (Average Score)
            {
                $match: {
                    averageScore: { $gte: Number(this.minScore) }
                }
            },
            // Stage 5: Lookup geografico
            { $lookup: { from: 'ipdetails', localField: 'ip', foreignField: 'ip', as: 'geo' } },
            { $addFields: { geoInfo: { $arrayElemAt: ['$geo', 0] } } },
            // Stage 6: Facet per Meta e Nodi paginati
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
                                status: { $first: '$status' },
                                allIps: { $push: '$ip' },
                                timeInfo: { $push: { ip: '$ip', firstSeen: '$firstSeen', lastSeen: '$lastSeen' } }
                            }
                        }
                    ],
                    nodes: [
                        { $sort: { firstSeen: -1 as const, totaleLogs: -1 as const } },
                        { $skip: (Number(this.page) - 1) * Number(this.pageSize) },
                        { $limit: Number(this.pageSize) }
                    ]
                }
            }
        ];
    }
}
