/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { PipelineStage } from '../PipelineStage';

export class DistributedGroupingStage implements PipelineStage {
    /**
     * @param firstIp L'IP da usare come ID principale per retrocompatibilità frontend
     * @param minLogsForAttack Soglia minima di log totali per il cluster
     */
    constructor(
        private readonly firstIp: string,
        private readonly minLogsForAttack: number
    ) { }

    generate(): any[] {
        return [
            // Stage: Raggruppa tutto in un unico cluster virtuale basato sulla lista IP fornita
            {
                $group: {
                    _id: 'distributed_investigation_cluster',
                    // Manteniamo un log rappresentativo per i metadati base
                    representative: { $first: '$$ROOT' },
                    // Lista di tutti gli IP unici coinvolti nel cluster
                    ipsInvolved: { $addToSet: '$request.ip' },
                    // Aggregazione di tutti i log per l'analisi comportamentale (stadi successivi)
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
            // Stage per il recupero dei ratelimit events (globali per la lista IP)
            // Nota: per ora eseguiamo il lookup solo se serve, ma lo manteniamo per compatibilità con GroupingStage
            {
                $lookup: {
                    from: 'ratelimitevents',
                    let: { ips: '$ipsInvolved', start_time: '$firstSeen', end_time: '$lastSeen' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ['$ip', '$$ips'] },
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
            // Stage: Filtra il cluster se non raggiunge i log minimi complessivi
            {
                $match: {
                    totaleLogs: { $gte: this.minLogsForAttack }
                }
            },
            // Stage: Riassemblaggio dell'oggetto per compatibilità con stadi successivi e frontend
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            '$representative',
                            {
                                // Per retrocompatibilità, l'ID dell'attacco è il primo IP della lista
                                _id: this.firstIp,
                                ip: this.firstIp,  // Campo esplicito per DTO e RAG
                                ips: '$ipsInvolved',
                                ipCount: { $size: '$ipsInvolved' },
                                isDistributed: true, // Indica che è un'analisi aggregata
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
