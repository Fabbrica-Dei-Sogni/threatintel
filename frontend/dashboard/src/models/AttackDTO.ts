import type { TimeConfig } from "./CommonDTO";

// Definizioni tipi (personalizzabili in base allo schema esatto)
export interface AttackLog {
    // Definizione minima esemplificativa
    _id: string;
    // Altre proprietà come da modello Mongo o DTO backend
    [key: string]: any;
}

export interface FetchAttackSearchParams {
    page: number;
    pageSize: number;
    filters: Record<string, string>;
    minLogsForAttack: number;
    timeConfig: TimeConfig;
    sortFields: Record<string, 1 | -1> | null;
}

export interface FetchAttackSearchResponse {
    attacks: AttackLog[];
    total: number;
    page: number;
    pageSize: number;
}