import { inject, singleton } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { IpDetailsService } from './IpDetailsService';
import CowrieSession from '../models/CowrieSessionSchema';
import CowrieEvent from '../models/CowrieEventSchema';
import CowrieAuth from '../models/CowrieAuthSchema';
import CowrieInput from '../models/CowrieInputSchema';
import CowrieTtyLog from '../models/CowrieTtyLogSchema';

import { ILongRunningService, ServiceStatus } from '../types/lifecycle';

@singleton()
export class CowrieService implements ILongRunningService {
    public readonly serviceName = 'CowrieService';
    private status: ServiceStatus = ServiceStatus.IDLE;
    private enrichmentInterval: NodeJS.Timeout | null = null;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly ipDetailsService: IpDetailsService
    ) {}

    public getStatus(): ServiceStatus {
        return this.status;
    }

    /**
     * Avvia il cron job per arricchire le sessioni sprovviste di Geo-Location
     */
    async start() {
        this.status = ServiceStatus.STARTING;
        if (this.enrichmentInterval) {
            this.status = ServiceStatus.RUNNING;
            return;
        }
        this.logger.info('[CowrieService] Avvio job di arricchimento IP in background (ogni 2 minuti).');
        
        // Esegue periodicamente per catturare record inseriti bypassando Node.js
        this.enrichmentInterval = setInterval(() => this.enrichSessions(), 2 * 60 * 1000);
        
        // Esecuzione immediata all'avvio
        await this.enrichSessions();
        this.status = ServiceStatus.RUNNING;
    }

    stop() {
        if (this.enrichmentInterval) {
            clearInterval(this.enrichmentInterval);
            this.enrichmentInterval = null;
        }
        this.status = ServiceStatus.IDLE;
    }

    private async enrichSessions() {
        try {
            // Cerca fino a 50 sessioni che non hanno ancora l'ip_details
            // e che hanno un src_ip valido
            const sessionsToEnrich = await CowrieSession.find({
                src_ip: { $exists: true, $ne: null },
                ipDetailsId: null
            }).limit(50); // Batch limit per evitare rate-limit su IPinfo

            if (sessionsToEnrich.length > 0) {
                this.logger.info(`[CowrieService] Trovate ${sessionsToEnrich.length} sessioni Telnet da arricchire.`);
            }

            for (const session of sessionsToEnrich) {
                try {
                    // Ignoriamo IP privati o esclusi
                    if (this.ipDetailsService.isIPExcluded(session.src_ip!)) {
                        continue;
                    }

                    const ipDetailsId = await this.ipDetailsService.saveIpDetails(session.src_ip!);
                    if (ipDetailsId) {
                        session.ipDetailsId = ipDetailsId;
                        await session.save();
                    }
                } catch (err: any) {
                    this.logger.error(`[CowrieService] Errore arricchimento sessione ${session.session} (IP: ${session.src_ip}): ${err.message}`);
                }
            }
        } catch (err: any) {
            this.logger.error(`[CowrieService] Errore nel job di arricchimento Cowrie: ${err.message}`);
        }
    }

    /**
     * API: Recupera le sessioni paginate assieme ai dati IP arricchiti. 
     * Implementa un'unica pipeline per dati e conteggio tramite $facet.
     */
    async getSessions(
        page: number = 1,
        pageSize: number = 20,
        sortFields: Record<string, any> = { timestamp: -1 },
        filters: any = {}
    ) {
        const skip = (page - 1) * pageSize;
        const mongoFilters = this.buildRegExpFilter(filters);
        
        // Se l'ordinamento è su timestamp, ci assicuriamo che sia cronologico e non alfabetico.
        const effectiveSort: Record<string, any> = {};
        for (const [key, value] of Object.entries(sortFields)) {
            // Se il campo è timestamp, usiamo il campo convertito che aggiungeremo nella pipeline
            if (key === 'timestamp') {
                effectiveSort['sortTimestamp'] = value;
            } else {
                effectiveSort[key] = value;
            }
        }

        // Se non ci sono campi di ordinamento, default a decrescente per timestamp
        if (Object.keys(effectiveSort).length === 0) {
            effectiveSort['sortTimestamp'] = -1;
        }

        const pipeline: any[] = [
            { $match: mongoFilters },
            // Aggiungiamo un campo temporale convertito per l'ordinamento affidabile
            {
                $addFields: {
                    sortTimestamp: { $toDate: "$timestamp" }
                }
            },
            // Lookup per i conteggi degli eventi nelle collezioni correlate
            {
                $lookup: {
                    from: 'event',
                    let: { sessId: '$session' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$session', '$$sessId'] } } },
                        { $count: 'cnt' }
                    ],
                    as: 'cnt_event'
                }
            },
            {
                $lookup: {
                    from: 'auth',
                    let: { sessId: '$session' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$session', '$$sessId'] } } },
                        { $count: 'cnt' }
                    ],
                    as: 'cnt_auth'
                }
            },
            {
                $lookup: {
                    from: 'input',
                    let: { sessId: '$session' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$session', '$$sessId'] } } },
                        { $count: 'cnt' }
                    ],
                    as: 'cnt_input'
                }
            },
            {
                $lookup: {
                    from: 'ttylog',
                    let: { sessId: '$session' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$session', '$$sessId'] } } },
                        { $count: 'cnt' }
                    ],
                    as: 'cnt_ttylog'
                }
            },
            {
                $addFields: {
                    eventCount: {
                        $add: [
                            { $ifNull: [{ $arrayElemAt: ['$cnt_event.cnt', 0] }, 0] },
                            { $ifNull: [{ $arrayElemAt: ['$cnt_auth.cnt', 0] }, 0] },
                            { $ifNull: [{ $arrayElemAt: ['$cnt_input.cnt', 0] }, 0] },
                            { $ifNull: [{ $arrayElemAt: ['$cnt_ttylog.cnt', 0] }, 0] }
                        ]
                    }
                }
            },
            // FacETING per dati e conteggio totale
            {
                $facet: {
                    data: [
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
                                ipDetailsId: { $arrayElemAt: ['$ipDetails', 0] }
                            }
                        },
                        { $sort: effectiveSort },
                        { $skip: skip },
                        { $limit: Number(pageSize) }
                    ],
                    total: [
                        { $count: 'count' }
                    ]
                }
            },
            {
                $project: {
                    sessions: '$data',
                    totalCount: { $arrayElemAt: ['$total.count', 0] }
                }
            }
        ];

        const [result] = await CowrieSession.aggregate(pipeline).allowDiskUse(true).exec();

        return {
            sessions: result?.sessions || [],
            totalCount: result?.totalCount || 0
        };
    }

    async countSessions(filters: any = {}) {
        const mongoFilters = this.buildRegExpFilter(filters);
        return await CowrieSession.countDocuments(mongoFilters);
    }

    private buildRegExpFilter(filters: any) {
        const mongoFilters: any = {};
        for (const [key, value] of Object.entries(filters)) {
            if (typeof value === 'string' && value.trim() !== '') {
                // Operatore regex case-insensitive 'like'-style
                mongoFilters[key] = { $regex: value, $options: 'i' };
            } else if (value !== undefined && value !== null) {
                mongoFilters[key] = value;
            }
        }
        return mongoFilters;
    }

    /**
     * API: Recupera il dettaglio di una singola sessione
     */
    async getSessionDetails(sessionId: string) {
        return await CowrieSession.findOne({ session: sessionId })
            .populate('ipDetailsId')
            .exec();
    }

    /**
     * API: Recupera la timeline di TUTTI gli eventi per una specifica sessione
     * Combina i dati dalle collezioni: event, auth, input, ttylog
     */
    async getSessionEvents(sessionId: string) {
        const id = (sessionId || '').trim();
        this.logger.info(`[CowrieService] Aggregating multi-collection forensic events for session: "${id}"`);
        
        // Esegue query parallele su tutte le collezioni forensi
        const [genericEvents, authEvents, inputEvents, ttyLogs] = await Promise.all([
            CowrieEvent.find({ session: id }).lean().exec(),
            CowrieAuth.find({ session: id }).lean().exec(),
            CowrieInput.find({ session: id }).lean().exec(),
            CowrieTtyLog.find({ session: id }).lean().exec()
        ]);

        // Unifica tutti i record in un unico array
        const allEvents = [
            ...(genericEvents || []),
            ...(authEvents || []),
            ...(inputEvents || []),
            ...(ttyLogs || [])
        ];

        // Ordinamento cronologico strettamente crescente
        allEvents.sort((a: any, b: any) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeA - timeB;
        });

        this.logger.info(`[CowrieService] Found ${allEvents.length} total forensic events for session "${id}"`);
        return allEvents;
    }
}
