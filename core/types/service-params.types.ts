import { TimeConfig } from './common.types';

/**
 * Parametri per il recupero del dettaglio di un attacco (IP-centrico).
 */
export interface GetAttackDetailParams {
    ip: string;
    minLogsForAttack?: number;
    timeConfig?: TimeConfig;
    protocol?: string | null;
}

/**
 * Parametri per il recupero di un singolo log tramite ID.
 */
export interface GetLogByIdParams {
    id: string;
}

/**
 * Filtro specifico per la ricerca degli attacchi.
 */
export interface AttackFilter {
    'request.ip'?: string;
    'request.url'?: string;
    'request.method'?: string;
    protocol?: string;
    timestamp?: string | any;
    dangerLevel?: string | number | number[];
    'fingerprint.hash'?: string;
    totaleLogs?: number | any;
    dangerScore?: number | any;
    averageScore?: number | any;
    attackPatterns?: string;
}

/**
 * Filtro specifico per la ricerca delle campagne.
 */
export interface CampaignFilter {
    minIps?: number;
    minScore?: number;
    minLogsPerIp?: number;
    minCorrelations?: number;
    protocol?: string;
    startTime?: string;
    endTime?: string;
    timeMode?: 'ago' | 'range';
    agoValue?: number;
    agoUnit?: string;
    selectedUris?: string[];
    search?: string;
}

/**
 * Parametri per la ricerca e il raggruppamento degli attacchi.
 */
export interface GetAttacksParams {
    page?: number;
    pageSize?: number;
    filters?: AttackFilter;
    minLogsForAttack?: number;
    timeConfig?: TimeConfig;
    sortFields?: any;
}

/**
 * Parametri per il recupero del dettaglio di una campagna (Hash-centrica).
 */
export interface GetCampaignDetailParams {
    hash: string;
    minScore?: number;
    minLogsPerIp?: number;
    protocol?: string | null;
    timeConfig?: TimeConfig;
    page?: number;
    pageSize?: number;
}

/**
 * Parametri per la ricerca e il discovery delle campagne.
 */
export interface GetCampaignsParams extends CampaignFilter {
    page?: number;
    pageSize?: number;
    timeConfig?: TimeConfig;
}

/**
 * Parametri per il recupero dei dettagli e della reputazione di un IP.
 */
export interface GetIpDetailsParams {
    ip: string;
}
