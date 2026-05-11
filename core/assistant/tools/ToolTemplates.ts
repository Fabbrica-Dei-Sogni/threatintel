/**
 * Template per le descrizioni e i metadati dei Tool dell'Agente AI.
 * Questa struttura centralizza le stringhe descrittive per facilitare 
 * l'internazionalizzazione futura e mantenere coerenza tra ToolRegistry e RagValidator.
 * 
 * Le descrizioni sono ottimizzate per guidare l'Agente AI verso un utilizzo 
 * corretto e sequenziale dei tool: SEARCH -> RESOLVE.
 */
export const TOOL_TEMPLATES = {
  SEMANTIC_SEARCH: {
    NAME: "semantic_search",
    DESCRIPTION:
      "Punto di ingresso per ogni investigazione. Esegue una ricerca semantica basata su narrazioni tecniche generate dal sistema. " +
      "Permette di individuare pattern, IP specifici, URL target o attività sospette. " +
      "Restituisce un riassunto narrativo (text) e un riferimento tecnico (sourceRef) da passare obbligatoriamente a resolve_threat_source per ottenere i dati integrali.",
    FIELDS: {
      QUERY: "La query investigativa. Può contenere IP specifici, URL, protocolli o descrizioni di attacchi (es: '1.2.3.4', '/admin/login', 'tentativi brute force').",
      TYPE: "Filtra il dominio: 'threat_log' (eventi atomici filtrabili per IP/URL), 'ip_details' (reputazione IP), 'attack_summary' (analisi comportamentale di un IP), 'campaign_summary' (cluster distribuiti identificati tramite hash o pattern condivisi).",
      LIMIT: "Numero di risultati. Default 5. Usare valori bassi per precisione su singoli IP, valori alti per analisi di trend.",
      SORT_BY: "Campo tecnico per l'ordinamento (es. 'score' per pericolosità, 'timestamp' per cronologia, 'totaleLogs' per volume).",
      SORT_ORDER: "Direzione: 'desc' (default per score/volume) o 'asc' (per i log più vecchi).",
      STATUS: "Stato del log: 'active' (default), 'archived' (storico/whitelist), 'deleted' (cestino).",
    }
  },
  RESOLVE_THREAT_SOURCE: {
    NAME: "resolve_threat_source",
    DESCRIPTION:
      "STRUMENTO DI ANALISI DETTAGLIATA. Deve essere usato DOPO semantic_search quando viene individuato un evento o un'entità rilevante. " +
      "Recupera il dato RAW integrale (JSON) da MongoDB partendo dal sourceRef. " +
      "Fornisce dettagli forensi non presenti nella ricerca semantica: geo-location completa, payload integrali, header HTTP, e metriche di scoring granulari.",
    FIELDS: {
      SOURCE_REF: "L'oggetto sourceRef INTEGRALE ricevuto da semantic_search. Non modificare questo oggetto.",
      PARAMS: "Parametri tecnici interni estratti dal sourceRef."
    }
  },
  ASK: {
    NAME: "ask",
    DESCRIPTION:
      "Interfaccia di sintesi esperta (RAG). Da usare per domande di alto livello, correlazioni cross-entità o spiegazioni concettuali del rischio. " +
      "Utilizza il contesto recuperato per fornire risposte elaborate. Utile per: 'Sintetizza i tratti comuni degli ultimi attacchi', 'Qual è la pericolosità media degli IP rilevati oggi?'.",
    FIELDS: {
      QUESTION: "La domanda complessa da sottoporre all'analista virtuale.",
      SCOPE: "Contesto opzionale (es. 'focus su protocollo SSH')."
    }
  },

  SEARCH_LOGS: {
    NAME: "search_logs",
    DESCRIPTION:
      "Ricerca diretta su MongoDB dei log atomici, SENZA passare per Qdrant. " +
      "Usare quando la domanda riguarda eventi singoli o parametri specifici: 'log dell'IP 1.2.3.4', 'log HTTP delle ultime 2 ore', 'log sospetti con score > 50'. " +
      "Restituisce una lista di log con resolveRef pronto per resolve_threat_source.",
    FIELDS: {
      START_DATE: "Data di inizio in formato ISO8601 (YYYY-MM-DD).",
      END_DATE: "Data di fine in formato ISO8601 (YYYY-MM-DD).",
      IP: "Filtra per IP esatto.",
      URL: "Filtra per URL o parte di esso (es: '/admin', '.php').",
      PROTOCOL: "Filtra per protocollo: 'http', 'ssh', 'ftp'.",
      MIN_SCORE: "Score minimo del log (0-100).",
      LIMIT: "Numero massimo di risultati. Default: 20.",
      OFFSET: "Numero di risultati da saltare per paginazione.",
      SORT_BY: "Campo di ordinamento: 'timestamp', 'fingerprint.score'.",
      SORT_ORDER: "'desc' (default) o 'asc'.",
      USER_AGENT: "Filtra per User-Agent o parte di esso (es: 'Nmap', 'python-requests').",
      STATUS: "Stato del log: 'active' (default), 'archived', 'deleted'."
    }
  },

 SEARCH_ATTACKS: {
    NAME: "search_attacks",
    DESCRIPTION:
      "Ricerca diretta su MongoDB degli attacchi aggregati per IP, SENZA passare per Qdrant. " +
      "Usare quando la domanda è temporale o parametrica: 'ultimi 10 giorni', 'attacchi dalla Cina', 'attacchi SSH con dangerScore 5'. " +
      "Filtri disponibili: dateFrom/dateTo (ISO8601), ip (stringa esatta), country (codice ISO: IT, CN, RU...), " +
      "protocol (http, ssh, ftp), dangerScore (1-5), minLogs (soglia minima log per IP). " +
      "Restituisce una lista di attacchi con sourceRef pronto per resolve_threat_source.",
    FIELDS: {
      DATE_FROM: "Data di inizio in formato ISO8601 (YYYY-MM-DD). Calcolata dinamicamente dall'agente (es: 'ultimi 10 giorni' → now - 10d).",
      DATE_TO: "Data di fine in formato ISO8601 (YYYY-MM-DD). Default: ora corrente.",
      IP: "Filtra per IP esatto.",
      COUNTRY: "Filtra per paese di origine (codice ISO: CN, RU, US, IT...).",
      PROTOCOL: "Filtra per protocollo: 'http', 'ssh', 'ftp'.",
      DANGER_SCORE: "Filtra per livello di pericolo (1=Critico, 5=Informativo).",
      MIN_LOGS: "Numero minimo di log per considerare un IP come attacco. Default: 10.",
      LIMIT: "Numero massimo di risultati. Default: 20.",
      OFFSET: "Numero di risultati da saltare per paginazione.",
      SORT_BY: "Campo di ordinamento: 'lastSeen', 'totaleLogs', 'dangerScore', 'averageScore'.",
      SORT_ORDER: "'desc' (default) o 'asc'.",
      USER_AGENT: "Filtra per User-Agent utilizzato nell'attacco (es: 'sqlmap', 'Mozilla/5.0').",
      STATUS: "Stato del log: 'active' (default), 'archived' (storico/whitelist), 'deleted' (cestino)."
    }
  },

  SEARCH_CAMPAIGNS: {
    NAME: "search_campaigns",
    DESCRIPTION:
      "Ricerca diretta su MongoDB delle campagne distribuite, SENZA passare per Qdrant. " +
      "Usare quando la domanda riguarda attività coordinate multi-IP: 'campagne degli ultimi 7 giorni', 'campagne SSH con più di 5 IP'. " +
      "Filtri disponibili: dateFrom/dateTo (ISO8601), protocol, minIps (numero minimo IP coinvolti), " +
      "minScore (score minimo), minLogsPerIp (log minimi per IP partecipante). " +
      "Restituisce una lista di campagne con sourceRef pronto per resolve_threat_source.",
    FIELDS: {
      DATE_FROM: "Data di inizio in formato ISO8601 (YYYY-MM-DD).",
      DATE_TO: "Data di fine in formato ISO8601 (YYYY-MM-DD).",
      PROTOCOL: "Filtra per protocollo: 'http', 'ssh', 'ftp'.",
      MIN_IPS: "Numero minimo di IP coinvolti nella campagna.",
      MIN_SCORE: "Score medio minimo della campagna.",
      MIN_LOGS_PER_IP: "Log minimi per ciascun IP partecipante.",
      LIMIT: "Numero massimo di risultati. Default: 20.",
      OFFSET: "Numero di risultati da saltare per paginazione.",
      SORT_BY: "Campo di ordinamento: 'lastSeen', 'firstSeen', 'ipCount', 'totaleLogs', 'averageScore'.",
      SORT_ORDER: "'desc' (default) o 'asc'.",
      USER_AGENT: "Filtra per User-Agent coinvolto nella campagna (es: 'Zgrab', 'Go-http-client').",
      STATUS: "Stato dei log della campagna: 'active' (default), 'archived', 'deleted'."
    }
  },
  GET_STATS: {
    NAME: "get_stats",
    DESCRIPTION:
      "Strumento di analisi aggregata e trend. Da usare quando la domanda riguarda volumi, distribuzioni o classifiche: 'Quali sono i paesi più attivi?', 'Quanti log sospetti oggi?', 'Top 5 indicatori di attacco'. " +
      "Permette di avere una visione d'insieme su migliaia di log senza scaricarli singolarmente.",
    FIELDS: {
      TIMEFRAME: "Periodo di analisi: '24h' (default), '1w', '1m', '1y', 'all'.",
      MIN_SCORE: "Score minimo per considerare un log come sospetto nelle statistiche. Default: 15.",
      LIMIT: "Numero di elementi nelle classifiche (Top N). Default: 10.",
      MIN_LOGS: "Soglia minima di log per IP per essere incluso nelle statistiche. Default: 1."
    }
  }
};
