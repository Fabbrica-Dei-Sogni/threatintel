/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { logger } from '../../logger';
import util from 'util';
import axios from 'axios';
import dotenv from 'dotenv';

// Import JS dependencies
import * as whois from 'whois';
import ipinfo from 'ipinfo';
import AbuseReport from '../models/AbuseReportSchema';
import IpDetails from '../models/IpDetailsSchema';
import AbuseIpDb from '../models/AbuseIpDbSchema';
import { AbuseCategoryEnum } from '../models/AbuseCategoryEnum';
import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN, EVENT_BUS_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import ipRangeCheck from 'ip-range-check';
import { IpDetailsMapper } from '../models/dto/IpDetailsDTO';
import { EventBus, AppEvents } from './EventBus';
import { GetIpDetailsParams } from '../types/service-params.types';

const whoisAsync = util.promisify(whois.lookup);

dotenv.config();

@injectable()
export class IpDetailsService {
    private excludedIPs: string[];
    private pendingLookups: Map<string, Promise<any>> = new Map();

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        @inject(EVENT_BUS_TOKEN) private readonly eventBus: EventBus
    ) {
        this.excludedIPs = this.parseExcludedIPs();
    }

    /**
     * Parsa la variabile EXCLUDED_IPS dal .env
     * @returns {string[]} Array di IP e range CIDR da escludere
     */
    parseExcludedIPs(): string[] {
        const excludedIPsEnv = process.env.EXCLUDED_IPS;
        if (!excludedIPsEnv) {
            // Default se non specificato
            return ['127.0.0.1', '::1', 'localhost'];
        }

        return excludedIPsEnv
            .split(',')
            .map(ip => ip.trim())
            .filter(ip => ip.length > 0);
    }

    /**
     * Verifica se un IP deve essere escluso dal salvataggio
     * @param {string} ip 
     * @returns {boolean} true se deve essere escluso
     */
    isIPExcluded(ip: string): boolean {
        if (!ip) return true;

        // Usa ip-range-check per verificare se l'IP è in uno dei range esclusi
        return ipRangeCheck(ip, this.excludedIPs);
    }

    async saveIpDetails(ip: string) {
        const ipDetailsId = await this.findOrCreate(ip);
        return ipDetailsId;
    }

    async findOrCreate(ip: string, updateReputationScore = false) {
        if (this.pendingLookups.has(ip)) {
            this.logger.debug(`[IpDetailsService] Richiesta simultanea per l'IP ${ip}. Attendo la promise già in corso per evitare chiamate API multiple.`);
            return this.pendingLookups.get(ip);
        }

        const promise = this._findOrCreateImpl(ip, updateReputationScore)
            .finally(() => this.pendingLookups.delete(ip));

        this.pendingLookups.set(ip, promise);
        return promise;
    }

    private async _findOrCreateImpl(ip: string, updateReputationScore = false) {
        let ipDetails = await IpDetails.findOne({ ip });
        const now = new Date();

        // Configurazione caching
        const maxAgeHours = parseInt(process.env.IP_CACHE_MAX_AGE_HOURS || '24', 10);
        const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

        // Verifica se i dati sono scaduti o mancanti
        const isCacheExpired = !ipDetails || !ipDetails.enrichedAt || (now.getTime() - new Date(ipDetails.enrichedAt).getTime() > maxAgeMs);
        const shouldEnrich = isCacheExpired || updateReputationScore;

        if (ipDetails) {
            // Aggiorna sempre l'ultimo avvistamento
            ipDetails.lastSeenAt = now;

            if (shouldEnrich) {
                this.logger.info(`[IpDetailsService] Cache scaduta o aggiornamento richiesto per ${ip}. Avvio enrichment...`);
                
                // 1. AbuseIPDB enrichment
                const saveAbuseDoc = await this.getAndSaveAbuseIpDb(ip);
                if (saveAbuseDoc) {
                    ipDetails.abuseipdbId = saveAbuseDoc._id;
                }

                // 2. IPInfo & Whois enrichment
                const enrichedData = await this.enrichIpData(ip);
                
                // Gestione specifica 429: Se ipinfo è fallito per rate limit, non aggiorniamo enrichedAt
                // in modo da permettere un retry al prossimo avvistamento senza aspettare 24h.
                const isIpInfoRateLimited = enrichedData.ipinfo && (enrichedData.ipinfo as any).status === 429;

                if (enrichedData.ipinfo && !isIpInfoRateLimited) {
                    ipDetails.ipinfo = enrichedData.ipinfo;
                }
                if (enrichedData.whois_raw) {
                    ipDetails.whois_raw = enrichedData.whois_raw;
                }
                
                if (!isIpInfoRateLimited) {
                    ipDetails.enrichedAt = now;
                } else {
                    this.logger.warn(`[IpDetailsService] Enrichment parziale per ${ip} causa rate limit. Prossimo retry automatico abilitato.`);
                }
            }

            await ipDetails.save();

            // SYNC TO RAG (Asincrono)
            this.syncToRag(ipDetails).catch(err => 
                this.logger.error(`[IpDetailsService] Error during RAG sync: ${err}`)
            );

            return ipDetails._id;
        } else {
            this.logger.info(`[IpDetailsService] Primo avvistamento per ${ip}. Esecuzione enrichment completo...`);
            
            // Primo enrichment obbligatorio
            const saveAbuseDoc = await this.getAndSaveAbuseIpDb(ip);
            const enrichedData = await this.enrichIpData(ip);
            const isIpInfoRateLimited = enrichedData.ipinfo && (enrichedData.ipinfo as any).status === 429;

            const payload = {
                ip,
                ...enrichedData,
                abuseipdbId: saveAbuseDoc?._id || null,
                lastSeenAt: now,
                // Se siamo in rate limit, non impostiamo enrichedAt o lo mettiamo a null
                // per scatenare il retry automatico alla prossima chiamata.
                enrichedAt: isIpInfoRateLimited ? null : now
            };

            // Utilizziamo findOneAndUpdate con upsert per gestire eventuali race conditions
            const result = await IpDetails.findOneAndUpdate(
                { ip },
                {
                    $set: payload,
                    $setOnInsert: { firstSeenAt: now }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            if (isIpInfoRateLimited) {
                this.logger.warn(`[IpDetailsService] Primo salvataggio per ${ip} con arricchimento parziale (Rate Limit).`);
            }

            // SYNC TO RAG (Asincrono)
            this.syncToRag(result).catch(err => 
                this.logger.error(`[IpDetailsService] Error during RAG sync: ${err}`)
            );

            return result._id;
        }
    }

    async getIpDetails(params: GetIpDetailsParams) {
        const { ip } = params;
        const ipDetails = await IpDetails.findOne({ ip })
            .populate('abuseipdbId')  // Popola il riferimento AbuseIpDb
            .exec();
        //return ipDetails || null;
        if (!ipDetails) return null;

        // Recupera i report associati se esiste un riferimento a AbuseIpDb
        let abuseReports: any[] = [];
        if (ipDetails.abuseipdbId) {
            const abuseRefId = (ipDetails.abuseipdbId as any)?._id ?? ipDetails.abuseipdbId;
            const reports = await AbuseReport.find({ abuseIpDbId: abuseRefId })
                .sort({ reportedAt: -1 })
                .exec();

            // Invertiamo l'enum in modo da avere id -> nome chiave
            const idToNameMap = Object.entries(AbuseCategoryEnum).reduce((acc: Record<string, string>, [key, val]) => {
                acc[String(val as number)] = key;
                return acc;
            }, {});

            // Mappa ID categorie in nomi testuali
            abuseReports = reports.map((rep: any) => ({
                ...rep.toObject(),
                categories: rep.categories.map((id: any) => ({
                    id,
                    name: idToNameMap[id] || `Unknown (${id})`,
                    //description: AbuseCategoryDescriptions[id] || ''
                }))
            }));
        }

        return {
            ipDetails: IpDetailsMapper.toDTO(ipDetails),
            abuseReports
        };

    }

    async getAndSaveAbuseIpDb(ip: string) {
        try {
            // Enrichment AbuseIPDB
            const abuseData = await this.enrichWithAbuse(ip);
            if (!abuseData) return null;

            const payload = {
                ip,
                lastReportedAt: abuseData.lastReportedAt ? new Date(abuseData.lastReportedAt) : null,
                totalReports: abuseData.totalReports || 0,
                abuseConfidenceScore: abuseData.abuseConfidenceScore || 0,
                isListed: abuseData.isWhitelisted === false,
                categories: [], // se li recuperi in seguito
                countryCode: abuseData.countryCode || null,
                domain: abuseData.domain || null,
                isp: abuseData.isp || null,
                isTor: abuseData.isTor || false,
                isWhitelisted: abuseData.isWhitelisted || false,
                usageType: abuseData.usageType || null,
                enrichedAt: new Date()
            };

            const savedDoc = await AbuseIpDb.findOneAndUpdate(
                { ip },
                payload,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            return savedDoc;
        } catch (error: any) {
            logger.error(`Errore aggiornamento AbuseIpDb per ${ip}: ${error.message}`);
            return null;
        }
    }

    async getAbuseCacheOnly(ip: string) {
        try {
            const cached = await AbuseIpDb.findOne({ ip });
            return cached;
        } catch (error: any) {
            logger.error(`Errore recupero cache AbuseIpDb per ${ip}: ${error.message}`);
            return null;
        }
    }

    async getAndSaveReportsAbuseIpDb(ip: string, maxAgeInDays = 2, perPage = 100) {
        try {
            const abuseDoc = await AbuseIpDb.findOne({ ip });
            if (!abuseDoc) return null;

            let page = 1;
            let savedReports: any[] = [];
            let morePages = true;

            while (morePages) {
                const reportsData = await this.getAbuseReportsFromApi(ip, maxAgeInDays, perPage, page);
                const reports = reportsData.results || [];

                for (const rep of reports) {
                    const reportPayload = {
                        abuseIpDbId: abuseDoc._id,
                        reportedAt: new Date(rep.reportedAt),
                        comment: rep.comment,
                        categories: rep.categories || [],
                        reporterId: rep.reporterId,
                        reporterCountryCode: rep.reporterCountryCode,
                        reporterCountryName: rep.reporterCountryName,
                        tags: rep.tags || []
                    };

                    const saved = await AbuseReport.findOneAndUpdate(
                        {
                            abuseIpDbId: abuseDoc._id,
                            reportedAt: new Date(rep.reportedAt),
                            reporterId: rep.reporterId
                        },
                        reportPayload,
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );

                    savedReports.push(saved);
                }

                // Paginazione: stoppa quando arrivi all'ultima pagina
                morePages = reportsData.page < reportsData.lastPage;
                page++;
            }

            return savedReports;
        } catch (error: any) {
            logger.error(`Errore aggiornamento AbuseIpDb per ${ip}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Metodo per ottenere i dettagli di un IP arricchiti dalla fonte abuse ipdb
     
     * @param {*} ip 
     * @returns 
     */
    async enrichWithAbuse(ip: string) {

        try {
            // Solo se non già controllato o se score ancora assente
            const data = await axios.get("https://api.abuseipdb.com/api/v2/check", {
                headers: { Key: process.env.ABUSEIPDB_KEY, Accept: "application/json" },
                params: { ipAddress: ip, maxAgeInDays: 30 }
            });
            return {
                abuseConfidenceScore: data.data.data.abuseConfidenceScore,
                countryCode: data.data.data.countryCode,
                domain: data.data.data.domain,
                isp: data.data.data.isp,
                isTor: data.data.data.isTor,
                isWhitelisted: data.data.data.isWhitelisted,
                usageType: data.data.data.usageType,
                lastReportedAt: data.data.data.lastReportedAt,
                totalReports: data.data.data.totalReports
            };

        } catch (err) {
            throw err;
        }
    }


    async getAbuseReportsFromApi(ip: string, maxAgeInDays = 1, perPage = 10, page = 1) {
        try {
            const response = await axios.get('https://api.abuseipdb.com/api/v2/reports', {
                headers: { Key: process.env.ABUSEIPDB_KEY, Accept: "application/json" },
                params: {
                    ipAddress: ip,
                    maxAgeInDays,  // intervallo massimo supportato
                    perPage,       // massimo consentito dalla API
                    page             // prende la prima pagina (fino a 100 report)                
                }
            });

            return response.data.data; // array di reports
        } catch (error: any) {
            logger.error(`Errore chiamata AbuseIPDB reports per IP ${ip}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Arricchisce un indirizzo IP con sorgenti pubbliche/lookup
     * @param {string} ip
     * @returns {Promise<Object>}  // Vedi schema sotto
     */
    async enrichIpData(ip: string) {

        // Dettaglio da ipinfo (puoi registrarti per key se sfori il free tier)
        const info = await this.ipinfoPromise(ip);

        // Whois con promisify (richiede connessione)
        let whoisData: any = '';
        try {
            whoisData = await whoisAsync(ip);
        } catch (e) { whoisData = null; }

        return {
            ip,
            ipinfo: info || null,
            whois_raw: whoisData || null,
            enrichedAt: new Date()
        };
    }

    private ipinfoPromise(ip: string): Promise<any> {
        return new Promise((resolve) => {
            this.logger.debug(`[IpDetailsService] Avvio lookup ipinfo per: ${ip}`);

            const token = process.env.IPINFO_TOKEN;
            const options = token ? { token: token } : {};

            ipinfo(ip, options, (err: any, data: any) => {

                if (err) {
                    // Gestione specifica per Rate Limit: Ritorniamo l'errore per il frontend, 
                    // ma lo logghiamo per poterlo intercettare nel findOrCreate
                    if (err.status === 429 || (err.error && err.error.title === 'Rate limit exceeded')) {
                        this.logger.warn(`[IpDetailsService] Rate limit superato per ipinfo su IP ${ip}. Segnalo errore per retry.`);
                        // Ritorniamo un oggetto con lo status per permettere al chiamante di decidere
                        return resolve({ status: 429, error: 'Rate limit exceeded' });
                    }

                    this.logger.warn(`[IpDetailsService] Fallimento lookup ipinfo per ${ip}:`, err);
                    return resolve(null);
                }

                // Controllo se ipinfo ha restituito l'errore nel campo data invece che in err
                if (data && (data.status === 429 || (data.error && data.error.title === 'Rate limit exceeded'))) {
                    this.logger.warn(`[IpDetailsService] Rate limit superato per ipinfo su IP ${ip} (in data). Segnalo errore per retry.`);
                    // Ritorniamo l'oggetto errore invece di null
                    return resolve({ status: 429, error: 'Rate limit exceeded' });
                }

                resolve(data);
            });
        });
    }

    private async syncToRag(ipDetails: any) {
        try {
            // Recupera dati completi per la traduzione semantica
            const abuseData = ipDetails.abuseipdbId ? await AbuseIpDb.findById(ipDetails.abuseipdbId) : null;
            const reports = abuseData ? await AbuseReport.find({ abuseIpDbId: abuseData._id }).sort({ reportedAt: -1 }).limit(20) : [];
            
            // Notifica il sistema RAG via Event Bus
            this.eventBus.emit(AppEvents.IP_DETAILS_UPDATED, { ipDetails, abuseData, reports });
        } catch (error) {
            this.logger.error(`[IpDetailsService] RAG event emission failed for ${ipDetails.ip}: ${error}`);
        }
    }

}
