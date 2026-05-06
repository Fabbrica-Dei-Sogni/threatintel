import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { AssistantService } from '../services/assistant/AssistantService';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { I18nService } from '../services/I18nService';
import { Controller, Delete, Get, Post } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import { McpUtils } from '../assistant/mcp/McpUtils';
import { McpNativeExecutor } from '../assistant/mcp/McpNativeExecutor';
import { InitializeResult, JsonRpcError, JsonRpcId, JsonRpcSuccess, ToolsCallParams, ToolsListResult } from '../assistant/types/mcp.types';
import { ToolRegistry } from '../assistant/tools/ToolRegistry';

const auth = getComponent(AuthMiddleware);

/**
 * McpProtocolController
 * 
 * Questo controller è l'ENTRY POINT del server MCP (Model Context Protocol).
 * La sua responsabilità è gestire il trasporto (HTTP POST) e il protocollo (JSON-RPC 2.0).
 * 
 * IL GIRO (Protocol Handling):
 * 1. Riceve una richiesta POST su /api/mcp.
 * 2. Valida che sia un messaggio JSON-RPC 2.0 valido.
 * 3. Gestisce i metodi standard MCP:
 *    - "initialize": Handshake iniziale per definire capacità e versione.
 *    - "tools/list": Restituisce il catalogo dei tool disponibili (dal ToolRegistry).
 *    - "tools/call": Delega l'esecuzione effettiva al McpNativeExecutor.
 * 4. Restituisce la risposta formattata secondo gli standard MCP.
 */
@singleton()
@Controller('/api/mcp')
export class McpProtocolController {
  constructor(
    @inject(Tokens.ASSISTANT_SERVICE_TOKEN) private assistant: AssistantService,
    @inject(Tokens.LOGGER_TOKEN) private logger: Logger,
    @inject(Tokens.I18N_TOKEN) private i18n: I18nService,
    @inject(Tokens.MCP_EXECUTOR_TOKEN) private mcpExecutor: McpNativeExecutor
  ) { }

  /**
   * @openapi
   * /mcp:
   *   get:
   *     summary: Endpoint MCP (Streamable HTTP) - GET
   *     description: |
   *       Entry point MCP utilizzato dai client per il transport HTTP.
   *       Questo server non espone lo stream SSE su GET e restituisce 405.
   *       Per le richieste MCP usare il metodo POST con payload JSON-RPC 2.0.
   *     tags: [MCP]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       405:
   *         description: Metodo GET non supportato per MCP (solo POST).
   */
  @Get('/', [auth.isAuthenticated()])
  async mcpGet(req: Request, res: Response): Promise<void> {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({
      error: "GET not supported for SSE on this MCP endpoint. Use POST.",
    });
  }

  /**
   * @openapi
   * /mcp:
   *   delete:
   *     summary: Chiusura sessione MCP (non supportata)
   *     description: |
   *       Endpoint riservato alla chiusura di sessioni MCP HTTP.
   *       Questo server non implementa la chiusura esplicita e restituisce 405.
   *     tags: [MCP]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       405:
   *         description: Chiusura sessione MCP non supportata.
   */
  @Delete('/', [auth.isAuthenticated()])
  async mcpDelete(req: Request, res: Response): Promise<void> {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({
      error: "MCP session termination is not supported.",
    });
  }

