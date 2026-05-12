/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import { AssistantToolName } from '../../types/assistant/assistant-tool.types';
import { TOOL_TEMPLATES } from './ToolTemplates';

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
    name: TOOL_TEMPLATES.SEMANTIC_SEARCH.NAME as AssistantToolName,
    description: TOOL_TEMPLATES.SEMANTIC_SEARCH.DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: TOOL_TEMPLATES.SEMANTIC_SEARCH.FIELDS.QUERY,
        },
        type: {
          type: 'string',
          enum: [
            'threat_log',
            'ip_details',
            'attack_summary',
            'campaign_summary',
          ],
          description: TOOL_TEMPLATES.SEMANTIC_SEARCH.FIELDS.TYPE,
        },
        limit: {
          type: 'number',
          description: TOOL_TEMPLATES.SEMANTIC_SEARCH.FIELDS.LIMIT,
        },
        sortBy: {
          type: 'string',
          description: TOOL_TEMPLATES.SEMANTIC_SEARCH.FIELDS.SORT_BY,
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: TOOL_TEMPLATES.SEMANTIC_SEARCH.FIELDS.SORT_ORDER,
        },
        status: {
          type: 'string',
          enum: ['active', 'archived', 'deleted'],
          description: TOOL_TEMPLATES.SEMANTIC_SEARCH.FIELDS.STATUS,
        }        
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
    name: TOOL_TEMPLATES.RESOLVE_THREAT_SOURCE.NAME as AssistantToolName,
    description: TOOL_TEMPLATES.RESOLVE_THREAT_SOURCE.DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        sourceRef: {
          type: 'object',
          description: TOOL_TEMPLATES.RESOLVE_THREAT_SOURCE.FIELDS.SOURCE_REF,
          properties: {
            params: {
              type: 'object',
              description: TOOL_TEMPLATES.RESOLVE_THREAT_SOURCE.FIELDS.PARAMS,
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
    name: TOOL_TEMPLATES.ASK.NAME as AssistantToolName,
    description: TOOL_TEMPLATES.ASK.DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: TOOL_TEMPLATES.ASK.FIELDS.QUESTION,
        },
        scope: {
          type: 'string',
          description: TOOL_TEMPLATES.ASK.FIELDS.SCOPE,
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

  // ── NUOVO: search_attacks ─────────────────────────────────────────────────
  {
    name: TOOL_TEMPLATES.SEARCH_ATTACKS.NAME as AssistantToolName,
    description: TOOL_TEMPLATES.SEARCH_ATTACKS.DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom:    { type: 'string',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.DATE_FROM },
        dateTo:      { type: 'string',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.DATE_TO },
        ip:          { type: 'string',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.IP },
        country:     { type: 'string',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.COUNTRY },
        protocol:    { type: 'string',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.PROTOCOL },
        dangerScore: { type: 'number',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.DANGER_SCORE },
        minLogs:     { type: 'number',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.MIN_LOGS },
        limit:       { type: 'number',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.LIMIT },
        offset:      { type: 'number',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.OFFSET },
        sortBy:      { type: 'string',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.SORT_BY },
        sortOrder:   { type: 'string',  enum: ['asc', 'desc'], description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.SORT_ORDER },
        userAgent:   { type: 'string',  description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.USER_AGENT },
        status:      { type: 'string',  enum: ['active', 'archived', 'deleted'], description: TOOL_TEMPLATES.SEARCH_ATTACKS.FIELDS.STATUS },
      },
      required: [],
    },
    annotations: { title: 'Search Attacks', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    execution: { endpoint: '/assistant/attacks', method: 'POST' },
  },

  // ── NUOVO: search_campaigns ───────────────────────────────────────────────
  {
    name: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.NAME as AssistantToolName,
    description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom:      { type: 'string',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.DATE_FROM },
        dateTo:        { type: 'string',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.DATE_TO },
        protocol:      { type: 'string',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.PROTOCOL },
        minIps:        { type: 'number',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.MIN_IPS },
        minScore:      { type: 'number',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.MIN_SCORE },
        minLogsPerIp:  { type: 'number',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.MIN_LOGS_PER_IP },
        limit:         { type: 'number',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.LIMIT },
        offset:        { type: 'number',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.OFFSET },
        sortBy:        { type: 'string',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.SORT_BY },
        sortOrder:     { type: 'string',  enum: ['asc', 'desc'], description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.SORT_ORDER },
        userAgent:     { type: 'string',  description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.USER_AGENT },
        status:        { type: 'string',  enum: ['active', 'archived', 'deleted'], description: TOOL_TEMPLATES.SEARCH_CAMPAIGNS.FIELDS.STATUS },
      },
      required: [],
    },
    annotations: { title: 'Search Campaigns', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    execution: { endpoint: '/assistant/campaigns', method: 'POST' },
  },

  // ── NUOVO: search_logs ────────────────────────────────────────────────────
  {
    name: TOOL_TEMPLATES.SEARCH_LOGS.NAME as AssistantToolName,
    description: TOOL_TEMPLATES.SEARCH_LOGS.DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.START_DATE },
        endDate: { type: 'string', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.END_DATE },
        ip: { type: 'string', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.IP },
        url: { type: 'string', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.URL },
        protocol: { type: 'string', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.PROTOCOL },
        minScore: { type: 'number', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.MIN_SCORE },
        limit: { type: 'number', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.LIMIT },
        offset: { type: 'number', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.OFFSET },
        sortBy: { type: 'string', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.SORT_BY },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.SORT_ORDER },
        userAgent: { type: 'string', description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.USER_AGENT },
        status: { type: 'string', enum: ['active', 'archived', 'deleted'], description: TOOL_TEMPLATES.SEARCH_LOGS.FIELDS.STATUS },
      },
      required: [],
    },
    annotations: { title: 'Search Logs', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    execution: { endpoint: '/assistant/logs', method: 'POST' },
  },
  {
    name: TOOL_TEMPLATES.GET_STATS.NAME as AssistantToolName,
    description: TOOL_TEMPLATES.GET_STATS.DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', enum: ['24h', '1w', '1m', '1y', 'all'], description: TOOL_TEMPLATES.GET_STATS.FIELDS.TIMEFRAME },
        minScore: { type: 'number', description: TOOL_TEMPLATES.GET_STATS.FIELDS.MIN_SCORE },
        limit: { type: 'number', description: TOOL_TEMPLATES.GET_STATS.FIELDS.LIMIT },
        minLogs: { type: 'number', description: TOOL_TEMPLATES.GET_STATS.FIELDS.MIN_LOGS },
      },
    },
    annotations: { title: 'Get Stats', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    execution: { endpoint: '/assistant/stats', method: 'GET' },
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