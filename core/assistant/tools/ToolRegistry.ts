import { AssistantToolName } from '../../types/assistant/assistant-tool.types';

export type McpToolDefinition = {
  name: AssistantToolName;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  execution: {
    endpoint: string;
    method: string;
  };
};

const TOOLS: McpToolDefinition[] = [
  {
    name: 'semantic_search',
    description:
      'Esegue una ricerca semantica nel database delle minacce (log, attacchi, campagne). Utile per trovare pattern o attività sospette descritte in linguaggio naturale.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            "La query di ricerca in linguaggio naturale (es: 'attacchi brute force SSH dalla Cina')",
        },
        type: {
          type: 'string',
          enum: [
            'threat_log',
            'ip_details',
            'attack_summary',
            'campaign_summary',
          ],
          description: 'Opzionale: filtra per tipo di entità.',
        },
        limit: {
          type: 'number',
          description: 'Numero massimo di risultati (default 5, max 20).',
        },
      },
      required: ['query'],
    },
    annotations: {
      title: 'Semantic Search',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    execution: {
      endpoint: '/assistant/search',
      method: 'POST',
    },
  },
  {
    name: 'resolve_threat_source',
    description:
      "Ottiene i dati tecnici completi (da MongoDB) partendo da un riferimento sorgente (sourceRef) trovato in una ricerca semantica.",
    inputSchema: {
      type: 'object',
      properties: {
        sourceRef: {
          type: 'object',
          description:
            "L'oggetto sourceRef integrale recuperato dall'hit della ricerca semantica.",
          properties: {
            params: {
              type: 'object',
              description: 'Parametri tecnici per la ricostruzione del dato.',
            },
          },
          required: ['params'],
        },
      },
      required: ['sourceRef'],
    },
    annotations: {
      title: 'Resolve Threat Source',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    execution: {
      endpoint: '/assistant/resolve',
      method: 'POST',
    },
  },
  {
    name: 'ask',
    description:
      "Esegue una domanda libera al motore investigativo e restituisce una risposta contestualizzata.",
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: "Domanda libera da sottoporre all'assistente.",
        },
        scope: {
          type: 'string',
          description: 'Ambito opzionale della domanda.',
        },
      },
      required: ['question'],
    },
    annotations: {
      title: 'Ask',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    execution: {
      endpoint: '/assistant/ask',
      method: 'POST',
    },
  },
];

/**
 * ToolRegistry
 * 
 * Il "Catalogo" centrale dei tool disponibili per l'Agente AI tramite MCP.
 * 
 * IL GIRO (Discovery):
 * 1. Definisce i metadati (nome, descrizione) e il contratto di input (JSON Schema).
 * 2. Viene interrogato dal McpProtocolController (metodo tools/list) per informare il client su cosa può fare.
 * 3. Viene usato dal McpNativeExecutor per validare gli argomenti prima di chiamare i Service.
 * 
 * Per aggiungere un nuovo tool:
 * 1. Aggiungi la definizione nell'array TOOLS qui sotto.
 * 2. Aggiungi il caso corrispondente nello switch-case di McpNativeExecutor.ts.
 */
export class ToolRegistry {
  public static list(): McpToolDefinition[] {
    return TOOLS;
  }

  public static listPublic() {
    return TOOLS.map(({ execution, ...tool }) => tool);
  }

  public static findByName(name: string): McpToolDefinition | undefined {
    return TOOLS.find((tool) => tool.name === name);
  }
}