/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import { inject, singleton } from 'tsyringe';
import { AssistantService } from '../../services/assistant/AssistantService';
import { ASSISTANT_SERVICE_TOKEN, LOGGER_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';
import { ToolRegistry, McpToolDefinition } from '../tools/ToolRegistry';
import { AssistantToolArgumentsMap, AssistantToolName } from '../../types/assistant/assistant-tool.types';

/**
 * McpNativeExecutor
 * 
 * Questo service funge da "Bridge" (ponte) tra il protocollo MCP e la business logic dell'applicazione.
 * A differenza di un approccio basato su chiamate HTTP esterne (Proxy), questo executor
 * invoca direttamente i Service del backend tramite Dependency Injection.
 * 
 * IL GIRO (Native Execution):
 * 1. Riceve il nome del tool e gli argomenti dal Protocol Controller.
 * 2. Valida la presenza del tool nel ToolRegistry.
 * 3. Valida la correttezza dei parametri (inputSchema).
 * 4. Esegue il mapping: Tool Name -> Metodo del Service (es. AssistantService).
 * 5. Restituisce il risultato grezzo che verrà poi incapsulato nel protocollo MCP.
 */
@singleton()
export class McpNativeExecutor {
  constructor(
    @inject(ASSISTANT_SERVICE_TOKEN) private assistant: AssistantService,
    @inject(LOGGER_TOKEN) private logger: Logger
  ) {}

  public async executeToolByName(
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    const tool = ToolRegistry.findByName(toolName);

    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Sanitizzazione argomenti: rimuoviamo i valori null che potrebbero rompere la validazione o i service
    const sanitizedArgs = Object.fromEntries(
      Object.entries(args).filter(([_, v]) => v !== null)
    );

    this.validateToolArguments(tool, sanitizedArgs);

    this.logger.info(`[McpNativeExecutor] Executing tool: ${toolName}`, { args: sanitizedArgs });

    const name = toolName as AssistantToolName;

    switch (name) {
      case 'semantic_search': {
        const sArgs = sanitizedArgs as AssistantToolArgumentsMap['semantic_search'];
        return this.assistant.search(sArgs.query, {
          limit: sArgs.limit,
          type: sArgs.type,
          sortBy: sArgs.sortBy,
          sortOrder: sArgs.sortOrder,
          status: sArgs.status,
        });
      }

      case 'resolve_threat_source': {
        const rArgs = sanitizedArgs as AssistantToolArgumentsMap['resolve_threat_source'];
        return this.assistant.resolveSource(rArgs.sourceRef as any);
      }

      case 'ask': {
        const aArgs = sanitizedArgs as AssistantToolArgumentsMap['ask'];
        return this.assistant.ask(aArgs.question);
      }
        
      case 'search_attacks': {
        const aArgs = sanitizedArgs as AssistantToolArgumentsMap['search_attacks'];
        return this.assistant.searchAttacks(aArgs);
      }

      case 'search_campaigns': {
        const cArgs = sanitizedArgs as AssistantToolArgumentsMap['search_campaigns'];
        return this.assistant.searchCampaigns(cArgs);
      }    

      default:
        throw new Error(`Tool ${toolName} logic not implemented in native executor`);
    }
  }

  private validateToolArguments(
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
}
