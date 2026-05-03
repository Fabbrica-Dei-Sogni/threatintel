// src/assistant/mcp/McpTypes.ts

export type JsonRpcId = string | number | null;

export interface JsonRpcBase {
  jsonrpc: '2.0';
}

export interface JsonRpcRequest extends JsonRpcBase {
  id?: JsonRpcId;
  method: string;
  params?: any;
}

export interface JsonRpcSuccess extends JsonRpcBase {
  id: JsonRpcId;
  result: any;
}

export interface JsonRpcError extends JsonRpcBase {
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcSuccess
  | JsonRpcError;

export const JsonRpcErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

/* ---------- initialize ---------- */

export interface InitializeRequestParams {
  protocolVersion: string;
  capabilities: {
    roots?: {
      listChanged?: boolean;
    };
    sampling?: Record<string, any>;
    experimental?: Record<string, any>;
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: {
    logging?: Record<string, any>;
    prompts?: {
      listChanged?: boolean;
    };
    resources?: {
      subscribe?: boolean;
      listChanged?: boolean;
    };
    tools: {
      listChanged?: boolean;
    };
    completions?: Record<string, any>;
    experimental?: Record<string, any>;
  };
  serverInfo: {
    name: string;
    version: string;
  };
  instructions?: string;
}

export interface InitializeRequest extends JsonRpcRequest {
  method: 'initialize';
  params: InitializeRequestParams;
}

/* ---------- notifications/initialized ---------- */

export interface InitializedNotification extends JsonRpcBase {
  method: 'notifications/initialized';
}

/* ---------- tools/list ---------- */

export interface ToolsListParams {
  cursor?: string;
}

export interface McpToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface JsonSchemaObject {
  type: 'object';
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
  annotations?: McpToolAnnotations;
}

export interface ToolsListResult {
  tools: McpTool[];
  nextCursor?: string;
}

export interface ToolsListRequest extends JsonRpcRequest {
  method: 'tools/list';
  params?: ToolsListParams;
}

/* ---------- tools/call ---------- */

export interface ToolsCallParams {
  name: string;
  arguments: Record<string, any>;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface AudioContent {
  type: 'audio';
  data: string;
  mimeType: string;
}

export interface ResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
  };
}

export type ToolResultContent =
  | TextContent
  | ImageContent
  | AudioContent
  | ResourceContent;

export interface ToolsCallResult {
  content: ToolResultContent[];
  isError?: boolean;
}

export interface ToolsCallRequest extends JsonRpcRequest {
  method: 'tools/call';
  params: ToolsCallParams;
}