const { logger } = require('../../../logger');
const ConfigService = require('../ConfigService');
require('dotenv').config();

console.log = (...args) => logger.info(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));

/**
 * Il servizio è studiato per implementare metodi che agiscano sui dati presenti su mongodb e/o redis.
 Qualsiasi pipeline di aggregazione o query (ndr prompt) che ha obiettivi di analisi forense dei dati, viene gestito in questo servizio.

 Per policy questo servizio non dipende da nessun'altro servizio e, lui stesso puo essere messo in dipendenza da tutti gli altri servizi.
 Lo scopo è rendere il forensic context iniettabile in qualsiasi altro contesto applicativo e che non deve dipendere da come è progettata l'applicazione.
 
 */
class ForensicService {

    constructor() {

        this.dangerWeights = {};
        this.tolleranceWeights = {};

        // Promessa di inizializzazione che sarà completata al caricamento da DB
        this.initialized = this._initFromDB();
    }


    async _initFromDB() {
        try {

            // Carica configurazioni chiave-valore
            const [
                dangerWeightStr,
                tolleranceWeightStr
            ] = await Promise.all([
                ConfigService.getConfigValue('DANGER_WEIGHT'),
                ConfigService.getConfigValue('TOLLERANCE_WEIGHTS'),
            ]);

            // Parsing pesi
            let weights = {};
            if (dangerWeightStr) {
                try {
                    weights = JSON.parse(dangerWeightStr);
                } catch {
                    // fallback parsing key:value
                    weights = dangerWeightStr.split(',').reduce((acc, pair) => {
                        const [key, value] = pair.split(':');
                        if (key && value && !isNaN(Number(value))) acc[key] = Number(value);
                        return acc;
                    }, {});
                }
            }
            this.dangerWeights = { ...weights };

            // Parsing tolleranze
            let tollerances = {};
            if (tolleranceWeightStr) {
                try {
                    tollerances = JSON.parse(tolleranceWeightStr);
                } catch {
                    // fallback parsing key:value
                    tollerances = tolleranceWeightStr.split(',').reduce((acc, pair) => {
                        const [key, value] = pair.split(':');
                        if (key && value && !isNaN(Number(value))) acc[key] = Number(value);
                        return acc;
                    }, {});
                }
            }
            this.tolleranceWeights = { ...tollerances };

            logger.info(`[ForensicService] Configurazioni pesi e tolleranze per gli attacchi caricate da DB`);
        } catch (err) {
            logger.error(`[ForensicService] Errore caricamento configurazioni da DB: ${err.message}`);
            // fallback o rilancio errore a seconda del contesto
            // qui si potrebbe caricare default oppure propagare errore
        }
    }

