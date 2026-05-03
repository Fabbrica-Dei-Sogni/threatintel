/**
 * Template per le descrizioni e i metadati dei Tool dell'Agente AI.
 * Questa struttura centralizza le stringhe descrittive per facilitare 
 * l'internazionalizzazione futura e mantenere coerenza tra ToolRegistry e RagValidator.
 */
export const TOOL_TEMPLATES = {
  SEMANTIC_SEARCH: {
    NAME: "semantic_search",
    DESCRIPTION:
      "Esegue una ricerca semantica nel database delle minacce (log, attacchi, campagne). Permette di trovare pattern, attività sospette e dettagli tecnici tramite linguaggio naturale e ordinamenti specifici.",
    FIELDS: {
      QUERY: "La query di ricerca in linguaggio naturale (es: 'attacchi brute force SSH dalla Cina')",
      TYPE: "Opzionale: filtra per tipo di entità (threat_log, ip_details, attack_summary, campaign_summary). OMETTERE questo campo se non si vuole filtrare per tipo.",
      LIMIT: "Opzionale: Numero massimo di risultati (default 5, max 20). OMETTERE questo campo per usare il default.",
      SORT_BY: "Opzionale: campo del POJO (es. timestamp, lastSeen, totalLogs, averageScore, score) su cui effettuare l'ordinamento.",
      SORT_ORDER: "Opzionale: direzione dell'ordinamento (asc = crescente, desc = decrescente). Default: desc se sortBy è presente."
    }
  },
  RESOLVE_THREAT_SOURCE: {
    NAME: "resolve_threat_source",
    DESCRIPTION:
      "Ottiene i dati tecnici completi (da MongoDB) partendo da un riferimento sorgente (sourceRef) trovato in una ricerca semantica.",
    FIELDS: {
      SOURCE_REF: "L'oggetto sourceRef integrale recuperato dall'hit della ricerca semantica.",
      PARAMS: "Parametri tecnici per la ricostruzione del dato."
    }
  },
  ASK: {
    NAME: "ask",
    DESCRIPTION:
      "Esegue una domanda libera al motore investigativo e restituisce una risposta contestualizzata (RAG).",
    FIELDS: {
      QUESTION: "Domanda libera da sottoporre all'assistente.",
      SCOPE: "Ambito opzionale della domanda."
    }
  }
};
