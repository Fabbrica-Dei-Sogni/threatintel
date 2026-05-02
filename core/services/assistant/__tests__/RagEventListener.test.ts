import 'reflect-metadata';
import { container } from 'tsyringe';
import { RagEventListener } from '../RagEventListener';
import { LOGGER_TOKEN, EVENT_BUS_TOKEN, RAG_SYNC_SERVICE_TOKEN } from '../../../di/tokens';
import { AppEvents } from '../../EventBus';
import { ServiceStatus } from '../../../types/lifecycle';

describe('RagEventListener', () => {
    let listener: RagEventListener;
    let mockLogger: any;
    let mockRagSync: any;
    let mockEventBus: any;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn()
        };

        mockRagSync = {
            syncThreatLog: jest.fn().mockResolvedValue(undefined),
            syncIpDetails: jest.fn().mockResolvedValue(undefined),
            materializeAttack: jest.fn().mockResolvedValue(undefined),
            materializeCampaign: jest.fn().mockResolvedValue(undefined)
        };

        mockEventBus = {
            on: jest.fn(),
            emit: jest.fn(),
            off: jest.fn()
        };

        container.clearInstances();
        container.registerInstance(LOGGER_TOKEN, mockLogger);
        container.registerInstance(RAG_SYNC_SERVICE_TOKEN, mockRagSync);
        container.registerInstance(EVENT_BUS_TOKEN, mockEventBus);

        listener = container.resolve(RagEventListener);
    });

    it('should register listeners on start', async () => {
        await listener.start();

        expect(listener.getStatus()).toBe(ServiceStatus.RUNNING);
        expect(mockEventBus.on).toHaveBeenCalledWith(AppEvents.THREAT_LOG_CREATED, expect.any(Function));
        expect(mockEventBus.on).toHaveBeenCalledWith(AppEvents.IP_DETAILS_UPDATED, expect.any(Function));
        expect(mockEventBus.on).toHaveBeenCalledWith(AppEvents.ATTACK_RESOLVED, expect.any(Function));
        expect(mockEventBus.on).toHaveBeenCalledWith(AppEvents.ATTACK_SEARCHED, expect.any(Function));
        expect(mockEventBus.on).toHaveBeenCalledWith(AppEvents.CAMPAIGN_RESOLVED, expect.any(Function));
        expect(mockEventBus.on).toHaveBeenCalledWith(AppEvents.CAMPAIGN_SEARCHED, expect.any(Function));
    });

    it('should trigger ragSync.syncThreatLog when THREAT_LOG_CREATED is emitted', async () => {
        await listener.start();

        // Get the listener callback for THREAT_LOG_CREATED
        const callback = mockEventBus.on.mock.calls.find(call => call[0] === AppEvents.THREAT_LOG_CREATED)[1];
        
        const mockLog = { request: { ip: '1.2.3.4' } };
        await callback(mockLog);

        expect(mockRagSync.syncThreatLog).toHaveBeenCalledWith(mockLog);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Event received: threat_log.created'));
    });

    it('should handle errors during start', async () => {
        mockEventBus.on.mockImplementation(() => { throw new Error('Subscription Error'); });
        
        await listener.start();

        expect(listener.getStatus()).toBe(ServiceStatus.FAILED);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to start'));
    });
});
