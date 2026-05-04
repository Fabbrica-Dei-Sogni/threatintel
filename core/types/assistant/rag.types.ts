import { ThreatLogService } from '../../services/ThreatLogService';
import { AttackLogService } from '../../services/AttackLogService';
import { CampaignService } from '../../services/CampaignService';
import { IpDetailsService } from '../../services/IpDetailsService';
import { IThreatLog } from '../../models/ThreatLogSchema';
import AttackDTO from '../../models/dto/AttackDTO';
import { IpDetailsDTO } from '../../models/dto/IpDetailsDTO';
import { TimeConfig } from '../common.types';

/**
 * Definizione dei tipi per i payload e i riferimenti sorgente del sistema RAG.
 */

export type RagEntityType = 'threat_log' | 'attack_summary' | 'campaign_summary' | 'ip_details';

/**
 * Versione attuale dello schema dei payload RAG.
 * Incrementare questo valore quando si modificano le interfacce dei payload per forzare il re-indexing.
 */
export const RAG_SCHEMA_VERSION = 4;

/**
 * Configurazione temporale standard per il sistema RAG.
 * Alias di TimeConfig per mantenere compatibilità.
 */
export type RagTimeConfig = TimeConfig;

/**
 * Parametri derivati dai Service per garantire coerenza "Type-Driven".
 */

export type LogSourceParams = Parameters<ThreatLogService['getLogById']>[0] & { type: 'log' };

export type IpDetailsSourceParams = Parameters<IpDetailsService['getIpDetails']>[0] & { type: 'ip_details' };

export type AttackSourceParams = Parameters<AttackLogService['getAttackDetail']>[0] & { type: 'attack' };

export type CampaignSourceParams = Parameters<CampaignService['getCampaignDetail']>[0] & { type: 'campaign' };

export type AttackSearchSourceParams = Parameters<AttackLogService['getAttacks']>[0] & { type: 'search_attack' };
export type CampaignSearchSourceParams = Parameters<CampaignService['getCampaigns']>[0] & { type: 'search_campaign' };


export type RagSourceParams = LogSourceParams | IpDetailsSourceParams | AttackSourceParams | CampaignSourceParams | AttackSearchSourceParams | CampaignSearchSourceParams;

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
    schemaVersion: number;   // Versione dello schema per migrazioni future
}

/**
 * Payload specifico per un singolo log atomico.
 * Estende i campi principali di IThreatLog.
 */
export interface ThreatLogPayload extends RagBasePayload, Partial<IThreatLog> {
    type: 'threat_log';
    mongoId: string;
    ip: string;
    timestamp: Date;
    score: number;
    status?: 'active' | 'archived' | 'deleted';
}

/**
 * Payload specifico per un riassunto di anomalia (attacco IP).
 * Estende AttackDTO per fornire contesto tecnico immediato all'Agente.
 */
export interface AttackSummaryPayload extends RagBasePayload, Partial<AttackDTO> {
    type: 'attack_summary';
    ip: string;
    totaleLogs: number;
    averageScore: number;
    status?: 'active' | 'archived' | 'deleted';
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
    totaleLogs?: number;
    averageScore?: number;
    firstSeen?: Date;
    lastSeen?: Date;
    status?: 'active' | 'archived' | 'deleted';
}

/**
 * Payload specifico per i dettagli tecnici e reputazionali di un IP.
 * Estende IpDetailsDTO.
 */
export interface IpDetailsPayload extends RagBasePayload, Partial<IpDetailsDTO> {
    type: 'ip_details';
    mongoId: string;
    ip: string;
    lastSeen: Date;
}

/**
 * Risultato di una ricerca semantica standardizzato.
 */
export interface RagSearchHit {
    id: string | number;
    score: number;
    text: string;
    sourceRef: RagSourceRef;
}

/**
 * Risposta del sistema RAG ad una domanda (Ask).
 */
export interface RagAskResponse {
    question: string;
    answer: string;
    sources: RagSearchHit[];
}

/**
 * Opzioni per la ricerca semantica.
 */
export interface RagSearchOptions {
    limit?: number;
    scoreThreshold?: number;
    type?: RagEntityType;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: 'active' | 'archived' | 'deleted';
}

/**
 * Struttura di un risultato di ricerca semantica "diretta", ovvero quando il sistema RAG è in grado di restituire un risultato già "narrato" e arricchito, senza necessità di ulteriori chiamate API.
 */
export interface DirectSearchHit {
    id: string;
    score: number;
    text: string;           // narrazione come ora
    summary: Record<string, any>;  // i campi chiave dell'oggetto (ip, paese, score, pattern...)
    resolveRef?: RagSourceRef;     // opzionale: solo se vuoi permettere il drill-down
}
