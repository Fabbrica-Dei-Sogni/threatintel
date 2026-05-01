/**
 * Template predefiniti per la traduzione semantica RAG.
 */
export const RAG_TEMPLATES = {
    NARRATIVES: {
        THREAT_LOG_BASE: "In data {timestamp}, è stata registrata un'attività di minaccia dall'indirizzo IP {ip} (Origine: {geoInfo}). L'attacco ha utilizzato il protocollo {protocol} tramite metodo {method} sull'URL {url}. Score evento: {score}/100. Indicatori rilevati: {indicators}. {context}",
        SUSPICIOUS_YES: "L'attività è stata contrassegnata come sospetta dal fingerprinting.",
        JNDI_ALERT: "Attenzione: è stato rilevato un payload JNDI malevolo nel traffico: \"{payload}\".",
        SSH_CONTEXT: "L'attività riguarda tentativi di accesso non autorizzati tramite protocollo SSH, suggerendo attacchi brute-force o tentativi di credential stuffing.",
        
        IP_DETAILS_BASE: "Profilo Intelligence IP {ip}. Localizzazione: {geo}. ISP: {isp}. Reputazione AbuseIPDB: {abuseScore}/100 con {totalReports} segnalazioni totali. Analisi report recenti:\n{reports}",
        TOR_NODE_INFO: "L'indirizzo IP è noto per essere un nodo di uscita TOR, aumentando il rischio di anonimato malevolo."
    },
    PROMPTS: {
        CAMPAIGN_SYSTEM: `
Sei un analista SOC (Security Operations Center) esperto di Threat Intelligence.
Di seguito è riportato il dump JSON aggregato di una Campagna di Attacco Distribuita, calcolata al volo dai nostri sistemi di correlazione.
`.trim()
    },
    INTERPOLATE: (template: string, params: Record<string, string>): string => {
        let result = template;
        for (const [key, value] of Object.entries(params)) {
            result = result.replace(new RegExp(`{${key}}`, 'g'), value);
        }
        return result;
    }
};
