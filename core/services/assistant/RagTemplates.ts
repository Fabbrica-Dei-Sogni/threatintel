/**
 * Template predefiniti per la traduzione semantica RAG.
 * Centralizziamo qui le stringhe per facilitare la manutenzione e 
 * preparare il sistema alla futura localizzazione (i18n).
 */
export const RAG_TEMPLATES = {
    THREAT_LOG: {
        CORE: "In data {timestamp}, è stata registrata un'attività di minaccia dall'indirizzo IP {ip}. L'origine tracciata è {geoInfo}. L'attacco ha utilizzato il protocollo {protocol} tramite {method}. Il threat score assegnato all'evento è {score}/100.",
        SUSPICIOUS_YES: "L'attività è stata contrassegnata come sospetta dal fingerprinting.",
        SUSPICIOUS_NO: "Il sistema di fingerprint non l'ha marcata come esplicitamente sospetta.",
        JNDI_ALERT: "Attenzione: è stato rilevato un payload JNDI malevolo nel traffico: \"{payload}\".",
        INDICATORS: "Indicatori tecnici rilevati: {indicators}."
    },
    IP_DETAILS: {
        HEADER: "Profilo di intelligence per l'indirizzo IP {ip}.",
        TIMELINE: "Questo nodo è stato osservato per la prima volta dalla nostra rete honeypot il {firstSeen} e l'ultima attività malevola locale risale al {lastSeen}.",
        ORG: "L'organizzazione associata a questo IP è {org}.",
        FOOTER: "Questo profilo rappresenta il contenitore storico per tutte le minacce provenienti da tale sorgente.",
        ABUSE_SCORE: "Analisi reputazionale globale: l'IP ha un Abuse Confidence Score di {score}/100. È stato segnalato {totalReports} volte da altre organizzazioni per comportamenti abusivi.",
        TOR_NODE: "L'indirizzo IP è noto per essere un nodo di uscita TOR, aumentando il rischio di anonimato malevolo.",
        COMMUNITY_REPORTS: "Dai report manuali della community emergono comportamenti specifici e TTPs (Tactics, Techniques, and Procedures): {comments}."
    },
    PROMPTS: {
        CAMPAIGN_SYSTEM: `
Sei un analista SOC (Security Operations Center) esperto di Threat Intelligence.
Di seguito è riportato il dump JSON aggregato di una Campagna di attacco distribuita, calcolata al volo dai nostri sistemi di correlazione.

Il tuo obiettivo è tradurre questi dati crudi in UN SINGOLO PARAGRAFO NARRATIVO (massimo 150 parole) altamente descrittivo e denso di parole chiave (Keyword-Dense). Questo testo andrà ad alimentare un database vettoriale (Qdrant) per un motore RAG.

Requisiti rigidi per il paragrafo:
1. Inizia chiarendo che si tratta di una "Campagna di Attacco Distribuita".
2. Riporta il numero totale di IP coinvolti (es. ipCount) e cita gli IP principali.
3. Specifica il vettore d'attacco principale o i protocolli predominanti usati (es. ssh, web).
4. Indica chiaramente il livello di gravità generale.

Non aggiungere saluti. Non aggiungere spiegazioni. Restituisci SOLO il testo del paragrafo.
`.trim()
    }
};

/**
 * Helper per l'interpolazione dei parametri nei template (simile al motore i18n interno)
 */
export function interpolate(template: string, params: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(params)) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
    return result;
}
