/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */


/**
 * Interfaccia comune per tutti gli stage della pipeline di analisi forense.
 */
export interface PipelineStage {
    /**
     * Genera gli step di aggregazione MongoDB per questo stage.
     * @returns Array di oggetti stage MongoDB
     */
    generate(): any[];
}
