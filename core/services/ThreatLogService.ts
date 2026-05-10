import dotenv from 'dotenv';
// Import model
import ThreatLog, { IThreatLog } from '../models/ThreatLogSchema';
import PatternAnalysisService from './PatternAnalysisService';
import { inject, injectable } from 'tsyringe';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { IpDetailsService } from './IpDetailsService';
import { ThreatAnalyticsService } from './ThreatAnalyticsService';
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

import { GetLogByIdParams, GetThreatLogParams } from '../types/service-params.types';

dotenv.config();

@injectable()
export class ThreatLogService {
    //private patternAnalysisService: any;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.IP_DETAILS_SERVICE_TOKEN) private readonly ipDetailsService: IpDetailsService,
        @inject(Tokens.PATTERN_ANALYSIS_SERVICE_TOKEN) private readonly patternAnalysisService: PatternAnalysisService,
        @inject(Tokens.THREAT_ANALYTICS_SERVICE_TOKEN) private readonly analyticsService: ThreatAnalyticsService,
        @inject(Tokens.EVENT_BUS_TOKEN) private readonly eventBus: EventBus
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
     * Ricerca avanzata nei log con supporto a paginazione, filtri e timeConfig.
     */
    async searchLogs(params: GetThreatLogParams): Promise<{ logs: IThreatLog[], total: number, page: number, pageSize: number }> {
        const { page = 1, pageSize = 20, filters = {}, sortFields = { timestamp: -1 }, timeConfig } = params;
        const safePage = sanitizePage(page);
        const safePageSize = sanitizePageSize(pageSize);
        const safeSort = sanitizeSortFields(sortFields, SortAllowedFields.threatLog);
        const skip = (safePage - 1) * safePageSize;

        const mongoFilters = this.buildRegExpFilter(filters);

        // Integrazione timeConfig se presente
        if (timeConfig) {
            const timeFilter = this.buildTimeFilter(timeConfig);
            if (timeFilter) {
                mongoFilters.timestamp = timeFilter;
            }
        }

        // Eseguiamo in parallelo per migliorare i tempi di risposta
        const [logs, total] = await Promise.all([
            ThreatLog.find(mongoFilters)
                .sort(safeSort)
                .skip(skip)
                .limit(safePageSize)
                .populate('ipDetailsId')
                .exec(),
            ThreatLog.countDocuments(mongoFilters).exec()
        ]);

        return { logs, total, page: safePage, pageSize: safePageSize };
    }

    private buildTimeFilter(timeConfig: any): any {
        const now = new Date();
        let timeAgo: Date | null = null;
        let timeToStart: Date | null = null;

        const parseDate = (d: any) => {
            if (d instanceof Date) return d;
            if (typeof d === 'string') {
                const parsed = new Date(d);
                return isNaN(parsed.getTime()) ? null : parsed;
            }
            return null;
        };

        const fromStr = timeConfig.fromDate || timeConfig.startTime || timeConfig.start;
        const toStr = timeConfig.toDate || timeConfig.endTime || timeConfig.end;

        if (timeConfig.timeMode === 'ago' && timeConfig.agoUnit && timeConfig.agoValue) {
            const unit = timeConfig.agoUnit;
            const val = Number(timeConfig.agoValue);
            if (unit === 'minutes' || unit === 'm') timeAgo = new Date(now.getTime() - (val * 60 * 1000));
            else if (unit === 'hours' || unit === 'h') timeAgo = new Date(now.getTime() - (val * 60 * 60 * 1000));
            else if (unit === 'days' || unit === 'd') timeAgo = new Date(now.getTime() - (val * 24 * 60 * 60 * 1000));
            else if (unit === 'months' || unit === 'M') timeAgo = new Date(now.getTime() - (val * 30 * 24 * 60 * 60 * 1000));
            else if (unit === 'years' || unit === 'y') timeAgo = new Date(now.getTime() - (val * 365 * 24 * 60 * 60 * 1000));
        } else if (fromStr || toStr) {
            if (fromStr) timeAgo = parseDate(fromStr);
            if (toStr) {
                const toDateParsed = parseDate(toStr);
                if (toDateParsed) {
                    if (typeof toStr === 'string' && toStr.length <= 10) {
                        toDateParsed.setHours(23, 59, 59, 999);
                    }
                    timeToStart = toDateParsed;
                }
            }
        } else {
            const minutes = timeConfig.minutes || timeConfig.m;
            const hours = timeConfig.hours || timeConfig.h;
            const days = timeConfig.days || timeConfig.d;
            if (minutes) timeAgo = new Date(now.getTime() - (minutes * 60 * 1000));
            else if (hours) timeAgo = new Date(now.getTime() - (hours * 60 * 60 * 1000));
            else if (days) timeAgo = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        }

        const timeFilter: any = {};
        if (timeAgo && timeToStart) {
            timeFilter.$gte = timeAgo;
            timeFilter.$lte = timeToStart;
        } else if (timeAgo) {
            timeFilter.$gte = timeAgo;
        } else if (timeToStart) {
            timeFilter.$lte = timeToStart;
        }

        return Object.keys(timeFilter).length > 0 ? timeFilter : null;
    }


