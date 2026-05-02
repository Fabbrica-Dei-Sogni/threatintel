/**
 * Politiche centralizzate per la materializzazione dei dati nel RAG.
 * Definiscono i criteri di filtro, le soglie di rilevanza e gli endpoint di riferimento.
 */
export const RAG_POLICIES = {
    // Configurazione per le Anomalie (Attacchi IP-centrici)
    ATTACKS: {
        entityType: 'attack_summary',
        minLogs: 5,                  // Solo attacchi con almeno 5 log
        pageSize: 100,               // Dimensione pagina per il job
        timeWindow: { 
            agoUnit: 'h', 
            agoValue: 24             // Ultime 24 ore
        },
        apiRef: {
            endpoint: '/api/attack/details',
            method: 'POST'
        }
    },
    
    // Configurazione per le Campagne (Distributed Threats)
    CAMPAIGNS: {
        entityType: 'campaign_summary',
        minIps: 2,                   // Solo campagne con almeno 2 IP
        minScore: 0,                 // Score minimo aggregato
        minLogsPerIp: 1,             // Minimo log per IP nel cluster
        protocol: 'http',            // Protocollo di default
        pageSize: 50,                // Dimensione pagina per il job
        timeWindow: { 
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
    }
} as const;
