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

        // Se lo status non è specificato esplicitamente, o è impostato ad 'active',
        // filtriamo per active o null (fallback per i log pre-migrazione)
        if (!query.status || query.status === 'active') {
            query.status = { $in: [null, 'active'] };
        }

        if (Object.keys(query).length === 0) {
            return [];
        }

        return [{ $match: query }];
    }
}
