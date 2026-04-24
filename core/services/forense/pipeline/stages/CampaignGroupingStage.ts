import { PipelineStage } from '../PipelineStage';

export class CampaignGroupingStage implements PipelineStage {
    constructor(private readonly minLogsForAttack: number) { }

    generate(): any[] {
        return [
            // Stage 2: Raggruppa per Hash (Discovery delle Campagne)
            {
                $group: {
                    _id: '$fingerprint.hash',
                    // Rappresentante della campagna
                    representative: { $first: '$$ROOT' },
                    // Tracking IP coinvolti
                    ipsInvolved: { $addToSet: '$request.ip' },
                    // Log aggregati
                    logsRaggruppati: {
                        $push: {
                            _id: '$_id',
                            timestamp: '$timestamp',
                            request: {
                                method: '$request.method',
                                url: '$request.url',
                                ip: '$request.ip'
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
            // Stage 3: Filtra per minimi logs (se richiesto)
            {
                $match: {
                    totaleLogs: { $gte: this.minLogsForAttack },
                    _id: { $ne: null }
                }
            },
            // Stage 4: Struttura finale per Campagna
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            '$representative',
                            {
                                hash: '$_id',
                                ips: '$ipsInvolved',
                                ipCount: { $size: '$ipsInvolved' },
                                logsRaggruppati: '$logsRaggruppati',
                                totaleLogs: '$totaleLogs',
                                firstSeen: '$firstSeen',
                                lastSeen: '$lastSeen',
                                sumScore: '$sumScore'
                            },
                        ]
                    }
                }
            }
        ];
    }
}
