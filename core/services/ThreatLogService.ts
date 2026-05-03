/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import dotenv from 'dotenv';
// Import model
import ThreatLog, { IThreatLog } from '../models/ThreatLogSchema';
import IpDetails from '../models/IpDetailsSchema';
import AttackDTO from '../models/dto/AttackDTO';
import PatternAnalysisService from './PatternAnalysisService';
import { ForensicService } from './forense/ForensicService';
import { ForensicPipelineService } from './forense/ForensicPipelineService';
import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN, EVENT_BUS_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { IpDetailsService } from './IpDetailsService';
import { EventBus, AppEvents } from './EventBus';
import { LogFilters } from '../types/threat-log.types';
import { Types } from 'mongoose';
import {
    sanitizeSortFields,
    sanitizeFilters,
    sanitizePageSize,
    sanitizePage,
    sanitizeLimit,
    SortAllowedFields,
    FilterAllowedFields
} from '../utils/queryGuard';

import { TimeConfig } from '../types/common.types';
import { GetAttackDetailParams, GetLogByIdParams, GetAttacksParams } from '../types/service-params.types';

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
        @inject(EVENT_BUS_TOKEN) private readonly eventBus: EventBus
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

        // SYNC TO RAG (Asincrono e non bloccante via Event Bus)
        if (log) {
            this.eventBus.emit(AppEvents.THREAT_LOG_CREATED, log);
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
     * Versione V2 di getAttacks che utilizza la nuova ForensicPipelineService (Builder Pattern).
     * @param param0 
     * @returns 
     */
    async getAttacks(params: GetAttacksParams = {}) {
        const {
            page = 1,
            pageSize = 20,
            filters = {},
            minLogsForAttack = 10,
            timeConfig = {},
            sortFields = null
        } = params;
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

        // Notifica il sistema RAG via Event Bus
        if (attacks.length > 0) {
            this.eventBus.emit(AppEvents.ATTACK_SEARCHED, { items: attacks, totalCount: result.totalCount || 0 });
        }


        return {
            items: attacks,
            totalCount: result.totalCount || 0
        };
    }

    async getAttackDetail(params: GetAttackDetailParams) {
        const {
            ip,
            minLogsForAttack = 1,
            timeConfig = {},
            protocol = null
        } = params;
        const mongoFilters: any = { 'request.ip': ip };
        if (protocol) {
            mongoFilters.protocol = protocol;
        }

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

        // Notifica il sistema RAG via Event Bus
        if (attack) {
            this.eventBus.emit(AppEvents.ATTACK_RESOLVED, attack);
        }

        return attack || null;
    }

    async getDistributedAttackDetail({
        ipList,
        minLogsForAttack = 1,
        timeConfig = {},
        protocol = null
    }: {
        ipList: string[];
        minLogsForAttack?: number;
        timeConfig?: any;
        protocol?: string | null;
    }) {
        // Costruisce la pipeline dedicata alla lista IP
        const pipeline = await this.forensicPipelineService.buildDistributedPipeline(ipList, minLogsForAttack, timeConfig, protocol);

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

            // Notifica il sistema RAG via Event Bus
            this.eventBus.emit(AppEvents.ATTACK_RESOLVED, resAny);

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
    async getLogById(params: GetLogByIdParams) {
        return await ThreatLog.findOne({ id: params.id })
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
}

