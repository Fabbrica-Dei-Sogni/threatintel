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

describe('Distributed Attack Pipeline Test', () => {
    let service: ForensicPipelineService;

    beforeEach(async () => {
        mockConfigService.getConfigValue.mockImplementation((_key: string) => {
            return Promise.resolve(null);
        });

        service = new ForensicPipelineService(mockLogger, mockConfigService);
        await (service as any).initialized;
    });

    it('should build a distributed pipeline correctly', async () => {
        const ipList = ['1.1.1.1', '2.2.2.2', '3.3.3.3'];
        const minLogs = 5;
        const timeConfig = { hours: 24 };

        const pipeline = await service.buildDistributedPipeline(ipList, minLogs, timeConfig);

        expect(Array.isArray(pipeline)).toBe(true);
        
        // 1. Check Match Stage for IP list
        const matchIpStage = pipeline.find(s => s.$match && s.$match['request.ip']);
        expect(matchIpStage).toBeDefined();
        expect(matchIpStage.$match['request.ip'].$in).toEqual(ipList);

        // 2. Check Distributed Grouping Stage
        const groupStage = pipeline.find(s => s.$group && s.$group._id === 'distributed_investigation_cluster');
        expect(groupStage).toBeDefined();
        expect(groupStage.$group.ipsInvolved).toBeDefined();

        // 3. Check ReplaceRoot and ID mapping
        const replaceRootStage = pipeline.find(s => s.$replaceRoot);
        expect(replaceRootStage).toBeDefined();
        const newRoot = replaceRootStage.$replaceRoot.newRoot.$mergeObjects[1];
        expect(newRoot._id).toBe(ipList[0]);
        expect(newRoot.isDistributed).toBe(true);
        expect(newRoot.ips).toBeDefined();

        // 4. Check that standard stages follow
        const rpsStage = pipeline.find(s => s.$addFields && s.$addFields.rps);
        expect(rpsStage).toBeDefined();

        const scoringStage = pipeline.find(s => s.$addFields && s.$addFields.dangerScore);
        expect(scoringStage).toBeDefined();
    });

    it('should throw error if ipList is empty', async () => {
        await expect(service.buildDistributedPipeline([], 1))
            .rejects.toThrow("[ForensicPipelineService] ipList non può essere vuota");
    });
});
