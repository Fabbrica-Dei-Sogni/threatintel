/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */

/**
 * AttackDTO - Rappresenta un aggregato di attacchi provenienti da un singolo IP
 * con analisi euristica, forense e arricchimento dati.
 */
export default class AttackDTO {
    // Identificativi
    _id?: string; // Spesso corrisponde all'IP nell'aggregato
    id?: string;  // UUID univoco della sessione di attacco
    isDistributed?: boolean; // Indica se l'attacco è distribuito su più IP
    // [SORTABLE] Indirizzo IP
    ip?: string;

    // Stato del log (active, archived, deleted)
    status?: 'active' | 'archived' | 'deleted';
    
    // [SORTABLE] Timestamps
    timestamp?: string; // ISO Date
    firstSeen?: string; // ISO Date
    lastSeen?: string;  // ISO Date
    
    // Protocollo utilizzato (http, telnet, ssh, ecc.)
    protocol?: string;

    // Dati di Geolocalizzazione
    geo?: {
        // [SORTABLE] Codice nazione (DE, IT, FR...)
        country?: string;
        region?: string;
        city?: string;
        coordinates?: [number, number]; // [lat, lon]
        timezone?: string;
    };

    // Analisi del Rischio e Score
    // [SORTABLE] Punteggio di pericolosità calcolato (0-100)
    dangerScore?: number;
    // [SORTABLE] Livello di pericolosità (numerico o enum)
    dangerLevel?: number | string;
    // [SORTABLE] Somma totale degli score dei singoli log
    sumScore?: number;
    // [SORTABLE] Media dello score per richiesta
    averageScore?: number;

    // Metriche di Volume e Intensità
    // [SORTABLE] Numero totale di eventi/log raggruppati
    totaleLogs?: number;
    // Alias per compatibilità con alcuni service e template
    totalLogs?: number;
    // [SORTABLE] Richieste per secondo
    rps?: number;
    // Descrizione testuale dell'intensità (es: "burst prolungato")
    intensityAttack?: string;
    rpsStyle?: string;
    intensityWeight?: number;

    // Durata dell'attacco
    // [SORTABLE] Durata in millisecondi
    attackDurationMs?: number;
    attackDurationMinutes?: number;
    durataAttacco?: {
        ms?: number;
        minutes?: number;
        human?: string; // Es: "1.8 min"
    };

    // Impronta digitale e Analisi Strumenti
    fingerprint: {
        hash?: string;
        suspicious?: boolean;
        score?: number;
        indicators?: string[];
        reasons?: string[]; // Mantengo per compatibilità
        riskLevel?: string; // Mantengo per compatibilità
    } = {};
    
    fingerprintAnalysis?: {
        userAgentCount?: number;
        userAgents?: string[];
        isTool?: boolean;
    };
    
    // [SORTABLE] Punteggio specifico per l'uso di tool (nmap, ecc.)
    toolRiskScore?: number;

    // Analisi dei Pattern e Payload
    attackPatterns?: string[];
    uniqueTechCount?: number;
    uniqueTechNorm?: number;
    payloadAnalysis?: {
        highRiskMatches?: string[];
    };
    // [SORTABLE] Rischio calcolato sui payload
    payloadRiskScore?: number;

    // Analisi della Sequenza (Brute force, movimenti laterali)
    sequenceAnalysis?: {
        lastCode?: number;
        bruteForceSuccess?: boolean;
        lateralMovement?: boolean;
    };
    sequenceRiskScore?: number;

    // Eventi di Rate Limiting
    // [SORTABLE] Quante volte l'IP è andato in rate limit
    countRateLimit?: number;
    rateLimitList?: any[];

    // Richiesta e Risposta (Dati aggregati o dell'ultimo evento)
    request: {
        ip?: string;
        url?: string;
        method?: string;
        userAgent?: string;
        headers?: Record<string, string>;
        body?: any;
        query?: Record<string, any>;
    } = {};
    
    response: {
        statusCode?: number;
        responseTime?: number;
        size?: number;
        body?: any;
    } = {};

    // Metadati e Flag
    metadata: {
        isBot?: boolean;
        isCrawler?: boolean;
    } = {};

    // Dati di Arricchimento (Popolati da IpDetailsService / AbuseIPDB)
    ipDetailsId?: string;
    ipDetails?: any;

    // I log atomici che compongono l'aggregato
    logsRaggruppati?: any[];
    
    // Campi di normalizzazione interni (usati dalle pipeline)
    rpsNorm?: number;
    durNorm?: number;
    scoreNorm?: number;
    durDecay?: number;
    durNormPenalized?: number;
    __v?: number;

    constructor(init?: Partial<AttackDTO>) {
        Object.assign(this, init);
    }
}
