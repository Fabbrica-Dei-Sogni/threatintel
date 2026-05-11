// core/assistant/types/assistant-tool.types.ts


export interface SemanticSearchArgs {
  query: string;
  type?: 'threat_log' | 'ip_details' | 'attack_summary' | 'campaign_summary';
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: 'active' | 'archived' | 'deleted';
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
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userAgent?: string;
  status?: 'active' | 'archived' | 'deleted';
}

export interface SearchLogArgs {
  ip?: string;
  url?: string;
  protocol?: string;
  startDate?: Date;
  endDate?: Date;
  minScore?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userAgent?: string;
  status?: 'active' | 'archived' | 'deleted';
}

export interface SearchCampaignsArgs {
  dateFrom?: string;
  dateTo?: string;
  protocol?: string;
  minIps?: number;
  minScore?: number;
  minLogsPerIp?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userAgent?: string;
  status?: 'active' | 'archived' | 'deleted';
}

export interface SearchGetStatsArgs {
  timeframe?: '24h' | '1w' | '1m' | '1y' | 'all';
  minScore?: number;
  limit?: number;
  minLogs?: number;
}



export enum AssistantToolName {
  SEMANTIC_SEARCH = 'semantic_search',
  RESOLVE_THREAT_SOURCE = 'resolve_threat_source',
  ASK = 'ask',
  SEARCH_LOGS = 'search_logs',
  SEARCH_ATTACKS = 'search_attacks',
  SEARCH_CAMPAIGNS = 'search_campaigns',
  GET_STATS = 'get_stats'
}

export interface AssistantToolArgumentsMap {
  semantic_search: SemanticSearchArgs;
  resolve_threat_source: ResolveThreatSourceArgs;
  ask: AskArgs;
  search_logs: SearchLogArgs;     // ← nuovo
  search_attacks: SearchAttacksArgs;     // ← nuovo
  search_campaigns: SearchCampaignsArgs; // ← nuovo  
  get_stats: SearchGetStatsArgs;
}