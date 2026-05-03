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
      SORT_BY: "Campo tecnico per l'ordinamento (es. 'score' per pericolosità, 'timestamp' per cronologia, 'totalLogs' per volume).",
      SORT_ORDER: "Direzione: 'desc' (default per score/volume) o 'asc' (per i log più vecchi)."
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
  }
};
