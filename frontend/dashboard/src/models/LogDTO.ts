/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

// Definizioni tipi per i dati
export interface Log {
    // Definisci qui le proprietà del log in base al tuo modello, ad esempio:
    _id: string;
    request: {
        ip: string;
        url: string;
        method?: string;
        [key: string]: any;
    };
    fingerprint?: {
        score?: number;
    };
    timestamp?: string | number;
    [key: string]: any;
}

export interface FetchSearchParams {
    page: number;
    pageSize: number;
    filters: Record<string, string>;
    sortFields: Record<string, 1 | -1> | null;
}

export interface FetchSearchResponse {
    logs: Log[];
    total: number;
    page?: number;
    pageSize?: number;
}