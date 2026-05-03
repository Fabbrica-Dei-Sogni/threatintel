// src/assistant/mcp/McpUtils.ts

import { JsonRpcError, JsonRpcId, JsonRpcRequest, JsonRpcSuccess, JsonRpcErrorCodes } from "../types/mcp.types";

export class McpUtils {
  public static isJsonRpcRequest(message: any): message is JsonRpcRequest {
    return (
      !!message &&
      typeof message === "object" &&
      message.jsonrpc === "2.0" &&
      typeof message.method === "string"
    );
  }

  public static isJsonRpcResponse(message: any): boolean {
    return (
      !!message &&
      typeof message === "object" &&
      message.jsonrpc === "2.0" &&
      ("result" in message || "error" in message) &&
      !("method" in message)
    );
  }

  public static success(id: JsonRpcId, result: any): JsonRpcSuccess {
    return {
      jsonrpc: "2.0",
      id,
      result,
    };
  }

  public static error(
    id: JsonRpcId,
    code: number,
    message: string,
    data?: any
  ): JsonRpcError {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        ...(data !== undefined ? { data } : {}),
      },
    };
  }

  public static invalidRequest(id: JsonRpcId = null, data?: any): JsonRpcError {
    return this.error(id, JsonRpcErrorCodes.INVALID_REQUEST, "Invalid Request", data);
  }

  public static methodNotFound(id: JsonRpcId, method: string): JsonRpcError {
    return this.error(id, JsonRpcErrorCodes.METHOD_NOT_FOUND, `Method not found: ${method}`);
  }

  public static invalidParams(id: JsonRpcId, message = "Invalid params", data?: any): JsonRpcError {
    return this.error(id, JsonRpcErrorCodes.INVALID_PARAMS, message, data);
  }

  public static internalError(id: JsonRpcId = null, data?: any): JsonRpcError {
    return this.error(id, JsonRpcErrorCodes.INTERNAL_ERROR, "Internal error", data);
  }

  public static generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }
}