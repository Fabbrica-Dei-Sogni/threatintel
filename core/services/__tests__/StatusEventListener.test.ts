/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import 'reflect-metadata';
import mongoose from 'mongoose';
import { container } from 'tsyringe';
import { StatusEventListener } from '../StatusEventListener';
import { EventBus, AppEvents } from '../EventBus';
import ThreatLog from '../../models/ThreatLogSchema';
import { LOGGER_TOKEN, EVENT_BUS_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';

describe('StatusEventListener', () => {
    let listener: StatusEventListener;
    let eventBus: EventBus;
    let logger: jest.Mocked<Logger>;

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
        await ThreatLog.deleteMany({});
        container.clearInstances();
        
        logger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        } as any;
        
        eventBus = new EventBus(logger);
        
        container.registerInstance(LOGGER_TOKEN, logger);
        container.registerInstance(EVENT_BUS_TOKEN, eventBus);
        
        listener = container.resolve(StatusEventListener);
        listener.start();
    });

    it('should update logs status when LOGS_STATUS_UPDATE_REQUESTED is emitted', async () => {
        // Create some logs
        await ThreatLog.create([
            { id: 'log1', timestamp: new Date(), request: { ip: '1.2.3.4', url: '/', method: 'GET' }, status: 'active' },
            { id: 'log2', timestamp: new Date(), request: { ip: '1.2.3.4', url: '/admin', method: 'POST' }, status: 'active' },
            { id: 'log3', timestamp: new Date(), request: { ip: '5.6.7.8', url: '/', method: 'GET' }, status: 'active' }
        ]);

        const payload = {
            filter: { 'request.ip': '1.2.3.4' },
            status: 'archived' as const,
            context: {
                reason: 'test_archive',
                sourceId: '1.2.3.4',
                updatedBy: 'tester'
            }
        };

        // Emit event
        eventBus.emit(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, payload);

        // Wait a bit for async processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify changes
        const archivedLogs = await ThreatLog.find({ status: 'archived' });
        expect(archivedLogs).toHaveLength(2);
        expect(archivedLogs[0].statusContext?.reason).toBe('test_archive');
        expect(archivedLogs[0].statusContext?.updatedBy).toBe('tester');

        const activeLogs = await ThreatLog.find({ status: 'active' });
        expect(activeLogs).toHaveLength(1);
        expect(activeLogs[0].request.ip).toBe('5.6.7.8');
    });

    it('should emit LOGS_STATUS_UPDATED when update is complete', async () => {
        const updatedSpy = jest.fn();
        eventBus.on(AppEvents.LOGS_STATUS_UPDATED, updatedSpy);

        const payload = {
            filter: { id: 'non-existent' },
            status: 'archived' as const,
            context: { reason: 'test' }
        };

        eventBus.emit(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, payload);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(updatedSpy).toHaveBeenCalledWith(expect.objectContaining({
            status: 'archived',
            modifiedCount: 0
        }));
    });
});
