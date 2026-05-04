import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../../di/tokens';
import { IThreatLog } from '../../models/ThreatLogSchema';
import { IIpDetails } from '../../models/IpDetailsSchema';
import { IAbuseIpDb } from '../../models/AbuseIpDbSchema';
import { IAbuseReport } from '../../models/AbuseReportSchema';
import { RAG_TEMPLATES } from './RagTemplates';
import CampaignDTO from '../../models/dto/CampaignDTO';
import AttackDTO from '../../models/dto/AttackDTO';

@injectable()
export class RagTranslationService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger
    ) {}

    /**
     * Traduce un ThreatLog in una narrazione testuale per il RAG.
     */
    public translateThreatLog(log: IThreatLog): string {
        this.logger.debug(`Translating ThreatLog ${log.id} for RAG`);
        
        const timestamp = new Date(log.timestamp).toLocaleString('it-IT');
        const ip = log.request?.ip || 'sconosciuto';
        const method = log.request?.method || 'N/A';
        const url = log.request?.url || '/';
        const protocol = log.protocol || 'http';
        const score = log.fingerprint?.score || 0;
        const indicators = log.fingerprint?.indicators?.join(', ') || 'nessuno';
        
        // Informazioni geografiche
        const country = log.geo?.country || 'paese sconosciuto';
        const city = log.geo?.city || 'città sconosciuta';
        const geoInfo = `${city}, ${country}`;

        let contextParts = [];
        
        if (log.fingerprint?.suspicious) {
            contextParts.push(RAG_TEMPLATES.NARRATIVES.SUSPICIOUS_YES);
        }

        if (log.request?.jndiPayload || indicators.toLowerCase().includes('jndi')) {
            const payload = log.request?.jndiPayload || 'rilevato dai sensori';
            contextParts.push(RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.NARRATIVES.JNDI_ALERT, { payload }));
        }

        if (protocol === 'ssh') {
            contextParts.push(RAG_TEMPLATES.NARRATIVES.SSH_CONTEXT);
        }

        const context = contextParts.join(' ');

        return RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.NARRATIVES.THREAT_LOG_BASE, {
            timestamp,
            ip,
            method,
            url,
            protocol,
            indicators,
            score: score.toString(),
            geoInfo,
            context
        });
    }

    /**
     * Traduce i dettagli di un IP e i relativi report in un sommario semantico.
     */
    public translateIpDetails(
        ipDetails: IIpDetails, 
        abuseData?: IAbuseIpDb | any | null, 
        abuseReports?: IAbuseReport[]
    ): string {
        this.logger.debug(`Translating IP Details for ${ipDetails.ip} for RAG`);

        const geo = ipDetails.ipinfo?.city 
            ? `${ipDetails.ipinfo.city}, ${ipDetails.ipinfo.country}` 
            : 'posizione sconosciuta';
        
        const isp = ipDetails.ipinfo?.org || 'ISP sconosciuto';
        
        const details = ipDetails as any;
        const isTor = abuseData?.isTor || 
                     details.threatScore?.isTor || 
                     (abuseReports && abuseReports.some(r => r.comment.toLowerCase().includes('tor node')));
        
        const torContext = isTor ? `\n[ALERT] ${RAG_TEMPLATES.NARRATIVES.TOR_NODE_INFO}` : '';

        const reportsSummary = (abuseReports || [])
            .map(r => {
                const cleanComment = this.sanitizeComment(r.comment);
                return cleanComment ? `- ${cleanComment}` : null;
            })
            .filter(Boolean)
            .slice(0, 5)
            .join('\n');

        const abuseScore = abuseData?.abuseConfidenceScore || 0;
        const totalReports = abuseData?.totalReports || 0;

        let narrative = RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.NARRATIVES.IP_DETAILS_BASE, {
            ip: ipDetails.ip,
            geo,
            isp,
            abuseScore: abuseScore.toString(),
            totalReports: totalReports.toString(),
            reports: reportsSummary || 'Nessun report dettagliato disponibile.'
        });

        return narrative + torContext;
    }

    /**
     * Traduce i dati tecnici di una campagna in una narrazione deterministica.
     */
    public translateCampaign(campaign: CampaignDTO): string {
        return RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.NARRATIVES.CAMPAIGN_SUMMARY_BASE, {
            hash: campaign.hash,
            ipCount: (campaign.ipCount || 0).toString(),
            correlations: (campaign.correlationHubsCount || 0).toString(),
            totaleLogs: (campaign.totaleLogs || 0).toString(),
            firstSeen: new Date(campaign.firstSeen).toLocaleString('it-IT'),
            lastSeen: new Date(campaign.lastSeen).toLocaleString('it-IT'),
            averageScore: (campaign.averageScore || 0).toFixed(2),
            patterns: campaign.attackPatterns?.join(', ') || 'generici',
            sampleUrl: campaign.sampleUrl || '/'
        });
    }

    /**
     * Traduce i dati tecnici di un attacco (IP-centrico) in una narrazione deterministica.
     */
    public translateAttack(attack: AttackDTO): string {
        const ip = attack.ip || attack.request?.ip || 'N/A';
        const intensity = attack.intensityAttack || 'normale';
        const duration = attack.durataAttacco?.human || `${attack.attackDurationMinutes || 0} minuti`;
        const patterns = attack.attackPatterns?.join(', ') || 'nessuno';
        const rateLimits = attack.countRateLimit || 0;
        const protocol = attack.protocol || 'N/A';
        const isp = attack.ipDetails?.ipinfo?.org || attack.ipDetails?.isp || 'ISP sconosciuto';
        
        // Mappatura Danger Level (da numerico a semantico)
        const dangerLevelMap: Record<number, string> = {
            1: 'Critico',
            2: 'Alto',
            3: 'Medio',
            4: 'Basso',
            5: 'Informativo'
        };
        const dangerLevel = typeof attack.dangerLevel === 'number' 
            ? dangerLevelMap[attack.dangerLevel] || `livello ${attack.dangerLevel}`
            : (attack.dangerLevel || 'non classificato');

        // Estrazione geografica arricchita
        const country = attack.geo?.country || attack.ipDetails?.ipinfo?.country || 'paese sconosciuto';
        const city = attack.geo?.city || attack.ipDetails?.ipinfo?.city || 'città sconosciuta';
        const geoInfo = (city !== 'città sconosciuta' || country !== 'paese sconosciuto') 
            ? `[Origine: ${city}, ${country}]` 
            : '';

        let contextParts = [];
        if (attack.isDistributed) {
            contextParts.push("L'attività è parte di una struttura di attacco distribuita.");
        }
        if (rateLimits > 0) {
            contextParts.push(`Sono stati rilevati ${rateLimits} eventi di violazione dei limiti di frequenza (rate limit).`);
        }
        
        // Analisi strumenti e automazione
        if (attack.fingerprintAnalysis?.isTool || (attack.toolRiskScore && attack.toolRiskScore > 50)) {
            contextParts.push("L'attacco sembra essere stato condotto tramite uno strumento automatizzato o uno scanner di vulnerabilità.");
        }

        // Analisi sequenze e movimenti
        if (attack.sequenceAnalysis?.bruteForceSuccess) {
            contextParts.push("Attenzione: è stato rilevato un possibile successo in un attacco brute-force (codice di risposta positivo dopo vari tentativi).");
        }
        if (attack.sequenceAnalysis?.lateralMovement) {
            contextParts.push("Sono stati identificati pattern riconducibili a tentativi di movimento laterale all'interno della rete.");
        }

        // Metadati bot/crawler
        if (attack.metadata?.isBot) {
            contextParts.push("L'indirizzo IP è identificato come un Bot noto.");
        } else if (attack.metadata?.isCrawler) {
            contextParts.push("L'indirizzo IP è identificato come un Crawler di ricerca.");
        }

        // Score di rischio specifici
        if (attack.payloadRiskScore && attack.payloadRiskScore > 70) {
            contextParts.push(`Il rischio associato ai payload inviati è estremamente elevato (${attack.payloadRiskScore.toFixed(0)}/100).`);
        }

        const context = contextParts.join(' ');

        return RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.NARRATIVES.ATTACK_SUMMARY_BASE, {
            ip,
            geoInfo,
            dangerLevel,
            intensity,
            duration,
            totaleLogs: (attack.totaleLogs || 0).toString(),
            firstSeen: new Date(attack.firstSeen).toLocaleString('it-IT'),
            lastSeen: new Date(attack.lastSeen).toLocaleString('it-IT'),
            averageScore: (attack.averageScore || 0).toFixed(2),
            patterns,
            indicators: patterns, // Per ora usiamo gli stessi per entrambi i placeholder nel template
            sampleUrl: attack.request?.url || '/',
            protocol,
            isp,
            context
        });
    }

    private sanitizeComment(comment: string): string {
        if (!comment) return '';
        const spamPatterns = [/fail2ban/i, /port scan/i, /bad ip/i];
        if (spamPatterns.some(p => p.test(comment))) return '';

        let clean = comment
            .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '')
            .trim();
        if (clean.length < 5) return '';
        return clean;
    }

    public buildCampaignSummaryPrompt(campaignJsonData: any): string {
        return RAG_TEMPLATES.PROMPTS.CAMPAIGN_SYSTEM + 
               RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.PROMPTS.CAMPAIGN_FOOTER, {
                   jsonData: JSON.stringify(campaignJsonData, null, 2)
               });
    }

    public buildAttackSummaryPrompt(attack: any): string {
        const ip = attack.ip || attack.request?.ip || 'N/A';
        return RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.PROMPTS.ATTACK_SUMMARY, {
            ip,
            totaleLogs: attack.totaleLogs.toString(),
            averageScore: (attack.averageScore || 0).toFixed(2),
            firstSeen: new Date(attack.firstSeen).toLocaleString('it-IT'),
            lastSeen: new Date(attack.lastSeen).toLocaleString('it-IT'),
            patterns: attack.attackPatterns?.join(', ') || 'Nessuno',
            sampleUrl: attack.sampleUrl || attack.request?.url || '/'
        });
    }
}
