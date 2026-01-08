import dotenv from 'dotenv';
// Import model
import ThreatLog from '../models/ThreatLogSchema';
import AttackDTO from '../models/dto/AttackDTO';
import PatternAnalysisService from './PatternAnalysisService';
import { ForensicService } from './forense/ForensicService';
import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { IpDetailsService } from './IpDetailsService';

dotenv.config();

@injectable()
export class ThreatLogService {
    //private patternAnalysisService: any;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly forensicService: ForensicService,
        private readonly ipDetailsService: IpDetailsService,
        private readonly patternAnalysisService: PatternAnalysisService,
    ) {
        // Parse della variabile di ambiente al costruttore
        //this.patternAnalysisService = new PatternAnalysis({ geoEnabled: true });
    }

    async saveLog(logEntry: any) {
        const ip = logEntry.request.ip;

        // Se IP è nella lista degli esclusi, non salvare
        if (this.ipDetailsService.isIPExcluded(ip)) {
            this.logger.info(`[ThreatLogger] IP ${ip} escluso dal salvataggio`);
            return null;
        }

        logEntry.ipDetailsId = await this.ipDetailsService.saveIpDetails(ip);

        // Utilizziamo findOneAndUpdate con upsert per rendere l'operazione atomica.
        // Questo previene errori E11000 se arrivano log duplicati (es. SSH backfill) nello stesso istante.
        const log = await ThreatLog.findOneAndUpdate(
            { id: logEntry.id },
            { $set: logEntry },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return log;
    }

    // Puoi aggiungere qui altri metodi di lettura/scrittura su ThreatLog

    // Lista log paginata e filtrata
    async getLogs({ page = 1, pageSize = 20, filters = {}, sortFields = { timestamp: -1 } }: any = {}) {
        const skip = (page - 1) * pageSize;

        const mongoFilters = this.buildRegExpFilter(filters);

        // Se non c'è ordinamento, default a timestamp discendente
        const sortQuery = sortFields && Object.keys(sortFields).length > 0 ? sortFields : { timestamp: -1 };

        return await ThreatLog.find(mongoFilters)
            //.sort({ timestamp: -1 })
            .sort(sortQuery)
            .skip(skip)
            .populate('ipDetailsId')
            .limit(Number(pageSize));
    }

    // Conteggio totale log filtrati (per paginazione frontend)
    async countLogs(filters = {}) {

        const mongoFilters = this.buildRegExpFilter(filters);

        return await ThreatLog.countDocuments(mongoFilters);
    }


    /**
     * Recupera linearmente degli attacchi con min log per attacco di 3
     * Ritorna in una sola aggregazione sia gli item paginati che il totale risultato dal filtro
     * @param {*} param0 
     * @returns 
     */
    async getAttacks({
        page = 1,
        pageSize = 20,
        filters = {},
        minLogsForAttack = 10,
        timeConfig = {},
        sortFields = null
    }: any = {}) {
        const skip = (page - 1) * pageSize;
        const mongoFilters = this.buildRegExpFilter(filters);

        // Costruisci sort dinamico
        const sortStage = { $sort: sortFields && Object.keys(sortFields).length ? sortFields : { timestamp: -1 } };

        // Pipeline base condivisa: match, group, match(minLogs), replaceRoot
        const basePipeline = await this.forensicService.buildAttackGroupsBasePipeline(mongoFilters, minLogsForAttack, timeConfig);

        // Unico aggregate con facet che restituisce dati e conteggio
        const pipeline = [
            ...basePipeline,
            {
                $facet: {
                    dati: [
                        // Lookup e popolazione
                        {
                            $lookup: {
                                from: 'ipdetails',
                                localField: 'ipDetailsId',
                                foreignField: '_id',
                                as: 'ipDetails'
                            }
                        },
                        {
                            $addFields: {
                                ipDetails: { $arrayElemAt: ['$ipDetails', 0] }
                            }
                        },
                        // Ordinamento e paginazione
                        //{ $sort: { timestamp: -1 } },
                        sortStage,
                        { $skip: skip },
                        { $limit: pageSize }
                    ],
                    totale: [
                        // Conta quanti documenti escono dallo replaceRoot
                        { $count: 'totalCount' }
                    ]
                }
            },
            // Estrai il conteggio dal facet
            {
                $addFields: {
                    totalCount: { $arrayElemAt: ['$totale.totalCount', 0] }
                }
            },
            // Proietta solo i campi che servono
            {
                $project: {
                    dati: 1,
                    totalCount: 1
                }
            }
        ];


        const [result] = await ThreatLog.aggregate(pipeline);

        const attacks: AttackDTO[] = result.dati;


        return {
            items: attacks,
            totalCount: result.totalCount || 0
        };
    }

    buildRegExpFilter(filters: any) {
        const mongoFilters: any = {};

        for (const [key, value] of Object.entries(filters)) {
            if (typeof value === 'string' && value.trim() !== '') {
                // Operatore regex case-insensitive 'like'-style
                mongoFilters[key] = { $regex: value, $options: 'i' };
            } else {
                // Se il filtro non è stringa (ad esempio boolean), filtro esatto
                mongoFilters[key] = value;
            }
        }
        return mongoFilters;
    }


    // Dettaglio singolo log per id
    async getLogById(id: string) {
        return await ThreatLog.findOne({ id: id })
            .populate('ipDetailsId');
    }

    // Recupera tutti gli IP unici dai log
    async getDistinctIPs() {
        return await ThreatLog.distinct('request.ip');
    }

    // Aggiorna tutti i log per quell'IP, impostando il riferimento al record IpDetails
    async assignIpDetailsToLogs(ip: string, ipDetailsId: any) {
        return await ThreatLog.updateMany(
            { 'request.ip': ip },
            { $set: { ipDetailsId } }
        );
    }

    async dryRunAnalyzeLogs(limit: string) {

        // Recupera un campione di log
        const logs = await this.getLogs({
            page: 1,
            pageSize: parseInt(limit),
            filters: {}
        });

        const previews = logs.map((logEntry: any) => {
            // Adatta i dati per il metodo analyzeRequest
            const fullUrl = logEntry.request.url || '';
            const userAgent = logEntry.request.userAgent || '';
            const bodyStr = JSON.stringify(logEntry.request.body || {});
            const referer = logEntry.request.referer || '';
            const method = logEntry.request.method || '';
            const queryStr = JSON.stringify(logEntry.request.query || {});

            const otherToAnalyze = {
                headers: logEntry.request.headers
            };

            // Esegui nuova analisi
            const newAnalysis = this.patternAnalysisService.analyze(
                fullUrl, userAgent, bodyStr, referer, method, queryStr, otherToAnalyze
            );

            const oldAnalysis = logEntry.fingerprint;

            return {
                logId: logEntry._id,
                ip: logEntry.request.ip,
                url: logEntry.request.url,
                userAgent: logEntry.request.userAgent,
                comparison: {
                    old: {
                        suspicious: oldAnalysis.suspicious,
                        score: oldAnalysis.score,
                        indicators: oldAnalysis.indicators
                    },
                    new: {
                        suspicious: newAnalysis.suspicious,
                        score: newAnalysis.score,
                        indicators: newAnalysis.indicators
                    },
                    hasChanges:
                        oldAnalysis.suspicious !== newAnalysis.suspicious ||
                        oldAnalysis.score !== newAnalysis.score ||
                        JSON.stringify(oldAnalysis.indicators) !== JSON.stringify(newAnalysis.indicators)
                }
            };
        });

        const summary = {
            totalSampled: previews.length,
            withChanges: previews.filter((p: any) => p.comparison.hasChanges).length,
            withoutChanges: previews.filter((p: any) => !p.comparison.hasChanges).length
        };

        return {
            message: 'Preview rianalisi completata',
            summary,
            previews
        };
    }

    async analyzeLogs({ batchSize = 100, updateDatabase = true }) {

        await this.patternAnalysisService.loadConfigFromDB();

        // Conta totale log da processare
        const totalLogs = await this.countLogs({});
        let processed = 0;
        let updated = 0;
        let errors = 0;

        const results: any = {
            totalLogs,
            processed: 0,
            updated: 0,
            errors: 0,
            startTime: new Date(),
            batches: []
        };

        this.logger.info(`Totale log da processare: ${totalLogs}`);

        // Processa in batch per evitare memory overflow
        for (let skip = 0; skip < totalLogs; skip += batchSize) {
            const batchStart = Date.now();
            const batchNumber = Math.floor(skip / batchSize) + 1;

            try {
                this.logger.info(`Processando batch ${batchNumber}...`);

                // Recupera batch di log dal database
                const logs = await this.getLogs({
                    page: batchNumber,
                    pageSize: batchSize,
                    filters: {}
                });

                const batchResults = await Promise.allSettled(
                    logs.map(async (logEntry: any) => {
                        try {
                            // Adatta i dati del logEntry per il nuovo metodo analyzeRequest
                            const fullUrl = logEntry.request.url || '';
                            const userAgent = logEntry.request.userAgent || '';
                            const bodyStr = JSON.stringify(logEntry.request.body || {});
                            const referer = logEntry.request.referer || '';
                            const method = logEntry.request.method || '';
                            const queryStr = JSON.stringify(logEntry.request.query || {});

                            const otherToAnalyze = {
                                headers: logEntry.request.headers
                            };

                            // Chiama il nuovo metodo analyzeRequest
                            const newAnalysis = this.patternAnalysisService.analyze(
                                fullUrl,
                                userAgent,
                                bodyStr,
                                referer,
                                method,
                                queryStr,
                                otherToAnalyze
                            );

                            // Confronta con l'analisi esistente per vedere se ci sono cambiamenti
                            const oldAnalysis = logEntry.fingerprint;
                            const hasChanges =
                                oldAnalysis.suspicious !== newAnalysis.suspicious ||
                                oldAnalysis.score !== newAnalysis.score ||
                                JSON.stringify(oldAnalysis.indicators) !== JSON.stringify(newAnalysis.indicators);

                            let updateResult: any = { status: 'unchanged', id: logEntry._id };

                            // Se ci sono cambiamenti e updateDatabase è true, aggiorna il database
                            if (hasChanges && updateDatabase) {
                                await ThreatLog.findByIdAndUpdate(logEntry._id, {
                                    'fingerprint.suspicious': newAnalysis.suspicious,
                                    'fingerprint.score': newAnalysis.score,
                                    'fingerprint.indicators': newAnalysis.indicators,
                                    'metadata.reanalyzedAt': new Date(),
                                    'metadata.isBot': newAnalysis.isBot
                                });

                                updateResult = {
                                    status: 'updated',
                                    id: logEntry._id,
                                    changes: {
                                        oldScore: oldAnalysis.score,
                                        newScore: newAnalysis.score,
                                        oldSuspicious: oldAnalysis.suspicious,
                                        newSuspicious: newAnalysis.suspicious,
                                        oldIndicators: oldAnalysis.indicators,
                                        newIndicators: newAnalysis.indicators
                                    }
                                };
                            } else if (hasChanges && !updateDatabase) {
                                updateResult = {
                                    status: 'would-update',
                                    id: logEntry._id,
                                    changes: {
                                        oldScore: oldAnalysis.score,
                                        newScore: newAnalysis.score,
                                        oldSuspicious: oldAnalysis.suspicious,
                                        newSuspicious: newAnalysis.suspicious
                                    }
                                };
                            }

                            return updateResult;

                        } catch (error: any) {
                            this.logger.error(`Errore rianalisi log ${logEntry._id}:`, error);
                            return {
                                status: 'error',
                                id: logEntry._id,
                                error: error.message
                            };
                        }
                    })
                );

                // Conta risultati del batch
                const batchStats = {
                    batchNumber,
                    processed: batchResults.length,
                    updated: batchResults.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value?.status === 'updated').length,
                    wouldUpdate: batchResults.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value?.status === 'would-update').length,
                    unchanged: batchResults.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value?.status === 'unchanged').length,
                    errors: batchResults.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value?.status === 'error').length,
                    duration: Date.now() - batchStart,
                    examples: batchResults
                        .filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value?.status === 'updated')
                        .slice(0, 3)
                        .map(r => (r as PromiseFulfilledResult<any>).value)
                };

                processed += batchStats.processed;
                updated += batchStats.updated;
                errors += batchStats.errors;

                results.batches.push(batchStats);

                this.logger.info(`Batch ${batchNumber} completato: processati ${batchStats.processed}, aggiornati ${batchStats.updated}, errori ${batchStats.errors}`);

            } catch (batchError: any) {
                this.logger.error(`Errore batch ${batchNumber}:`, batchError);
                errors += batchSize;

                results.batches.push({
                    batchNumber,
                    processed: 0,
                    updated: 0,
                    errors: batchSize,
                    duration: Date.now() - batchStart,
                    error: batchError.message
                });
            }
        }

        results.processed = processed;
        results.updated = updated;
        results.errors = errors;
        results.endTime = new Date();
        results.duration = results.endTime.getTime() - results.startTime.getTime();

        this.logger.info(`Rianalisi completata: ${processed} processati, ${updated} aggiornati, ${errors} errori`);

        return { message: 'Rianalisi di tutti i log completata', results };
    }

    async getStats(timeframe = '24h') {
        const hours = timeframe === '24h' ? 24 : 168; // 1 week
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const stats = await ThreatLog.aggregate([
            { $match: { timestamp: { $gte: since } } },
            {
                $group: {
                    _id: null,
                    totalRequests: { $sum: 1 },
                    suspiciousRequests: {
                        $sum: { $cond: ['$fingerprint.suspicious', 1, 0] }
                    },
                    uniqueIPs: { $addToSet: '$request.ip' },
                    topCountries: { $push: '$geo.country' },
                    topUserAgents: { $push: '$request.userAgent' }
                }
            }
        ]);

        return stats[0] || {
            totalRequests: 0,
            suspiciousRequests: 0,
            uniqueIPs: [],
            topCountries: [],
            topUserAgents: []
        };
    }

    async getTopThreats(limit = 10) {
        return await ThreatLog.find({ 'fingerprint.suspicious': true })
            .sort({ 'fingerprint.score': -1 })
            .limit(limit)
            .select('request.ip request.url fingerprint.score fingerprint.indicators timestamp');
    }
}