  /**
   * @openapi
   * /mcp:
   *   post:
   *     summary: Endpoint MCP JSON-RPC
   *     description: |
   *       Endpoint principale del server MCP, conforme al Model Context Protocol (MCP).
   *       Accetta richieste JSON-RPC 2.0 con metodi:
   *         - "initialize": handshake MCP e discovery delle capabilities
   *         - "tools/list": elenco dei tool disponibili (catalogo MCP)
   *         - "tools/call": esecuzione di un tool
   *       Il body deve essere un oggetto JSON-RPC o un array di messaggi JSON-RPC.
   *     tags: [MCP]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             oneOf:
   *               - type: object
   *                 description: Singolo messaggio JSON-RPC 2.0
   *               - type: array
   *                 description: Batch di messaggi JSON-RPC 2.0
   *     responses:
   *       200:
   *         description: Risposta MCP JSON-RPC 2.0 (singola o batch).
   *       202:
   *         description: Nessuna risposta JSON-RPC (solo notifiche).
   *       400:
   *         description: Richiesta MCP non valida.
   *       500:
   *         description: Errore interno durante la gestione MCP.
   */
  @Post('/', [auth.isAuthenticated()])
  async mcpPost(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;

      if (!body || typeof body !== "object") {
        res.status(400).json(McpUtils.invalidRequest());
        return;
      }

      if (Array.isArray(body)) {
        const responses: Array<JsonRpcSuccess | JsonRpcError> = [];

        for (const message of body) {
          const response = await this.handleMcpMessage(message, req, res);
          if (response) responses.push(response);
        }

        if (responses.length === 0) {
          res.status(202).end();
          return;
        }

        res.status(200).json(responses);
        return;
      }

      const response = await this.handleMcpMessage(body, req, res);

      if (!response) {
        res.status(202).end();
        return;
      }

      res.status(200).json(response);
    } catch (err: any) {
      this.logger.error("[AssistantController] MCP POST error:", err);
      res.status(500).json(McpUtils.internalError(null, err?.message));
    }
  }

  private async handleMcpMessage(
    message: any,
    req: Request,
    res: Response
  ): Promise<JsonRpcSuccess | JsonRpcError | null> {
    if (McpUtils.isJsonRpcResponse(message)) {
      return null;
    }

    if (!McpUtils.isJsonRpcRequest(message)) {
      return McpUtils.invalidRequest(message?.id ?? null);
    }

    const id: JsonRpcId = message.id ?? null;
    const method = message.method;
    const params = message.params ?? {};

    switch (method) {
      case "initialize":
        return this.handleInitialize(id, res);

      case "notifications/initialized":
        return null;

      case "tools/list":
        return this.handleToolsList(id);

      case "tools/call":
        return await this.handleToolsCall(id, params, req);

      default:
        return McpUtils.methodNotFound(id, method);
    }
  }

  private handleInitialize(id: JsonRpcId, res: Response): JsonRpcSuccess {
    res.setHeader("Mcp-Session-Id", McpUtils.generateSessionId());

    const result: InitializeResult = {
      protocolVersion: '2025-03-26',
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: 'ThreatIntel Forensic Server',
        version: '1.0.0',
      },
      instructions:
        'Call tools/list to discover tools, then tools/call to execute them.',
    };

    return McpUtils.success(id, result);

  }

private handleToolsList(id: JsonRpcId): JsonRpcSuccess {
  return McpUtils.success(id, {
    tools: ToolRegistry.listPublic(),
  });
}

  private async handleToolsCall(
    id: JsonRpcId,
    params: ToolsCallParams ,
    req: Request
  ): Promise<JsonRpcSuccess | JsonRpcError> {
    const toolName = params?.name;
    const args = params?.arguments ?? {};

    if (!toolName || typeof toolName !== "string") {
      return McpUtils.invalidParams(id, "Missing or invalid tool name");
    }

    try {
      const result = await this.mcpExecutor.executeToolByName(toolName, args);

      return McpUtils.success(id, {
        content: [
          {
            type: "text",
            text:
              typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      });
    } catch (err: any) {
      const msg = err?.message || "Unknown tool execution error";

      if (
        msg.startsWith("Missing required argument:") ||
        msg === "Tool arguments must be an object" ||
        msg.startsWith("Unknown tool:")
      ) {
        return McpUtils.invalidParams(id, msg);
      }

      return McpUtils.success(id, {
        content: [
          {
            type: "text",
            text: `Tool execution failed: ${msg}`,
          },
        ],
        isError: true,
      });
    }
  }


}

