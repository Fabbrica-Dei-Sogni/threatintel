/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { TimeFilterStage } from '../TimeFilterStage';
import { MatchFilterStage } from '../MatchFilterStage';
import { GroupingStage } from '../GroupingStage';
import { ScoringStage } from '../ScoringStage';
import { AttackStatsStage } from '../AttackStatsStage';
import { SequenceAnalysisStage } from '../SequenceAnalysisStage';
import { PayloadAnalysisStage } from '../PayloadAnalysisStage';
import { FingerprintAnalysisStage } from '../FingerprintAnalysisStage';

describe('Forensic Pipeline Stages', () => {
    describe('TimeFilterStage', () => {
        it('should return empty array if no timeConfig provided', () => {
            const stage = new TimeFilterStage(null);
            expect(stage.generate()).toEqual([]);
        });

        it('should generate $match stage for minutes', () => {
            const stage = new TimeFilterStage({ minutes: 10 });
            const pipeline = stage.generate();
            expect(pipeline[0].$match.timestamp.$gte).toBeDefined();
        });

        it('should handle fromDate and toDate strings', () => {
            const stage = new TimeFilterStage({ fromDate: '2025-01-01', toDate: '2025-01-02' });
            const pipeline = stage.generate();
            expect(pipeline[0].$match.timestamp.$gte).toBeInstanceOf(Date);
            expect(pipeline[0].$match.timestamp.$lte).toBeInstanceOf(Date);
            expect(pipeline[0].$match.timestamp.$lte.getHours()).toBe(23);
        });
    });

    describe('MatchFilterStage', () => {
        it('should return the default status filter if no filters provided', () => {
            const stage = new MatchFilterStage({});
            const pipeline = stage.generate();
            expect(pipeline[0].$match).toEqual({
                status: { $in: [null, 'active'] }
            });
        });

        it('should generate $match stage for filters with default status', () => {
            const stage = new MatchFilterStage({ 'request.ip': '1.2.3.4' });
            const pipeline = stage.generate();
            expect(pipeline[0].$match).toEqual({
                'request.ip': '1.2.3.4',
                status: { $in: [null, 'active'] }
            });
        });
    });

    describe('GroupingStage', () => {
        it('should generate $group and $replaceRoot stages', () => {
            const stage = new GroupingStage(5);
            const pipeline = stage.generate();
            expect(pipeline).toHaveLength(4);
            expect(pipeline[0].$group).toBeDefined();
            expect(pipeline[1].$lookup).toBeDefined();
            expect(pipeline[2].$match.totaleLogs.$gte).toBe(5);
            expect(pipeline[3].$replaceRoot).toBeDefined();
        });
    });

    describe('ScoringStage', () => {
        it('should generate $addFields stages for scoring', () => {
            const stage = new ScoringStage({}, {});
            const pipeline = stage.generate();
            // Should have several $addFields stages
            expect(pipeline.length).toBeGreaterThan(0);
            expect(pipeline[0].$addFields.rpsStyle).toBeDefined();
            expect(pipeline[pipeline.length - 1].$addFields.dangerLevel).toBeDefined();
        });

        it('should use provided weights', () => {
            const dangerWeights = { RPSNORM: 0.9 };
            const tolleranceWeights = { RPSTOL: 50 };
            const stage = new ScoringStage(dangerWeights, tolleranceWeights);
            const pipeline = stage.generate();
            
            // Check if weights are used in the pipeline (indirectly by checking stage structure)
            // The ScoringStage uses these internally to build the $addFields segments.
            const normalizationStage = pipeline.find(s => s.$addFields && s.$addFields.rpsNorm);
            expect(normalizationStage.$addFields.rpsNorm.$min[0].$divide[1]).toBe(50);
        });

        it('should include behavioral boosting scores', () => {
            const stage = new ScoringStage({}, {});
            const pipeline = stage.generate();
            const dangerScoreStage = pipeline.find(s => s.$addFields && s.$addFields.dangerScore);
            const addArray = dangerScoreStage.$addFields.dangerScore.$round[0].$multiply[1].$add;
            
            expect(JSON.stringify(addArray)).toContain('toolRiskScore');
        });
    });

    describe('AttackStatsStage', () => {
        it('should generate $addFields stages for metrics', () => {
            const stage = new AttackStatsStage({});
            const pipeline = stage.generate();
            expect(pipeline).toHaveLength(4);
            expect(pipeline[0].$addFields.attackDurationMs).toBeDefined();
            expect(pipeline[1].$addFields.durataAttacco.human).toBeDefined();
            expect(pipeline[2].$addFields.attackPatterns).toBeDefined();
        });

        it('should handle uniqueTechNorm with custom tolerance', () => {
            const stage = new AttackStatsStage({ UNQTECHTOL: 10 });
            const pipeline = stage.generate();
            const normStage = pipeline.find(s => s.$addFields && s.$addFields.uniqueTechNorm);
            expect(normStage.$addFields.uniqueTechNorm.$min[0].$divide[1]).toBe(10);
        });

        it('should cover all human duration branches', () => {
            const stage = new AttackStatsStage({});
            const pipeline = stage.generate();
            const humanStage = pipeline.find(s => s.$addFields && s.$addFields.durataAttacco);
            const branches = humanStage.$addFields.durataAttacco.human.$switch.branches;
            
            expect(branches).toHaveLength(3);
            expect(branches[0].case.$lt[1]).toBe(0.000016);
            expect(branches[1].case.$lt[1]).toBe(1);
            expect(branches[2].case.$lt[1]).toBe(60);
        });

        it('should cover attackPatterns reduction logic', () => {
            const stage = new AttackStatsStage({});
            const pipeline = stage.generate();
            const patternsStage = pipeline.find(s => s.$addFields && s.$addFields.attackPatterns);
            const reduceOp = patternsStage.$addFields.attackPatterns.$let.vars.allIndicators.$reduce;
            
            expect(reduceOp.input).toBe('$logsRaggruppati');
            expect(reduceOp.in.$setUnion).toBeDefined();
        });
    });

    describe('SequenceAnalysisStage', () => {
        it('should generate $addFields stages for sequence analysis', () => {
            const stage = new SequenceAnalysisStage();
            const pipeline = stage.generate();
            expect(pipeline.length).toBeGreaterThan(0);
            expect(pipeline.some(s => s.$addFields && s.$addFields.logsSorted)).toBe(true);
            expect(pipeline.some(s => s.$addFields && s.$addFields.sequenceRiskScore)).toBe(true);
        });
    });

    describe('PayloadAnalysisStage', () => {
        it('should generate $addFields stages for payload analysis', () => {
            const stage = new PayloadAnalysisStage(['admin', 'system']);
            const pipeline = stage.generate();
            expect(pipeline.length).toBeGreaterThan(0);
            expect(pipeline.some(s => s.$addFields && s.$addFields.payloadRiskScore)).toBe(true);
        });
    });

    describe('FingerprintAnalysisStage', () => {
        it('should generate $addFields stages for fingerprint analysis', () => {
            const stage = new FingerprintAnalysisStage(['malicious.com']);
            const pipeline = stage.generate();
            expect(pipeline.length).toBeGreaterThan(0);
            expect(pipeline.some(s => s.$addFields && s.$addFields.toolRiskScore)).toBe(true);
        });
    });
});
