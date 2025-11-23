import { logger } from '../../logger';
import util from 'util';
import axios from 'axios';
import dotenv from 'dotenv';

// Import JS dependencies
const whois = require('whois');
const ipinfo = require('ipinfo');
const AbuseReport = require('../models/AbuseReportSchema');
const IpDetails = require('../models/IpDetailsSchema');
const AbuseIpDb = require('../models/AbuseIpDbSchema');
const { AbuseCategoryEnum } = require('../models/AbuseCategoryEnum');
const ipRangeCheck = require('ip-range-check');

const whoisAsync = util.promisify(whois.lookup);

dotenv.config();

class IpDetailsService {
    private excludedIPs: string[];

    constructor() {
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
        let ipDetails = await IpDetails.findOne({ ip });
        let now = new Date();

        let saveAbuseDoc: any = null;
        //gestire il caso in se l'ip gia esiste, aggiornare il nuovo campo lastSeen
        //se è la prima volta definito il nuovo campo firstSeen
        if (ipDetails) {

            //aggiorna sempre lastSeen
            ipDetails.lastSeenAt = now;


            if (!ipDetails.abuseipdbId || updateReputationScore) {
                saveAbuseDoc = await this.getAndSaveAbuseIpDb(ip);
                ipDetails.abuseipdbId = saveAbuseDoc?._id;
            }

            //rieseguire l'enrichment del reputation score ogni volta
            await ipDetails.save();
        }
        else {

            // Enrichment asincrono
            saveAbuseDoc = await this.getAndSaveAbuseIpDb(ip);
            const enrichedData = await this.enrichIpData(ip); // <-- la tua funzione ipinfo/whois

            //TODO: eseguire l'enrichment del reputation score ogni volta
            ipDetails = new IpDetails({ ip, ...enrichedData, abuseipdbId: saveAbuseDoc?._id || null });
            ipDetails.firstSeenAt = now;
            ipDetails.lastSeenAt = now;

            await ipDetails.save();
        }


        //TODO: integrare l'enrichment del reputation score dal provider abuse
        //ip details avra una sezione dedicata per tracciare i dati del reputation score
        //la sezione è uno schema dedicato reputationscore ed è associato per riferimento all'ipdetails

        //l'enrichment del reputation score viene aggiornato ogni volta che arriva una richiesta
        //gestire nel fingerprints della richiesta il reputation score corrente al momento della richiesta con almeno una lista di 10 report segnalati.
        //queste info di reputation sono legate alla richiesta, nell'abuse dell'ip il reputation score puo variare nel tempo.


        //await ipDetails.save();
        return ipDetails._id;
    }

    async getIpDetails(ip: string) {
        const ipDetails = await IpDetails.findOne({ ip })
            .populate('abuseipdbId')  // Popola il riferimento AbuseIpDb
            .exec();
        //return ipDetails || null;
        if (!ipDetails) return null;

        // Recupera i report associati se esiste un riferimento a AbuseIpDb
        let abuseReports: any[] = [];
        if (ipDetails.abuseipdbId) {
            const reports = await AbuseReport.find({ abuseIpDbId: ipDetails.abuseipdbId._id })
                .sort({ reportedAt: -1 })
                .exec();

            // Invertiamo l'enum in modo da avere id -> nome chiave
            const idToNameMap = Object.entries(AbuseCategoryEnum).reduce((acc: any, [key, val]) => {
                acc[val as string] = key;
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
            ipDetails,
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

    ipinfoPromise(ip: string) {
        return new Promise((resolve) => {
            ipinfo(ip, {}, (err: any, c: any) => {
                if (err) return resolve(null);
                resolve(c);
            });
        });
    }

}
export default new IpDetailsService();
