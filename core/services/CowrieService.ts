import { inject, singleton } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { IpDetailsService } from './IpDetailsService';
import CowrieSession from '../models/CowrieSessionSchema';
import CowrieEvent from '../models/CowrieEventSchema';
import CowrieAuth from '../models/CowrieAuthSchema';
import CowrieInput from '../models/CowrieInputSchema';
import CowrieTtyLog from '../models/CowrieTtyLogSchema';

@singleton()
export class CowrieService {
    private enrichmentInterval: NodeJS.Timeout | null = null;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly ipDetailsService: IpDetailsService
    ) {}

    /**
     * Avvia il cron job per arricchire le sessioni sprovviste di Geo-Location
     */
    startEnrichmentJob() {
        if (this.enrichmentInterval) return;
        this.logger.info('[CowrieService] Avvio job di arricchimento IP in background (ogni 2 minuti).');
        
        // Esegue periodicamente per catturare record inseriti bypassando Node.js
        this.enrichmentInterval = setInterval(() => this.enrichSessions(), 2 * 60 * 1000);
        
        // Esecuzione immediata all'avvio
        this.enrichSessions();
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
     * API: Recupera le sessioni paginate assieme ai dati IP arricchiti
     */
    async getSessions(
        page: number = 1,
        limit: number = 20,
        sort: Record<string, any> = { timestamp: -1 },
        filters: any = {}
    ) {
        const skip = (page - 1) * limit;
        const mongoFilters = this.buildRegExpFilter(filters);
        
        const total = await this.countSessions(filters);
        
        const sessions = await CowrieSession.find(mongoFilters)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('ipDetailsId')
            .exec();

        return {
            data: sessions,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
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
