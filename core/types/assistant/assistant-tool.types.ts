// core/assistant/types/assistant-tool.types.ts

import { GetAttacksParams, GetCampaignsParams } from "../service-params.types";

export interface SemanticSearchArgs {
  query: string;
  type?: 'threat_log' | 'ip_details' | 'attack_summary' | 'campaign_summary';
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ResolveThreatSourceArgs {
  sourceRef: {
    params: Record<string, unknown>;
  };
}

export interface AskArgs {
  question: string;
  scope?: string;
}

export interface SearchAttacksArgs {
  dateFrom?: string;
  dateTo?: string;
  ip?: string;
  country?: string;
  protocol?: string;
  dangerScore?: number;
  minLogs?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchCampaignsArgs {
  dateFrom?: string;
  dateTo?: string;
  protocol?: string;
  minIps?: number;
  minScore?: number;
  minLogsPerIp?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}


export type AssistantToolName =
  | 'semantic_search'
  | 'resolve_threat_source'
  | 'ask'
  | 'search_attacks'     // ← nuovo
  | 'search_campaigns';  // ← nuovo

export interface AssistantToolArgumentsMap {
  semantic_search: SemanticSearchArgs;
  resolve_threat_source: ResolveThreatSourceArgs;
  ask: AskArgs;
  search_attacks: SearchAttacksArgs;     // ← nuovo
  search_campaigns: SearchCampaignsArgs; // ← nuovo  
}