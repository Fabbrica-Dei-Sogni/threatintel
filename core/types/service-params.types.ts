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
 * Parametri per la ricerca e il raggruppamento degli attacchi.
 */
export interface GetAttacksParams {
    page?: number;
    pageSize?: number;
    filters?: any;
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
export interface GetCampaignsParams {
    minIps?: number;
    minScore?: number;
    minLogsPerIp?: number;
    protocol?: string;
    page?: number;
    pageSize?: number;
    timeConfig?: TimeConfig;
    selectedUris?: string[];
    search?: string;
    minCorrelations?: number;
}

/**
 * Parametri per il recupero dei dettagli e della reputazione di un IP.
 */
export interface GetIpDetailsParams {
    ip: string;
}
