/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { PipelineStage } from './PipelineStage';

export class ForensicPipelineBuilder {
    private stages: PipelineStage[] = [];

    /**
     * Aggiunge uno stage alla pipeline.
     * @param stage Lo stage da aggiungere
     */
    addStage(stage: PipelineStage): this {
        this.stages.push(stage);
        return this;
    }

    /**
     * Costruisce la pipeline finale concatenando tutti gli stage.
     */
    build(): any[] {
        return this.stages.flatMap(stage => stage.generate());
    }

    /**
     * Resetta la pipeline rimuovendo tutti gli stage.
     */
    reset(): this {
        this.stages = [];
        return this;
    }
}
