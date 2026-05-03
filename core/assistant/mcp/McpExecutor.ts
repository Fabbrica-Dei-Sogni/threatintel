// src/assistant/mcp/McpExecutor.ts

import type { Request } from 'express';
import axios, { Method } from 'axios';
import { ToolRegistry, McpToolDefinition } from '../tools/ToolRegistry';

/**
@deprecated This class is deprecated and will be removed in future versions. Please use the new ToolExecutionService instead.
 */
export class McpExecutor {
  public static async executeToolByName(
    toolName: string,
    args: Record<string, any>,
    req: Request
  ): Promise<any> {
    const tool = ToolRegistry.findByName(toolName);

    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    this.validateToolArguments(tool, args);

    return this.executeInternalEndpoint(tool, args, req);
  }

  public static validateToolArguments(
    tool: McpToolDefinition,
    args: Record<string, any>
  ): void {
    if (args === null || typeof args !== 'object' || Array.isArray(args)) {
      throw new Error('Tool arguments must be an object');
    }

    const required = Array.isArray(tool.inputSchema?.required)
      ? tool.inputSchema.required
      : [];

    for (const key of required) {
      if (args[key] === undefined || args[key] === null) {
        throw new Error(`Missing required argument: ${key}`);
      }
    }
  }

  private static async executeInternalEndpoint(
    tool: McpToolDefinition,
    args: Record<string, any>,
    req: Request
  ): Promise<any> {
    const baseUrl =
      process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;

    const { endpoint, method } = tool.execution;
    const url = `${baseUrl}${endpoint}`;
    const httpMethod = (method || 'POST').toUpperCase() as Method;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const authorization = req.get('authorization');
    if (authorization) {
      headers['Authorization'] = authorization;
    }

    const response = await axios({
      url,
      method: httpMethod,
      headers,
      data: httpMethod === 'GET' ? undefined : args,
      params: httpMethod === 'GET' ? args : undefined,
      timeout: 30000,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      throw new Error(
        `Internal endpoint ${endpoint} returned HTTP ${response.status}`
      );
    }

    return response.data;
  }
}