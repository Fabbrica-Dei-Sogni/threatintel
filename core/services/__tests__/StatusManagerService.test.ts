import 'reflect-metadata';
import { StatusManagerService } from '../StatusManagerService';
import { EventBus, AppEvents } from '../EventBus';
import { Logger } from 'winston';

describe('StatusManagerService', () => {
    let service: StatusManagerService;
    let eventBus: jest.Mocked<EventBus>;
    let logger: jest.Mocked<Logger>;

    beforeEach(() => {
        eventBus = {
            emit: jest.fn()
        } as any;
        logger = {
            info: jest.fn(),
            error: jest.fn()
        } as any;

        service = new StatusManagerService(logger, eventBus);
    });

    it('should emit LOGS_STATUS_UPDATE_REQUESTED for archiveCampaign', async () => {
        await service.archiveCampaign('some-hash', 'test-user');

        expect(eventBus.emit).toHaveBeenCalledWith(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, {
            filter: { 'fingerprint.hash': 'some-hash' },
            status: 'archived',
            context: {
                reason: 'campaign_archived',
                sourceId: 'some-hash',
                updatedBy: 'test-user'
            }
        });
    });

    it('should emit LOGS_STATUS_UPDATE_REQUESTED for archiveAttack', async () => {
        await service.archiveAttack('1.1.1.1', 'test-user');

        expect(eventBus.emit).toHaveBeenCalledWith(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, {
            filter: { 'request.ip': '1.1.1.1' },
            status: 'archived',
            context: {
                reason: 'attack_archived',
                sourceId: '1.1.1.1',
                updatedBy: 'test-user'
            }
        });
    });

    it('should emit LOGS_STATUS_UPDATE_REQUESTED for updateLogStatus', async () => {
        await service.updateLogStatus('log-id', 'deleted', 'manual_cleanup', 'test-user');

        expect(eventBus.emit).toHaveBeenCalledWith(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, {
            filter: { id: 'log-id' },
            status: 'deleted',
            context: {
                reason: 'manual_cleanup',
                sourceId: 'log-id',
                updatedBy: 'test-user'
            }
        });
    });

    it('should emit LOGS_STATUS_UPDATE_REQUESTED for restoreByContext', async () => {
        await service.restoreByContext('context-id', 'test-user');

        expect(eventBus.emit).toHaveBeenCalledWith(AppEvents.LOGS_STATUS_UPDATE_REQUESTED, {
            filter: { 'statusContext.sourceId': 'context-id' },
            status: 'active',
            context: {
                reason: 'manual_restore',
                sourceId: 'context-id',
                updatedBy: 'test-user'
            }
        });
    });
});
