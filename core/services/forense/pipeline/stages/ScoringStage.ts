import { PipelineStage } from '../PipelineStage';

export class ScoringStage implements PipelineStage {
    constructor(
        private readonly dangerWeights: any,
        private readonly tolleranceWeights: any
    ) { }

    generate(): any[] {
        // Defaults se mancano
        const tWeights = {
            rpsTol: this.tolleranceWeights.RPSTOL || 10,
            durTol: this.tolleranceWeights.DURTOL || 361,
            scoreTol: this.tolleranceWeights.SCORETOL || 40,
            durDecayTol: this.tolleranceWeights.DURDECAYTOL || 240
        };

        const dWeights = {
            rpsNorm: this.dangerWeights.RPSNORM ? this.dangerWeights.RPSNORM : (parseFloat(process.env.DANGER_WEIGHT_RPSNORM || '0.18') || 0.18),
            durNormPenalized: this.dangerWeights.DURNORM ? this.dangerWeights.DURNORM : (parseFloat(process.env.DANGER_WEIGHT_DURNORM || '0.12') || 0.12),
            scoreNorm: this.dangerWeights.SCORENORM ? this.dangerWeights.SCORENORM : (parseFloat(process.env.DANGER_WEIGHT_SCORENORM || '0.50') || 0.50),
            // BUG LEGACY: Il servizio originale usa DURNORM anche per uniqueTechNorm. Replicato per parity.
            uniqueTechNorm: this.dangerWeights.DURNORM ? this.dangerWeights.DURNORM : (parseFloat(process.env.DANGER_WEIGHT_UNIQUETECHNORM || '0.20') || 0.20)
        };

        return [
            {
                $addFields: {
                    // Label per esprimere uno stile di rps
                    rpsStyle: {
                        $switch: {
                            branches: [
                                { case: { $lt: ['$rps', 0.1] }, then: 'sporadico' },
                                { case: { $lt: ['$rps', 1] }, then: 'basso' },
                                { case: { $lt: ['$rps', 10] }, then: 'moderato' },
                                { case: { $lt: ['$rps', 50] }, then: 'alto' }
                            ],
                            default: 'elevato'
                        }
                    },
                    // Label descrittiva per indicare l'intensita dell'attacco
                    intensityAttack: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $and: [
                                            { $lt: ['$attackDurationMinutes', 5] },  // meno di 5 minuti
                                            { $gte: ['$rps', 10] }  // rps alto
                                        ]
                                    },
                                    then: 'burst lampo'
                                },
                                {
                                    case: {
                                        $and: [
                                            { $gte: ['$attackDurationMinutes', 5] },  // più di 5 minuti
                                            { $lt: ['$rps', 1] }  // rps basso moderato
                                        ]
                                    },
                                    then: 'persistente basso'
                                },
                                {
                                    case: {
                                        $and: [
                                            { $gte: ['$attackDurationMinutes', 2] },  // più di 2 minuti
                                            { $lt: ['$rps', 5] },
                                            { $gte: ['$rps', 1] }
                                        ]
                                    },
                                    then: 'persistente medio'
                                },
                                {
                                    case: {
                                        $and: [
                                            { $gte: ['$attackDurationMinutes', 1.5] },  // da 1.5 a 60 minuti
                                            { $gte: ['$rps', 9] }
                                        ]
                                    },
                                    then: 'burst prolungato'
                                },
                                {
                                    case: { $and: [{ $lt: ['$rps', 2] }, { $lt: ['$attackDurationMinutes', 1] }] },
                                    then: 'scansione micro burst basso'
                                },
                                {
                                    case: { $and: [{ $lt: ['$rps', 5] }, { $lt: ['$attackDurationMinutes', 1] }] },
                                    then: 'scansione micro burst moderato'
                                },
                                {
                                    case: { $and: [{ $gte: ['$rps', 5] }, { $lt: ['$attackDurationMinutes', 1] }] },
                                    then: 'scansione micro burst intenso'
                                },
                                {
                                    case: { $gte: ['$rps', 50] },
                                    then: 'estremo'
                                },
                                {
                                    case: {
                                        $and: [
                                            { $gte: ['$attackDurationMinutes', 60] },
                                            { $gte: ['$rps', 5] }
                                        ]
                                    },
                                    then: 'persistente alto'
                                },
                                {
                                    case: {
                                        $lt: ['$rps', 1]
                                    },
                                    then: 'basso impatto'
                                }
                            ],
                            default: 'altro'
                        }
                    }
                }
            },
            {
                $addFields: {
                    // Normalizzazioni
                    rpsNorm: {
                        $min: [{ $divide: ['$rps', tWeights.rpsTol] }, 1]
                    },
                    durNorm: {
                        $min: [
                            {
                                $divide: [
                                    { $ln: { $add: ['$attackDurationMinutes', 1] } },
                                    { $ln: tWeights.durTol }
                                ]
                            },
                            1
                        ]
                    },
                    scoreNorm: {
                        $min: [{ $divide: ['$averageScore', tWeights.scoreTol] }, 1]
                    }
                }
            },
            {
                $addFields: {
                    durDecay: {
                        $exp: {
                            $multiply: [
                                -1,
                                { $divide: ['$attackDurationMinutes', tWeights.durDecayTol] }
                            ]
                        }
                    }
                }
            },
            {
                $addFields: {
                    durNormPenalized: { $multiply: ['$durNorm', '$durDecay'] }
                }
            },
            {
                $addFields: {
                    dangerScore: {
                        $round: [
                            {
                                $multiply: [
                                    100,
                                    {
                                        $add: [
                                            // peso sul rps
                                            { $multiply: ['$rpsNorm', dWeights.rpsNorm] },
                                            // peso sulla durata attacco
                                            { $multiply: ['$durNormPenalized', dWeights.durNormPenalized] },
                                            // peso sullo score medio dell'attacco
                                            { $multiply: ['$scoreNorm', dWeights.scoreNorm] },
                                            // peso sul numero di tecniche usate nell'attacco
                                            { $multiply: ['$uniqueTechNorm', dWeights.uniqueTechNorm] }
                                        ]
                                    }
                                ]
                            },
                            2
                        ]
                    }
                }
            },
            {
                $addFields: {
                    dangerLevel: {
                        $switch: {
                            branches: [
                                { case: { $lte: ['$dangerScore', 15] }, then: 5 },
                                { case: { $lte: ['$dangerScore', 30] }, then: 4 },
                                { case: { $lte: ['$dangerScore', 60] }, then: 3 },
                                { case: { $lte: ['$dangerScore', 85] }, then: 2 }
                            ],
                            default: 1
                        }
                    }
                }
            }
        ];
    }
}
