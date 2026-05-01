import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../../di/tokens';
import { IThreatLog } from '../../models/ThreatLogSchema';
import { IIpDetails } from '../../models/IpDetailsSchema';
import { IAbuseIpDb } from '../../models/AbuseIpDbSchema';
import { IAbuseReport } from '../../models/AbuseReportSchema';
import { RAG_TEMPLATES, interpolate } from './RagTemplates';


/**
 * Servizio dedicato alla "Traduzione Semantica" per l'indicizzazione RAG.
 * Converte i modelli di dominio strutturati (JSON) in stringhe narrative 
 * ricche di parole chiave, ottimizzate per la ricerca vettoriale su Qdrant.
 */
@injectable()
export class RagTranslationService {

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger
    ) {}

    /**
     * Traduce un singolo ThreatLog (Atomo) in testo narrativo.
     * Approccio: Deterministico (Zero costi LLM, esecuzione istantanea).
     */
    public translateThreatLog(log: IThreatLog): string {
        this.logger.debug('Translating ThreatLog to semantic narrative');
        const ip = log.request?.ip || "Sconosciuto";
        const protocol = log.protocol || "Sconosciuto";
        const method = log.request?.method || "N/A";
        
        let geoInfo = "provenienza sconosciuta";
        if (log.geo) {
            const parts = [];
            if (log.geo.city) parts.push(log.geo.city);
            if (log.geo.country) parts.push(log.geo.country);
            if (log.geo.isp) parts.push(`(ISP: ${log.geo.isp})`);
            if (parts.length > 0) {
                geoInfo = parts.join(', ');
            }
        }

        const score = log.fingerprint?.score || 0;
        const isSuspicious = log.fingerprint?.suspicious 
            ? RAG_TEMPLATES.THREAT_LOG.SUSPICIOUS_YES 
            : RAG_TEMPLATES.THREAT_LOG.SUSPICIOUS_NO;
        
        const timestamp = new Date(log.timestamp).toISOString();

        // 1. Core Narrative
        let narrative = interpolate(RAG_TEMPLATES.THREAT_LOG.CORE, {
            timestamp,
            ip,
            geoInfo,
            protocol,
            method,
            score
        }) + " " + isSuspicious;

        // 2. Keyword Density (Aggiungiamo indicatori specifici se presenti)
        if (log.request?.jndiPayload) {
            narrative += " " + interpolate(RAG_TEMPLATES.THREAT_LOG.JNDI_ALERT, { payload: log.request.jndiPayload });
        }
        
        if (log.fingerprint?.indicators && log.fingerprint.indicators.length > 0) {
            narrative += " " + interpolate(RAG_TEMPLATES.THREAT_LOG.INDICATORS, { indicators: log.fingerprint.indicators.join(', ') });
        }

        return narrative;
    }

    /**
     * Traduce le informazioni di base di un IP (Atomo) in testo narrativo.
     * Approccio: Deterministico (Zero costi LLM).
     * @param ipDetails I dettagli base dell'IP
     * @param abuseData Opzionale. I dati di intelligence provenienti da AbuseIPDB, se disponibili.
     * @param abuseReports Opzionale. Array di report correlati per estrarre TTPs dai commenti.
     */
    public translateIpDetails(ipDetails: IIpDetails, abuseData?: IAbuseIpDb | null, abuseReports?: IAbuseReport[]): string {
        this.logger.debug('Translating IpDetails to semantic narrative');
        const ip = ipDetails.ip;
        const firstSeen = new Date(ipDetails.firstSeenAt).toISOString();
        const lastSeen = new Date(ipDetails.lastSeenAt).toISOString();
        
        let orgInfo = "";
        if (ipDetails.ipinfo && ipDetails.ipinfo.org) {
            orgInfo = interpolate(RAG_TEMPLATES.IP_DETAILS.ORG, { org: ipDetails.ipinfo.org });
        }

        let narrative = interpolate(RAG_TEMPLATES.IP_DETAILS.HEADER, { ip }) + " " +
                        interpolate(RAG_TEMPLATES.IP_DETAILS.TIMELINE, { firstSeen, lastSeen }) + " " +
                        orgInfo + " " +
                        RAG_TEMPLATES.IP_DETAILS.FOOTER;

        // Aggiunta Intelligence esterna (AbuseIPDB)
        if (abuseData) {
            const score = abuseData.abuseConfidenceScore || 0;
            const totalReports = abuseData.totalReports || 0;
            const isTor = abuseData.isTor ? RAG_TEMPLATES.IP_DETAILS.TOR_NODE : "";
            
            narrative += " " + interpolate(RAG_TEMPLATES.IP_DETAILS.ABUSE_SCORE, { score, totalReports }) + " " + isTor;
        }

        // Estrazione Semantica dai Commenti (Filtro Anti-Spam e Deduplicazione)
        if (abuseReports && abuseReports.length > 0) {
            const spamRegex = /(fail2ban|ban triggered|port scan|blocked via|banned|honeypot)/i;
            
            const uniqueComments = new Set<string>();
            const semanticComments: string[] = [];

            for (const report of abuseReports) {
                const comment = report.comment?.trim();
                if (!comment || comment.length < 15) continue; // Salta commenti troppo brevi
                
                if (spamRegex.test(comment)) continue; // Filtra lo spam automatico noto
                
                if (!uniqueComments.has(comment)) {
                    uniqueComments.add(comment);
                    semanticComments.push(comment);
                }
                
                if (semanticComments.length >= 5) break; // Limite massimo 5 per non esplodere coi token
            }

            if (semanticComments.length > 0) {
                const comments = semanticComments.map(c => `"${c}"`).join('; ');
                narrative += " " + interpolate(RAG_TEMPLATES.IP_DETAILS.COMMUNITY_REPORTS, { comments });
            }
        }

        return narrative.trim().replace(/\s+/g, ' '); // Pulisce spazi doppi
    }

    /**
     * Genera il Prompt di Sistema da inviare all'LLM (es. Ollama/OpenAI) 
     * per riassumere le Campagne o gli Attacchi generati on-the-fly.
     * Approccio: Generativo (Richiede invocazione LLM esterna).
     */
    public buildCampaignSummaryPrompt(campaignJsonData: any): string {
        this.logger.debug('Building campaign summary prompt for LLM materialization');
        
        return RAG_TEMPLATES.PROMPTS.CAMPAIGN_SYSTEM + 
               "\n\n--- INIZIO DATI JSON DELLA CAMPAGNA ---\n" + 
               JSON.stringify(campaignJsonData, null, 2) + 
               "\n--- FINE DATI ---";
    }
}
