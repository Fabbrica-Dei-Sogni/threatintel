import dotenv from 'dotenv';
// Import model
import ThreatLog, { IThreatLog } from '../models/ThreatLogSchema';
import IpDetails from '../models/IpDetailsSchema';
import AttackDTO from '../models/dto/AttackDTO';
import PatternAnalysisService from './PatternAnalysisService';
import { ForensicService } from './forense/ForensicService';
import { ForensicPipelineService } from './forense/ForensicPipelineService';
import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN, RAG_SYNC_SERVICE_TOKEN, OLLAMA_SERVICE_TOKEN, RAG_TRANSLATION_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { IpDetailsService } from './IpDetailsService';
import { ConfigService } from './ConfigService';
import { RagSyncService } from './assistant/RagSyncService';
import { OllamaService } from './assistant/OllamaService';
import { RagTranslationService } from './assistant/RagTranslationService';
import { RAG_POLICIES } from './assistant/RagPolicies';
import { RagSourceRef } from '../types/assistant/rag.types';
import { LogFilters } from '../types/threat-log.types';
import { ThreatIndicator } from '../types/indicators';
import { Types } from 'mongoose';
import {
    sanitizeSortFields,
    sanitizeFilters,
    sanitizePageSize,
    sanitizePage,
    sanitizeLimit,
    SortAllowedFields,
    FilterAllowedFields,
    escapeRegex
} from '../utils/queryGuard';

dotenv.config();

