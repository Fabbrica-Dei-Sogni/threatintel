/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import 'reflect-metadata';
import { getComponent, container } from '../../di/container';
import { setupContainer } from '../../di/registry';
import mongoose from 'mongoose';
import { AttackLogService } from '../AttackLogService';
import ThreatLog from '../../models/ThreatLogSchema';


import { 
    LOGGER_TOKEN, 
    EVENT_BUS_TOKEN, 
    FORENSIC_PIPELINE_TOKEN,
    ATTACK_LOG_SERVICE_TOKEN 
} from '../../di/tokens';

describe('AttackLogService', () => {
    let service: AttackLogService;
    let mockLogger: any;
    let mockForensicPipelineService: any;

    let mockEventBus: any;

    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/threatintel_test';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        setupContainer(container);
        container.clearInstances();

        await ThreatLog.deleteMany({});

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockForensicPipelineService = {
            buildStandardPipeline: jest.fn().mockResolvedValue([]),
            buildDistributedPipeline: jest.fn().mockResolvedValue([])
        };



        mockEventBus = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn()
        };

        container.registerInstance(LOGGER_TOKEN, mockLogger);
        container.registerInstance(FORENSIC_PIPELINE_TOKEN, mockForensicPipelineService);
        container.registerInstance(EVENT_BUS_TOKEN, mockEventBus);

        service = getComponent(ATTACK_LOG_SERVICE_TOKEN);
    });

    describe('getAttacks', () => {
        it('should call forensicPipelineService with correct filters', async () => {
            const params = {
                page: 1,
                pageSize: 20,
                filters: { 'request.ip': '1.2.3.4' },
                minLogsForAttack: 5
            };

            // Setup mock to return a simple pipeline and a result
            mockForensicPipelineService.buildStandardPipeline.mockResolvedValue([{ $match: {} }]);
            
            // Mock aggregate call con fluent API
            const spy = jest.spyOn(ThreatLog, 'aggregate').mockReturnValue({
                allowDiskUse: jest.fn().mockResolvedValue([{ dati: [], totale: [{ totalCount: 0 }] }])
            } as any);

            await service.getAttacks(params);

            const [firstCall] = mockForensicPipelineService.buildStandardPipeline.mock.calls;
            expect(firstCall[0]).toMatchObject({ 'request.ip': { $regex: '1.2.3.4', $options: 'i' } });
            expect(firstCall[1]).toBe(5);
            expect(firstCall[2]).toEqual({});
            
            spy.mockRestore();
        });
    });

    describe('getAttackDetail', () => {
        it('should fetch detail for a specific IP', async () => {
            const params = { ip: '1.2.3.4' };
            mockForensicPipelineService.buildStandardPipeline.mockResolvedValue([{ $match: { 'request.ip': '1.2.3.4' } }]);
            
            const spy = jest.spyOn(ThreatLog, 'aggregate').mockReturnValue({
                allowDiskUse: jest.fn().mockResolvedValue([{ ip: '1.2.3.4' }])
            } as any);

            const result = await service.getAttackDetail(params);

            expect(result).toBeDefined();
            expect(result.ip).toBe('1.2.3.4');
            expect(mockEventBus.emit).toHaveBeenCalledWith(expect.anything(), expect.anything());
            
            spy.mockRestore();
        });
    });

    describe('getDistributedAttackDetail', () => {
        it('should fetch distributed attack detail for multiple IPs', async () => {
            const ipList = ['1.1.1.1', '2.2.2.2'];
            mockForensicPipelineService.buildDistributedPipeline.mockResolvedValue([{ $match: { 'request.ip': { $in: ipList } } }]);
            
            const spy = jest.spyOn(ThreatLog, 'aggregate').mockReturnValue({
                allowDiskUse: jest.fn().mockResolvedValue([{ ips: ipList }])
            } as any);
            const populateSpy = jest.spyOn(ThreatLog, 'populate').mockResolvedValue({ ips: ipList } as any);

            const result = await service.getDistributedAttackDetail({ ipList });

            expect(result).toBeDefined();
            expect(mockForensicPipelineService.buildDistributedPipeline).toHaveBeenCalled();
            
            spy.mockRestore();
            populateSpy.mockRestore();
        });
    });
});
