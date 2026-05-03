// core/assistant/types/assistant-tool.types.ts

export interface SemanticSearchArgs {
  query: string;
  type?: 'threat_log' | 'ip_details' | 'attack_summary' | 'campaign_summary';
  limit?: number;
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

export type AssistantToolName =
  | 'semantic_search'
  | 'resolve_threat_source'
  | 'ask';

export interface AssistantToolArgumentsMap {
  semantic_search: SemanticSearchArgs;
  resolve_threat_source: ResolveThreatSourceArgs;
  ask: AskArgs;
}