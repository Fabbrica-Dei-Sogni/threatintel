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
        minLogs: 10,                  // Alzata soglia per ridurre rumore (allineata a dashboard)
        pageSize: 50,                // Dimensione pagina per il job di sincronizzazione
        protocol: '',            // Filtro per protocollo (coerente con dashboard)
        timeConfig: { 
            timeMode: 'ago',
            agoUnit: 'days', 
            agoValue: 10              // Finestra ridotta a 1 ora per il sync periodico (più efficiente)
        },
        apiRef: {
            endpoint: '/api/attack/details',
            method: 'POST'
        }
    },
    
    // Configurazione per le Campagne (Cluster di Fingerprint)
    CAMPAIGNS: {
        entityType: 'campaign_summary',
        minIps: 5,                   
        minScore: 0,                 
        minLogsPerIp: 2,             
        protocol: 'http',            
        pageSize: 50,                
        timeConfig: { 
            timeMode: 'ago',
            agoUnit: 'days', 
            agoValue: 30             // Finestra ridotta a 1 ora per coerenza con gli attacchi
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