@injectable()
export class ThreatLogService {
    //private patternAnalysisService: any;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly forensicService: ForensicService,
        private readonly forensicPipelineService: ForensicPipelineService,
        private readonly ipDetailsService: IpDetailsService,
        private readonly patternAnalysisService: PatternAnalysisService,
        private readonly configService: ConfigService,
        @inject(RAG_SYNC_SERVICE_TOKEN) private readonly ragSync: RagSyncService,
        @inject(OLLAMA_SERVICE_TOKEN) private readonly ollama: OllamaService,
        @inject(RAG_TRANSLATION_TOKEN) private readonly translator: RagTranslationService
    ) {
        // Parse della variabile di ambiente al costruttore
        //this.patternAnalysisService = new PatternAnalysis({ geoEnabled: true });
    }

    async saveLog(logEntry: Partial<IThreatLog>) {
        const ip = logEntry.request?.ip;
        if (!ip) return null;

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

        // SYNC TO RAG (Asincrono e non bloccante)
        if (log) {
            this.ragSync.syncThreatLog(log).catch(err =>
                this.logger.warn(`[ThreatLogService] RAG sync skipped or failed (non-blocking): ${err}`)
            );
        }

        return log;
    }

    // Puoi aggiungere qui altri metodi di lettura/scrittura su ThreatLog

    // Lista log paginata e filtrata
    async getLogs({ page = 1, pageSize = 20, filters = {}, sortFields = { timestamp: -1 } }: { page?: number, pageSize?: number, filters?: LogFilters | any, sortFields?: any } = {}) {
        const safePage = sanitizePage(page);
        const safePageSize = sanitizePageSize(pageSize);
        const safeSort = sanitizeSortFields(sortFields, SortAllowedFields.threatLog);
        const skip = (safePage - 1) * safePageSize;

        const mongoFilters = this.buildRegExpFilter(filters);

        const results = await ThreatLog.find(mongoFilters)
            .sort(safeSort)
            .skip(skip)
            .populate('ipDetailsId')
            .limit(safePageSize);

        return results;
    }

    // Conteggio totale log filtrati (per paginazione frontend)
    async countLogs(filters = {}) {

        const mongoFilters = this.buildRegExpFilter(filters);

        return await ThreatLog.countDocuments(mongoFilters);
    }


    /**
     * @deprecated
     * Recupera linearmente degli attacchi con min log per attacco di 3
     * Ritorna in una sola aggregazione sia gli item paginati che il totale risultato dal filtro
     * @param {*} param0 
     * @returns 
     */
    async getAttacksLegacy({
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
        const safeSort = sanitizeSortFields(sortFields, SortAllowedFields.threatLog);
        const sortStage = { $sort: safeSort };

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


        const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);

        const attacks: AttackDTO[] = result.dati;


        return {
            items: attacks,
            totalCount: result.totalCount || 0
        };
    }

    /**
     * Versione V2 di getAttacks che utilizza la nuova ForensicPipelineService (Builder Pattern).
     * @param param0 
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

        // Estrai dangerLevel dai filtri prima di buildRegExpFilter per gestirlo manualmente post-aggregazione
        const { dangerLevel, ...restFilters } = filters;
        const mongoFilters = this.buildRegExpFilter(restFilters, FilterAllowedFields.attack);

        // Costruisci sort dinamico
        const safeSort = sanitizeSortFields(sortFields, SortAllowedFields.attack, { lastSeen: -1 });
        const sortStage = { $sort: safeSort };

        // Pipeline base costruita col nuovo Builder
        const basePipeline = await this.forensicPipelineService.buildStandardPipeline(mongoFilters, minLogsForAttack, timeConfig);

        // Aggiungi filtro dangerLevel se presente (va fatto dopo ScoringStage che lo calcola)
        if (dangerLevel) {
            const levels = typeof dangerLevel === 'string'
                ? dangerLevel.split(',').map(l => parseInt(l.trim())).filter(l => !isNaN(l))
                : [parseInt(dangerLevel)];

            if (levels.length > 0) {
                basePipeline.push({ $match: { dangerLevel: { $in: levels } } });
            }
        }

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

        const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);

        const attacks: AttackDTO[] = result.dati;


        return {
            items: attacks,
            totalCount: result.totalCount || 0
        };
    }

    async getAttackDetail({
        ip,
        minLogsForAttack = 1,
        timeConfig = {}
    }: {
        ip: string;
        minLogsForAttack?: number;
        timeConfig?: any;
    }) {
        const mongoFilters = { 'request.ip': ip };

        // Pipeline base costruita col nuovo Builder
        const basePipeline = await this.forensicPipelineService.buildStandardPipeline(mongoFilters, minLogsForAttack, timeConfig);

        const pipeline = [
            ...basePipeline,
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
            }
        ];

        const [attack] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);

        return attack || null;
    }

    async getDistributedAttackDetail({
        ipList,
        minLogsForAttack = 1,
        timeConfig = {}
    }: {
        ipList: string[];
        minLogsForAttack?: number;
        timeConfig?: any;
    }) {
        // Costruisce la pipeline dedicata alla lista IP
        const pipeline = await this.forensicPipelineService.buildDistributedPipeline(ipList, minLogsForAttack, timeConfig);

        // Esegue l'aggregazione
        const [attack] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);

        // Aggiunge metadati extra se necessario (lookup ipDetails per il "rappresentante")
        if (attack) {
            const result = await ThreatLog.populate(attack, { path: 'ipDetailsId', model: 'IpDetails' });
            // Sincronizza il campo ipDetails per retrocompatibilità con il frontend (che si aspetta ipDetails anziché ipDetailsId)
            const resAny = result as any;
            // Sincronizza il campo ipDetails per retrocompatibilità con il frontend (che si asaptte ipDetails anziché ipDetailsId)
            if (resAny.ipDetailsId) {
                resAny.ipDetails = resAny.ipDetailsId;
            }

            // Recupera ipDetails per TUTTI gli IP coinvolti per visualizzazione su mappa
            if (resAny.ips && resAny.ips.length > 0) {
                const allDetails = await IpDetails.find({ ip: { $in: resAny.ips } })
                    .populate('abuseipdbId')
                    .lean();
                resAny.allIpDetails = allDetails;
            }

            return result;
        }

        return null;
    }

    buildRegExpFilter(filters: any, allowedFields: Set<string> = FilterAllowedFields.threatLog) {
        const mongoFilters: any = {};
        const safeFilters = sanitizeFilters(filters, allowedFields);

        for (const [key, value] of Object.entries(safeFilters)) {
            if (key === 'protocol') {
                if (value === 'http') {
                    mongoFilters.$or = [
                        { protocol: 'http' },
                        { protocol: { $exists: false } },
                        { protocol: null }
                    ];
                } else {
                    mongoFilters[key] = value;
                }
            } else if (typeof value === 'string') {
                mongoFilters[key] = { $regex: value, $options: 'i' };
            } else {
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
    async assignIpDetailsToLogs(ip: string, ipDetailsId: Types.ObjectId) {
        return await ThreatLog.updateMany(
            { 'request.ip': ip },
            { $set: { ipDetailsId } }
        );
    }

    async dryRunAnalyzeLogs(limit: string) {

        // Recupera un campione di log
        const safeLimit = sanitizeLimit(parseInt(limit, 10), 500, 100);

        const logs = await this.getLogs({
            page: 1,
            pageSize: safeLimit,
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
            const newHash = this.patternAnalysisService.generateFingerprint(logEntry.request);

            return {
                logId: logEntry._id,
                ip: logEntry.request.ip,
                url: logEntry.request.url,
                userAgent: logEntry.request.userAgent,
                comparison: {
                    old: {
                        hash: oldAnalysis.hash,
                        suspicious: oldAnalysis.suspicious,
                        score: oldAnalysis.score,
                        indicators: oldAnalysis.indicators
                    },
                    new: {
                        hash: newHash,
                        suspicious: newAnalysis.suspicious,
                        score: newAnalysis.score,
                        indicators: newAnalysis.indicators
                    },
                    hasChanges:
                        oldAnalysis.hash !== newHash ||
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

        // Filtro per recuperare solo log HTTP
        // Escludendo quindi SSH o altri flussi futuri
        const httpFilter = {
            protocol: { $in: ['http', 'https'] }
        };

        // Conta totale log da processare
        const totalLogs = await this.countLogs(httpFilter);
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

        this.logger.info(`Totale log HTTP da processare: ${totalLogs}`);

        // Processa in batch per evitare memory overflow
        for (let skip = 0; skip < totalLogs; skip += batchSize) {
            const batchStart = Date.now();
            const batchNumber = Math.floor(skip / batchSize) + 1;

            try {
                this.logger.info(`Processando batch ${batchNumber}...`);

                // Recupera batch di log dal database direttamente per bypassare i limiti di UI (sanitizePageSize)
                const logs = await ThreatLog.find(httpFilter)
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(batchSize)
                    .lean();

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
                            const newHash = this.patternAnalysisService.generateFingerprint(logEntry.request);

                            const hasChanges =
                                oldAnalysis.hash !== newHash ||
                                oldAnalysis.suspicious !== newAnalysis.suspicious ||
                                oldAnalysis.score !== newAnalysis.score ||
                                JSON.stringify(oldAnalysis.indicators) !== JSON.stringify(newAnalysis.indicators);

                            let updateResult: any = { status: 'unchanged', id: logEntry._id };

                            // Se ci sono cambiamenti e updateDatabase è true, aggiorna il database
                            if (hasChanges && updateDatabase) {
                                await ThreatLog.findByIdAndUpdate(logEntry._id, {
                                    'fingerprint.hash': newHash,
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
                                        oldHash: oldAnalysis.hash,
                                        newHash: newHash,
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

    private getTimeframeHours(timeframe: string): number {
        switch (timeframe) {
            case '1w': return 168;
            case '1m': return 720;
            case '1y': return 8760;
            case '24h':
            default: return 24;
        }
    }

    async getStats(timeframe = '24h', minScore = 15, limit = 10, minLogs = 1) {
        let timeframeMatch: any = {};

        if (timeframe !== 'all') {
            const hours = this.getTimeframeHours(timeframe);
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            timeframeMatch.timestamp = { $gte: since };
            this.logger.info(`[ThreatLogService] Calculating stats for timeframe: ${timeframe} (since: ${since.toISOString()}) with minScore: ${minScore}, minLogs: ${minLogs}, limit: ${limit}`);
        } else {
            this.logger.info(`[ThreatLogService] Calculating stats for ALL TIME with minScore: ${minScore}, minLogs: ${minLogs}, limit: ${limit}`);
        }

        const effectiveLimit = limit > 0 ? limit : 1000;

        // Pipeline definitiva: separa il traffico globale dall'analisi delle minacce filtrata
        const results = await ThreatLog.aggregate([
            { $match: timeframeMatch },
            {
                $facet: {
                    // 1. Traffico Totale e Distribuzione Score (UNFILTERED)
                    global: [
                        {
                            $group: {
                                _id: null,
                                totalTraffic: { $sum: 1 },
                                min: { $min: "$fingerprint.score" },
                                max: { $max: "$fingerprint.score" },
                                avg: { $avg: "$fingerprint.score" }
                            }
                        }
                    ],
                    // 2. Conteggio Minacce Attenzionate (FILTERED BY minLogs)
                    threatsCount: [
                        {
                            $group: {
                                _id: "$request.ip",
                                count: { $sum: 1 },
                                isSuspicious: {
                                    $max: {
                                        $cond: [
                                            { $and: [{ $eq: ['$fingerprint.suspicious', true] }, { $gte: ['$fingerprint.score', minScore] }] },
                                            1, 0
                                        ]
                                    }
                                }
                            }
                        },
                        { $match: { count: { $gte: minLogs }, isSuspicious: 1 } },
                        { $count: "count" }
                    ],
                    // 3. Top Paesi (FILTERED BY minLogs)
                    topCountries: [
                        {
                            $group: {
                                _id: "$request.ip",
                                count: { $sum: 1 },
                                country: { $first: "$geo.country" },
                                isSuspicious: {
                                    $max: {
                                        $cond: [
                                            { $and: [{ $eq: ['$fingerprint.suspicious', true] }, { $gte: ['$fingerprint.score', minScore] }] },
                                            1, 0
                                        ]
                                    }
                                }
                            }
                        },
                        { $match: { count: { $gte: minLogs }, isSuspicious: 1, country: { $exists: true, $ne: null } } },
                        { $group: { _id: "$country", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: effectiveLimit }
                    ],
                    // 4. Top Indicators (FILTERED BY minLogs)
                    topIndicators: [
                        {
                            $group: {
                                _id: "$request.ip",
                                count: { $sum: 1 },
                                indicators: { $addToSet: "$fingerprint.indicators" },
                                isSuspicious: {
                                    $max: {
                                        $cond: [
                                            { $and: [{ $eq: ['$fingerprint.suspicious', true] }, { $gte: ['$fingerprint.score', minScore] }] },
                                            1, 0
                                        ]
                                    }
                                }
                            }
                        },
                        { $match: { count: { $gte: minLogs }, isSuspicious: 1 } },
                        { $unwind: "$indicators" },
                        { $unwind: "$indicators" },
                        { $group: { _id: { ip: "$_id", ind: "$indicators" } } },
                        { $group: { _id: "$_id.ind", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: effectiveLimit }
                    ],
                    // 5. Nodi Unici (FILTERED BY minLogs)
                    uniqueIPs: [
                        { $group: { _id: "$request.ip", count: { $sum: 1 } } },
                        { $match: { count: { $gte: minLogs } } },
                        { $group: { _id: null, ips: { $push: "$_id" } } }
                    ]
                }
            }
        ]);

        const facet = results[0];
        const global = facet.global[0] || { totalTraffic: 0, min: 0, max: 100, avg: 15 };
        const threats = facet.threatsCount[0] || { count: 0 };

        const countriesMap: Record<string, number> = {};
        (facet.topCountries || []).forEach((c: any) => { countriesMap[c._id] = c.count; });

        const indicatorsMap: Record<string, number> = {};
        (facet.topIndicators || []).forEach((i: any) => { indicatorsMap[i._id] = i.count; });

        return {
            totalRequests: global.totalTraffic,
            suspiciousRequests: threats.count,
            topCountries: countriesMap,
            topIndicators: indicatorsMap,
            uniqueIPs: facet.uniqueIPs[0]?.ips || [],
            scoreDistribution: { min: global.min, max: global.max, avg: global.avg }
        };
    }


    async getTopThreats(limit = 10, timeframe = '24h', minScore = 15) {
        let query: any = { 'fingerprint.suspicious': true };

        if (timeframe !== 'all') {
            const hours = this.getTimeframeHours(timeframe);
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            query.timestamp = { $gte: since };
        }

        if (minScore > 0) {
            query['fingerprint.score'] = { $gte: minScore };
        }

        return await ThreatLog.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .select('request.ip request.url fingerprint.score fingerprint.indicators geo.country timestamp');
    }

    /**
     * Materializza i riassunti AI degli attacchi (Anomalie) nel database vettoriale.
     * Implementa un loop di recupero totale (Fetch-All) per garantire la coerenza.
     */
    async materializeAttackSummaries(options: { forceAi?: boolean } = {}) {
        // Controllo Fallback
        if (!this.ragSync.getStatus().operational) {
            this.logger.debug('[ThreatLogService] RAG materialization skipped: System is not operational.');
            return;
        }

        // Verifica se la generazione AI è abilitata
        const aiEnabledConfig = await this.configService.getConfigValue('RAG_AI_SUMMARY_ENABLED');
        const isAiEnabled = options.forceAi || aiEnabledConfig === 'true' || process.env.RAG_AI_SUMMARY_ENABLED === 'true';

        this.logger.info('[ThreatLogService] Starting attack materialization for RAG (Fetch-All)...');

        let currentPage = 1;
        const policy = RAG_POLICIES.ATTACKS;
        let totalProcessed = 0;
        let hasMore = true;

        try {
            while (hasMore) {
                this.logger.debug(`[ThreatLogService] Fetching page ${currentPage} for RAG materialization...`);
                
                const result = await this.getAttacks({ 
                    page: currentPage, 
                    pageSize: policy.pageSize, 
                    minLogsForAttack: policy.minLogs, 
                    timeConfig: policy.timeConfig
                });

                const attacks = result.items || [];
                if (attacks.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const attack of attacks) {
                    const ip = attack.request?.ip || 'N/A';
                    try {
                        this.logger.debug(`[ThreatLogService] Materializing summary for attack by IP: ${ip}`);

                        // 1. Narrazione Tecnica (Deterministica)
                        const technicalNarrative = this.translator.translateAttack(attack);
                        let finalContent = technicalNarrative;

                        // 2. Generazione AI (Opzionale)
                        if (isAiEnabled) {
                            try {
                                const prompt = this.translator.buildAttackSummaryPrompt(attack);
                                const aiSummary = await this.ollama.generate(prompt);
                                finalContent = `RIASSUNTO ANALISTA AI: ${aiSummary}\n\nDETTAGLI TECNICI CORRELATI:\n${technicalNarrative}`;
                            } catch (aiErr) {
                                this.logger.warn(`[ThreatLogService] AI Generation failed for IP ${ip}, falling back to technical data: ${aiErr.message}`);
                            }
                        }

                        // 3. Embedding
                        const vector = await this.ollama.getEmbedding(finalContent);

                        // 4. Source Reference per la tracciabilità agentica
                        const sourceRef: RagSourceRef = {
                            endpoint: policy.apiRef.endpoint,
                            method: policy.apiRef.method,
                            params: { 
                                type: 'attack',
                                ip: ip,
                                minLogsForAttack: policy.minLogs,
                                timeConfig: policy.timeConfig
                            }
                        };

                        await this.ragSync.syncAttackSummary(attack, finalContent, vector, sourceRef);
                        totalProcessed++;
                    } catch (err) {
                        this.logger.warn(`[ThreatLogService] Non-blocking materialization error for IP ${ip}: ${err.message}`);
                    }
                }

                // Controllo uscita dal loop
                if (attacks.length < policy.pageSize || totalProcessed >= result.totalCount) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            }

            this.logger.info(`[ThreatLogService] Materialization completed. Total attacks synced: ${totalProcessed}`);
        } catch (error) {
            this.logger.error(`[ThreatLogService] Attack materialization failed: ${error}`);
        }
    }
}