    // Metodo privato per costruire la pipeline base condivisa
    async buildAttackGroupsBasePipeline(mongoFilters, minLogsForAttack, timeConfig = null) {
        // Aspetta che l'inizializzazione sia completata
        await this.initialized;

        let timeAgo = null;
        let timeToStart = null;

        if (timeConfig) {
            const now = new Date();

            // Gestione intervallo da fromDate e toDate (prioritaria se presenti)
            if (timeConfig.fromDate && timeConfig.toDate) {
                // Assumendo la struttura { dataInizio: Date }
                timeAgo = timeConfig.fromDate instanceof Date ? timeConfig.fromDate : null;
                timeToStart = timeConfig.toDate instanceof Date ? timeConfig.toDate : null;
            } else if (timeConfig.fromDate) {
                timeAgo = timeConfig.fromDate instanceof Date ? timeConfig.fromDate : null;
            } else if (timeConfig.toDate) {
                timeToStart = timeConfig.toDate instanceof Date ? timeConfig.toDate : null;
            }
            else {

                // Caso 1: Solo periodo finale (timeAgo) - dal passato ad ora
                if (timeConfig.minutes || timeConfig.hours || timeConfig.days) {
                    if (timeConfig.minutes) {
                        timeAgo = new Date(now.getTime() - (timeConfig.minutes * 60 * 1000));
                    } else if (timeConfig.hours) {
                        timeAgo = new Date(now.getTime() - (timeConfig.hours * 60 * 60 * 1000));
                    } else if (timeConfig.days) {
                        timeAgo = new Date(now.getTime() - (timeConfig.days * 24 * 60 * 60 * 1000));
                    }
                }

                // Caso 2: Finestra temporale precisa con 'from' e 'to'
                else if (timeConfig.from && timeConfig.to) {
                    // timeAgo = punto di inizio (più lontano nel passato)
                    if (timeConfig.from.minutes) {
                        timeAgo = new Date(now.getTime() - (timeConfig.from.minutes * 60 * 1000));
                    } else if (timeConfig.from.hours) {
                        timeAgo = new Date(now.getTime() - (timeConfig.from.hours * 60 * 60 * 1000));
                    } else if (timeConfig.from.days) {
                        timeAgo = new Date(now.getTime() - (timeConfig.from.days * 24 * 60 * 60 * 1000));
                    }

                    // timeToStart = punto finale (più vicino al presente)
                    if (timeConfig.to.minutes) {
                        timeToStart = new Date(now.getTime() - (timeConfig.to.minutes * 60 * 1000));
                    } else if (timeConfig.to.hours) {
                        timeToStart = new Date(now.getTime() - (timeConfig.to.hours * 60 * 60 * 1000));
                    } else if (timeConfig.to.days) {
                        timeToStart = new Date(now.getTime() - (timeConfig.to.days * 24 * 60 * 60 * 1000));
                    }
                }


                // Caso 3: Solo 'from' - da un punto nel passato ad ora
                else if (timeConfig.from) {
                    if (timeConfig.from.minutes) {
                        timeAgo = new Date(now.getTime() - (timeConfig.from.minutes * 60 * 1000));
                    } else if (timeConfig.from.hours) {
                        timeAgo = new Date(now.getTime() - (timeConfig.from.hours * 60 * 60 * 1000));
                    } else if (timeConfig.from.days) {
                        timeAgo = new Date(now.getTime() - (timeConfig.from.days * 24 * 60 * 60 * 1000));
                    }
                }

                // Caso 4: Solo 'to' - dall'inizio fino a un punto nel passato
                else if (timeConfig.to) {
                    if (timeConfig.to.minutes) {
                        timeToStart = new Date(now.getTime() - (timeConfig.to.minutes * 60 * 1000));
                    } else if (timeConfig.to.hours) {
                        timeToStart = new Date(now.getTime() - (timeConfig.to.hours * 60 * 60 * 1000));
                    } else if (timeConfig.to.days) {
                        timeToStart = new Date(now.getTime() - (timeConfig.to.days * 24 * 60 * 60 * 1000));
                    }
                }
            }
        }

        // Costruisce il filtro temporale dinamicamente
        let timeFilter = {};
        if (timeAgo && timeToStart) {
            // Finestra temporale precisa: da timeAgo a timeToStart
            timeFilter = {
                timestamp: {
                    $gte: timeAgo,
                    $lte: timeToStart
                }
            };
        } else if (timeAgo) {
            // Solo inizio: da timeAgo ad ora
            timeFilter = {
                timestamp: { $gte: timeAgo }
            };
        } else if (timeToStart) {
            // Solo fine: dall'inizio fino a timeToStart
            timeFilter = {
                timestamp: { $lte: timeToStart }
            };
        }

        //setting dei pesi di pericolosità interpolando con i valori di env e quelli di default.
        const dangerWeights = {
            rpsNorm: this.dangerWeights.RPSNORM ? this.dangerWeights.RPSNORM : (parseFloat(process.env.DANGER_WEIGHT_RPSNORM) || 0.18),
            durNormPenalized: this.dangerWeights.DURNORM ? this.dangerWeights.DURNORM : parseFloat(process.env.DANGER_WEIGHT_DURNORM) || 0.12,
            scoreNorm: this.dangerWeights.SCORENORM ? this.dangerWeights.SCORENORM : parseFloat(process.env.DANGER_WEIGHT_SCORENORM) || 0.50,
            uniqueTechNorm: this.dangerWeights.DURNORM ? this.dangerWeights.DURNORM : parseFloat(process.env.DANGER_WEIGHT_UNIQUETECHNORM) || 0.20
        };

        const tolleranceWeights = {
            unqTechTol: this.tolleranceWeights.UNQTECHTOL ? this.tolleranceWeights.UNQTECHTOL : 6,
            rpsTol: this.tolleranceWeights.RPSTOL ? this.tolleranceWeights.RPSTOL : 10,
            durTol: this.tolleranceWeights.DURTOL ? this.tolleranceWeights.DURTOL : 361,
            scoreTol: this.tolleranceWeights.SCORETOL ? this.tolleranceWeights.SCORETOL : 40,
            durDecayTol: this.tolleranceWeights.DURDECAYTOL ? this.tolleranceWeights.DURDECAYTOL : 240
        };

        return [

            // NUOVO Stage 0: Filtro temporale sui log più recenti
            ...(Object.keys(timeFilter).length > 0 ? [{ $match: timeFilter }] : []),

            // Stage 1: Applica filtri (come nel find)
            ...(Object.keys(mongoFilters).length > 0 ? [{ $match: mongoFilters }] : []),

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

            // Stage 3: Filtra gruppi significativi
            {
                $match: {
                    totaleLogs: { $gte: minLogsForAttack },
                    firstSeen: { $exists: true, $ne: null },
                    lastSeen: { $exists: true, $ne: null }
                }
            },

            // Stage 4: Ricrea la struttura come un normale ThreatLog + i 3 campi extra
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            '$representative', // Mantiene tutti i campi originali del log
                            {
                                // Aggiungi i 3 campi richiesti
                                logsRaggruppati: '$logsRaggruppati',
                                totaleLogs: '$totaleLogs',
                                firstSeen: '$firstSeen',
                                lastSeen: '$lastSeen',
                                durataAttacco: {
                                    ms: { $subtract: ['$lastSeen', '$firstSeen'] },
                                    minutes: {
                                        $round: [
                                            { $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] },
                                            2
                                        ]
                                    },
                                    human: {
                                        $switch: {
                                            branches: [
                                                {
                                                    case: { $lt: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 1] },
                                                    then: { $concat: [{ $toString: { $subtract: ['$lastSeen', '$firstSeen'] } }, 'ms'] }
                                                },
                                                {
                                                    case: { $lt: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 60] },
                                                    then: { $concat: [{ $toString: { $round: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 1] } }, ' min'] }
                                                }
                                            ],
                                            default: {
                                                $concat: [
                                                    { $toString: { $floor: { $divide: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 60] } } },
                                                    'h ',
                                                    { $toString: { $mod: [{ $floor: { $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] } }, 60] } },
                                                    'm'
                                                ]
                                            }
                                        }
                                    },
                                },
                                averageScore: {
                                    $round: [
                                        { $divide: ['$sumScore', '$totaleLogs'] }, 2
                                    ]
                                },
                                // Nuovi campi rate limit eventi:
                                countRateLimit: { $size: '$rateLimitEvents' },
                                rateLimitList: '$rateLimitEvents'
                            },
                        ]
                    }
                },

            },
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
            {
                //conta le tecniche usate nell'attacco
                $addFields: {
                    uniqueTechCount: { $size: "$attackPatterns" }
                }
            },
            {
                //normalizza il conteggio delle tecniche in un valore tra 0 e 1 avendo come massimo 8 tecniche (considerando ridondanze)
                //XXX: tolleranza numero tecniche 15
                $addFields: {
                    uniqueTechNorm: {
                        $min: [{ $divide: ["$uniqueTechCount", tolleranceWeights.unqTechTol] }, 1]
                    }
                }
            },
            {
                $addFields: {
                    // Calcolo RPS (requests per second) arrotondato a 5 decimali
                    rps: {
                        $round: [
                            {
                                $divide: [
                                    '$totaleLogs',
                                    {
                                        $max: [
                                            1,
                                            {
                                                $divide: [
                                                    { $subtract: ['$lastSeen', '$firstSeen'] },
                                                    1000
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            5
                        ]
                    }
                }
            },
            {
                $addFields: {
                    //label per esprimere uno stile di rps
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
                    }
                }
            },
            {
                $addFields: {
                    attackDurationMinutes: {
                        $divide: [
                            { $subtract: ['$lastSeen', '$firstSeen'] },
                            60000
                        ]
                    },
                    //label descrittiva per indicare l'intensita dell'attacco in base a rps e durata
                    intensityAttack: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $and: [
                                            { $lt: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 5] },  // meno di 5 minuti
                                            { $gte: ['$rps', 10] }  // rps alto
                                        ]
                                    },
                                    then: 'burst lampo'
                                },
                                {
                                    case: {
                                        $and: [
                                            { $gte: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 5] },  // più di 5 minuti
                                            { $lt: ['$rps', 1] }  // rps basso moderato
                                        ]
                                    },
                                    then: 'persistente basso'
                                },
                                {
                                    case: {
                                        $and: [
                                            { $gte: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 2] },  // più di 5 minuti
                                            { $lt: ['$rps', 5] },
                                            { $gte: ['$rps', 1] }
                                        ]
                                    },
                                    then: 'persistente medio'
                                },
                                {
                                    case: {
                                        $and: [
                                            { $gte: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 1.5] },  // da 5 a 60 minuti
                                            { $gte: ['$rps', 9] }
                                        ]
                                    },
                                    then: 'burst prolungato'  // attacco concentrato ma più lungo del burst lampo, es. flood prolungato
                                },
                                {
                                    case: { $and: [{ $lt: ['$rps', 2] }, { $lt: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 1] }] },
                                    then: 'scansione micro burst basso'  // eventi sporadici brevi ma a bassa intensità
                                },
                                {
                                    case: { $and: [{ $lt: ['$rps', 5] }, { $lt: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 1] }] },
                                    then: 'scansione micro burst moderato'  // eventi sporadici brevi ma a bassa intensità
                                },
                                {
                                    case: { $and: [{ $gte: ['$rps', 5] }, { $lt: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 1] }] },
                                    then: 'scansione micro burst intenso'  // eventi sporadici brevi ma a bassa intensità
                                },
                                {
                                    case: { $gte: ['$rps', 50] },
                                    then: 'estremo'  // attacchi critici e drammatici, flood/DDoS massivi
                                },
                                {
                                    case: {
                                        $and: [
                                            { $gte: [{ $divide: [{ $subtract: ['$lastSeen', '$firstSeen'] }, 60000] }, 60] },
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
                    //XXX: tolleranza rps su un rate massimo di 10 rps al secondo (tetto massimo fino ad ora incontrato)
                    rpsNorm: {
                        $min: [{ $divide: ['$rps', tolleranceWeights.rpsTol] }, 1]
                    },
                    //XXX: tolleranza duranta attacco con un andamento logaritmico per non sovrapporre lo score a durate eccessivamente lunghe
                    durNorm: {
                        $min: [
                            {
                                $divide: [
                                    { $ln: { $add: ['$attackDurationMinutes', 1] } },
                                    //3600 60 ore, 300 6 ore
                                    { $ln: tolleranceWeights.durTol }
                                ]
                            },
                            1
                        ]
                    },
                    //XXX: tolleranza sullo score medio ottenuto in un attacco, considerando il massimo teorico di 67 punti, valore massimo fino ad ora incontrato
                    scoreNorm: {
                        $min: [{ $divide: ['$averageScore', tolleranceWeights.scoreTol] }, 1]
                    }
                }
            },
            {
                $addFields: {
                    //XXX: tolleranza di 240 ore in cui viene calcolato un coefficiente dividendo l'attacco in minuti con la tolleranza (indicata come massimo teorico di 4 ore) applicando la funzione esponenziale negativa
                    durDecay: {
                        $exp: {
                            $multiply: [
                                -1,
                                { $divide: ['$attackDurationMinutes', tolleranceWeights.durDecayTol] }
                            ]
                        }
                    }
                }
            },
            {
                $addFields: {
                    // Ora che durNorm e durDecay esistono, moltiplichiamo
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
                                            //peso sul rps
                                            { $multiply: ['$rpsNorm', dangerWeights.rpsNorm] },
                                            //peso sulla durata attacco (penalizzata dal coefficiente di decadimento applicato su una tolleranza di 4 ore)
                                            { $multiply: ['$durNormPenalized', dangerWeights.durNormPenalized] },
                                            //peso sullo score medio dell'attacco
                                            { $multiply: ['$scoreNorm', dangerWeights.scoreNorm] },
                                            //peso sul numero di tecniche usate nell'attacco
                                            { $multiply: ['$uniqueTechNorm', dangerWeights.uniqueTechNorm] }
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
                                { case: { $lte: ['$dangerScore', 15] }, then: 'Defcon 5' },
                                { case: { $lte: ['$dangerScore', 30] }, then: 'Defcon 4' },
                                { case: { $lte: ['$dangerScore', 60] }, then: 'Defcon 3' },
                                { case: { $lte: ['$dangerScore', 85] }, then: 'Defcon 2' }
                            ],
                            default: 'Defcon 1'
                        }
                    }
                }
            }
        ];
    }
}

module.exports = new ForensicService();