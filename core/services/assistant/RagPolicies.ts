/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import { RagEntityType, RagTimeConfig } from "../../types/assistant/rag.types";

export interface RagPolicy {
    entityType: RagEntityType;
    minScore?: number;
    minLogs?: number;
    minIps?: number;
    minLogsPerIp?: number;
    protocol?: string;
    pageSize?: number;
    timeConfig?: RagTimeConfig;
    apiRef: {
        endpoint: string;
        method: 'GET' | 'POST';
    };
}

export const RAG_POLICIES = {
    // Configurazione per le Anomalie (Attacchi raggruppati per IP)
    ATTACKS: {
        entityType: 'attack_summary',
        minLogs: 5,                   // Solo attacchi con almeno 5 log
        pageSize: 50,                // Dimensione pagina per il job di sincronizzazione
        timeConfig: { 
            timeMode: 'ago',
            agoUnit: 'h', 
            agoValue: 24             // Ultime 24 ore
        },
        apiRef: {
            endpoint: '/api/attack/details',
            method: 'POST'
        }
    },
    
    // Configurazione per le Campagne (Cluster di Fingerprint)
    CAMPAIGNS: {
        entityType: 'campaign_summary',
        minIps: 2,                   // Solo campagne con almeno 2 IP
        minScore: 0,                 // Score minimo aggregato
        minLogsPerIp: 1,             // Minimo log per IP nel cluster
        protocol: 'http',            // Protocollo di default
        pageSize: 50,                // Dimensione pagina per il job
        timeConfig: { 
            timeMode: 'ago',
            agoUnit: 'h', 
            agoValue: 24             // Ultime 24 ore
        },
        apiRef: {
            endpoint: '/api/campaign/details',
            method: 'POST'
        }
    },

    // Configurazione per i Log Atomici
    LOGS: {
        entityType: 'threat_log',
        minScore: 3,                 // Solo log con score >= 3
        apiRef: {
            endpoint: '/api/threats/logs/:id',
            method: 'GET'
        }
    },

    // Configurazione per la Reputazione IP
    IP_DETAILS: {
        entityType: 'ip_details',
        apiRef: {
            endpoint: '/api/ipdetail/:ip',
            method: 'GET'
        }
    }
} as const;
