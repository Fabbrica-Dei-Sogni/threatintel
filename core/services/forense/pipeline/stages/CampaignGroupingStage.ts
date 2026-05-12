/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { PipelineStage } from '../PipelineStage';

/**
 * Stage di raggruppamento per le Campagne (Discovery).
 * Implementa un raggruppamento a due livelli:
 * 1. Raggruppamento per { Hash, IP } per contare i log per singolo nodo sorgente.
 * 2. Raggruppamento per Hash per aggregare i dati della campagna globale.
 */
export class CampaignGroupingStage implements PipelineStage {
    constructor(private readonly minLogsPerIp: number = 1) { }

    generate(): any[] {
        return [
            // Stage 1: Raggruppamento per Hash + IP (Nodi sorgente)
            {
                $group: {
                    _id: { hash: '$fingerprint.hash', ip: '$request.ip' },
                    logsPerIp: { $sum: 1 },
                    sumScorePerIp: { $sum: '$fingerprint.score' },
                    indicatorsPerIp: { $push: '$fingerprint.indicators' },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' },
                    sampleUrl: { $first: '$request.url' },
                    protocols: { $addToSet: '$protocol' },
                    userAgentsPerIp: { $addToSet: '$request.userAgent' },
                    status: { $first: '$status' }
                }
            },
            // Stage 2: Filtro per minimi logs per IP e rimozione null hash
            {
                $match: {
                    '_id.hash': { $ne: null },
                    logsPerIp: { $gte: Number(this.minLogsPerIp) }
                }
            },
            // Stage 3: Raggruppamento finale per Hash (Campagna globale)
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
                    timeInfo: { $push: { ip: '$_id.ip', firstSeen: '$firstSeen', lastSeen: '$lastSeen' } },
                    allProtocols: { $push: '$protocols' },
                    allUserAgents: { $push: '$userAgentsPerIp' },
                    status: { $first: '$status' }
                }
            },
            // Stage 4: Proiezione finale con calcolo indicatori e protocolli univoci
            {
                $project: {
                    hash: '$_id',
                    ipCount: 1,
                    totaleLogs: 1,
                    maxLogsInThisCampaign: 1,
                    firstSeen: 1,
                    lastSeen: 1,
                    sampleUrl: 1,
                    status: 1,
                    averageScore: { $divide: ['$sumScore', '$totaleLogs'] },
                    timeInfo: 1,
                    fingerprintAnalysis: {
                        userAgents: {
                            $reduce: {
                                input: '$allUserAgents',
                                initialValue: [],
                                in: { $setUnion: ['$$value', '$$this'] }
                            }
                        }
                    },
                    protocols: {
                        $reduce: {
                            input: '$allProtocols',
                            initialValue: [],
                            in: { $setUnion: ['$$value', '$$this'] }
                        }
                    },
                    attackPatterns: {
                        $reduce: {
                            input: '$allIndicators',
                            initialValue: [],
                            in: { $setUnion: ['$$value', { $reduce: { input: '$$this', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } }] }
                        }
                    }
                }
            }
        ];
    }
}
