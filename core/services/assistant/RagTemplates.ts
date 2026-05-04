/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
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
        TOR_NODE_INFO: "L'indirizzo IP è noto per essere un nodo di uscita TOR, aumentando il rischio di anonimato malevolo.",

        ATTACK_SUMMARY_BASE: "Analisi tecnica dell'attaccante {ip} {geoInfo}. Livello di pericolo {dangerLevel} con intensità {intensity}. Attività rilevata dal {firstSeen} al {lastSeen} (durata: {duration}) per un totale di {totaleLogs} richieste su protocollo {protocol}. Score medio di pericolosità: {averageScore}/100. ISP rilevato: {isp}. Pattern comportamentali: {patterns}. Indicatori tecnici rilevati: {indicators}. Target primario: {sampleUrl}. {context}",
        CAMPAIGN_SUMMARY_BASE: "Rilevata Campagna di Attacco Distribuita (Hash: {hash}). La campagna coinvolge {ipCount} indirizzi IP unici e presenta {correlations} hub di correlazione temporale. Volume totale di traffico: {totaleLogs} log. Prima apparizione: {firstSeen}, Ultima apparizione: {lastSeen}. Score medio della campagna: {averageScore}/100. Pattern di attacco: {patterns}. Esempio di URL target: {sampleUrl}."
    },
    PROMPTS: {
        // Prompt per la generazione di riassunti tramite AI
        CAMPAIGN_SYSTEM: "Sei un analista SOC (Security Operations Center) esperto di Threat Intelligence. Di seguito è riportato il dump JSON aggregato di una Campagna di Attacco Distribuita, calcolata al volo dai nostri sistemi di correlazione.",
        CAMPAIGN_FOOTER: "\n\n--- INIZIO DATI JSON DELLA CAMPAGNA ---\n{jsonData}\n--- FINE DATI ---",

        ATTACK_SUMMARY: "Descrivi brevemente l'attività di questo attaccante basandoti sui dati tecnici forniti. Sii conciso e focalizzati sulla pericolosità e sulla tecnica.\n\nDati Attaccante:\n- IP: {ip}\n- Totale Colpi: {totaleLogs}\n- Score Medio: {averageScore}\n- Prima Attività: {firstSeen}\n- Ultima Attività: {lastSeen}\n- Pattern Rilevati: {patterns}\n- URL Target (campione): {sampleUrl}\n\nIstruzioni: Spiega che tipo di minaccia rappresenta questo IP e se sembra un attacco mirato o una scansione automatica di massa.",

        // Prompt per il sistema "Ask" (Q&A)
        ASK_SYSTEM: "Sei un analista esperto di cybersecurity. Rispondi alla domanda dell'utente basandoti ESCLUSIVAMENTE sul contesto fornito sotto. Se il contesto non contiene informazioni sufficienti, dillo chiaramente.\n\nContesto di Threat Intelligence:\n{contextText}\n\nDomanda: {question}\nRisposta:",

        // Etichette per i risultati materializzati
        CAMPAIGN_REPORT_LABEL: "REPORT AI CAMPAGNA: {aiSummary}\n\nDETTAGLI TECNICI AGGREGATI:\n{technicalNarrative}",
        ATTACK_REPORT_LABEL: "RIASSUNTO ANALISTA AI: {aiSummary}\n\nDETTAGLI TECNICI CORRELATI:\n{technicalNarrative}"
    },
    INTERPOLATE: (template: string, params: Record<string, string>): string => {
        let result = template;
        for (const [key, value] of Object.entries(params)) {
            result = result.replace(new RegExp(`{${key}}`, 'g'), value);
        }
        return result;
    },

    VALIDATION: {
        LIMIT_RANGE: "Il limite di ricerca deve essere compreso tra 1 e 50",
        SCORE_THRESHOLD_RANGE: "Il punteggio di soglia deve essere compreso tra 0 e 1",
        ENTITY_TYPE_NOT_SUPPORTED: "Tipo di entità non supportato: {type}",
        SORT_ORDER_INVALID: "La direzione dell'ordinamento deve essere asc o desc",
        SOURCE_REF_REQUIRED: "SourceRef deve essere un oggetto",
        SOURCE_REF_PARAMS_REQUIRED: "SourceRef.params è obbligatorio e deve essere un oggetto",
        SOURCE_TYPE_INVALID: "Tipo di sorgente non valido. Ammessi: {types}",
        MISSING_ID: "ID mancante per il tipo log",
        MISSING_IP: "IP mancante per il tipo {type}",
        MISSING_HASH: "Hash campagna mancante",
        INVALID_MIN_LOGS: "minLogsForAttack non valido o mancante"
    }

};
