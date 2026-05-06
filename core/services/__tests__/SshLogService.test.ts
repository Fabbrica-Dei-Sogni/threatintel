import 'reflect-metadata';
import { SshLogService } from '../SshLogService';

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as Tokens from '../../di/tokens';
import { setupContainer } from '../../di/registry';
import { getComponent, container } from '../../di/container';

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('SshLogService', () => {
    let service: SshLogService;
    let mockLogger: any;
    let mockThreatLogService: any;
    let mockAppConfigProvider: any;
    let mockThreatLogFactory: any;

    beforeEach(() => {
        // Initialize DI
        setupContainer(container);
        
        // Clear instances
        container.clearInstances();

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockThreatLogService = {
            saveLog: jest.fn().mockResolvedValue({}),
            countLogs: jest.fn().mockResolvedValue(1),
            getLogs: jest.fn().mockResolvedValue([{
                protocol: 'ssh',
                request: { headers: { 'ssh-event': 'Failed' } },
                fingerprint: { score: 0, indicators: [], suspicious: false }
            }])
        };

        mockAppConfigProvider = {
            getDynamicConfig: jest.fn().mockImplementation((key) => {
                if (key === 'SSH_FAILED_PASSWORD') return '20';
                if (key === 'SSH_INVALID_USER') return '30';
                return null;
            })
        };

        mockThreatLogFactory = {
            createLog: jest.fn().mockImplementation((p) => ({
                protocol: p.protocol,
                request: { ip: p.ip, method: p.method, url: p.url, userAgent: p.userAgent },
                fingerprint: { score: p.score },
                timestamp: p.timestamp || new Date()
            }))
        };

        // Register mocks using Tokens
        container.registerInstance(Tokens.LOGGER_TOKEN, mockLogger);
        container.registerInstance(Tokens.THREAT_LOG_SERVICE_TOKEN, mockThreatLogService);
        container.registerInstance(Tokens.CONFIG_PROVIDER_TOKEN, mockAppConfigProvider);
        container.registerInstance(Tokens.THREAT_LOG_FACTORY_TOKEN, mockThreatLogFactory);

        service = getComponent(Tokens.SSH_LOG_SERVICE_TOKEN);
    });

    describe('loadConfig', () => {
        it('should load custom scores from config', async () => {
            await service.loadConfig();
            expect((service as any).failedPasswordScore).toBe(20);
            expect((service as any).invalidUserScore).toBe(30);
        });
    });

    describe('processEntry', () => {
        it('should parse Failed password messages', async () => {
            const entry = { MESSAGE: 'Failed password for root from 1.2.3.4 port 1234 ssh2' };
            await (service as any).processEntry(entry);
            
            const batch = (service as any).sshBatchBuffer;
            expect(batch.size).toBe(1);
            const item = batch.get('1.2.3.4_root_Failed');
            expect(item.ip).toBe('1.2.3.4');
            expect(item.user).toBe('root');
            expect(item.type).toBe('Failed');
        });

        it('should parse Invalid user messages', async () => {
            const entry = { MESSAGE: 'Invalid user admin from 5.6.7.8 port 5678' };
            await (service as any).processEntry(entry);
            
            const batch = (service as any).sshBatchBuffer;
            expect(batch.has('5.6.7.8_admin_Invalid')).toBe(true);
        });

        it('should aggregate multiple events in the buffer', async () => {
            const entry = { MESSAGE: 'Failed password for root from 1.2.3.4 port 1234 ssh2' };
            await (service as any).processEntry(entry);
            await (service as any).processEntry(entry);
            
            const item = (service as any).sshBatchBuffer.get('1.2.3.4_root_Failed');
            expect(item.count).toBe(2);
        });
    });

    describe('flushBuffer', () => {
        it('should save buffered events to ThreatLogService', async () => {
            const entry = { MESSAGE: 'Failed password for root from 1.2.3.4 port 1234 ssh2' };
            await (service as any).processEntry(entry);
            
            await (service as any).flushBuffer();
            
            expect(mockThreatLogService.saveLog).toHaveBeenCalled();
            expect((service as any).sshBatchBuffer.size).toBe(0);
        });
    });

    describe('analyzeSshLogs', () => {
        it('should update existing SSH logs with new scores', async () => {
            const result = await service.analyzeSshLogs();
            expect(result.updated).toBe(1);
            expect(mockThreatLogService.saveLog).toHaveBeenCalled();
        });
    });

    describe('start/stop', () => {
        it('should start journalctl process and interval', async () => {
            const mockProcess = {
                stdout: new EventEmitter(),
                stderr: new EventEmitter(),
                on: jest.fn(),
                kill: jest.fn()
            };
            (spawn as jest.Mock).mockReturnValue(mockProcess);
            jest.spyOn(service as any, 'backfillLogs').mockResolvedValue(undefined);

            await service.start();
            
            expect(spawn).toHaveBeenCalledWith('journalctl', expect.arrayContaining(['SYSLOG_IDENTIFIER=sshd']));
            expect((service as any).bufferFlushInterval).not.toBeNull();
        });

        it('should stop process and clear interval', () => {
            const mockProcess = { kill: jest.fn() };
            (service as any).journalProcess = mockProcess;
            (service as any).bufferFlushInterval = setInterval(() => {}, 1000);
            
            service.stop();
            
            expect(mockProcess.kill).toHaveBeenCalled();
            expect((service as any).bufferFlushInterval).toBeNull();
        });
    });
});
