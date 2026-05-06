/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { PipelineStage } from '../PipelineStage';

export class MatchFilterStage implements PipelineStage {
    constructor(private readonly filters: any) { }

    generate(): any[] {
        const query = { ...this.filters };

        if (Object.keys(query).length === 0) {
            return [];
        }

        return [{ $match: query }];
    }
}
