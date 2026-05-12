/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import 'reflect-metadata';
import { ForensicPipelineService } from '../services/forense/ForensicPipelineService';
import { createMockConfigProvider } from './TestUtils';


// Mock Logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
} as any;

// Mock ConfigService
const mockConfigService = {
    getConfigValue: jest.fn(),
} as any;

describe('Forensic Pipeline Service Test', () => {
    let newService: ForensicPipelineService;

    beforeEach(async () => {
        // Mock config values
        mockConfigService.getConfigValue.mockImplementation((key: string) => {
            if (key === 'DANGER_WEIGHT') return Promise.resolve(null);
            if (key === 'TOLLERANCE_WEIGHTS') return Promise.resolve(null);
            if (key === 'SUSPICIOUS_PATTERNS') return Promise.resolve('test_malware,cmd.exe');
            if (key === 'SUSPICIOUS_REFERERS') return Promise.resolve('bad_tool,curl');
            return Promise.resolve(null);
        });

        newService = new ForensicPipelineService(mockLogger, mockConfigService, createMockConfigProvider());
        await (newService as any).initialized;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should build a standard pipeline correctly', async () => {
        const filters = { 'headers.host': 'example.com' };
        const minLogs = 10;
        const timeConfig = { mode: 'last', value: 24, unit: 'hours' } as any;

        const pipeline = await newService.buildStandardPipeline(filters, minLogs, timeConfig);

        expect(Array.isArray(pipeline)).toBe(true);

        // Check Match Stage
        const matchStage = pipeline.find(s => s.$match && s.$match['headers.host']);
        expect(matchStage).toBeDefined();

        // Check Grouping Stage
        const groupStage = pipeline.find(s => s.$group && s.$group._id === '$request.ip');
        expect(groupStage).toBeDefined();

        // Check Scoring Stage (it's part of the standard pipeline)
        const statsStages = pipeline.filter(s => s.$addFields);
        expect(statsStages.length).toBeGreaterThan(0);

        const dangerCalc = statsStages.find(s => s.$addFields && s.$addFields.dangerScore);
        expect(dangerCalc).toBeDefined();
        
        // Pipeline should contain advanced stages
        expect(pipeline.some(s => s.$addFields && s.$addFields.sequenceRiskScore)).toBe(true);
        expect(pipeline.some(s => s.$addFields && s.$addFields.payloadRiskScore)).toBe(true);
    });

    it('should handle missing DB config by using environment fallbacks', async () => {
        mockConfigService.getConfigValue.mockResolvedValue(null);
        
        const serviceWithDefaults = new ForensicPipelineService(mockLogger, mockConfigService, createMockConfigProvider());
        await (serviceWithDefaults as any).initialized;

        const pipeline = await serviceWithDefaults.buildStandardPipeline({}, 5);
        const scoringStage = pipeline.find(s => s.$addFields && s.$addFields.dangerScore);
        
        expect(scoringStage).toBeDefined();
    });

    it('should correctly build a distributed pipeline', async () => {
        const ipList = ['10.0.0.1', '10.0.0.2'];
        const pipeline = await newService.buildDistributedPipeline(ipList, 5);

        const matchIpStage = pipeline.find(s => s.$match && s.$match['request.ip']);
        expect(matchIpStage.$match['request.ip'].$in).toEqual(ipList);

        const clusterGroup = pipeline.find(s => s.$group && s.$group._id === 'distributed_investigation_cluster');
        expect(clusterGroup).toBeDefined();
    });

    it('should verify complex scoring logic and defcon thresholds', async () => {
        const pipeline = await newService.buildStandardPipeline({}, 5);
        const statsStages = pipeline.filter(s => s.$addFields);
        
        const dangerCalc = statsStages.find(s => s.$addFields && s.$addFields.dangerScore)!.$addFields.dangerScore.$round[0].$multiply[1].$add;
        // Verify weights are applied (RPS, DUR, SCORE, UNIQUE, DISTRIBUTED)
        expect(dangerCalc.length).toBeGreaterThanOrEqual(7);

        // Verify Defcon Thresholds (20, 40, 65, 80)
        const dangerLevelStage = statsStages.find(s => s.$addFields && s.$addFields.dangerLevel);
        const switchBranches = dangerLevelStage!.$addFields.dangerLevel.$switch.branches;

        expect(switchBranches[0].case.$lte[1]).toBe(20); // Defcon 5
        expect(switchBranches[1].case.$lte[1]).toBe(40); // Defcon 4
        expect(switchBranches[2].case.$lte[1]).toBe(65); // Defcon 3
        expect(switchBranches[3].case.$lte[1]).toBe(80); // Defcon 2
    });
});
