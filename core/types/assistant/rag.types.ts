/**
 * Definizione dei tipi per i payload e i riferimenti sorgente del sistema RAG.
 */

export type RagEntityType = 'threat_log' | 'attack_summary' | 'campaign_summary' | 'ip_details';

/**
 * Parametri specifici per la ricostruzione di un Log
 */
export interface LogSourceParams {
    type: 'log';
    id: string;
}

/**
 * Parametri specifici per la ricostruzione di un Attacco (Anomalia)
 */
export interface AttackSourceParams {
    type: 'attack';
    ip: string;
    minLogsForAttack: number;
    timeWindow: { agoUnit: string, agoValue: number };
}

/**
 * Parametri specifici per la ricostruzione di una Campagna
 */
export interface CampaignSourceParams {
    type: 'campaign';
    campaignId: string;
    minIps: number;
    minScore: number;
    minLogsPerIp: number;
    timeWindow: { agoUnit: string, agoValue: number };
    protocol: string;
}

export type RagSourceParams = LogSourceParams | AttackSourceParams | CampaignSourceParams;

/**
 * Riferimento alla sorgente originale del dato (API).
 * Permette all'Agente AI di sapere come recuperare i dati tecnici completi.
 */
export interface RagSourceRef {
    endpoint: string;
    method: 'GET' | 'POST';
    params: RagSourceParams;
}

/**
 * Struttura base di un payload memorizzato su Qdrant.
 */
export interface RagBasePayload {
    type: RagEntityType;
    text: string;           // La narrazione prodotta dal traduttore o dall'AI
    materializedAt: Date;   // Timestamp di quando il vettore è stato generato
    sourceRef: RagSourceRef; // Link all'API originale
}

/**
 * Payload specifico per un singolo log atomico.
 */
export interface ThreatLogPayload extends RagBasePayload {
    type: 'threat_log';
    mongoId: string;
    ip: string;
    timestamp: Date;
    score: number;
}

/**
 * Payload specifico per un riassunto di anomalia (attacco IP).
 */
export interface AttackSummaryPayload extends RagBasePayload {
    type: 'attack_summary';
    ip: string;
    totalLogs: number;
    averageScore: number;
}

/**
 * Payload specifico per un riassunto di campagna distribuita.
 */
export interface CampaignSummaryPayload extends RagBasePayload {
    type: 'campaign_summary';
    campaignId: string;
    ipCount: number;
    protocols: string[];
    topIps: string[];
}
