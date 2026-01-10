import { PipelineStage } from '../PipelineStage';

export class GroupingStage implements PipelineStage {
    constructor(private readonly minLogsForAttack: number) { }

    generate(): any[] {
        return [
            // Stage 2: Raggruppa per IP
            {
                $group: {
                    _id: '$request.ip',
                    // Mantieni la struttura del primo log come "rappresentante" del gruppo
                    representative: { $first: '$$ROOT' },
                    // Aggiungi i 3 campi richiesti
                    logsRaggruppati: { $push: '$$ROOT' },
                    totaleLogs: { $sum: 1 },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' },
                    sumScore: { $sum: '$fingerprint.score' }        // Somma di tutti i valori di score
                }
            },
            // Stage per il recupero dei ratelimit events
            {
                $lookup: {
                    from: 'ratelimitevents',  // nome della collection dei rate limit events
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
                            '$representative', // Mantiene tutti i campi originali del log
                            {
                                // Aggiungi i campi calcolati
                                logsRaggruppati: '$logsRaggruppati',
                                totaleLogs: '$totaleLogs',
                                firstSeen: '$firstSeen',
                                lastSeen: '$lastSeen',
                                // Mantieni sumScore per il calcolo successivo dell'averageScore
                                sumScore: '$sumScore',
                                // Nuovi campi rate limit eventi:
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
