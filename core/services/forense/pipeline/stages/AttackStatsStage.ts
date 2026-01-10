import { PipelineStage } from '../PipelineStage';

export class AttackStatsStage implements PipelineStage {
    constructor(private readonly tolleranceWeights: any) { }

    generate(): any[] {
        return [
            // 1. Calcolo Metriche Base (Durata, Score Medio, RPS)
            {
                $addFields: {
                    // Durata in ms e minuti per calcoli
                    attackDurationMs: { $subtract: ['$lastSeen', '$firstSeen'] },
                    attackDurationMinutes: {
                        $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000]
                    },
                    // Score medio
                    averageScore: {
                        $round: [{ $divide: ['$sumScore', '$totaleLogs'] }, 2]
                    },
                    // RPS (Requests Per Second)
                    rps: {
                        $round: [
                            {
                                $divide: [
                                    '$totaleLogs',
                                    { $max: [1, { $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 1000] }] }
                                ]
                            },
                            5
                        ]
                    }
                }
            },
            // 2. Arricchimento Oggetti Compleessi (Durata Human, ecc - meno prioritari per i calcoli)
            {
                $addFields: {
                    durataAttacco: {
                        ms: '$attackDurationMs',
                        minutes: { $round: ['$attackDurationMinutes', 2] },
                        human: {
                            $switch: {
                                branches: [
                                    {
                                        case: { $lt: ['$attackDurationMinutes', 0.000016] }, // < 1ms approx protection
                                        then: { $concat: [{ $toString: '$attackDurationMs' }, 'ms'] }
                                    },
                                    {
                                        case: { $lt: ['$attackDurationMinutes', 1] }, // < 1 min
                                        then: { $concat: [{ $toString: '$attackDurationMs' }, 'ms'] }
                                    },
                                    {
                                        case: { $lt: ['$attackDurationMinutes', 60] }, // < 1 hour
                                        then: { $concat: [{ $toString: { $round: ['$attackDurationMinutes', 1] } }, ' min'] }
                                    }
                                ],
                                default: {
                                    $concat: [
                                        { $toString: { $floor: { $divide: ['$attackDurationMinutes', 60] } } },
                                        'h ',
                                        { $toString: { $mod: [{ $floor: '$attackDurationMinutes' }, 60] } },
                                        'm'
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            // 3. Calcolo Attack Patterns e Tecniche
            {
                $addFields: {
                    attackPatterns: {
                        $let: {
                            vars: {
                                allIndicators: {
                                    $reduce: {
                                        input: "$logsRaggruppati",
                                        initialValue: [],
                                        in: {
                                            $setUnion: [
                                                "$$value",
                                                { $ifNull: ["$$this.fingerprint.indicators", []] }
                                            ]
                                        }
                                    }
                                }
                            },
                            in: {
                                $setUnion: [
                                    {
                                        $map: {
                                            input: "$$allIndicators",
                                            as: "ind",
                                            in: {
                                                $toLower: {
                                                    $cond: [
                                                        { $gte: [{ $indexOfBytes: ["$$ind", ":"] }, 0] },
                                                        { $arrayElemAt: [{ $split: ["$$ind", ":"] }, 1] },
                                                        "$$ind"
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    []
                                ]
                            }
                        }
                    }
                }
            },
            // 4. Conteggi e Normalizzazioni Tecniche
            {
                $addFields: {
                    uniqueTechCount: { $size: "$attackPatterns" },
                    uniqueTechNorm: {
                        $min: [{ $divide: [{ $size: "$attackPatterns" }, this.tolleranceWeights.UNQTECHTOL || 6] }, 1]
                    }
                }
            }
        ];
    }
}
