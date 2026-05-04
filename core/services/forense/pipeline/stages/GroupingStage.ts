/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { PipelineStage } from '../PipelineStage';

export class GroupingStage implements PipelineStage {
    constructor(private readonly minLogsForAttack: number) { }

    generate(): any[] {
        return [
            // Stage 2: Raggruppa per IP (Analisi Forense Standard)
            {
                $group: {
                    _id: '$request.ip',
                    // Mantieni la struttura del primo log come "rappresentante" del gruppo
                    representative: { $first: '$$ROOT' },
                    // Aggiungi i log raggruppati per l'analisi comportamentale
                    logsRaggruppati: {
                        $push: {
                            _id: '$_id',
                            timestamp: '$timestamp',
                            request: {
                                method: '$request.method',
                                url: '$request.url',
                                ip: '$request.ip',
                                headers: '$request.headers',
                                body: '$request.body',
                                query: '$request.query'
                            },
                            response: {
                                statusCode: '$response.statusCode'
                            },
                            fingerprint: '$fingerprint',
                            session_id: '$session_id',
                            metadata: '$metadata'
                        }
                    },
                    totaleLogs: { $sum: 1 },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' },
                    sumScore: { $sum: '$fingerprint.score' }
                }
            },
            // Stage per il recupero dei ratelimit events (specifico per IP)
            {
                $lookup: {
                    from: 'ratelimitevents',
                    let: { ip_agg: '$_id', start_time: '$firstSeen', end_time: '$lastSeen' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$ip', '$$ip_agg'] },
                                        { $gte: ['$timestamp', '$$start_time'] },
                                        { $lte: ['$timestamp', '$$end_time'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'rateLimitEvents'
                }
            },
            // Stage 3: Filtra gruppi significativi (min logs)
            {
                $match: {
                    totaleLogs: { $gte: this.minLogsForAttack },
                    firstSeen: { $exists: true, $ne: null },
                    lastSeen: { $exists: true, $ne: null }
                }
            },
            // Stage 4: Ricrea la struttura come un normale ThreatLog + i campi extra
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            '$representative',
                            {
                                _id: '$_id', // L'IP attaccante
                                ip: '$_id',  // Campo esplicito per DTO e RAG
                                logsRaggruppati: '$logsRaggruppati',
                                totaleLogs: '$totaleLogs',
                                firstSeen: '$firstSeen',
                                lastSeen: '$lastSeen',
                                sumScore: '$sumScore',
                                countRateLimit: { $size: '$rateLimitEvents' },
                                rateLimitList: '$rateLimitEvents'
                            },
                        ]
                    }
                }
            }
        ];
    }
}