    buildRegExpFilter(filters: any, allowedFields: Set<string> = FilterAllowedFields.threatLog) {
        const mongoFilters: any = {};
        const andFilters: any[] = [];
        const safeFilters = sanitizeFilters(filters, allowedFields);

        // Gestione speciale dello status con fallback ad active
        if (allowedFields.has('status')) {
            const statusValue = safeFilters.status;
            if (!statusValue) {
                mongoFilters.status = 'active';
            } else {
                mongoFilters.status = statusValue;
            }
            // Rimuoviamo status dai filtri safe per non processarlo nuovamente nel loop generico
            delete safeFilters.status;
        }

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
                // Supporto multi-parola con logica AND
                const words = value.trim().split(/\s+/).filter(w => w.length > 0);
                if (words.length > 1) {
                    // Usiamo $and per compatibilità massima invece di $all con regex
                    words.forEach(w => {
                        andFilters.push({ [key]: { $regex: w, $options: 'i' } });
                    });
                } else if (words.length === 1) {
                    mongoFilters[key] = { $regex: words[0], $options: 'i' };
                }
            } else {
                mongoFilters[key] = value;
            }
        }

        if (andFilters.length > 0) {
            mongoFilters.$and = andFilters;
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

    /**
     * @deprecated Usare BackgroundJobManager con 'threat_reanalyze' per un'esecuzione asincrona.
     */
    async analyzeLogs({ batchSize = 100, updateDatabase = true }) {

        await this.patternAnalysisService.loadConfigFromDB();

        // Filtro per recuperare solo log HTTP
        // Escludendo quindi SSH o altri flussi futuri
        const httpFilter = {
            protocol: { $in: ['http', 'https'] }
        };

        // Conta totale log da processare
        const totaleLogs = await this.countLogs(httpFilter);
        let processed = 0;
        let updated = 0;
        let errors = 0;

        const results: any = {
            totaleLogs,
            processed: 0,
            updated: 0,
            errors: 0,
            startTime: new Date(),
            batches: []
        };

        this.logger.info(`Totale log HTTP da processare: ${totaleLogs}`);

        // Processa in batch per evitare memory overflow
        for (let skip = 0; skip < totaleLogs; skip += batchSize) {
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

    async getStats(timeframe = '24h', minScore = 15, limit = 10, minLogs = 1) {
        return this.analyticsService.getStats(timeframe, minScore, limit, minLogs);
    }

    async getTopThreats(limit = 10, timeframe = '24h', minScore = 15) {
        return this.analyticsService.getTopThreats(limit, timeframe, minScore);
    }
}

