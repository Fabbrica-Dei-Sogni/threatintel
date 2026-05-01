import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../../di/tokens';
import { IThreatLog } from '../../models/ThreatLogSchema';
import { IIpDetails } from '../../models/IpDetailsSchema';
import { IAbuseIpDb } from '../../models/AbuseIpDbSchema';
import { IAbuseReport } from '../../models/AbuseReportSchema';
import { RAG_TEMPLATES } from './RagTemplates';

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
    public translateCampaign(campaign: any): string {
        return RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.NARRATIVES.CAMPAIGN_SUMMARY_BASE, {
            hash: campaign.hash,
            ipCount: campaign.ipCount.toString(),
            totalLogs: campaign.totaleLogs.toString(),
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
    public translateAttack(attack: any): string {
        const ip = attack.ip || attack.request?.ip || 'N/A';
        return RAG_TEMPLATES.INTERPOLATE(RAG_TEMPLATES.NARRATIVES.ATTACK_SUMMARY_BASE, {
            ip,
            totalLogs: attack.totaleLogs.toString(),
            firstSeen: new Date(attack.firstSeen).toLocaleString('it-IT'),
            lastSeen: new Date(attack.lastSeen).toLocaleString('it-IT'),
            averageScore: (attack.averageScore || 0).toFixed(2),
            patterns: attack.attackPatterns?.join(', ') || 'nessuno',
            sampleUrl: attack.sampleUrl || attack.request?.url || '/'
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
               "\n\n--- INIZIO DATI JSON DELLA CAMPAGNA ---\n" + 
               JSON.stringify(campaignJsonData, null, 2) + 
               "\n--- FINE DATI ---";
    }

    public buildAttackSummaryPrompt(attack: any): string {
        const ip = attack.ip || attack.request?.ip || 'N/A';
        return `Descrivi brevemente l'attività di questo attaccante basandoti sui dati tecnici forniti. 
Sii conciso e focalizzati sulla pericolosità e sulla tecnica.

Dati Attaccante:
- IP: ${ip}
- Totale Colpi: ${attack.totaleLogs}
- Score Medio: ${attack.averageScore?.toFixed(2)}
- Prima Attività: ${attack.firstSeen}
- Ultima Attività: ${attack.lastSeen}
- Pattern Rilevati: ${attack.attackPatterns?.join(', ') || 'Nessuno'}
- URL Target (campione): ${attack.sampleUrl || attack.request?.url}

Istruzioni: Spiega che tipo di minaccia rappresenta questo IP e se sembra un attacco mirato o una scansione automatica di massa.`;
    }
}
