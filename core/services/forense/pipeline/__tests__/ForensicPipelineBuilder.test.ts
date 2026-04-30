/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { ForensicPipelineBuilder } from '../ForensicPipelineBuilder';

describe('ForensicPipelineBuilder', () => {
    let builder: ForensicPipelineBuilder;

    beforeEach(() => {
        builder = new ForensicPipelineBuilder();
    });

    describe('addStage', () => {
        it('should add stages to the pipeline', () => {
            const mockStage = { generate: () => [{ $match: { test: 1 } }] };
            builder.addStage(mockStage as any);
            const pipeline = builder.build();
            expect(pipeline).toHaveLength(1);
            expect(pipeline[0].$match.test).toBe(1);
        });

        it('should return this for chaining', () => {
            const result = builder.addStage({ generate: () => [] } as any);
            expect(result).toBe(builder);
        });
    });

    describe('build', () => {
        it('should concatenate all stages using flatMap', () => {
            builder.addStage({ generate: () => [{ stage: 1 }] } as any);
            builder.addStage({ generate: () => [{ stage: 2 }, { stage: 3 }] } as any);
            const pipeline = builder.build();
            expect(pipeline).toEqual([{ stage: 1 }, { stage: 2 }, { stage: 3 }]);
        });
    });

    describe('reset', () => {
        it('should clear all stages', () => {
            builder.addStage({ generate: () => [{ stage: 1 }] } as any);
            builder.reset();
            const pipeline = builder.build();
            expect(pipeline).toHaveLength(0);
        });

        it('should return this for chaining', () => {
            const result = builder.reset();
            expect(result).toBe(builder);
        });
    });
});
